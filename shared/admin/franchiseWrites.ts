/**
 * The four franchise write forms: a decision with three outcomes, and an instalment with two.
 *
 * `shared/admin/writes.ts` for the franchise half of the panel, and its division of labour holds
 * unchanged — **this side refuses what is obviously malformed, the server decides everything that
 * depends on state it holds.** None of these schemas knows whether KYC has landed, whether a
 * decision has already been made, or whether an instalment has been claimed. All three are
 * `ConditionCheck`s on a stored row, and guessing at them here would produce a form that refuses
 * something the server would have allowed.
 *
 * One difference from the gym's writes, and it is the whole reason this file is separate rather than
 * three more exports there: **two of these routes do not exist yet.** `POST …/approval` and
 * `POST …/payments/{n}/verify` have no handler (docs/franchise-onboarding.md §8.1), so what is
 * written below is not a copy of a validator — it is the first statement of what these routes will
 * accept, and `franchisesMock.ts` was written against it.
 *
 * ## The granted territory is not prefilled from the proposal
 *
 * `AdminFranchiseApprovalBody` says why, and the form obeys it: §3's case is granting three suburbs
 * of five, and a field that arrives holding what was asked for is a grant nobody made the moment
 * somebody clicks straight past it. The screen offers an explicit copy instead, which is a decision
 * rather than a default.
 *
 * ## Rupees on the form, paise on the wire
 *
 * `franchiseInvite.ts`'s convention, for the same reason: nobody types 124988200. Whole rupees
 * only. A transfer that lands with paise on it cannot be recorded exactly here, and if that ever
 * happens this field needs a decimal step rather than a rounded entry.
 */

import * as z from "zod";
import { FRANCHISE_TIERS, type FranchiseTierId } from "../franchise/program";
import type { FranchiseOnboardingStatus } from "../franchise/onboarding/types";
import type {
  AdminFranchiseApprovalBody,
  AdminFranchisePaymentRefuseBody,
  AdminFranchisePaymentVerifyBody,
} from "./franchises";

/**
 * The two statuses a decision may be recorded against, and the two `?queue=review` answers with.
 *
 * One list because it is one fact: a franchise at `kyc_submitted` has done everything it can and is
 * waiting on us, which is the same operational state as `under_review`. The sparse index the list
 * handler reads is built on exactly this pair, and the approval route's precondition is the same
 * pair. The server still enforces it — this is what lets the panel avoid offering a button whose
 * only possible answer is a 409.
 */
export const FRANCHISE_REVIEW_STATUSES: readonly FranchiseOnboardingStatus[] = [
  "kyc_submitted",
  "under_review",
];

/** `MIN_REASON_LENGTH` / `MAX_REASON_LENGTH` in `writes.ts`, restated so the two files stay apart. */
export const MIN_FRANCHISE_REASON = 10;
export const MAX_FRANCHISE_REASON = 500;

/** At most this many lines in a hold. Longer than this is a phone call, not a checklist. */
export const MAX_OUTSTANDING_ITEMS = 10;

const tierIds = FRANCHISE_TIERS.map((t) => t.id) as [FranchiseTierId, ...FranchiseTierId[]];

/**
 * An internal note, required on all three outcomes.
 *
 * Including approvals, which is the one that looks like ceremony and is not: the approval note is
 * what the next person reads when a franchisee asks why their territory came back smaller than they
 * proposed. `internalReason` is never shown to the franchisee on any outcome.
 */
const internalReason = z
  .string()
  .trim()
  .min(MIN_FRANCHISE_REASON, `At least ${MIN_FRANCHISE_REASON} characters. This is our record.`)
  .max(MAX_FRANCHISE_REASON, `At most ${MAX_FRANCHISE_REASON} characters.`);

// ── POST /admin/franchises/{id}/approval ────────────────────────────────────

export const adminFranchiseApproveFormSchema = z.object({
  grantedTerritory: z
    .string()
    .trim()
    .min(3, "Name the territory being granted. It is what the term sheet renders.")
    .max(300, "At most 300 characters."),
  grantedBoundary: z
    .string()
    .trim()
    .min(3, "Describe the boundary. It goes into the term sheet as written.")
    .max(2000, "At most 2000 characters."),
  /** Empty is a real answer: nothing is carved out. */
  grantedExclusions: z.string().trim().max(2000, "At most 2000 characters."),
  /** `""` keeps the tier the franchisee proposed, which is the ordinary case. */
  grantedTier: z.union([z.enum(tierIds), z.literal("")]),
  internalReason,
});

export const adminFranchiseHoldFormSchema = z.object({
  /**
   * One outstanding item per line.
   *
   * A textarea rather than a `useFieldArray`, unlike the settlement's deduction lines, because
   * these are sentences with no fields of their own and the natural way to write four of them is
   * four lines. `toAdminFranchiseHoldBody` does the splitting.
   */
  outstanding: z
    .string()
    .trim()
    .min(3, "Say what is outstanding. The franchisee is shown this list verbatim.")
    .max(2000, "At most 2000 characters.")
    .refine(
      (value) => splitOutstanding(value).length <= MAX_OUTSTANDING_ITEMS,
      `At most ${MAX_OUTSTANDING_ITEMS} items. More than that is a call rather than a list.`,
    ),
  contactName: z
    .string()
    .trim()
    .min(2, "Name who is in touch, so their screen is not a dead end.")
    .max(120, "At most 120 characters."),
  internalReason,
});

export const adminFranchiseDeclineFormSchema = z.object({ internalReason });

export type AdminFranchiseApproveForm = z.output<typeof adminFranchiseApproveFormSchema>;
export type AdminFranchiseHoldForm = z.output<typeof adminFranchiseHoldFormSchema>;
export type AdminFranchiseDeclineForm = z.output<typeof adminFranchiseDeclineFormSchema>;

/** Blank lines and stray bullet characters dropped, so a pasted list does not arrive as `- PAN card`. */
export function splitOutstanding(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function toAdminFranchiseApproveBody(
  form: AdminFranchiseApproveForm,
): AdminFranchiseApprovalBody {
  return {
    outcome: "approved",
    grantedTerritory: form.grantedTerritory,
    grantedBoundary: form.grantedBoundary,
    grantedExclusions: form.grantedExclusions,
    grantedTier: form.grantedTier === "" ? null : form.grantedTier,
    internalReason: form.internalReason,
  };
}

export function toAdminFranchiseHoldBody(form: AdminFranchiseHoldForm): AdminFranchiseApprovalBody {
  return {
    outcome: "on_hold",
    outstanding: splitOutstanding(form.outstanding),
    contactName: form.contactName,
    internalReason: form.internalReason,
  };
}

export function toAdminFranchiseDeclineBody(
  form: AdminFranchiseDeclineForm,
): AdminFranchiseApprovalBody {
  return { outcome: "declined", internalReason: form.internalReason };
}

// ── POST /admin/franchises/{id}/payments/{n}/verify and /refuse ─────────────

/** The ceiling from `franchiseInvite.ts`, in rupees. A digit-slip guard. */
const MAX_RECEIVED_INR = 100_000_000;

export const adminFranchiseVerifyFormSchema = z.object({
  /**
   * What arrived, not what was expected.
   *
   * Prefilled with the expected figure by the screen, because the two agree in most cases and the
   * one that matters is the admin changing it. A shortfall is ordinary: a ₹12,50,000 RTGS routinely
   * lands a few hundred rupees short because the sending bank deducted charges (§7.3).
   */
  receivedInr: z
    .number({ invalid_type_error: "Enter the amount that arrived." })
    .int("Whole rupees only.")
    .positive("Must be more than zero.")
    .max(MAX_RECEIVED_INR, "Larger than any instalment should be. Check the digits."),
});

export const adminFranchiseRefuseFormSchema = z.object({
  /** The one reason on this surface the franchisee reads. See `AdminFranchisePaymentRefuseBody`. */
  reason: z
    .string()
    .trim()
    .min(
      MIN_FRANCHISE_REASON,
      "The franchisee is shown this, so it has to say what was wrong with the claim.",
    )
    .max(MAX_FRANCHISE_REASON, `At most ${MAX_FRANCHISE_REASON} characters.`),
});

export type AdminFranchiseVerifyForm = z.output<typeof adminFranchiseVerifyFormSchema>;
export type AdminFranchiseRefuseForm = z.output<typeof adminFranchiseRefuseFormSchema>;

export function toAdminFranchiseVerifyBody(
  form: AdminFranchiseVerifyForm,
): AdminFranchisePaymentVerifyBody {
  return { receivedPaise: form.receivedInr * 100 };
}

export function toAdminFranchiseRefuseBody(
  form: AdminFranchiseRefuseForm,
): AdminFranchisePaymentRefuseBody {
  return { reason: form.reason };
}

/** `investmentPaise`'s problem again: the wire names a field the form does not have. */
export const VERIFY_FIELD_FOR_WIRE: Record<string, keyof AdminFranchiseVerifyForm> = {
  receivedPaise: "receivedInr",
};
