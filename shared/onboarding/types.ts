/**
 * The onboarding API contract.
 *
 * Written before the backend exists, deliberately. The wizard talks to
 * `OnboardingApi` and nothing else; phase 1 wires it to `createMockOnboardingApi`
 * and phase 2 swaps in edge-function calls. If a component ever reaches past this
 * interface, that swap stops being a one-file change. See docs/gym-onboarding.md §8.
 *
 * The invariant this file exists to protect: **the server owns `currentStep`.**
 * Nothing here lets a client assert which step it is on. It asks, and it submits
 * against what it was told. A stale tab or a hand-edited URL therefore cannot skip
 * the agreement or re-enter signing. See §4.
 */

// ── Steps and status ────────────────────────────────────────────────────────

/** 1 Confirm Your Details · 2 Your Partnership · 3 Review & Sign · 4 Deposit · 5 You're Set Up */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [1, 2, 3, 4, 5];

/**
 * Lifecycle, in order. Persisted as `gym_onboarding.status`.
 *
 * `signed` is the commercial milestone, not `active` — a gym that signed and never
 * paid the deposit is a partner with a receivable, not a lapsed lead (§3, step 4).
 */
export type OnboardingStatus =
  | "invited"
  | "opened"
  | "details_submitted"
  | "partnership_ack"
  | "agreement_viewed"
  | "signed"
  | "deposit_paid"
  | "active";

export type DepositStatus = "not_started" | "pending" | "paid" | "deferred";

export type EntityType = "proprietorship" | "partnership" | "llp" | "pvt_ltd";

// ── The state the server hands back ─────────────────────────────────────────

/** Step 1's payload. Prefilled from the demo request where we have it. */
export type GymDetails = {
  legalEntityName: string;
  entityType: EntityType;
  /** The name on the door, if it differs from the legal entity. */
  tradeName: string;
  gstin: string;
  /** Optional: §24.5 makes each party responsible for its own registrations. */
  fssaiLicenceNumber: string;
  registeredAddress: string;
  installationAddress: string;
  signatoryName: string;
  signatoryDesignation: string;
  /** §41 notices block. */
  noticesEmail: string;
  noticesPhone: string;
};

/**
 * That gym's commercials, from `gym_terms` — not from
 * `shared/partnership/summary.ts`.
 *
 * The public page is indicative; this is the row that binds. Step 2 and the
 * agreement must both read from here, or a gym with a negotiated deposit sees
 * ₹50,000 on one screen and its real figure on another.
 */
export type OnboardingTerms = {
  securityDepositInr: number;
  termMonths: number;
  gymSharePctBeforeMilestone: number;
  gymSharePctAfterMilestone: number;
  milestoneCups: number;
  /** §6.1's profit test: cumulative §7 Net Profit, not cumulative gross sales. */
  milestoneNetProfitInr: number;
  advertisingGymSharePct: number;
  electricityInrPerBlock: number;
  electricityCupsPerBlock: number;
  electricityReviewWindowMonths: number;
  settlementDaysAfterMonthEnd: number;
  /**
   * Schedule B's early-termination charge, in rupees.
   *
   * Zero is the standard term and means it: the exit price is nil provided the gym
   * gives §36.1's 30 days' written notice. Null is still available for a gym whose
   * charge is genuinely unagreed, so the two cases stay distinguishable — a blank
   * printing as "₹0" is how a placeholder becomes a term nobody chose.
   */
  earlyTerminationChargeInr: number | null;
};

export type MachineSummary = {
  model: string;
  /** The join key to mbp-backend. Null until a unit is allocated. */
  deviceNo: string | null;
  serialNumber: string | null;
  valueInr: number;
  accessories: string;
  /** §4.1: the term runs from the later of signing and installation, so this is separate. */
  installationDate: string | null;
};

/** One per transition, so the admin funnel comes for free (§4). */
export type OnboardingTimestamps = {
  invitedAt: string | null;
  firstOpenedAt: string | null;
  detailsSubmittedAt: string | null;
  partnershipAckAt: string | null;
  agreementViewedAt: string | null;
  signedAt: string | null;
  depositInitiatedAt: string | null;
  depositPaidAt: string | null;
  accountCreatedAt: string | null;
};

/**
 * Per-step draft payloads, keyed by name rather than step number so a renumbering
 * of the wizard cannot silently repoint a draft at the wrong step.
 *
 * Drafts are always `Partial` — a draft is by definition incomplete, and the
 * submitted value lives outside `drafts` so a half-typed step 1 can never
 * overwrite a submitted step 1 (§4).
 */
export type StepDrafts = {
  details?: Partial<GymDetails>;
  signature?: Partial<SignatureInput>;
};

export type DraftKey = keyof StepDrafts;

export type OnboardingState = {
  tokenId: string;
  gymId: string;

  /** Authoritative. The client renders this; it never computes it. */
  currentStep: OnboardingStep;
  /** Genuinely finished, as distinct from drafted. */
  completedSteps: OnboardingStep[];
  status: OnboardingStatus;

  /**
   * Once true, steps 1 and 2 are frozen: the signature hash covers the rendered
   * agreement, which contains the step 1 values. Enforced server-side — the UI
   * is not a security boundary (§4).
   */
  isSigned: boolean;
  depositStatus: DepositStatus;
  /**
   * Set only when `depositStatus === "paid"`, and only by the server reading its own
   * `deposits` row — never from a redirect or a client callback (§5).
   */
  depositReceipt: DepositReceipt | null;

  /** Who sent the link, for the step 1 hero. */
  invitedByName: string;
  gymDisplayName: string;

  details: GymDetails;
  terms: OnboardingTerms;
  machine: MachineSummary;
  drafts: StepDrafts;
  timestamps: OnboardingTimestamps;

  /** Set once the agreement is signed, for the step 5 download. */
  agreement: { version: string; contentHash: string } | null;
};

// ── Inputs ──────────────────────────────────────────────────────────────────

export type SignatureInput = {
  fullName: string;
  designation: string;
  /** "I have read and agree to this Agreement" */
  agreedToAgreement: boolean;
  /** "I am authorised to bind <legal entity>" — §32, deliberately separate. */
  authorisedToBind: boolean;
  /**
   * SHA-256 of the exact text that was on screen. The load-bearing field: it
   * proves a later edit to the agreement content did not retroactively change
   * what was signed (§3, step 3).
   */
  contentHash: string;
  /** Proves control of the address the agreement was sent to, at the moment of signing. */
  otpCode: string;
};

export type DepositChoice = "pay_now" | "pay_later";

// ── Results ─────────────────────────────────────────────────────────────────

export type OnboardingErrorCode =
  /** No such token, or the signature does not verify. */
  | "invalid_token"
  /** Past its 30-day TTL (§7). */
  | "expired_token"
  /** Superseded by a resend, or voided by admin. */
  | "revoked_token"
  /** Submitted a step the server is not on. Carries `currentStep` so the UI can recover. */
  | "wrong_step"
  /** Steps 1–2 after signing. */
  | "frozen"
  /** The conditional `signed_at is null` write lost. Two tabs, one signature. */
  | "already_signed"
  | "validation"
  | "otp_invalid"
  | "network";

export type OnboardingError = {
  code: OnboardingErrorCode;
  message: string;
  /** Present on `wrong_step`, so the client can re-render where the server actually is. */
  currentStep?: OnboardingStep;
  /** Present on `validation`, keyed by field name. */
  fieldErrors?: Record<string, string>;
};

export type OnboardingResult<T> = { ok: true; data: T } | { ok: false; error: OnboardingError };

export type StateResult = OnboardingResult<OnboardingState>;

export type DraftSaveResult = OnboardingResult<{ savedAt: string }>;

/** Razorpay Payment Link, per §5. The gym navigates off-site and comes back. */
export type DepositLink = { paymentUrl: string; linkId: string; amountPaise: number };

/**
 * What the gym is shown once our own record says the money arrived.
 *
 * Amount in paise because that is what the gateway settles in and what the record
 * stores; the rupee figure is a rendering. `method` is here because a gym owner
 * recognises "UPI" faster than a receipt number when reconciling their own bank
 * statement, and reconciliation is the only reason this panel exists.
 *
 * What it deliberately does not carry is any tax characterisation, even though the
 * question is settled: no GST at collection, and the document is a receipt rather than
 * a tax invoice, because a refundable deposit is not consideration for a supply under
 * CGST Act §2(31) (agreement §5.9). It stays off the type because the moment part of a
 * deposit is applied or forfeited that portion *does* become consideration and needs a
 * tax document of its own — so the characterisation belongs to the document being
 * issued, not to this record.
 */
export type DepositReceipt = {
  receiptNo: string;
  amountPaise: number;
  /** As reported by the gateway: "UPI", "netbanking", "card". */
  method: string;
  paidAt: string;
};

// ── The interface ───────────────────────────────────────────────────────────

/**
 * Every call takes the token. There is no session — the token *is* the
 * authorisation, scoped to exactly one `gym_id` (§7).
 *
 * Every mutating call re-returns the whole state rather than a patch, so the
 * client cannot drift from the server by applying an update optimistically and
 * getting it subtly wrong.
 */
export interface OnboardingApi {
  /** Also records `first_opened_at`, `first_open_ip` and `first_open_ua` on first call. */
  getState(token: string): Promise<StateResult>;

  /**
   * Debounced draft write. Deliberately NOT part of step progression: saving a
   * draft never advances `currentStep` and never marks a step complete.
   */
  saveDraft<K extends DraftKey>(
    token: string,
    key: K,
    value: NonNullable<StepDrafts[K]>,
  ): Promise<DraftSaveResult>;

  submitDetails(token: string, input: GymDetails): Promise<StateResult>;

  /** Step 2 has no input; continuing is itself the evidence the commercials were shown. */
  ackPartnership(token: string): Promise<StateResult>;

  /** Called when step 3 first renders, for the audit trail. Idempotent. */
  markAgreementViewed(token: string): Promise<StateResult>;

  requestSigningOtp(token: string): Promise<OnboardingResult<{ sentTo: string }>>;

  signAgreement(token: string, input: SignatureInput): Promise<StateResult>;

  /** `pay_now` returns a link; `pay_later` moves straight to step 5 with a pending deposit. */
  chooseDeposit(
    token: string,
    choice: DepositChoice,
  ): Promise<OnboardingResult<{ state: OnboardingState; link: DepositLink | null }>>;

  /** Polls our own record, never a client callback — the webhook is the source of truth (§5). */
  refreshDepositStatus(token: string): Promise<StateResult>;

  /** Creates the portal account. Lands after signing, before the deposit clears (§3, step 5). */
  createAccount(token: string, password: string): Promise<StateResult>;
}
