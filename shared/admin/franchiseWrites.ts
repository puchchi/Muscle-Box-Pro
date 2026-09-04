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
 * These schemas were written before the handlers were, and the handlers were then written to them.
 * Two places where the two deliberately disagree, and in both the form is the stricter one, so the
 * admin is told before a round trip rather than after: `internalReason` is capped at 500 here and at
 * 4000 by `validateApprovalDecision`, and `receivedInr` is whole rupees here while the wire carries
 * paise. `MIN_FRANCHISE_REASON` matches on both sides, and so does every field name.
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
import type { FranchiseOnboardingStatus, FranchiseTerms } from "../franchise/onboarding/types";
import { MACHINE_ALLOCATION, MAX_INVESTMENT_INR } from "./franchiseInvite";
import type {
  AdminFranchiseApprovalBody,
  AdminFranchisePaymentRefuseBody,
  AdminFranchisePaymentVerifyBody,
  AdminFranchiseTermsPatchBody,
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
 * A revenue or advertising split, as a whole percent.
 *
 * Whole percent for the reason the amounts are whole rupees: this figure is rendered onto a signed
 * document that somebody has to compute a payment from. Zero is a real answer on all four fields it
 * is used for, and 100 is a real answer on the two advertising ones.
 */
const sharePct = z
  .number({ invalid_type_error: "Enter a percentage." })
  .int("Whole percent only.")
  .min(0, "Cannot be negative.")
  .max(100, "At most 100%.");

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
    // Twenty rather than three, matching `validateTerritoryGrant`: this is the text an exclusivity dispute
    // is read against, and "Pune" is not something that can be argued from. Enforced here as well as there
    // so the admin sees it before a round trip.
    .min(20, "Describe the boundary in a sentence. It is what an exclusivity dispute is read against.")
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
    )
    // Per line, not in total: the route caps each item at 300 and 2000 characters on one line would pass
    // the length check above and come back as a field error on a textarea the admin has already left.
    .refine(
      (value) => splitOutstanding(value).every((item) => item.length <= 300),
      "One of those lines is too long (at most 300 characters each).",
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

// ── PATCH /admin/franchises/{id}/terms ──────────────────────────────────────

/**
 * The route's own bounds, restated. Both are typo guards; the schedule's floor is not.
 *
 * A zero-stage schedule is not "no instalments agreed" — it is an empty array the term sheet would
 * render as a table with no rows while the server reported the row complete. Clearing is spelled
 * `paymentSchedule: null`, which is a state the design has and this form offers as its own choice.
 */
export const FRANCHISE_PAYMENT_STAGES = { min: 1, max: 12 } as const;
export const MAX_STAGE_TRIGGER = 200;

/**
 * The editable commercials, in rupees, with the tier deliberately missing.
 *
 * `adminTermsFormSchema`'s two rules both hold. Every field is required on the form even though the
 * route patches, because the form is prefilled from the franchise's current terms and submits only
 * what moved (`franchiseTermsDiff`) — so a blank means the admin cleared a figure rather than left
 * it alone. And the money is whole rupees, because the term sheet prints rupees.
 *
 * ## The tier is not here, and its absence is enforced by the server
 *
 * §3 finalises the tier together with the territory and records the grant on the `TERRITORY` row.
 * The route answers a **field error** for a body carrying `tier` rather than dropping it, which is
 * the right call and the reason this form has no such input: an admin who saw a tier select, changed
 * it and got a 200 would read that as the tier having changed.
 *
 * ## Two fields have a third state, and it is not zero
 *
 * `capitalRecoveryPaise` and `paymentSchedule` are the two the server lets you clear, because they
 * are the two that gate issuance. `earlyTerminationChargeInr`'s argument applies to the first
 * exactly: null means "agreement-specific, not yet agreed" and zero means "recovered from the
 * first rupee", and a blank printing as ₹0 on a term sheet is how a placeholder becomes a term
 * nobody chose. So `null` is a choice on this form rather than an empty box.
 */
export const adminFranchiseTermsFormSchema = z.object({
  /** Rupees. `franchiseInvite.ts`'s convention: nobody types 125000000. */
  investmentInr: z
    .number({ invalid_type_error: "The investment is required." })
    .int("Whole rupees only.")
    .positive("Must be more than zero.")
    .max(MAX_INVESTMENT_INR, `At most ₹${MAX_INVESTMENT_INR.toLocaleString("en-IN")}.`),
  machineAllocation: z
    .number({ invalid_type_error: "The machine count is required." })
    .int("A whole number of machines.")
    .min(MACHINE_ALLOCATION.min, "A franchise with no machines is not a franchise.")
    .max(MACHINE_ALLOCATION.max, `At most ${MACHINE_ALLOCATION.max}.`),
  /** Null clears it, which makes the franchise unissuable on purpose. See the docstring. */
  capitalRecoveryInr: z
    .number({ invalid_type_error: "Enter an amount, or choose 'not agreed'." })
    .int("Whole rupees only.")
    .min(0, "Cannot be negative.")
    .max(MAX_INVESTMENT_INR, `At most ₹${MAX_INVESTMENT_INR.toLocaleString("en-IN")}.`)
    .nullable(),
  proteinSharePctDuringRecovery: sharePct,
  proteinSharePctAfterRecovery: sharePct,
  advertisingFranchiseeSharePct: sharePct,
  advertisingMbpSharePct: sharePct,
  /**
   * The stages, or null for "no schedule agreed".
   *
   * The 100% check is on the array rather than per row, and it is not tidiness: §6 states the
   * schedule as percentages of the investment precisely so that editing the investment cannot leave
   * a stale instalment behind. A schedule summing to 90 is therefore not a discount somebody agreed,
   * it is a tenth of the consideration no instalment will ever ask for.
   */
  paymentSchedule: z
    .array(
      z.object({
        pct: z
          .number({ invalid_type_error: "Enter a percentage." })
          .int("Whole percent only.")
          .min(1, "At least 1%.")
          .max(100, "At most 100%."),
        trigger: z
          .string()
          .trim()
          .min(1, "Say what triggers this instalment.")
          .max(MAX_STAGE_TRIGGER, `At most ${MAX_STAGE_TRIGGER} characters.`),
      }),
    )
    .min(
      FRANCHISE_PAYMENT_STAGES.min,
      "Remove the schedule entirely rather than leaving it empty. An empty list is not a schedule with no instalments.",
    )
    .max(FRANCHISE_PAYMENT_STAGES.max, `At most ${FRANCHISE_PAYMENT_STAGES.max} stages.`)
    .refine(
      (stages) => stages.reduce((sum, stage) => sum + stage.pct, 0) === 100,
      (stages) => ({
        message: `The stages add up to ${stages.reduce((sum, stage) => sum + stage.pct, 0)}%. They must add up to 100%.`,
      }),
    )
    .nullable(),
});

export type AdminFranchiseTermsForm = z.output<typeof adminFranchiseTermsFormSchema>;
export type AdminFranchiseTermsFormInput = z.input<typeof adminFranchiseTermsFormSchema>;

/** The form's values for a franchise as it stands, in rupees. */
export function franchiseTermsFormValues(terms: FranchiseTerms): AdminFranchiseTermsForm {
  return {
    investmentInr: terms.investmentPaise / 100,
    machineAllocation: terms.machineAllocation,
    capitalRecoveryInr:
      terms.capitalRecoveryPaise === null ? null : terms.capitalRecoveryPaise / 100,
    proteinSharePctDuringRecovery: terms.proteinSharePctDuringRecovery,
    proteinSharePctAfterRecovery: terms.proteinSharePctAfterRecovery,
    advertisingFranchiseeSharePct: terms.advertisingFranchiseeSharePct,
    advertisingMbpSharePct: terms.advertisingMbpSharePct,
    // Copied, not aliased. The form mutates rows through `useFieldArray`, and a shared reference
    // would let the "before" snapshot the diff is taken against change underneath it — so every
    // edit would compare equal and `franchiseTermsDiff` would answer "nothing changed".
    paymentSchedule:
      terms.paymentSchedule === null
        ? null
        : terms.paymentSchedule.map((stage) => ({ pct: stage.pct, trigger: stage.trigger })),
  };
}

/**
 * Only what changed, or null if nothing did, converted to the wire's paise.
 *
 * `termsDiff`'s contract exactly, including the null: the server refuses an empty patch, and that
 * refusal reaching an admin who pressed Save on an untouched form reads as a rejection of their
 * edit rather than as there being no edit.
 *
 * The schedule needs a deep compare rather than `!==`, which is the whole reason this is not a copy
 * of `termsDiff`. It is an array of objects rebuilt on every render by `useFieldArray`, so a
 * reference check reports every save as a schedule change — and a schedule sent unchanged is the
 * write that re-pins the term sheet and sends the franchisee back to re-read it for nothing.
 */
export function franchiseTermsDiff(
  before: AdminFranchiseTermsForm,
  after: AdminFranchiseTermsForm,
): AdminFranchiseTermsPatchBody | null {
  const patch: AdminFranchiseTermsPatchBody = {};

  if (after.investmentInr !== before.investmentInr) patch.investmentPaise = after.investmentInr * 100;
  if (after.machineAllocation !== before.machineAllocation) {
    patch.machineAllocation = after.machineAllocation;
  }
  if (after.capitalRecoveryInr !== before.capitalRecoveryInr) {
    patch.capitalRecoveryPaise =
      after.capitalRecoveryInr === null ? null : after.capitalRecoveryInr * 100;
  }
  for (const key of [
    "proteinSharePctDuringRecovery",
    "proteinSharePctAfterRecovery",
    "advertisingFranchiseeSharePct",
    "advertisingMbpSharePct",
  ] as const) {
    if (after[key] !== before[key]) patch[key] = after[key];
  }
  if (!sameSchedule(before.paymentSchedule, after.paymentSchedule)) {
    patch.paymentSchedule = after.paymentSchedule;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

function sameSchedule(
  before: AdminFranchiseTermsForm["paymentSchedule"],
  after: AdminFranchiseTermsForm["paymentSchedule"],
): boolean {
  if (before === null || after === null) return before === after;
  if (before.length !== after.length) return false;
  // Order is part of the schedule: stage 1 is the booking amount and stage 3 is on delivery, so two
  // schedules with the same rows in a different order are different schedules.
  return before.every(
    (stage, i) => stage.pct === after[i].pct && stage.trigger === after[i].trigger,
  );
}

/**
 * Where a server field error lands on this form.
 *
 * Two renames and one reshape. The route addresses per-stage errors as `paymentSchedule[1].pct`
 * while react-hook-form addresses the same input as `paymentSchedule.1.pct`, so those are rewritten
 * by `franchiseTermsFieldPath` rather than mapped here — a `Record` cannot enumerate an index.
 */
export const TERMS_FIELD_FOR_WIRE: Record<string, keyof AdminFranchiseTermsForm> = {
  investmentPaise: "investmentInr",
  capitalRecoveryPaise: "capitalRecoveryInr",
};

/**
 * A server field key as a path this form can `setError` on, or null if it names nothing here.
 *
 * Null rather than a guess, so an unmapped key is shown in the banner instead of being attached to
 * whichever input sorts first. `tier` is the key this exists to reject: the route answers a field
 * error for it, and there is no tier input on this form to hang it on.
 */
export function franchiseTermsFieldPath(wireKey: string): string | null {
  const renamed = TERMS_FIELD_FOR_WIRE[wireKey];
  if (renamed) return renamed;
  const stage = /^paymentSchedule\[(\d+)\]\.(pct|trigger)$/.exec(wireKey);
  if (stage) return `paymentSchedule.${stage[1]}.${stage[2]}`;
  if (wireKey === "paymentSchedule") return "paymentSchedule";
  return wireKey in FRANCHISE_TERMS_FIELDS ? wireKey : null;
}

/** The form's own keys, as a value, so `franchiseTermsFieldPath` can test membership. */
const FRANCHISE_TERMS_FIELDS: Record<keyof AdminFranchiseTermsForm, true> = {
  investmentInr: true,
  machineAllocation: true,
  capitalRecoveryInr: true,
  proteinSharePctDuringRecovery: true,
  proteinSharePctAfterRecovery: true,
  advertisingFranchiseeSharePct: true,
  advertisingMbpSharePct: true,
  paymentSchedule: true,
};

// ── POST and DELETE /admin/franchises/{id}/invite ────────────────────────────

/**
 * A resend, which mints a new link and kills the old one in the same transaction.
 *
 * Both fields are optional in effect and both defaults are the safe ones. `invitedByName` blank
 * means **inherit the name from the token being superseded**, which the server does rather than
 * falling back to the logged-in admin — the name is the franchisee's named contact through a
 * months-long onboarding, so a colleague clicking resend must not silently become that contact.
 * `sendInvite` defaults to true, because a resend nobody receives is not a resend.
 */
export const adminFranchiseResendFormSchema = z.object({
  /** `""` means inherit. See the docstring; the server resolves it, not this form. */
  invitedByName: z.string().trim().max(120, "At most 120 characters."),
  sendInvite: z.boolean(),
});

export type AdminFranchiseResendForm = z.output<typeof adminFranchiseResendFormSchema>;

/** The wire body. `invitedByName` is omitted rather than sent empty, because `""` is not a name. */
export function toAdminFranchiseResendBody(form: AdminFranchiseResendForm): {
  invitedByName?: string;
  sendInvite: boolean;
} {
  return {
    ...(form.invitedByName === "" ? {} : { invitedByName: form.invitedByName }),
    sendInvite: form.sendInvite,
  };
}
