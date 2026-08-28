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
 * ## Seven fields the gym fills in, not the admin — added 2026-08-23
 *
 * `legalEntityName`, `entityType`, `gstin`, `registeredAddress`, `installationAddress`,
 * `signatoryName` and `signatoryDesignation` used to be required here, and then required again
 * at step 1 when the gym submitted its own details — the admin's copy was retyped labour that
 * never became the row of record. `domain/details.ts`'s `validateInviteDetails` is the server
 * side of this: those seven are blank-tolerant on `POST /admin/gyms` specifically, while the
 * gym's own step-1 submission (`onboardingDetails.ts`) still calls the original, fully strict
 * `validateDetails` — nothing about what ends up on the agreement got looser, only what an
 * admin has to type before the gym exists.
 *
 * `fssaiLicenceNumber` is not on this form at all, for the same reason: it was already optional
 * server-side, so there was nothing an admin was usefully entering.
 *
 * `tradeName`, `noticesEmail` and `noticesPhone` stay required — nothing after invite time
 * supplies them. `tradeName` feeds `slugify()` at the moment the gym is created, and the
 * notices pair has to be reachable from the moment the invite exists (§41), not from the moment
 * the gym finishes onboarding.
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
 *
 * ## Terms default to `PARTNERSHIP`, and that is not the preset button we ruled out
 *
 * The invite form's default *values* for every commercial figure are `shared/partnership/summary.ts`'s
 * standard terms — that file's own docstring names this as its second consumer: *"the defaults
 * used when admin creates a gym's `gym_terms` row."* This is not the "typical terms" shortcut
 * that was deliberately left out earlier: there is no button, nothing is hidden, and every
 * figure is visible and editable the moment the form renders. What was ruled out was a
 * *reachable* default that only appears if pressed, which hides the same value behind an extra
 * click and makes it easier to apply without looking. A number already sitting in the field an
 * admin is about to look at is the opposite of that.
 */

import * as z from "zod";
import { entityTypeSchema } from "../onboarding/schema";
import type { EntityType, GymDetails, OnboardingTerms } from "../onboarding/types";

/** ₹10,00,00,000 — a digit-slip guard, not a policy limit. Matches `MAX_AMOUNT_INR` server-side. */
const MAX_AMOUNT_INR = 100_000_000;

/** A whole rupee amount, never negative, capped at the digit-slip guard. */
const wholeRupees = z
  .number({ invalid_type_error: "Enter an amount in whole rupees." })
  .int("Paise are not accepted here. Whole rupees only.")
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

/** `GSTIN` in `domain/details.ts` — shape only, not the check-digit. See the module docstring. */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** `PHONE` in `domain/details.ts`. Deliberately permissive on separators. */
const PHONE_RE = /^(\+?91[-\s]?)?[0-9][0-9\s-]{8,14}$/;

/**
 * A field that may be left for the gym to fill in later.
 *
 * Blank is accepted outright — not a shorter minimum, an actual bypass of the length check —
 * because "not yet provided" and "too short to be real" are different failures and only one of
 * them is this form's business. `validateInviteDetails` draws the same line: present-and-
 * malformed is still refused, because typing something wrong is not the same as leaving it.
 */
function deferrableText(min: number, max: number) {
  return z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (v.length >= min && v.length <= max),
      `Leave blank for the gym to fill in, or enter ${min}–${max} characters.`,
    );
}

/**
 * `entityType`, deferrable. A native `<select>` needs a real option value for "not chosen yet"
 * — `""` — which is why this is a union with the enum rather than `.optional()`: an `undefined`
 * would fight the controlled `<select>`'s own value prop the way it does everywhere else in
 * this codebase's forms.
 */
export const adminInviteEntityTypeSchema = z.union([entityTypeSchema, z.literal("")]);

/**
 * The seven fields the gym fills in at step 1, plus the three that stay required — see the
 * module docstring's *"Seven fields the gym fills in, not the admin"* section for which is
 * which and why. No `fssaiLicenceNumber`: it was already optional server-side, so there was
 * nothing here for an admin to usefully enter.
 */
export const adminInviteDetailsSchema = z.object({
  legalEntityName: deferrableText(3, 200),
  entityType: adminInviteEntityTypeSchema,
  tradeName: z.string().trim().min(2, "Required.").max(200, "Must be at most 200 characters."),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || GSTIN_RE.test(v), "Leave blank, or enter a valid 15-character GSTIN."),
  registeredAddress: deferrableText(10, 400),
  installationAddress: deferrableText(10, 400),
  signatoryName: deferrableText(2, 120),
  signatoryDesignation: deferrableText(2, 120),
  noticesEmail: z.string().trim().email("A valid email is required for formal notices."),
  noticesPhone: z.string().trim().regex(PHONE_RE, "A valid phone number is required."),
});

export type AdminInviteDetailsInput = z.infer<typeof adminInviteDetailsSchema>;

/**
 * The commercial terms, in rupees — the same shape as `OnboardingTerms`, because that is
 * exactly what this creates: the row step 2 and the agreement both read from afterwards.
 *
 * The schema itself has no defaults and no field is optional — the standard figures live in
 * `AdminInviteGym.tsx`'s initial form state, not here, so that `adminInviteFormSchema.safeParse`
 * always answers "every commercial figure this gym has, right now" and never silently accepts
 * an admin who cleared a field. See the module docstring's *"Terms default to `PARTNERSHIP`"*
 * section for why prefilling the value is not the preset button that was ruled out.
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

/**
 * The machine being costed at invite time — model and value only.
 *
 * `deviceNo`, `serialNumber`, `accessories` and `installationDate` are gone from this form
 * entirely as of 2026-08-23, for the same reason as the seven `GymDetails` fields above: the
 * physical unit and its logistics are usually undecided when a gym is invited, while the model
 * and its book value are not — they are the same for nearly every gym, and Schedule A needs a
 * real description of *something* immediately, which is what `model`/`valueInr` still provide.
 *
 * `domain/adminInput.ts`'s `validateInviteMachineInput` is the server side of this. `deviceNo`
 * cannot simply travel blank the way the seven detail fields do — it is `gsi1-device`'s
 * partition key, and a machine row cannot exist without a real string there — so the server
 * fills it with a placeholder (`newPendingDeviceNo()`) rather than accepting an empty one. This
 * form does not construct that placeholder or send anything in its place; it simply never sends
 * the key, and `validateInviteMachineInput` treats an absent field exactly like a blank one.
 * `shared/admin/gyms.ts`'s `isPendingDeviceNo` is how a reader tells a real allocation from one
 * still pending — see the note on `AdminGymView.machine` there.
 */
export const adminInviteMachineSchema = z.object({
  model: z.string().trim().min(1, "Required.").max(120, "Must be at most 120 characters."),
  valueInr: wholeRupees,
});

export type AdminInviteMachineInput = z.infer<typeof adminInviteMachineSchema>;

/**
 * `invitedByName` — whose name the gym reads on the invite, not who is accountable for sending
 * it (`issuedByEmail`, which the server derives from the session and this form never sends).
 * Blank is a real choice: it means "default to my own name", exactly as
 * `validateInvitedByName` treats absent, `null` and blank alike.
 */
export const adminInviteFormSchema = z.object({
  details: adminInviteDetailsSchema,
  terms: adminInviteTermsSchema,
  machine: adminInviteMachineSchema,
  invitedByName: z
    .string()
    .trim()
    .max(120, "Must be at most 120 characters.")
    .refine((v) => v === "" || v.length >= 2, "Must be at least 2 characters, or blank."),
});

export type AdminInviteFormInput = z.infer<typeof adminInviteFormSchema>;

/**
 * What `POST /admin/gyms` actually wants on the wire.
 *
 * `machine` carries only `model` and `valueInr` — `deviceNo`, `serialNumber`, `accessories` and
 * `installationDate` are simply absent, and `validateInviteMachineInput` treats an absent key
 * exactly like a blank one (see that function's docstring, and `adminInviteMachineSchema`'s).
 */
export type AdminInviteBody = {
  details: GymDetails;
  terms: OnboardingTerms;
  machine: {
    model: string;
    valueInr: number;
  };
  invitedByName?: string;
};

/**
 * `entityType`'s baseline when the admin leaves it for the gym to choose.
 *
 * Matches `validateInviteDetails`'s own fallback server-side exactly, on purpose: sending
 * `"proprietorship"` explicitly rather than an absent key produces the identical stored row
 * either way, and keeping the two in step here means there is only one place — this constant
 * and its server counterpart — that would need to change if the baseline ever did.
 */
const DEFAULT_ENTITY_TYPE: EntityType = "proprietorship";

/**
 * Form values → wire body.
 *
 * Three things happen here, not one:
 *
 * - **The machine's four logistics fields are simply not sent** — an absent key for
 *   `invitedByName` too, the same distinction `validateInvitedByName`'s docstring draws between
 *   "not provided" and "provided as empty".
 * - **A blank `entityType` resolves to `DEFAULT_ENTITY_TYPE`** rather than travelling as `""`.
 *   The server would default it identically if left absent; resolving it here means
 *   `AdminInviteBody.details` can stay the same `GymDetails` type every other reader of this
 *   module already expects, instead of a second, looser type that exists only for this one
 *   field.
 * - **The other six deferrable fields travel through unchanged** — `GymDetails` already types
 *   them as plain `string`, and `""` is a valid one. `validateInviteDetails` reads a blank
 *   exactly as "the gym will supply this."
 */
export function toAdminInviteBody(form: AdminInviteFormInput): AdminInviteBody {
  const body: AdminInviteBody = {
    details: {
      ...form.details,
      entityType: form.details.entityType === "" ? DEFAULT_ENTITY_TYPE : form.details.entityType,
      // Not on this form at all — see the module docstring on why FSSAI was dropped rather
      // than deferred. `GymDetails` still requires the key, so it is supplied here as the
      // "not recorded" value `validateDetails` already treats it as everywhere else.
      fssaiLicenceNumber: "",
    },
    terms: form.terms,
    machine: {
      model: form.machine.model,
      valueInr: form.machine.valueInr,
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
