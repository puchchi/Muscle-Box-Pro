/**
 * What the admin surface reads: the Gyms list, and one gym in full.
 *
 * These describe `GET /admin/gyms` and `GET /admin/gyms/{gymId}` in `mbp-backend`
 * (`docs/gym-onboarding-api-design.md` §2.1, and `lib/gymState.ts`'s `toAdminGymView`).
 *
 * **Written as a contract rather than inferred, because the server side has no contract to
 * infer from.** `toAdminGymView` returns `Record<string, unknown>` — every field is
 * assembled by hand and nothing on either side would notice a rename. That is the same
 * asymmetry that left `GET /gym/portal` wrong on eight fields with the whole backend suite
 * green, and the answer is the same one: state the shape here, check it at runtime in
 * `gymsSchema.ts`, and let a mismatch be a loud parse failure instead of a blank on screen.
 *
 * Three conventions, all load-bearing:
 *
 * - **Money is rupees, except where it is named otherwise.** `securityDepositInr`,
 *   `valueInr` — but `AdminDeposit.amountPaise`, because that is what the handler sends.
 *   `domain/adminInput.ts` refuses a fractional rupee outright rather than store one, since
 *   `depositPaiseToInr` in the agreement renderer *throws* rather than print a rounded
 *   figure into a contract.
 * - **`null` is an answer, absence is not.** A gym with no signature has `signature: null`,
 *   meaning "has not signed". Nothing here is optional, so a field the server stops sending
 *   fails the parse rather than reading as an absence someone will interpret.
 * - **Where the backend already answers a shared type, this reuses it.** `details` is a
 *   `GymDetails`, `terms` an `OnboardingTerms`, `timestamps` an `OnboardingTimestamps`,
 *   `machine` a `MachineSummary` — those are the literal return types of `detailsOf`,
 *   `termsOf`, `timestampsOf` and `machineOf`. Restating them here would create a second
 *   place for the same shape to drift.
 */

import type {
  DepositChoice,
  DepositStatus,
  GymDetails,
  MachineSummary,
  OnboardingStatus,
  OnboardingStep,
  OnboardingTerms,
  OnboardingTimestamps,
} from "../onboarding/types";
import type { MachineStatus } from "../gym/portal";

// ── The list ────────────────────────────────────────────────────────────────

/**
 * One row of the Gyms tab.
 *
 * Deliberately thin, and the thinness is the endpoint's design rather than an omission: the
 * handler comment notes that fanning out six reads per row to render a table of fifty would
 * be three hundred reads for a page nobody has scrolled. Anything not here is
 * `AdminGymView`, one gym at a time.
 */
export type AdminGymListRow = {
  gymId: string;
  tradeName: string;
  legalEntityName: string;
  /** Cosmetic in the onboarding URL, and never consulted for authorisation (§2.7). */
  slug: string;
  status: OnboardingStatus;
  noticesEmail: string;
  noticesPhone: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A page of gyms, newest first.
 *
 * `nextCursor` is null on the last page. The query runs over `gsi4-gymlist`, whose partition
 * is a single constant value with `createdAt` as the sort key — so newest-first is the only
 * order available and there is no server-side filter or search. Filtering by status is
 * therefore something the client does over the rows it has, and that is a documented scale
 * bound (§5: at thousands of gyms the index becomes a partition per status or per month),
 * not a gap to work around by fetching every page.
 */
export type AdminGymList = {
  gyms: AdminGymListRow[];
  nextCursor: string | null;
};

// ── One gym, in full ────────────────────────────────────────────────────────

/**
 * A unit this gym has, or has had — the full row, unlike `MachineSummary`.
 *
 * `machines` is not filtered to the live one, on purpose. `installationDate` starts the
 * contractual term (§4.1), so which unit was installed when is a fact someone will need
 * later — which is why `replaceMachine` marks the old row `replaced` rather than deleting it,
 * and why the whole history crosses the wire.
 *
 * `deviceNo` is a required string here and nullable on `MachineSummary`, which is not an
 * inconsistency: a row that exists has a device number, because `deviceNo` is part of its
 * sort key. The nullable one is a *projection* that has to represent "no unit at all".
 */
export type AdminMachine = {
  deviceNo: string;
  model: string;
  serialNumber: string | null;
  valueInr: number;
  accessories: string;
  /** An ISO calendar date, no time part. It renders into Schedule A, so the format is contractual. */
  installationDate: string | null;
  status: MachineStatus;
  /** An ISO timestamp, not a date — see `MachineRecord.lastServiceAt` for why. */
  lastServiceAt: string | null;
  replacedByDeviceNo: string | null;
  replacedAt: string | null;
};

/** Our own deposit record — the one only the webhook may mark paid. */
export type AdminDeposit = {
  depositId: string;
  status: DepositStatus;
  /**
   * Paise, and the one amount on this surface that is **not** rupees.
   *
   * `toAdminGymView` sends `amountPaise` for the deposits list while sending `valueInr` for
   * machines, so converting here would make this type disagree with the wire it describes.
   * Named for its unit so nobody divides twice.
   */
  amountPaise: number;
  /** §2.7 names this explicitly: reconciling against Razorpay's dashboard needs the link id. */
  linkId: string | null;
  paymentId: string | null;
  method: string | null;
  receiptNo: string | null;
  paidAt: string | null;
  createdAt: string | null;
  linkExpiresAt: string | null;
};

/**
 * A deposit that was let go, with a name against it.
 *
 * The deposit is skippable (`DepositChoice = "pay_later"`), so activation accepts a waiver in
 * its place. This record is what keeps a waived deposit distinguishable from a deposit nobody
 * chased — a difference that matters once the gym is already trading.
 */
export type AdminDepositWaiver = {
  reason: string;
  byEmail: string;
  at: string | null;
};

/**
 * The e-signature record.
 *
 * IP, user-agent and `contentHash` are here because they *are* the evidence: signing carries
 * no OTP today (§2.5), so what makes this a real e-signature record is a typed name, explicit
 * consent, a server timestamp and a hash of the exact text that was read.
 */
export type AdminSignature = {
  agreementVersion: string;
  contentHash: string;
  signatoryName: string;
  signatoryDesignation: string;
  agreedToAgreement: boolean;
  authorisedToBind: boolean;
  ip: string;
  userAgent: string;
  signedAt: string | null;
};

/** A version that was assembled and pinned for this gym. */
export type AdminAgreement = {
  version: string;
  effectiveDate: string;
  contentHash: string;
  length: number;
  viewedAt: string | null;
};

/**
 * The gym's current onboarding link, or null.
 *
 * **Null is an answer.** It distinguishes a voided invite from one nobody has used, which is
 * the question being asked when a gym says "the link didn't work".
 *
 * The handle itself is not here and cannot be: only `sha256(handle)` is stored, so a link is
 * recoverable exactly once — in the response to the request that minted it. `revokedAt` plus
 * `supersededByTokenId` is how a superseded link stays legible as evidence afterwards.
 */
export type AdminInvite = {
  tokenId: string;
  typ: string;
  /** Whose name the gym reads as their contact. `issuedByEmail` is the accountability record. */
  invitedByName: string;
  issuedByEmail: string;
  createdAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  supersededByTokenId: string | null;
};

/**
 * One gym, completely — §2.7: *"the one that needs to be genuinely complete."*
 *
 * It answers "why is this gym stuck?", and a partial answer sends whoever asked to the
 * DynamoDB console, which is the state this panel exists to leave. That is the reason this
 * type is wide rather than a summary: every field here is one someone reaches for while
 * diagnosing, and the alternative to holding them all is a round trip per question.
 */
export type AdminGymView = {
  gymId: string;
  slug: string;
  status: OnboardingStatus;
  /** Derived from `completedSteps`, never incremented — a counter is what lets a resumed link skip a step. */
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  timestamps: OnboardingTimestamps;
  details: GymDetails;
  terms: OnboardingTerms;
  termsUpdatedByEmail: string;
  /**
   * The live unit as the **wizard** projects it — `machineOf`, which answers the fields
   * Schedule A quotes rather than the operational pair.
   *
   * **Never null, and that is the trap.** `machineOf(null)` returns a zero-valued summary
   * (`deviceNo: null`, `model: ""`, `valueInr: 0`), so "no unit allocated" reads as
   * `machine.deviceNo === null` — not as `machine === null`, which never happens. Checking
   * the wrong one shows a gym with no machine a ₹0 unit called "".
   *
   * `status` and `lastServiceAt` are not on this projection at all; they are in `machines`.
   */
  machine: MachineSummary;
  machines: AdminMachine[];
  depositStatus: DepositStatus;
  deposits: AdminDeposit[];
  depositChoice: DepositChoice | null;
  depositWaiver: AdminDepositWaiver | null;
  signature: AdminSignature | null;
  agreements: AdminAgreement[];
  invite: AdminInvite | null;
  activatedAt: string | null;
  activatedByEmail: string | null;
};
