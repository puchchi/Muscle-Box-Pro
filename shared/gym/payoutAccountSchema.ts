/**
 * Validation for the payout account, shared by the form, the seam and (later) the handler.
 *
 * One schema for both directions, and both directions matter for different reasons.
 *
 * **Outbound** is a form that must not reject a real account. A gym that cannot pass this
 * screen cannot be paid at all, so every rule here is the loosest one that still catches a
 * mistake: 6–18 characters rather than a bank-by-bank length table, letters allowed because
 * a few co-operative banks issue them, separators stripped rather than refused because that
 * is how the number is printed in a passbook. The check that actually catches a typo is not
 * the format — it is having the number typed twice.
 *
 * **Inbound** is stricter, and its job is to make the no-full-numbers rule in
 * `payoutAccount.ts` enforceable rather than aspirational. `accountNumberLast4` is exactly
 * four characters here, so a handler that ever sends the whole number fails the boundary
 * instead of rendering "••••4567890123" to a gym that then has a bank credential in its
 * browser cache.
 *
 * What this file does not do is claim an account exists at that IFSC or belongs to that
 * name. Only a bank can answer either, and a format check that reads like verification is
 * worse than an obvious format check.
 */

import * as z from "zod";
import type { PayoutAccount, PayoutAccountInput, PayoutAccountType } from "./payoutAccount";

/**
 * Eleven characters: four-letter bank code, a literal `0`, six for the branch.
 *
 * The `0` in position five is reserved by RBI and is what makes this worth checking at all
 * — it catches the common slip of typing a MICR or SWIFT code into the box.
 */
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Letters and digits, 6–18. See the note above on why it is not narrower. */
const ACCOUNT_NUMBER = /^[0-9A-Za-z]{6,18}$/;

/** The last four, as the server sends them back. */
const ACCOUNT_LAST4 = /^[0-9A-Za-z]{4}$/;

export const payoutAccountTypeSchema = z.enum(["savings", "current"]);

/** Dropdown order is the order gyms pick in — most gyms bank on a current account. */
export const PAYOUT_ACCOUNT_TYPE_LABELS: Record<PayoutAccountType, string> = {
  current: "Current",
  savings: "Savings",
};

/**
 * Spaces and hyphens out.
 *
 * Both appear in a printed account number and neither is part of it, so stripping is
 * kinder than rejecting and cannot change which account is meant. Case is deliberately
 * left alone: an alphanumeric account number is rare enough that nobody has told us
 * whether a bank treats it case-insensitively, and uppercasing on a guess would corrupt
 * the one field where being wrong loses money.
 */
export function normaliseAccountNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

/**
 * The form's shape, and the reason it is not the wire's.
 *
 * Every field is a plain string in and a plain string out, with no `.transform()`
 * anywhere: a zod schema whose output type differs from its input type cannot drive a
 * react-hook-form resolver without a third generic and a cast at every call site.
 * Normalising is `toPayoutAccountInput`'s job instead, which runs once, on submit,
 * where the value is leaving.
 */
export const payoutAccountFormSchema = z
  .object({
    accountHolderName: z
      .string()
      .trim()
      .min(3, "Enter the account holder's name as the bank has it")
      .max(120, "That looks too long for an account name"),
    accountNumber: z
      .string()
      .trim()
      .refine(
        (value) => ACCOUNT_NUMBER.test(normaliseAccountNumber(value)),
        "An account number is 6 to 18 letters or digits",
      ),
    confirmAccountNumber: z.string().trim().min(1, "Type the account number again"),
    ifsc: z
      .string()
      .trim()
      .refine((value) => IFSC.test(value.toUpperCase()), "An IFSC looks like HDFC0001234"),
    accountType: payoutAccountTypeSchema,
  })
  .refine(
    (values) =>
      normaliseAccountNumber(values.accountNumber) ===
      normaliseAccountNumber(values.confirmAccountNumber),
    {
      // On the second field, because that is the one to correct: the first is where the
      // gym read the number off its passbook, and marking it would suggest it is the
      // wrong one.
      path: ["confirmAccountNumber"],
      message: "Both account numbers have to match",
    },
  );

export type PayoutAccountFormValues = z.infer<typeof payoutAccountFormSchema>;

/** The form's values as the endpoint wants them, normalised once on the way out. */
export function toPayoutAccountInput(values: PayoutAccountFormValues): PayoutAccountInput {
  return {
    accountHolderName: values.accountHolderName.trim(),
    accountNumber: normaliseAccountNumber(values.accountNumber),
    ifsc: values.ifsc.trim().toUpperCase(),
    accountType: values.accountType,
  };
}

/** What the endpoint may send about an account on file. */
export const payoutAccountSchema = z.object({
  accountHolderName: z.string().trim().min(1).max(200),
  // Exactly four. A longer value is a handler sending the whole number, which is a
  // response this app refuses to render rather than one it truncates for display.
  accountNumberLast4: z.string().regex(ACCOUNT_LAST4, "must be the last four characters only"),
  ifsc: z.string().regex(IFSC, "must be an 11-character IFSC"),
  bankName: z.string().trim().min(1).max(120).nullable(),
  accountType: payoutAccountTypeSchema,
  updatedAt: z.string().datetime(),
});

/**
 * Proof the schema and the type have not drifted. Same device as `portalSchema.ts` — a
 * field added to one and not the other fails `tsc`.
 */
export const _typeCheck = payoutAccountSchema satisfies z.ZodType<PayoutAccount>;

/**
 * The envelope, and why there is one.
 *
 * `{ account: null }` says "this gym has not given us one", which is an ordinary answer to
 * a successful request. A bare `404` would say the same thing indistinguishably from a
 * route that does not exist or a session the API did not recognise, and the difference
 * decides whether the card offers a form or an error.
 */
export const payoutAccountEnvelopeSchema = z.object({
  account: payoutAccountSchema.nullable(),
});

export type PayoutAccountParse =
  | { ok: true; account: PayoutAccount | null }
  | { ok: false; issues: string[] };

/**
 * Validate a payout-account response.
 *
 * A result rather than a throw, and `issues` are `path: message` strings for a log —
 * the card tells a gym its details could not be loaded and nothing about our field names.
 */
export function parsePayoutAccountResponse(value: unknown): PayoutAccountParse {
  const result = payoutAccountEnvelopeSchema.safeParse(value);
  if (result.success) return { ok: true, account: result.data.account };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
