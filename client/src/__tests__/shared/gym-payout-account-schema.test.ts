import { describe, it, expect } from "vitest";
import {
  PAYOUT_ACCOUNT_TYPE_LABELS,
  PAYOUT_ACCOUNT_TYPES,
  normaliseAccountNumber,
  parsePayoutAccountResponse,
  payoutAccountFormSchema,
  payoutAccountTypeSchema,
  toPayoutAccountInput,
  type PayoutAccountFormValues,
} from "@shared/gym/payoutAccountSchema";
import type { PayoutAccount } from "@shared/gym/payoutAccount";

/**
 * The two boundaries around the account we send a gym's money to.
 *
 * Written from the direction of harm in both directions, and the harms are opposites.
 * Outbound, a rule that is too strict stops a real gym being paid at all — so the tests
 * that matter most are the ones asserting that unusual but genuine input is *accepted*.
 * Inbound, a rule that is too loose puts a full bank credential in a browser: the
 * `accountNumberLast4` case below is the whole reason the response schema exists.
 */

function validForm(overrides: Partial<PayoutAccountFormValues> = {}): PayoutAccountFormValues {
  return {
    accountHolderName: "Iron Temple Fitness Pvt Ltd",
    accountNumber: "50100234564417",
    confirmAccountNumber: "50100234564417",
    ifsc: "HDFC0001234",
    accountType: "current",
    ...overrides,
  };
}

function validAccount(overrides: Partial<PayoutAccount> = {}): PayoutAccount {
  return {
    accountHolderName: "Iron Temple Fitness Pvt Ltd",
    accountNumberLast4: "4417",
    ifsc: "HDFC0001234",
    bankName: "HDFC Bank",
    accountType: "current",
    updatedAt: "2026-04-29T10:05:00.000Z",
    ...overrides,
  };
}

/** The messages a gym reads, keyed by field, so a test can name one. */
function formErrors(values: PayoutAccountFormValues): Record<string, string> {
  const result = payoutAccountFormSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("payoutAccountFormSchema", () => {
  it("accepts an ordinary account", () => {
    expect(payoutAccountFormSchema.safeParse(validForm()).success).toBe(true);
  });

  it("accepts the account numbers Indian banks actually issue", () => {
    // Nine digits at a co-operative bank, sixteen at a private one, and letters because a
    // handful of banks do issue them. A length table per bank would have rejected at least
    // one of these, and a rejected gym is a gym that cannot be paid.
    for (const accountNumber of ["001234567", "0011010012345678", "SB0012345678"]) {
      expect(
        formErrors(validForm({ accountNumber, confirmAccountNumber: accountNumber })),
      ).toEqual({});
    }
  });

  it("reads a passbook number with its spaces and hyphens as the same number", () => {
    // How it is printed, and typing it back without the separators is not something to ask
    // of someone copying fourteen digits off a page.
    expect(normaliseAccountNumber("5010 0234-56 4417")).toBe("50100234564417");
    const values = validForm({
      accountNumber: "5010 0234 5644 17",
      confirmAccountNumber: "50100234-564417",
    });
    expect(formErrors(values)).toEqual({});
    // And separated differently in the two boxes is still a match, since neither is part
    // of the number.
    expect(toPayoutAccountInput(values).accountNumber).toBe("50100234564417");
  });

  it("rejects an account number that is too short or has punctuation in it", () => {
    expect(formErrors(validForm({ accountNumber: "12345", confirmAccountNumber: "12345" })))
      .toHaveProperty("accountNumber");
    expect(
      formErrors(validForm({ accountNumber: "5010/234564", confirmAccountNumber: "5010/234564" })),
    ).toHaveProperty("accountNumber");
    expect(
      formErrors(
        validForm({ accountNumber: "1".repeat(19), confirmAccountNumber: "1".repeat(19) }),
      ),
    ).toHaveProperty("accountNumber");
  });

  /**
   * The check that catches a real typo. No format rule can: a mistyped digit in a
   * fourteen-digit number is still a well-formed fourteen-digit number, and the money goes
   * to whoever holds it.
   */
  it("marks the confirmation, not the original, when the two do not match", () => {
    const errors = formErrors(
      validForm({ accountNumber: "50100234564417", confirmAccountNumber: "50100234564418" }),
    );
    expect(errors.confirmAccountNumber).toMatch(/have to match/i);
    expect(errors).not.toHaveProperty("accountNumber");
  });

  it("insists on the RBI zero in the fifth position of an IFSC", () => {
    // What makes checking an IFSC worth doing at all: it is the difference between an IFSC
    // and the MICR or SWIFT code printed beside it on the same cheque.
    expect(formErrors(validForm({ ifsc: "HDFC1001234" }))).toHaveProperty("ifsc");
    expect(formErrors(validForm({ ifsc: "HDFC000123" }))).toHaveProperty("ifsc");
    expect(formErrors(validForm({ ifsc: "hdfc0001234" }))).toEqual({});
  });

  it("does not fail a name that arrives with the spacing of a form field", () => {
    expect(formErrors(validForm({ accountHolderName: "  Iron Temple Fitness  " }))).toEqual({});
    expect(formErrors(validForm({ accountHolderName: "Jo" }))).toHaveProperty(
      "accountHolderName",
    );
  });
});

describe("toPayoutAccountInput", () => {
  it("normalises once, on the way out", () => {
    // The IFSC uppercased and the account number stripped, so the handler is never the
    // place that has to guess whether "hdfc0001234" and "HDFC0001234" are one branch.
    expect(
      toPayoutAccountInput(
        validForm({
          accountHolderName: "  Iron Temple Fitness Pvt Ltd ",
          accountNumber: " 5010 0234-564417 ",
          ifsc: " hdfc0001234 ",
        }),
      ),
    ).toEqual({
      accountHolderName: "Iron Temple Fitness Pvt Ltd",
      accountNumber: "50100234564417",
      ifsc: "HDFC0001234",
      accountType: "current",
    });
  });

  it("leaves the case of an alphanumeric account number alone", () => {
    // Uppercasing here would be a guess about a field where being wrong loses money.
    expect(toPayoutAccountInput(validForm({ accountNumber: "sb0012345678" })).accountNumber).toBe(
      "sb0012345678",
    );
  });

  it("does not put the confirmation on the wire", () => {
    expect(toPayoutAccountInput(validForm())).not.toHaveProperty("confirmAccountNumber");
  });
});

describe("parsePayoutAccountResponse", () => {
  it("reads an account on file", () => {
    const result = parsePayoutAccountResponse({ account: validAccount() });
    expect(result).toEqual({ ok: true, account: validAccount() });
  });

  it("treats no account as an answer rather than a failure", () => {
    // The difference between offering a form and showing an error, which is why the
    // response is an envelope and not a bare 404.
    expect(parsePayoutAccountResponse({ account: null })).toEqual({ ok: true, account: null });
  });

  /**
   * The reason this schema exists.
   *
   * A handler that sends the whole number is a handler putting a bank credential into a
   * browser's memory, its cache and any error reporter watching. Rendering "••••4564417"
   * from it would hide the leak on screen while leaving it in the response.
   */
  it("refuses a response carrying more of the account number than four characters", () => {
    const result = parsePayoutAccountResponse({
      account: validAccount({ accountNumberLast4: "50100234564417" }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toMatch(/accountNumberLast4/);
  });

  it("refuses an IFSC or a timestamp it cannot render", () => {
    expect(parsePayoutAccountResponse({ account: validAccount({ ifsc: "HDFC1001234" })}).ok).toBe(
      false,
    );
    // `formatIstDate` would print the string back verbatim, so a gym would read
    // "Updated 29-04-2026" in a sentence written for a date.
    expect(parsePayoutAccountResponse({ account: validAccount({ updatedAt: "29-04-2026" }) }).ok)
      .toBe(false);
  });

  it("accepts an account whose bank we could not name", () => {
    // The IFSC lookup is the server's and it misses. A card without a bank name is worth
    // more than an error over a cosmetic field.
    const result = parsePayoutAccountResponse({ account: validAccount({ bankName: null }) });
    expect(result.ok).toBe(true);
  });

  it("fails a missing envelope rather than reading it as no account", () => {
    // `{}` from a half-written handler must not render as "no account on file", which would
    // invite a gym to re-enter details it has already given us.
    expect(parsePayoutAccountResponse({}).ok).toBe(false);
    expect(parsePayoutAccountResponse(null).ok).toBe(false);
  });

  it("names the field in its issues, for a log and not for a gym", () => {
    // Spread rather than an override, because `loan` is not a `PayoutAccountType` and the
    // point of the case is a value the type system would never have let through.
    const result = parsePayoutAccountResponse({
      account: { ...validAccount(), accountType: "loan" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toMatch(/^account\.accountType: /);
  });
});

describe("the two account types", () => {
  it("has a label for each", () => {
    expect(PAYOUT_ACCOUNT_TYPE_LABELS).toEqual({ current: "Current", savings: "Savings" });
  });

  it("offers both, current first, whatever order the enum is written in", () => {
    // The form starts on the first of these. If it ever tracked the enum's order instead,
    // which account type a gym is offered by default would change with an unrelated edit.
    expect(PAYOUT_ACCOUNT_TYPES).toEqual(["current", "savings"]);
    expect([...PAYOUT_ACCOUNT_TYPES].sort()).toEqual([...payoutAccountTypeSchema.options].sort());
  });
});
