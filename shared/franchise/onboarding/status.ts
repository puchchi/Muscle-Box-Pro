/**
 * The rules the franchise flow is, expressed without any storage in them.
 *
 * The ladder, the derived step, which steps we complete rather than the franchisee, and the
 * two freeze points. Nothing here reads a clock or a table — `now` is a parameter and state
 * is an argument — so every rule is assertable on its own rather than through a sequence of API
 * calls that happens to exercise it.
 *
 * ## This file has a twin in `mbp-backend`, and they are byte-identical
 *
 * `services/onboarding/src/domain/franchise/status.ts` is this module with two import paths
 * changed and nothing else (docs/franchise-onboarding.md §8.5). That is deliberate — the server
 * is the authority on the ladder and the wizard has to predict it exactly, or a step the client
 * offers is a step the server answers `wrong_step` to. **A change here is a change there.**
 * `schema.ts` beside this file has the same arrangement with `domain/franchise/details.ts`, except
 * that one is hand-copied rather than identical, because that service carries no Zod.
 *
 * Callers on this side: `useFranchiseOnboarding.ts`, `StepDocuments.tsx` and the mock's
 * test suite.
 */

import type { EntityType } from "../../onboarding/types";
import type {
  FranchiseDocumentType,
  FranchiseOnboardingState,
  FranchiseOnboardingStatus,
  FranchiseOnboardingStep,
  UploadedDocument,
} from "./types";
import { FRANCHISE_ONBOARDING_STEPS } from "./types";

// ── The ladder ──────────────────────────────────────────────────────────────

/**
 * Rank, not order, because three of the statuses share a position.
 *
 * `under_review`, `on_hold` and `declined` are the three ways step 4 can stand, so they rank
 * equally: a record can move between review and hold in either direction, and can be declined
 * from either. What equal rank does *not* permit is coming back from `approved` — rank 6
 * outranks all three, so `approved → on_hold` and `approved → declined` are both refused.
 * Withdrawing an approval is termination, which is a different instrument and not a status
 * write.
 */
const STATUS_RANK: Record<FranchiseOnboardingStatus, number> = {
  invited: 0,
  opened: 1,
  details_submitted: 2,
  territory_submitted: 3,
  /** Submitted, nobody has looked yet. */
  kyc_submitted: 4,
  /** Someone has picked it up. Distinct from the above so the admin funnel can see the queue wait. */
  under_review: 5,
  on_hold: 5,
  declined: 5,
  approved: 6,
  franchise_ack: 7,
  operations_submitted: 8,
  termsheet_viewed: 9,
  esign_requested: 10,
  signed: 11,
  payment_claimed: 12,
  payment_verified: 13,
  active: 14,
};

/** Throws on an unknown status rather than defaulting to 0, so a typo cannot read as "earliest". */
export function statusRank(status: FranchiseOnboardingStatus): number {
  const rank = STATUS_RANK[status];
  if (rank === undefined) throw new Error(`Unknown franchise onboarding status: ${status}`);
  return rank;
}

/** Terminal and absorbing. Nothing writes past it. */
export function isDeclined(status: FranchiseOnboardingStatus): boolean {
  return status === "declined";
}

/**
 * Whether `to` may be written over `from`.
 *
 * Forward-only, with exactly one cycle: `on_hold → under_review`, because a hold is a state
 * we put an application into and take it out of. That cycle is admin-only and it is the only
 * one; a client-driven transition can never reach either status, since neither is produced by
 * a step commit.
 *
 * Equal rank is allowed so that re-submitting a step is idempotent rather than an error.
 */
export function isForwardStatus(
  from: FranchiseOnboardingStatus,
  to: FranchiseOnboardingStatus,
): boolean {
  if (isDeclined(from)) return false;
  if (from === "on_hold" && to === "under_review") return true;
  return statusRank(to) >= statusRank(from);
}

/**
 * The status a franchisee's own commit of `step` sets, or null where the franchisee's
 * submission is not what moves the record.
 *
 * Null for 4, 7, 8 and 9, and each null is load-bearing:
 *
 *   - 4 is our decision, written by the approval route;
 *   - 7 is `signed`, written by the Digio webhook and by nothing else (§6.4);
 *   - 8 is `payment_verified`, written by an admin who read a bank statement (§7.3);
 *   - 9 is **not** `active`. `POST /admin/franchises/{id}/activate` is the only route that
 *     ends onboarding. The gym flow's mock wrote `active` here and the real route could not,
 *     so two screens read a status the server never set.
 */
export function statusForStepCommit(
  step: FranchiseOnboardingStep,
): FranchiseOnboardingStatus | null {
  switch (step) {
    case 1:
      return "details_submitted";
    case 2:
      return "territory_submitted";
    case 3:
      return "kyc_submitted";
    case 5:
      return "franchise_ack";
    case 6:
      return "operations_submitted";
    default:
      return null;
  }
}

// ── Who completes what ──────────────────────────────────────────────────────

/**
 * The steps a franchisee's submission may never complete, because their completion is our
 * assertion (§7.4).
 *
 * Each is derived on read from the record that proves it: step 4 from an approval, step 7 from
 * a signature, step 8 from a verified payment. Nothing writes them into stored
 * `completedSteps`, and `franchiseeCommits` is what a submission path checks.
 */
export const COMPLETED_ON_READ_STEPS: readonly FranchiseOnboardingStep[] = [4, 7, 8];

export function franchiseeCommits(step: FranchiseOnboardingStep): boolean {
  return !COMPLETED_ON_READ_STEPS.includes(step);
}

/**
 * Stored completions plus the ones our own records imply.
 *
 * The gym flow's `withInstallationComplete` generalised: three steps instead of one, and the
 * shape is the point — a step is complete when the server's own record says so, so the
 * evidence is read at the moment the state is served rather than latched by whichever call
 * happened to notice first.
 */
export function completedStepsOnRead(
  stored: readonly FranchiseOnboardingStep[],
  state: Pick<FranchiseOnboardingState, "approval" | "payments" | "timestamps">,
): FranchiseOnboardingStep[] {
  const out = new Set<FranchiseOnboardingStep>(stored.filter(franchiseeCommits));

  if (state.approval?.outcome === "approved") out.add(4);
  if (state.timestamps.signedAt) out.add(7);
  if (state.payments.some((p) => p.instalment === 1 && p.verifiedAt !== null)) out.add(8);

  return [...out].sort((a, b) => a - b);
}

/**
 * `currentStep` is the lowest step not yet completed.
 *
 * Derived rather than incremented, which matters when a franchisee corrects step 1 while
 * sitting on step 6: recomputing leaves them on 6, whereas `+1` would knock them backwards.
 *
 * Returns 9 when everything is complete. Unlike the gym flow there is no step past the last
 * completable one, so there is no cap to get wrong here.
 */
export function deriveCurrentStep(
  completed: readonly FranchiseOnboardingStep[],
): FranchiseOnboardingStep {
  for (const step of FRANCHISE_ONBOARDING_STEPS) {
    if (!completed.includes(step)) return step;
  }
  return 9;
}

// ── The two freeze points ───────────────────────────────────────────────────

/** Steps whose values are rendered into the signed term sheet. */
const FROZEN_BY_SIGNATURE: readonly FranchiseOnboardingStep[] = [1, 2, 3, 5, 6];

/**
 * Why `step` can no longer be changed, as a sentence for the franchisee, or null if it can.
 *
 * Two freeze points, and conflating them is the mistake that is easy to make (§4).
 * `approvedAt` freezes the territory, because exclusivity attaches to what we granted and a
 * franchisee who could edit it afterwards could silently widen it. `signedAt` freezes
 * everything the term sheet renders.
 *
 * A third, narrower one: steps 1 and 3 close together when the documents are in, because the
 * uploaded PAN card is what evidences the PAN typed in step 1. Either half edited without the
 * other is a record its own documents no longer support, so one timestamp closes both.
 *
 * **A hold reopens the application.** While `on_hold`, steps 1 to 3 unfreeze, because a hold
 * is how we ask for a correction — and a hold that asked for a correction the flow then
 * refused to accept would be a dead end with no way out of it.
 */
export function freezeReason(
  state: Pick<FranchiseOnboardingState, "status" | "timestamps">,
  step: FranchiseOnboardingStep,
): string | null {
  if (state.timestamps.signedAt && FROZEN_BY_SIGNATURE.includes(step)) {
    return "This can't be changed now that the term sheet is signed. Contact us and we'll issue an amendment.";
  }
  if (state.status === "on_hold") return null;
  if (step === 2 && state.timestamps.approvedAt) {
    return "Your territory is fixed now that it has been approved. Contact us if it needs to change.";
  }
  if (step === 1 && state.timestamps.kycSubmittedAt) {
    return "Your details are locked now that your documents are in, because the documents have to match them. Contact us and we'll reopen this.";
  }
  if (step === 3 && state.timestamps.kycSubmittedAt) {
    return "Your documents are with us for review. Contact us if one of them needs replacing.";
  }
  return null;
}

/**
 * The first step that exists only for an approved franchise.
 *
 * The `currentStep` check catches this too — an unapproved record sits on step 4 — but
 * `not_approved` is the honest answer, and "please complete the earlier steps first" is not,
 * because there is no earlier step for the franchisee to complete.
 */
export const FIRST_STEP_REQUIRING_APPROVAL: FranchiseOnboardingStep = 5;

// ── Documents ───────────────────────────────────────────────────────────────

/**
 * What step 3 must have before it can be committed.
 *
 * `financial_evidence` is deliberately absent: it is optional, and asking for it by hand
 * during evaluation loses nothing because evaluation is a conversation regardless (§3).
 * `payment_proof` belongs to step 8 and is never required — a UTR is the claim.
 */
export function requiredDocumentTypes(entityType: EntityType): FranchiseDocumentType[] {
  const required: FranchiseDocumentType[] = ["pan_card", "address_proof", "signatory_id"];
  // An unregistered franchisee has no incorporation certificate, LLP agreement or partnership
  // deed to produce. Requiring one would make the answer `unregistered` exists for unusable.
  if (entityType !== "unregistered") required.splice(1, 0, "entity_proof");
  return required;
}

export function missingRequiredDocuments(
  entityType: EntityType,
  documents: readonly UploadedDocument[],
): FranchiseDocumentType[] {
  const held = new Set(documents.map((d) => d.docType));
  return requiredDocumentTypes(entityType).filter((type) => !held.has(type));
}
