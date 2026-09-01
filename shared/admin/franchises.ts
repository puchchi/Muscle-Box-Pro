/**
 * What the admin panel's franchise reads and writes carry.
 *
 * `shared/admin/gyms.ts`'s brief for the other half of the panel. Everything here was taken from
 * the handlers rather than from the plan: `row()` in `adminFranchisesList.ts` and
 * `toAdminFranchiseView` in `lib/franchiseState.ts` are the definitions, and the plan's §8.4 table
 * describes routes rather than shapes.
 *
 * ## Money is paise on this surface, unlike the gym's
 *
 * `POST /admin/gyms` takes `securityDepositInr` and multiplies by 100 server-side. The franchise
 * routes take and return integer paise throughout, which is the convention `mbp-backend`'s own
 * money rule asks for. Two forms in one dashboard with two conventions is recorded as open
 * question 11 in `docs/franchise-onboarding.md`; until it is settled, **every number in this file
 * is paise** and `formatPaiseAsInr` is what renders it.
 *
 * ## The three writes are the ones that unblock the wizard
 *
 * `AdminFranchiseApprovalBody` and the two payment bodies were defined here before their handlers
 * existed, and the handlers were then written to them. They matter more than they look: steps 4 and
 * 8 are completed by **us**, so until an admin decides and confirms, no franchise can reach step 9
 * at all.
 */

import type {
  ApprovalOutcome,
  FranchiseDocumentType,
  FranchiseOnboardingStatus,
  FranchiseTerms,
  PaymentClaim,
} from "../franchise/onboarding/types";
import type { EntityType } from "../onboarding/types";
import type { FranchiseTierId } from "../franchise/program";

// ── The list ────────────────────────────────────────────────────────────────

/**
 * One row of `GET /admin/franchises`. Eleven thin fields, and that is the whole budget.
 *
 * The handler's own comment says what is missing and why: *"no PAN, no GSTIN, no signatory on a
 * list"*. What that leaves out and the table has to live without is **the tier and the
 * investment** — neither is on `PROFILE`, both are on `TERMS`, and reading them would be a
 * partition query per row. So the franchise list cannot show what a franchise is worth, and the
 * detail page is the only place that can.
 */
export type AdminFranchiseListRow = {
  franchiseId: string;
  /** Empty until the franchisee submits step 1. The invite only needs a trade name. */
  legalEntityName: string;
  tradeName: string;
  slug: string;
  status: FranchiseOnboardingStatus;
  entityType: EntityType | "";
  noticesEmail: string;
  noticesPhone: string;
  /** The application this was created from, when an admin converted one. */
  sourceApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFranchiseList = {
  /**
   * `"review"` when the sparse index was read instead of the main one.
   *
   * It matters to the page rather than only to the handler: the review queue is oldest-first,
   * ignores `cursor` and always answers `nextCursor: null`, so a "Load more" button under it
   * would be a button that silently does nothing.
   */
  queue: "review" | null;
  franchises: AdminFranchiseListRow[];
  nextCursor: string | null;
};

// ── The detail ──────────────────────────────────────────────────────────────

/**
 * Proposal and grant side by side, never merged.
 *
 * The handler's comment is the reason and it is worth repeating where the type is read: approving
 * three suburbs of five is the case that matters, and a shape that carried only the grant would
 * lose the fact that anything was cut.
 */
export type AdminFranchiseTerritory = {
  tier: FranchiseTierId;
  /** Derived from `proposedState` and `proposedDistricts`, so a list has one string to show. */
  proposedTerritory: string;
  proposedState: string;
  proposedDistricts: string[];
  /** Empty unless they wanted part of a district rather than all of it. */
  proposedPincodes: string[];
  /** Optional prose, for whatever the two lists above could not say. Often empty. */
  proposedBoundary: string;
  existingRelationships: string;
  submittedAt: string | null;
  grantedTier: FranchiseTierId | null;
  grantedTerritory: string | null;
  grantedBoundary: string | null;
  grantedExclusions: string | null;
  grantedAt: string | null;
};

/**
 * The approval record as **we** hold it, which is not what the franchisee is shown.
 *
 * `internalReason` is the difference. `ApprovalView` in the wizard's types has no such field and
 * says why: a declined franchisee gets no generated sentence explaining a commercial judgement.
 * This is the audience it was written for, so it is on screen here.
 */
export type AdminFranchiseApproval = {
  outcome: ApprovalOutcome;
  decidedAt: string | null;
  decidedByEmail: string | null;
  internalReason: string | null;
  /** Distinct from `decidedAt`: one `approved` instant, and the freeze point step 2 reads. */
  approvedAt: string | null;
};

export type AdminFranchiseOperations = {
  warehouseAddress: string;
  warehouseAreaSqft: number;
  temperatureControl: "yes" | "no";
  operationsContactName: string;
  operationsContactPhone: string;
  deploymentPlan: string;
  logisticsArrangement: "own_vehicle" | "contracted" | "undecided";
  submittedAt: string | null;
};

/**
 * A KYC upload, as the admin view describes it.
 *
 * Three field names differ from the wizard's `UploadedDocument` (`originalFilename` for
 * `fileName`, `bytes` for `sizeBytes`, plus `uploadState`) because these come off the stored row
 * rather than out of the franchisee's view. Not worth reconciling: renaming either side to match
 * the other would make one of the two disagree with its handler.
 *
 * **No `s3Key`, deliberately.** The handler's comment: it points at an identity document, a
 * download goes through a route that presigns, and a key in a JSON response is a key in a browser
 * history and a log.
 */
export type AdminFranchiseDocument = {
  docId: string;
  docType: FranchiseDocumentType;
  contentType: string;
  bytes: number;
  originalFilename: string;
  uploadState: "pending" | "uploaded";
  requestedAt: string | null;
  uploadedAt: string | null;
  /**
   * When the franchisee withdrew this upload, if they did.
   *
   * Not a third `uploadState`: it is orthogonal to one, since a `pending` row can be withdrawn and so can an
   * `uploaded` one. The franchisee's own view drops a withdrawn row entirely; the admin view keeps it, because a
   * document somebody sent us and then replaced is part of the history of what we were given.
   */
  removedAt: string | null;
};

export type AdminFranchisePayment = {
  instalmentNo: number;
  /** The reference the franchisee must quote. §7.2 makes this the whole reconciliation mechanism. */
  reference: string;
  expectedPaise: number;
  state: "pending" | "verified" | "rejected";
  /** What actually arrived. Null until someone verifies, and may differ from `expectedPaise`. */
  receivedPaise: number | null;
  claim: PaymentClaim | null;
  verifiedAt: string | null;
  verifiedByEmail: string | null;
  rejectedAt: string | null;
  /** On a rejection, the sentence the franchisee is shown. */
  reason: string | null;
};

/**
 * The term sheet the server has pinned, as the admin view describes it.
 *
 * The **current** pin, which is the newest row rather than the first. A franchise's term sheet is re-pinned when
 * the document drifts while it is still unsigned — an admin correcting a City-tier figure is the case that
 * matters — so `seq` above 1, or an `issuedCount` above 1, is the visible trace of that having happened. Worth
 * showing rather than hiding: "which document is this franchisee looking at" is the question this card answers,
 * and a re-issue is the thing that makes the answer non-obvious.
 *
 * `fields` is not on the wire. The stored row keeps the exact fields that were hashed as evidence, and putting
 * them here would give the screen a second source for text it renders from `terms` and `territory` anyway.
 */
export type AdminFranchiseTermSheet = {
  /** 1-based issuance sequence, from the `TERMSHEET#<nnn>` sort key. */
  seq: number;
  /** How many have been issued, this one included. */
  issuedCount: number;
  /** The document's own version, e.g. `"1.0"`. Several issuances may share it. */
  version: string;
  effectiveDate: string;
  validUntil: string;
  contentHash: string;
  length: number;
  /** Null until a PDF renderer exists, and deliberately not a plausible-looking string before then. */
  pdfHash: string | null;
  /** When this issuance was pinned. The franchisee's *first* view is `timestamps.termsheetViewedAt`. */
  issuedAt: string;
};

/**
 * Every transition instant we hold.
 *
 * **These are the stored field names, not the wizard contract's.** `decidedAt` serves both hold
 * and decline, `termsheetViewedAt` is spelled with a lowercase `s`, and nothing writes
 * `reviewStartedAt` at all. Left as the handler sends them, because a translation layer here
 * would be a second place for the ladder's vocabulary to live.
 */
export type AdminFranchiseTimestamps = {
  invitedAt: string | null;
  firstOpenedAt: string | null;
  detailsSubmittedAt: string | null;
  territorySubmittedAt: string | null;
  kycSubmittedAt: string | null;
  reviewStartedAt: string | null;
  approvedAt: string | null;
  decidedAt: string | null;
  franchiseAckAt: string | null;
  operationsSubmittedAt: string | null;
  termsheetViewedAt: string | null;
  esignRequestedAt: string | null;
  signedAt: string | null;
  paymentClaimedAt: string | null;
  paymentVerifiedAt: string | null;
  accountCreatedAt: string | null;
  activatedAt: string | null;
};

/**
 * Where the link was opened, and by what.
 *
 * On the admin view because §10 rests the e-signed document's weight on the franchisee having
 * walked the flow themselves, and this is the only record of that.
 */
export type AdminFranchiseFirstOpen = {
  at: string | null;
  ip: string | null;
  userAgent: string | null;
};

export type AdminFranchiseInviteRecord = {
  tokenId: string;
  typ: string;
  invitedByName: string;
  issuedByEmail: string;
  createdAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  supersededByTokenId: string | null;
};

/**
 * `GET /admin/franchises/{franchiseId}` — everything we hold about one franchise.
 *
 * `esign` is `null` from the handler unconditionally: nothing writes an `ESIGN#` row yet, and the fields a
 * provider integration needs are named by the provider, so there is no shape to describe. Typed as `null`
 * rather than as an optional object so that adding it is a compile error here rather than a blank card on the
 * page. `termSheet` was the same until a writer landed, which is that device working as intended.
 */
export type AdminFranchiseView = {
  franchiseId: string;
  slug: string;
  status: FranchiseOnboardingStatus;
  /**
   * Derived from the **stored** `completedSteps`, not the wizard's read-time derivation.
   *
   * The handler's comment is the reason: `completedStepsOnRead` adds steps 4 and 8 from our own
   * records for the franchisee's benefit, and an admin asking why a franchise is stuck wants the
   * rows as they are.
   */
  currentStep: number;
  completedSteps: number[];
  sourceApplicationId: string | null;
  createdAt: string | null;
  updatedAt: string | null;

  details: {
    legalEntityName: string;
    entityType: EntityType | "";
    tradeName: string;
    cin: string;
    llpin: string;
    pan: string;
    gstin: string;
    registeredAddress: string;
    signatoryName: string;
    signatoryDesignation: string;
    signatoryPan: string;
    /** Four digits, which is all we hold. There is no full number to leak here. */
    signatoryAadhaarLast4: string;
    noticesEmail: string;
    noticesPhone: string;
  };

  terms: FranchiseTerms;
  termsUpdatedAt: string | null;
  termsUpdatedByEmail: string;

  territory: AdminFranchiseTerritory | null;
  approval: AdminFranchiseApproval | null;
  operations: AdminFranchiseOperations | null;
  documents: AdminFranchiseDocument[];
  payments: AdminFranchisePayment[];

  termSheet: AdminFranchiseTermSheet | null;
  esign: null;
  /**
   * Rows in the partition this view has no model for.
   *
   * Surfaced rather than dropped, for the reason the detail page exists: an unrecognised `sk` is
   * exactly the kind of thing that would otherwise send someone to the DynamoDB console.
   */
  unmodelledRows: string[];

  firstOpen: AdminFranchiseFirstOpen | null;
  timestamps: AdminFranchiseTimestamps;
  invite: AdminFranchiseInviteRecord | null;
};

// ── The writes ──────────────────────────────────────────────────────────────

/**
 * `POST /admin/franchises/{id}/approval` — step 4, all three outcomes.
 *
 * A union rather than one object with optional fields, matching `ApprovalView` on the wizard side,
 * because the three outcomes need genuinely different things and an approval missing its granted
 * territory is the one of these that must not be expressible.
 *
 * **The granted territory is required on an approval and is not the proposal.** §3's case is
 * approving three suburbs of five: an approval that defaulted to what was asked for would record
 * a grant nobody made, and it is this string the term sheet renders.
 */
export type AdminFranchiseApprovalBody =
  | {
      outcome: "approved";
      grantedTerritory: string;
      grantedBoundary: string;
      /** What is carved out of the grant. Empty is a real answer: nothing is excluded. */
      grantedExclusions: string;
      /** Null keeps the tier the franchisee proposed. */
      grantedTier: FranchiseTierId | null;
      internalReason: string;
    }
  | {
      outcome: "on_hold";
      /** What we still need, in the franchisee's own terms. Shown to them verbatim. */
      outstanding: string[];
      /** Who is in touch, so their screen is not a dead end. */
      contactName: string;
      internalReason: string;
    }
  | {
      outcome: "declined";
      /** Ours alone. The franchisee is shown no reason at all (§3). */
      internalReason: string;
    };

/**
 * `POST /admin/franchises/{id}/payments/{n}/verify` — the write that completes step 8.
 *
 * `receivedPaise` is what arrived, not what was expected, and the two differing is the ordinary
 * case rather than the exception: a ₹12,50,000 transfer routinely lands a few hundred rupees short
 * because the sending bank deducted charges. §7.3 makes the shortfall visible and deliberately
 * does not decide whether it blocks anything (open question 2).
 */
export type AdminFranchisePaymentVerifyBody = {
  receivedPaise: number;
};

/**
 * A refusal, which is not the same shape as a verification.
 *
 * `reason` is required and is the one reason string on this surface that **is** shown to the
 * franchisee: it is a statement about a document ("we could not find that UTR"), not an assessment
 * of a person, and withholding it would leave them resubmitting the same claim.
 */
export type AdminFranchisePaymentRefuseBody = {
  reason: string;
};
