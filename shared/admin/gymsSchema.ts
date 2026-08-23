/**
 * Runtime validation of the two admin read endpoints.
 *
 * `gyms.ts` says what `GET /admin/gyms` and `GET /admin/gyms/{gymId}` are supposed to send.
 * This says what the panel will accept, and it exists for one specific reason: **the server
 * has no type for these responses.** `toAdminGymView` in `mbp-backend` returns
 * `Record<string, unknown>`, built field by field, so a renamed or dropped field type-checks
 * on both sides and surfaces as a blank cell.
 *
 * That is not hypothetical. `GET /gym/portal` was wrong on eight field names for exactly this
 * reason, with every backend test passing, and it was found by reading the handler rather than
 * by anything failing. The gym dashboard got `portalSchema.ts` as the answer; this is the same
 * answer for the admin side, and the reason it matters more here is that the detail page is
 * what someone reads to decide whether a gym is stuck. A wrong answer to that sends them to
 * the DynamoDB console — which is the state this panel exists to leave.
 *
 * Two things it deliberately does not do:
 *
 * - **It does not re-derive `currentStep`.** The server derives it from `completedSteps` and
 *   this only checks it is a step number. A second derivation here would be a second place
 *   for the ladder to live, and the two would disagree the first time one changed.
 * - **It does not enforce internal consistency.** A gym whose `status` is `signed` with
 *   `signature: null` is a real state worth *seeing* — that is precisely the "why is this gym
 *   stuck?" question — so it parses. Refusing it would hide the bug being investigated behind
 *   a validation error, which is the one outcome worse than rendering it.
 *
 * On strictness: every object here is a plain `z.object()`, which **strips** unknown keys
 * rather than refusing them. That is the right direction for a read: the backend adding a
 * field must not break the panel. The failure this guards is the opposite one — a field we
 * render going missing or changing type.
 */

import * as z from "zod";
import type { AdminGymList, AdminGymView } from "./gyms";

// ── Primitives ──────────────────────────────────────────────────────────────

/** A label a human reads. Empty is a bug worth surfacing, not a blank cell. */
const label = z.string().min(1);

/**
 * A string that is allowed to be empty.
 *
 * Distinct from `label` because several of these legitimately are: `fssaiLicenceNumber` is
 * optional by §24.5, `accessories` defaults to `""` in the validator, and `machineOf(null)`
 * returns `model: ""` for a gym with no unit allocated.
 */
const text = z.string();

/** An ISO timestamp, or null where the event has not happened. Format-checked, not parsed. */
const instant = z.string().datetime({ offset: true }).nullable();

/**
 * An ISO calendar date — `YYYY-MM-DD`, no time part.
 *
 * Separate from `instant` because `installationDate` is contractual: it renders into Schedule
 * A and starts the term (§4.1), so a value carrying a time component is a different kind of
 * value than the one that was agreed.
 */
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Rupees. Non-negative and finite — `formatInr(NaN)` is the string "₹NaN". */
const rupees = z.number().finite().min(0);

/** Paise. Integer, because a fractional paisa is not a thing that can be charged. */
const paise = z.number().int().min(0);

/** A whole count that cannot be negative. */
const count = z.number().int().min(0);

/** A percentage share. Above 100 is not a share. */
const percent = z.number().min(0).max(100);

const onboardingStatus = z.enum([
  "invited",
  "opened",
  "details_submitted",
  "partnership_ack",
  "agreement_viewed",
  "signed",
  "deposit_paid",
  "active",
]);

const depositStatus = z.enum(["not_started", "pending", "paid", "deferred"]);
const depositChoice = z.enum(["pay_now", "pay_later"]);
const entityType = z.enum(["proprietorship", "partnership", "llp", "pvt_ltd"]);
const machineStatus = z.enum(["allocated", "installed", "servicing", "replaced", "removed"]);

/**
 * A step number.
 *
 * Range-checked rather than taken as a number, because it drives rendering: `currentStep: 9`
 * from a confused server would drive the panel to a step that does not exist. Same reasoning
 * as `asStep` in `apiClient.ts`.
 */
const step = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

// ── The list ────────────────────────────────────────────────────────────────

const adminGymListRowSchema = z.object({
  gymId: label,
  tradeName: label,
  legalEntityName: label,
  slug: label,
  status: onboardingStatus,
  noticesEmail: label,
  noticesPhone: label,
  // Required on a row, unlike the nullable timestamps on the detail view: a gym that exists
  // was created, and `createdAt` is the `gsi4-gymlist` sort key, so a row without one could
  // not have been returned by the query that found it.
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const adminGymListSchema = z.object({
  gyms: z.array(adminGymListRowSchema),
  nextCursor: z.string().nullable(),
});

// ── One gym ─────────────────────────────────────────────────────────────────

const gymDetailsSchema = z.object({
  legalEntityName: label,
  entityType,
  tradeName: label,
  gstin: label,
  // Genuinely optional — §24.5 makes each party responsible for its own registrations, so a
  // gym without one has `""` here and that is not an error.
  fssaiLicenceNumber: text,
  registeredAddress: label,
  installationAddress: label,
  signatoryName: label,
  signatoryDesignation: label,
  noticesEmail: label,
  noticesPhone: label,
});

const onboardingTermsSchema = z.object({
  securityDepositInr: rupees,
  termMonths: z.number().int().min(1),
  gymSharePctBeforeMilestone: percent,
  gymSharePctAfterMilestone: percent,
  milestoneCups: count,
  milestoneNetProfitInr: rupees,
  advertisingGymSharePct: percent,
  electricityInrPerBlock: rupees,
  electricityCupsPerBlock: z.number().int().min(1),
  electricityReviewWindowMonths: z.number().int().min(1),
  settlementDaysAfterMonthEnd: z.number().int().min(1),
  // Nullable and *meaningfully* so: zero is the standard term and means the exit price is
  // nil; null means genuinely unagreed. Collapsing them is how a blank becomes a term
  // nobody chose. See `OnboardingTerms.earlyTerminationChargeInr`.
  earlyTerminationChargeInr: rupees.nullable(),
});

/** `machineOf`'s projection — the wizard's field set, and never null. See `AdminGymView.machine`. */
const machineSummarySchema = z.object({
  model: text,
  deviceNo: label.nullable(),
  serialNumber: label.nullable(),
  valueInr: rupees,
  accessories: text,
  installationDate: calendarDate.nullable(),
});

const adminMachineSchema = z.object({
  // Required here, unlike on the summary: a row that exists has a device number, because
  // `deviceNo` is part of its sort key.
  deviceNo: label,
  model: label,
  serialNumber: label.nullable(),
  valueInr: rupees,
  accessories: text,
  installationDate: calendarDate.nullable(),
  status: machineStatus,
  lastServiceAt: instant,
  replacedByDeviceNo: label.nullable(),
  replacedAt: instant,
});

const adminDepositSchema = z.object({
  depositId: label,
  status: depositStatus,
  amountPaise: paise,
  linkId: label.nullable(),
  paymentId: label.nullable(),
  method: label.nullable(),
  receiptNo: label.nullable(),
  paidAt: instant,
  createdAt: instant,
  linkExpiresAt: instant,
});

const adminDepositWaiverSchema = z.object({
  // A reason is required and has a floor on the server, because "n/a" is not a reason and the
  // point of the field is that someone can read it in six months. Not re-imposing the length
  // here: a stored waiver is history, and refusing to display one because it is too short
  // would hide the decision rather than improve it.
  reason: label,
  byEmail: label,
  at: instant,
});

const adminSignatureSchema = z.object({
  agreementVersion: label,
  contentHash: label,
  signatoryName: label,
  signatoryDesignation: label,
  agreedToAgreement: z.boolean(),
  authorisedToBind: z.boolean(),
  ip: text,
  userAgent: text,
  signedAt: instant,
});

const adminAgreementSchema = z.object({
  version: label,
  effectiveDate: calendarDate,
  contentHash: label,
  length: z.number().int().min(0),
  viewedAt: instant,
});

const adminInviteSchema = z.object({
  tokenId: label,
  typ: label,
  invitedByName: label,
  issuedByEmail: label,
  createdAt: instant,
  expiresAt: instant,
  revokedAt: instant,
  revokedReason: label.nullable(),
  supersededByTokenId: label.nullable(),
});

/**
 * The nine transition timestamps.
 *
 * Spelled out rather than accepted as a record of nullable strings, because these drive the
 * funnel: a renamed `signedAt` would read as "not signed yet" for every gym at once, which
 * is both wrong and the sort of wrong that looks like a data problem rather than a bug.
 */
const onboardingTimestampsSchema = z.object({
  invitedAt: instant,
  firstOpenedAt: instant,
  detailsSubmittedAt: instant,
  partnershipAckAt: instant,
  agreementViewedAt: instant,
  signedAt: instant,
  depositInitiatedAt: instant,
  depositPaidAt: instant,
  accountCreatedAt: instant,
});

export const adminGymViewSchema = z.object({
  gymId: label,
  slug: label,
  status: onboardingStatus,
  currentStep: step,
  completedSteps: z.array(step),
  timestamps: onboardingTimestampsSchema,
  details: gymDetailsSchema,
  terms: onboardingTermsSchema,
  termsUpdatedByEmail: label,
  machine: machineSummarySchema,
  machines: z.array(adminMachineSchema),
  depositStatus,
  deposits: z.array(adminDepositSchema),
  depositChoice: depositChoice.nullable(),
  depositWaiver: adminDepositWaiverSchema.nullable(),
  signature: adminSignatureSchema.nullable(),
  agreements: z.array(adminAgreementSchema),
  invite: adminInviteSchema.nullable(),
  activatedAt: instant,
  activatedByEmail: label.nullable(),
});

/**
 * The compile-time half.
 *
 * `satisfies z.ZodType<T>` is what stops the schema and the type drifting apart: neither can
 * change without this line failing, which is the property that keeps a validator from quietly
 * validating last month's shape. Same device as `portalSchema.ts`'s `_typeCheck`.
 */
export const _listTypeCheck = adminGymListSchema satisfies z.ZodType<AdminGymList>;
export const _viewTypeCheck = adminGymViewSchema satisfies z.ZodType<AdminGymView>;

export type AdminParse<T> = { ok: true; data: T } | { ok: false; issues: string[] };

/**
 * Turn a `safeParse` result into an `AdminParse`.
 *
 * `issues` are `path: message` strings for a developer-facing detail line. Unlike the gym
 * dashboard, the audience here *is* a developer or an operator, so the panel shows them
 * rather than hiding them behind "unavailable" — a field path is the fastest possible answer
 * to "what changed on the backend?".
 */
function toParse<T>(result: z.SafeParseReturnType<unknown, T>): AdminParse<T> {
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

export function parseAdminGymList(value: unknown): AdminParse<AdminGymList> {
  return toParse(adminGymListSchema.safeParse(value));
}

export function parseAdminGymView(value: unknown): AdminParse<AdminGymView> {
  return toParse(adminGymViewSchema.safeParse(value));
}
