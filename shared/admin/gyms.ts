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

/**
 * The device number on a unit that has been costed but not yet chosen.
 *
 * Mirrors `domain/ids.ts`'s `newPendingDeviceNo`/`isPendingDeviceNo` in `mbp-backend` — same
 * prefix, same reason: `POST /admin/gyms` writes a machine row with model and value at invite
 * time even when the admin has not picked a physical unit, because `deviceNo` cannot be blank
 * on the row (it is `gsi1-device`'s partition key). This side has to know the convention too,
 * or "no unit chosen yet" renders as a real device with a serial number attached — see
 * `AdminGymDetail.tsx`'s Machine card, the one place this actually matters.
 *
 * If the backend's prefix ever changes, this constant has to change with it — there is no way
 * to derive one from the other across the repo boundary, which is exactly why this docstring
 * points back at the source of truth rather than re-deriving the reasoning.
 */
const PENDING_DEVICE_PREFIX = "PENDING-";

export function isPendingDeviceNo(deviceNo: string | null): boolean {
  return deviceNo !== null && deviceNo.startsWith(PENDING_DEVICE_PREFIX);
}

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

// ── Offboarding ─────────────────────────────────────────────────────────────

/**
 * The offboarding ladder — `mbp-backend`'s `domain/offboarding.ts`, not ours.
 *
 * Forward-only and, unlike `OnboardingStatus`, genuinely terminal: `settled` is the end of the
 * relationship, not a step to progress from. That is why the admin panel treats a gym with an
 * offboarding record as read-mostly — the write actions that assume a live agreement (terms,
 * machine) are refused past `terminated` server-side, so offering them would be a button whose
 * only outcome is a 409.
 */
export type OffboardingState = "notice_served" | "terminated" | "machine_recovered" | "settled";

/**
 * Why the agreement ended. The document's four causes, not a taxonomy of our own.
 *
 * There is deliberately no `mbp_convenience`: §35 gives us no right to terminate at will, so a
 * member for it would be a state the contract does not permit. See `TerminationCause` in
 * `mbp-backend`'s `domain/offboarding.ts` for the clause behind each.
 */
export type TerminationCause = "gym_notice" | "gym_breach" | "mutual" | "term_expiry";

/** What may be taken out of the deposit before it goes back. §38, §35 and §37.6. */
export type DeductionKind = "outstanding_dues" | "retrieval_costs" | "damage" | "other";

/**
 * One line of a settlement, in **both** units.
 *
 * The rest of this file sends rupees and drops the paise; this response does not, and the
 * asymmetry is the backend's on purpose. `offboardingOf`'s docstring gives the reason: this is
 * the one figure an admin reads while deciding what to pay out of a bank account, and it has to
 * reconcile against a Razorpay statement to the paise. So the exact integer travels beside the
 * readable one rather than instead of it.
 */
export type AdminDeduction = {
  kind: DeductionKind;
  amountPaise: number;
  amountInr: number;
  note: string;
};

/**
 * The deposit split at the end of the relationship.
 *
 * **Recorded, not paid.** Nothing in the onboarding service moves money, so `payableToGymPaise`
 * is a figure a human pays from the Razorpay dashboard afterwards. The panel has to say that out
 * loud beside it, because the one misreading that costs real money is a payable read as a
 * payment already made.
 *
 * `payableToGymPaise` and `shortfallPaise` are two fields rather than one signed number for the
 * reason `settlementFigures` gives: the first thing anything downstream does with a payable is
 * pay it, so a negative payable is one sign flip away from paying a receivable.
 */
export type AdminOffboardingSettlement = {
  depositHeldPaise: number;
  depositHeldInr: number;
  deductionsPaise: number;
  deductionsInr: number;
  payableToGymPaise: number;
  payableToGymInr: number;
  shortfallPaise: number;
  shortfallInr: number;
  deductions: AdminDeduction[];
  /** §5.x: thirty days from *retrieval*, not from termination. */
  dueAt: string | null;
  recordedByEmail: string;
};

/**
 * The offboarding record, or null — and **null is the ordinary case**, not a fault.
 *
 * The row does not exist until the first offboarding action (§11), so almost every gym has
 * `offboarding: null`. It is on the shared read rather than only in the offboarding handlers
 * because every one of those handlers needs it anyway, and because a detail page that had to
 * fetch it separately would show a terminated gym as live for one render.
 *
 * `earlyAgainstNotice` is stored rather than derived: §37.6 makes retrieval costs recoverable
 * where removal was required *without* the §36.1 notice, and cutting a served notice short is
 * that case. Recomputing it at settlement time would compare against a notice row that may have
 * been corrected since, so the answer is whatever was true when we terminated.
 */
export type AdminOffboarding = {
  state: OffboardingState;
  notice: {
    receivedAt: string | null;
    /** §36.1's thirty days, counted from 00:00 IST on the day the notice arrived. */
    effectiveAt: string | null;
    /** Free text, because §41 does not close the set of ways a notice can arrive. */
    channel: string;
    recordedByEmail: string;
    recordedAt: string | null;
  } | null;
  cause: TerminationCause | null;
  reason: string | null;
  earlyAgainstNotice: boolean | null;
  terminatedAt: string | null;
  terminatedByEmail: string | null;
  loginsDisabled: boolean | null;
  machineRecoveredAt: string | null;
  machineRecoveredByEmail: string | null;
  recoveredDeviceNo: string | null;
  machineCondition: string | null;
  settlement: AdminOffboardingSettlement | null;
  settledAt: string | null;
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
   * A second, related trap since 2026-08-23: `deviceNo` being non-null no longer means a real
   * unit exists. `POST /admin/gyms` allocates a machine row (with a real model and value) even
   * when the admin has not chosen a physical unit yet, and fills `deviceNo` with a
   * `PENDING-`-prefixed placeholder rather than leaving it null — because the field is
   * `gsi1-device`'s partition key and cannot be blank on a written row. Check
   * `isPendingDeviceNo(machine.deviceNo)` before treating a device number as a real allocation.
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
  /**
   * Null for almost every gym. See `AdminOffboarding`.
   *
   * `toAdminGymView` has always sent this field; this side only started declaring it on
   * 2026-08-28, which means it was being silently stripped by `gymsSchema`'s `z.object()` until
   * then. That is the strip direction working as intended — a field the backend adds must not
   * break the panel — but it also means a terminated gym read as a live one on this screen for
   * as long as the field went undeclared.
   */
  offboarding: AdminOffboarding | null;
};
