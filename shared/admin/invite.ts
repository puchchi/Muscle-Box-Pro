/**
 * The invite form's contract: `POST /admin/gyms` (§2.7 of `mbp-backend`'s
 * `docs/gym-onboarding-api-design.md`), which creates a gym and mints its onboarding link in
 * one transaction — five items, all or nothing.
 *
 * ## Why this mirrors the server's validators rather than inventing lighter ones
 *
 * `domain/adminInput.ts` and `domain/details.ts` are the actual gate: they own the money
 * conversion, the deposit band, the GSTIN checksum, the device-number shape. Nothing here
 * replaces that — the server re-validates every field regardless, per the design's own rule
 * that *"a control written twice is a control that is weaker in one place."* What this schema
 * is for is turning a typo into a message on the input the admin is looking at instead of a
 * round trip: the ranges, the whole-rupee rule and the regexes below are copied from those two
 * files on purpose, so the two rarely disagree, and where they do the server's answer always
 * wins — this is a courtesy, not a security boundary (same posture as every wizard step).
 *
 * The one rule this does **not** copy is the GSTIN check-digit verification
 * (`gstinChecksumValid`). It is documented as a known gap: a wrong-but-well-shaped GSTIN
 * round-trips as a `fieldError` correctly, it is just an avoidable server call on the field
 * most likely to be mistyped. Fixing that means porting the checksum, not this form.
 *
 * ## Rupees in, whole rupees only
 *
 * Every amount here is typed `z.number().int()`, not "a number with two decimal places". That
 * is deliberate and matches the server exactly: `inrToPaise` converts a rupee figure to paise
 * and `isWholeRupees` then requires the *paise* figure be divisible by 100 — which is only ever
 * true when the rupee figure itself has no fractional part. So the honest client-side rule is
 * "whole rupees", not "up to two decimals", and validating anything looser would pass values
 * the server refuses.
 *
 * `earlyTerminationChargeInr` is the one amount that is nullable rather than merely optional:
 * null means "not agreed" and zero means "agreed at nil" (§36.1's standard term), and this form
 * asks for one explicitly rather than defaulting either way — see `AdminInviteTerms` below.
 */

import * as z from "zod";
import { gymDetailsSchema } from "../onboarding/schema";
import type { GymDetails, OnboardingTerms } from "../onboarding/types";

/** ₹10,00,00,000 — a digit-slip guard, not a policy limit. Matches `MAX_AMOUNT_INR` server-side. */
const MAX_AMOUNT_INR = 100_000_000;

/** A whole rupee amount, never negative, capped at the digit-slip guard. */
const wholeRupees = z
  .number({ invalid_type_error: "Enter an amount in whole rupees." })
  .int("Paise are not accepted here — whole rupees only.")
  .min(0, "Cannot be negative.")
  .max(MAX_AMOUNT_INR, `Must be at most ₹${MAX_AMOUNT_INR.toLocaleString("en-IN")}.`);

/** A whole-number field within an inclusive range, mirroring `whole()` in `domain/adminInput.ts`. */
function wholeNumber(min: number, max: number) {
  return z
    .number({ invalid_type_error: "Must be a whole number." })
    .int("Must be a whole number.")
    .min(min, `Must be at least ${min}.`)
    .max(max, `Must be at most ${max}.`);
}

/**
 * The commercial terms, in rupees — the same shape as `OnboardingTerms`, because that is
 * exactly what this creates: the row step 2 and the agreement both read from afterwards.
 *
 * No defaults, on purpose, and that is a decision this form keeps rather than works around. A
 * default deposit figure is the kind of value that ends up in a signed agreement because
 * nobody noticed the field was blank (`validateTermsInput`'s own docstring), and this form asks
 * for every field once, deliberately, per gym — not something the client should paper over
 * with a "typical terms" button.
 */
export const adminInviteTermsSchema = z.object({
  securityDepositInr: wholeRupees,
  termMonths: wholeNumber(1, 600),
  gymSharePctBeforeMilestone: wholeNumber(0, 100),
  gymSharePctAfterMilestone: wholeNumber(0, 100),
  milestoneCups: wholeNumber(0, 10_000_000),
  milestoneNetProfitInr: wholeRupees,
  advertisingGymSharePct: wholeNumber(0, 100),
  electricityInrPerBlock: wholeRupees,
  electricityCupsPerBlock: wholeNumber(1, 1_000_000),
  electricityReviewWindowMonths: wholeNumber(1, 120),
  settlementDaysAfterMonthEnd: wholeNumber(1, 90),
  // Nullable, not optional: the form always sends a decision, and null is a real one — see the
  // module comment. `.nullable()` alone, no `.optional()`, so a form that forgets to set the
  // field fails the schema rather than silently becoming "not agreed".
  earlyTerminationChargeInr: wholeRupees.nullable(),
});

export type AdminInviteTermsInput = z.infer<typeof adminInviteTermsSchema>;

/** `ISO_DATE` in `domain/adminInput.ts` — no time part, because this renders into Schedule A. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The machine being allocated. `deviceNo` is the join key to the payments service
 * (`gsi1-device`), which is why its shape is checked and not just its presence: a stray space
 * produces a machine row that no payment ever matches, and the symptom shows up months later
 * as a gym with no revenue.
 */
export const adminInviteMachineSchema = z.object({
  deviceNo: z
    .string()
    .trim()
    .min(1, "Required.")
    .max(64, "Must be at most 64 characters.")
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, digits, hyphen and underscore only."),
  model: z.string().trim().min(1, "Required.").max(120, "Must be at most 120 characters."),
  // Present-but-empty is allowed and means "not recorded" — same as the wizard's optional
  // fields — so this stays a plain string rather than `.nullable()`, and the empty string is
  // turned into `null` at the point of submission (see `toAdminInviteBody`).
  serialNumber: z.string().trim().max(120, "Must be at most 120 characters."),
  accessories: z.string().trim().max(2000, "Must be at most 2000 characters."),
  valueInr: wholeRupees,
  // A calendar date or blank — allocation time genuinely may not have an installation date yet
  // (§2.7). Format-checked only; the server's `isoDate` additionally rejects a shape-valid but
  // impossible date like `2026-02-31`, which is a smaller gap than the GSTIN checksum one and
  // documented for the same reason: it round-trips as a field error rather than silently
  // storing the wrong date.
  installationDate: z
    .string()
    .trim()
    .refine((v) => v === "" || ISO_DATE.test(v), "Must be a date as YYYY-MM-DD, or blank."),
});

export type AdminInviteMachineInput = z.infer<typeof adminInviteMachineSchema>;

/**
 * `invitedByName` — whose name the gym reads on the invite, not who is accountable for sending
 * it (`issuedByEmail`, which the server derives from the session and this form never sends).
 * Blank is a real choice: it means "default to my own name", exactly as
 * `validateInvitedByName` treats absent, `null` and blank alike.
 */
export const adminInviteFormSchema = z.object({
  details: gymDetailsSchema,
  terms: adminInviteTermsSchema,
  machine: adminInviteMachineSchema,
  invitedByName: z
    .string()
    .trim()
    .max(120, "Must be at most 120 characters.")
    .refine((v) => v === "" || v.length >= 2, "Must be at least 2 characters, or blank."),
});

export type AdminInviteFormInput = z.infer<typeof adminInviteFormSchema>;

/** What `POST /admin/gyms` actually wants on the wire — `null` machine fields, no blank strings. */
export type AdminInviteBody = {
  details: GymDetails;
  terms: OnboardingTerms;
  machine: {
    deviceNo: string;
    model: string;
    serialNumber: string | null;
    accessories: string;
    valueInr: number;
    installationDate: string | null;
  };
  invitedByName?: string;
};

/**
 * Form values → wire body.
 *
 * The two shapes differ only in how "not provided" is spelled: a form gives blank strings
 * because that is what an empty input is, and the server wants `null` (machine fields) or an
 * absent key (`invitedByName`) — the same distinction `validateInvitedByName`'s docstring
 * draws between "not provided" and "provided as empty". This is the one place that translates
 * between them, so the rule lives in one spot rather than in every call site.
 */
export function toAdminInviteBody(form: AdminInviteFormInput): AdminInviteBody {
  const body: AdminInviteBody = {
    details: form.details,
    terms: form.terms,
    machine: {
      deviceNo: form.machine.deviceNo,
      model: form.machine.model,
      serialNumber: form.machine.serialNumber.trim() === "" ? null : form.machine.serialNumber.trim(),
      accessories: form.machine.accessories,
      valueInr: form.machine.valueInr,
      installationDate: form.machine.installationDate.trim() === "" ? null : form.machine.installationDate.trim(),
    },
  };
  if (form.invitedByName.trim() !== "") body.invitedByName = form.invitedByName.trim();
  return body;
}

/** The response — what there is to hand the admin once the gym exists. */
export type AdminInviteResult = {
  gymId: string;
  slug: string;
  /**
   * The onboarding link, in full. **This is the one and only place it exists after this call
   * returns** — only `sha256(handle)` is stored, so losing this means minting a new one with
   * `POST …/invite`, not looking this one up again.
   */
  onboardingUrl: string;
  tokenId: string;
  expiresAt: string;
};
