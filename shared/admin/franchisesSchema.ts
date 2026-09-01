/**
 * Runtime validation of the two admin franchise reads.
 *
 * `gymsSchema.ts`'s reason applies here unchanged and it is worth restating, because the franchise
 * routes are newer and the temptation to trust them is stronger: **the server has no type for
 * these responses.** `toAdminFranchiseView` returns `Record<string, unknown>`, assembled field by
 * field across about seventy fields, so a rename type-checks on both sides and lands as a blank
 * cell on the page someone is reading to decide whether a ₹25 lakh franchise is stuck.
 *
 * It also does something `gymsSchema` does not have to: these routes **are not deployed**. The
 * panel talks to a mock (see `client/src/lib/adminFranchiseApi.ts`), so this schema is currently
 * validating our own fixture. That is not wasted — it is the thing that will catch the drift on
 * the day the seam flips, which is exactly when nobody will be looking for it.
 *
 * The same two abstentions as the gym side:
 *
 * - **It does not re-derive `currentStep`.** The server derives it from `completedSteps`; this
 *   checks it is a step number and stops there.
 * - **It does not enforce internal consistency.** A franchise at `signed` with no `signedAt` is a
 *   real state worth *seeing* — that is the "why is this stuck?" question — so it parses.
 *
 * Every object is a plain `z.object()`, which strips unknown keys rather than refusing them. The
 * backend adding a field must not break the panel; the failure guarded here is the opposite one.
 */

import * as z from "zod";
import { toParse, type AdminParse } from "./parse";
import type { AdminFranchiseList, AdminFranchiseView } from "./franchises";

export type { AdminParse };

// ── Primitives ──────────────────────────────────────────────────────────────

/** A label a human reads. Empty is a bug worth surfacing, not a blank cell. */
const label = z.string().min(1);

/**
 * A string the franchisee has not supplied yet.
 *
 * Nearly every field on `details` is one of these until step 1 lands: `POST /admin/franchises`
 * writes all nine identity fields as `""` and ignores them if an admin sends values. Named for the
 * reason rather than the shape, so the screens know to say "not yet answered" rather than render a
 * blank row.
 */
const deferred = z.string();

/** An ISO instant, or null where the transition has not happened. */
const instant = z.string().nullable();

const step = z.number().int().min(1).max(9);

/** Integer paise. Never a float, and never negative on this surface. */
const paise = z.number().int().min(0);

const entityType = z.enum([
  "proprietorship",
  "partnership",
  "llp",
  "pvt_ltd",
  "unregistered",
]);

/** Blank until step 1, which is why this is not just `entityType`. */
const entityTypeOrBlank = z.union([entityType, z.literal("")]);

const tierId = z.enum(["territory", "city"]);

/**
 * The seventeen rungs, and the three branches among them.
 *
 * A closed enum rather than a string, unlike most fields here, because the page colours and orders
 * by this value: an unrecognised status would sort last and render grey, which reads as "early in
 * the funnel" for something that might be `declined`. Better to fail the parse loudly and print
 * the field path.
 */
const franchiseStatus = z.enum([
  "invited",
  "opened",
  "details_submitted",
  "territory_submitted",
  "kyc_submitted",
  "under_review",
  "approved",
  "on_hold",
  "declined",
  "franchise_ack",
  "operations_submitted",
  "termsheet_viewed",
  "esign_requested",
  "signed",
  "payment_claimed",
  "payment_verified",
  "active",
]);

// ── The list ────────────────────────────────────────────────────────────────

const adminFranchiseListRowSchema = z.object({
  franchiseId: label,
  legalEntityName: deferred,
  tradeName: label,
  slug: label,
  status: franchiseStatus,
  entityType: entityTypeOrBlank,
  noticesEmail: deferred,
  noticesPhone: deferred,
  sourceApplicationId: label.nullable(),
  createdAt: label,
  updatedAt: label,
});

export const adminFranchiseListSchema = z.object({
  queue: z.literal("review").nullable(),
  franchises: z.array(adminFranchiseListRowSchema),
  nextCursor: label.nullable(),
});

// ── The detail ──────────────────────────────────────────────────────────────

const franchiseTermsSchema = z.object({
  tier: tierId,
  investmentPaise: paise,
  machineAllocation: z.number().int().min(0),
  /**
   * Null is the load-bearing case, not the empty edge.
   *
   * The City tier's schedule is left to the definitive agreement, and a null here is exactly what
   * stops a term sheet being issued at step 7. A schema that coerced it to `[]` would turn "we
   * have not agreed this" into "there are no instalments".
   */
  paymentSchedule: z
    .array(z.object({ pct: z.number(), trigger: label }))
    .nullable(),
  capitalRecoveryPaise: paise.nullable(),
  proteinSharePctDuringRecovery: z.number(),
  proteinSharePctAfterRecovery: z.number(),
  advertisingFranchiseeSharePct: z.number(),
  advertisingMbpSharePct: z.number(),
});

const adminFranchiseTerritorySchema = z.object({
  tier: tierId,
  proposedTerritory: deferred,
  proposedBoundary: deferred,
  existingRelationships: deferred,
  submittedAt: instant,
  grantedTier: tierId.nullable(),
  grantedTerritory: label.nullable(),
  grantedBoundary: label.nullable(),
  /** Nullable *and* allowed to be empty: nothing excluded is a real grant. */
  grantedExclusions: deferred.nullable(),
  grantedAt: instant,
});

const adminFranchiseApprovalSchema = z.object({
  outcome: z.enum(["approved", "on_hold", "declined"]),
  decidedAt: instant,
  decidedByEmail: label.nullable(),
  internalReason: deferred.nullable(),
  approvedAt: instant,
});

const adminFranchiseOperationsSchema = z.object({
  warehouseAddress: deferred,
  warehouseAreaSqft: z.number(),
  temperatureControl: z.enum(["yes", "no"]),
  operationsContactName: deferred,
  operationsContactPhone: deferred,
  deploymentPlan: deferred,
  logisticsArrangement: z.enum(["own_vehicle", "contracted", "undecided"]),
  submittedAt: instant,
});

const adminFranchiseDocumentSchema = z.object({
  docId: label,
  docType: z.enum([
    "pan_card",
    "entity_proof",
    "address_proof",
    "signatory_id",
    "financial_evidence",
    "payment_proof",
  ]),
  contentType: deferred,
  bytes: z.number().int().min(0),
  originalFilename: deferred,
  uploadState: z.enum(["pending", "uploaded"]),
  requestedAt: instant,
  uploadedAt: instant,
});

/**
 * The franchisee's claim, as stored.
 *
 * `paidOn` is a `YYYY-MM-DD` calendar date rather than an instant — it is the date they say they
 * sent the money, read off their own statement, and it is the one figure on this card they can
 * check against it. `claimedAt` is when they told us, which is a different question.
 */
const paymentClaimSchema = z.object({
  utr: label,
  amountPaise: paise,
  paidOn: label,
  proofDocId: label.nullable(),
  claimedAt: label,
});

const adminFranchisePaymentSchema = z.object({
  instalmentNo: z.number().int().min(1),
  reference: label,
  expectedPaise: paise,
  state: z.enum(["pending", "verified", "rejected"]),
  receivedPaise: paise.nullable(),
  claim: paymentClaimSchema.nullable(),
  verifiedAt: instant,
  verifiedByEmail: label.nullable(),
  rejectedAt: instant,
  reason: deferred.nullable(),
});

const adminFranchiseTimestampsSchema = z.object({
  invitedAt: instant,
  firstOpenedAt: instant,
  detailsSubmittedAt: instant,
  territorySubmittedAt: instant,
  kycSubmittedAt: instant,
  reviewStartedAt: instant,
  approvedAt: instant,
  decidedAt: instant,
  franchiseAckAt: instant,
  operationsSubmittedAt: instant,
  termsheetViewedAt: instant,
  esignRequestedAt: instant,
  signedAt: instant,
  paymentClaimedAt: instant,
  paymentVerifiedAt: instant,
  accountCreatedAt: instant,
  activatedAt: instant,
});

const adminFranchiseInviteSchema = z.object({
  tokenId: label,
  typ: label,
  invitedByName: deferred,
  issuedByEmail: deferred,
  createdAt: instant,
  expiresAt: instant,
  revokedAt: instant,
  revokedReason: deferred.nullable(),
  supersededByTokenId: label.nullable(),
});

export const adminFranchiseViewSchema = z.object({
  franchiseId: label,
  slug: label,
  status: franchiseStatus,
  currentStep: step,
  completedSteps: z.array(step),
  sourceApplicationId: label.nullable(),
  createdAt: instant,
  updatedAt: instant,

  details: z.object({
    legalEntityName: deferred,
    entityType: entityTypeOrBlank,
    tradeName: deferred,
    cin: deferred,
    llpin: deferred,
    pan: deferred,
    gstin: deferred,
    registeredAddress: deferred,
    signatoryName: deferred,
    signatoryDesignation: deferred,
    signatoryPan: deferred,
    signatoryAadhaarLast4: deferred,
    noticesEmail: deferred,
    noticesPhone: deferred,
  }),

  terms: franchiseTermsSchema,
  termsUpdatedAt: instant,
  termsUpdatedByEmail: deferred,

  territory: adminFranchiseTerritorySchema.nullable(),
  approval: adminFranchiseApprovalSchema.nullable(),
  operations: adminFranchiseOperationsSchema.nullable(),
  documents: z.array(adminFranchiseDocumentSchema),
  payments: z.array(adminFranchisePaymentSchema),

  /**
   * Both pinned to `null`, matching the handler.
   *
   * `z.null()` rather than `something.nullable()` on purpose: the day a writer lands for either,
   * this line fails and forces the shape to be described here rather than rendering as an empty
   * card that nobody notices is empty.
   */
  termSheet: z.null(),
  esign: z.null(),
  unmodelledRows: z.array(z.string()),

  firstOpen: z
    .object({ at: instant, ip: label.nullable(), userAgent: label.nullable() })
    .nullable(),
  timestamps: adminFranchiseTimestampsSchema,
  invite: adminFranchiseInviteSchema.nullable(),
});

/**
 * The compile-time half.
 *
 * `satisfies` is what stops the schema and the type drifting apart: neither can change without
 * this line failing. Same device as `gymsSchema.ts`.
 */
export const _franchiseListTypeCheck =
  adminFranchiseListSchema satisfies z.ZodType<AdminFranchiseList>;
export const _franchiseViewTypeCheck =
  adminFranchiseViewSchema satisfies z.ZodType<AdminFranchiseView>;

export function parseAdminFranchiseList(value: unknown): AdminParse<AdminFranchiseList> {
  return toParse(adminFranchiseListSchema.safeParse(value));
}

export function parseAdminFranchiseView(value: unknown): AdminParse<AdminFranchiseView> {
  return toParse(adminFranchiseViewSchema.safeParse(value));
}
