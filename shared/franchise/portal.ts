/**
 * What the franchise portal is given, and what it is not.
 *
 * `shared/gym/portal.ts` is the model and its reasoning holds here unchanged, so read that
 * one first. This is the response shape of `GET /franchise/portal`, and it is written before
 * the dashboard so that a card cannot reach past it.
 *
 * The difference from the gym's is how much of it is absent. The program document lists
 * eighteen things a franchisee should see; sales, cup consumption, operating costs,
 * advertising income, distributable profit, payouts, capital recovery progress, per-machine
 * status, statements and alerts all wait on a settlement pipeline that does not exist. Those
 * ship as `{ available: false, reason: "not_implemented" }`, and the rule the gym portal
 * states is the reason this type is mostly holes: **absent, not zero. A dashboard showing ₹0
 * settled is a claim about the world.**
 *
 * What *is* here is the record itself: the terms that bind, the territory that was granted,
 * the instalments as claimed and as verified, and the executed agreement. Every one of those
 * is a fact we already hold, so none of it is a promise.
 *
 * Two things are deliberately absent and are not oversights:
 *
 *   - **No document URLs.** `UploadedDocument` carries none, and `onboarding/types.ts` says
 *     adding one would be a mistake. The portal shows that a file arrived.
 *   - **No bank details.** The franchisee's payout account is a post-activation setting with
 *     no route behind it yet, and `PaymentInstructions` is *our* account, which belongs in
 *     the wizard where money is being sent and nowhere else.
 */

import type { PortalAbsence, PortalSection } from "../gym/portal";
import type {
  EsignSignType,
  FranchiseOnboardingStatus,
  FranchisePayment,
  FranchiseTerms,
  OperationsReadiness,
  UploadedDocument,
} from "./onboarding/types";

/**
 * The same wrapper the gym portal uses, imported rather than redeclared.
 *
 * Not tidiness: `reason` selects the copy on screen, and two enums would let one dashboard
 * gain a third absence reason that the other silently renders as whichever branch its
 * component wrote last. The cards in `client/src/pages/gym/portalCards.tsx` are shared
 * between the two screens, so they narrow one type or they narrow nothing.
 */
export type { PortalAbsence, PortalSection };

/**
 * A section that cannot have data yet, and says so in its type.
 *
 * `PortalSection<never>` rather than a speculative payload per section. `{ available: true;
 * data: never }` is uninhabitable, so this states "today this can only be absent" without
 * inventing ten shapes for pipelines nobody has designed — and whoever builds one is forced
 * by the compiler to replace `never` with the real thing rather than filling a guess.
 */
export type UnbuiltSection = PortalSection<never>;

/**
 * The territory as granted, which exists only on an approval (§3).
 *
 * The tier is **not** repeated here. It lives on `FranchiseTerms`, which is the record that
 * binds, and `ApprovalView` refuses the same duplication for the same reason: a second copy
 * is free to disagree with the first.
 */
export type GrantedTerritory = {
  territory: string;
  territoryBoundary: string;
  /** ISO timestamp the approval was recorded. */
  decidedAt: string;
};

/**
 * The executed agreement: which document, and the signature on it.
 *
 * The issued pin and the signature flattened into one object, because a franchisee reading
 * this is asking one question and the two halves are useless apart. Rendered as "agreement"
 * on screen even though the PDF is titled Term Sheet.
 *
 * `contentHash` is on the wire so the dashboard can show the same reference as the emailed
 * copy. `signedPdfHash` is not: two fingerprints on one screen is an invitation to compare
 * the wrong pair.
 */
export type ExecutedAgreement = {
  version: string;
  /** ISO date, resolved in `Asia/Kolkata` by the server. */
  effectiveDate: string;
  /** ISO date the term sheet lapses if the definitive agreement is not executed. */
  validUntil: string;
  /** SHA-256 of the rendered text. The UI truncates it and labels it a reference. */
  contentHash: string;
  /** ISO timestamp. Formatted in IST on this side, as `MachineRecord.lastServiceAt` explains. */
  signedAt: string;
  signerName: string;
  signType: EsignSignType;
};

export type FranchisePortalSnapshot = {
  franchiseId: string;
  /**
   * The trade name, or the legal entity name where there is no trade name.
   *
   * The fallback is the server's, not the browser's: a franchise record can carry an empty
   * `tradeName` legitimately, and validating this as non-empty here without the fallback
   * would fail the whole snapshot and blank a working dashboard over a cosmetic field.
   */
  franchiseDisplayName: string;
  /** Where the record stands. Everyone who can sign in has at least reached `payment_verified`. */
  onboardingStatus: FranchiseOnboardingStatus;
  user: { email: string; role: string };

  /** That franchise's own terms row, never `shared/franchise/program.ts`. */
  terms: FranchiseTerms;
  /** Null before an approval, which for anyone holding a login means never. */
  territory: GrantedTerritory | null;
  /** Step 6 as submitted. Null if the record predates it. */
  operations: OperationsReadiness | null;
  /** Latest per document type, newest first. Names and sizes; no URLs. */
  documents: UploadedDocument[];
  /**
   * Every instalment on the record, not just the first.
   *
   * An empty array is "nothing is due yet", which is not absence, so this is not wrapped in
   * `PortalSection`: the instalments are rows we hold, and the same `franchiseeVisiblePayment`
   * projection the wizard uses produces them.
   */
  payments: FranchisePayment[];
  agreement: ExecutedAgreement | null;

  /**
   * The settlement half of the program document (§22). All ten are `not_implemented` today
   * and none of them can be faked from what the record holds.
   */
  sales: UnbuiltSection;
  consumption: UnbuiltSection;
  costs: UnbuiltSection;
  advertising: UnbuiltSection;
  profit: UnbuiltSection;
  payouts: UnbuiltSection;
  /**
   * Progress *towards* recovery. `terms.capitalRecoveryPaise` — the threshold — is available
   * and sits beside this on screen; how much of it has been recovered needs the pipeline.
   * Named for the progress rather than for the subject so the card cannot read as a
   * contradiction of the threshold printed next to it.
   */
  capitalRecoveryProgress: UnbuiltSection;
  /**
   * Per-machine status. Absent for a harder reason than the rest: `repo/machines.ts` is keyed
   * by gym, so there is no franchise machine record to read a status off at all.
   * `terms.machineAllocation` is the count that was agreed, and that is a different claim.
   */
  machines: UnbuiltSection;
  statements: UnbuiltSection;
  alerts: UnbuiltSection;

  /** ISO timestamp the record was read. Shown, because a stale dashboard lies. */
  asOf: string;
};
