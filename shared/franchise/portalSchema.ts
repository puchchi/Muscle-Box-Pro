/**
 * Runtime validation of `GET /franchise/portal`.
 *
 * `shared/gym/portalSchema.ts` is the model and the four failure modes it enumerates are the
 * same four here, so read that one first. `absenceSchema` and `section` are imported from it
 * rather than rewritten, so both dashboards agree on what an absent section looks like.
 *
 * Two things this file has to get right that the gym's does not:
 *
 * 1. **Money is integer paise, and a float is a rejected response.** `investmentPaise`,
 *    `expectedPaise`, `receivedPaise` and the claimed amount are what a ₹12,50,000 transfer
 *    is reconciled against. `1250000.0000001` formats as a plausible figure and reconciles
 *    against nothing, so `.int()` is doing real work on every one of them.
 *
 * 2. **An unbuilt section must not be able to arrive available.** The ten settlement sections
 *    are `section(z.never())`, so a server that starts sending `{ available: true, data: … }`
 *    for one fails the parse loudly instead of rendering a card the client invented a shape
 *    for. The type says the same thing (`PortalSection<never>`); this is the half that
 *    survives the network.
 *
 * There is no `httpUrl` primitive here, and that is the contract rather than an omission: the
 * franchise portal puts nothing from the network into an `href`. Documents are names and the
 * agreement is a reference string.
 */

import * as z from "zod";
import { absenceSchema, section } from "../gym/portalSchema";
import type { FranchisePortalSnapshot } from "./portal";

// ── Primitives ──────────────────────────────────────────────────────────────

/** A label a human reads. Empty is a bug worth surfacing, not a blank card. */
const label = z.string().min(1);

/** Money. Integer paise, never negative, never a float — see the header. */
const paise = z.number().int().min(0);

/** A share of something. Outside 0–100 it is not a share. */
const percent = z.number().finite().min(0).max(100);

/** "2026-08-21". */
const isoDate = z.string().date();

/** "2026-08-21T06:30:00.000Z". */
const isoTimestamp = z.string().datetime();

/**
 * 64 lowercase hex. Same regex as the gym agreement's, for the same reason: the dashboard
 * truncates it for display, so a short or upper-case digest renders as a plausible reference
 * that does not match the emailed copy — the one thing a reference exists to let someone check.
 */
const sha256Hex = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "must be a 64-character lowercase hex digest");

// ── Components ──────────────────────────────────────────────────────────────

const franchiseOnboardingStatusSchema = z.enum([
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

/**
 * That franchise's own terms row.
 *
 * Every field is required and two of them are nullable, which are different things.
 * `capitalRecoveryPaise` and `paymentSchedule` are null where the program document leaves
 * them to the definitive agreement (§6, §21) — so null is an answer, and a missing key is a
 * record that never had one. Defaulting either here would print a Territory figure to a City
 * franchisee, which is the exact mistake `FranchiseTerms` was written to prevent.
 */
const franchiseTermsSchema = z.object({
  tier: z.enum(["territory", "city"]),
  investmentPaise: paise,
  machineAllocation: z.number().int().min(0),
  paymentSchedule: z.array(z.object({ pct: percent, trigger: label })).nullable(),
  capitalRecoveryPaise: paise.nullable(),
  proteinSharePctDuringRecovery: percent,
  proteinSharePctAfterRecovery: percent,
  advertisingFranchiseeSharePct: percent,
  advertisingMbpSharePct: percent,
});

const grantedTerritorySchema = z.object({
  territory: label,
  territoryBoundary: z.string(),
  decidedAt: isoTimestamp,
});

/**
 * Step 6 as submitted, and most of it is legitimately blank.
 *
 * `z.string()` rather than `label` on the warehouse fields: `warehouseNotIdentified` empties
 * all three by design, and `temperatureControl` has `""` as a real third value meaning the
 * question was never put. Requiring content here would fail the snapshot of every franchisee
 * who has not found a warehouse yet.
 */
const operationsReadinessSchema = z.object({
  warehouseNotIdentified: z.boolean(),
  warehouseAddress: z.string(),
  warehouseAreaSqft: z.number().finite().min(0).nullable(),
  temperatureControl: z.enum(["yes", "no", ""]),
  operationsContactName: z.string(),
  operationsContactPhone: z.string(),
  deploymentPlan: z.string(),
  logisticsArrangement: z.enum(["own_vehicle", "contracted", "undecided"]),
});

const uploadedDocumentSchema = z.object({
  docId: label,
  docType: z.enum(["pan_card", "entity_proof", "address_proof", "signatory_id", "payment_proof"]),
  fileName: label,
  sizeBytes: z.number().int().min(0),
  contentType: label,
  uploadedAt: isoTimestamp,
});

/** The franchisee's own words about a transfer. `amountPaise` is claimed, not credited. */
const paymentClaimSchema = z.object({
  utr: label,
  amountPaise: paise,
  paidOn: isoDate,
  proofDocId: z.string().min(1).nullable(),
  claimedAt: isoTimestamp,
});

/**
 * One instalment.
 *
 * `receivedPaise` is nullable and separate from `expectedPaise` because under- and
 * over-payment both have to be representable: a bank that deducted charges sent ₹12,49,500,
 * and a schema that collapsed the two would either reject that or record it as paid in full.
 */
const franchisePaymentSchema = z.object({
  instalment: z.number().int().min(1),
  expectedPaise: paise,
  claim: paymentClaimSchema.nullable(),
  receivedPaise: paise.nullable(),
  verifiedAt: isoTimestamp.nullable(),
  refusal: z.string().min(1).nullable(),
});

const executedAgreementSchema = z.object({
  version: label,
  effectiveDate: isoDate,
  validUntil: isoDate,
  contentHash: sha256Hex,
  // A timestamp, not a date. The wire carries the instant and this side formats it in IST.
  signedAt: isoTimestamp,
  signerName: label,
  signType: z.enum(["aadhaar", "electronic", "dsc"]),
});

/**
 * A section whose pipeline does not exist. See the header: `z.never()` is what makes a
 * premature `{ available: true }` a parse failure rather than a card full of nothing.
 */
const unbuiltSection = section(z.never());

// ── The response ────────────────────────────────────────────────────────────

export const franchisePortalSnapshotSchema = z.object({
  franchiseId: label,
  // The server falls back to the legal entity name, so this is safe to require non-empty.
  franchiseDisplayName: label,
  onboardingStatus: franchiseOnboardingStatusSchema,
  user: z.object({ email: z.string().email(), role: label }),

  terms: franchiseTermsSchema,
  territory: grantedTerritorySchema.nullable(),
  operations: operationsReadinessSchema.nullable(),
  documents: z.array(uploadedDocumentSchema),
  payments: z.array(franchisePaymentSchema),
  agreement: executedAgreementSchema.nullable(),

  sales: unbuiltSection,
  consumption: unbuiltSection,
  costs: unbuiltSection,
  advertising: unbuiltSection,
  profit: unbuiltSection,
  payouts: unbuiltSection,
  capitalRecoveryProgress: unbuiltSection,
  machines: unbuiltSection,
  statements: unbuiltSection,
  alerts: unbuiltSection,

  asOf: isoTimestamp,
});

/**
 * Proof the schema and the type have not drifted apart. `gymPortalSnapshotSchema`'s note
 * explains why this line is worth having; it fails `tsc` in both directions.
 */
export const _typeCheck = franchisePortalSnapshotSchema satisfies z.ZodType<FranchisePortalSnapshot>;

export type FranchisePortalSnapshotParse =
  | { ok: true; snapshot: FranchisePortalSnapshot }
  | { ok: false; issues: string[] };

/**
 * Validate a portal response.
 *
 * A result rather than a throw, so the caller decides what a bad response looks like on
 * screen. `issues` are `path: message` strings for a log or a developer-facing detail line,
 * not for a franchisee, who is told the figures are unavailable and nothing about our field
 * names.
 */
export function parseFranchisePortalSnapshot(value: unknown): FranchisePortalSnapshotParse {
  const result = franchisePortalSnapshotSchema.safeParse(value);
  if (result.success) return { ok: true, snapshot: result.data };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

/** Re-exported so the franchise pages never import from `../gym/`. */
export { absenceSchema };
