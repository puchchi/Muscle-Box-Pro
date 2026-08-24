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

/**
 * 1 Confirm Your Details · 2 Your Partnership · 3 Review & Sign · 4 Deposit ·
 * 5 You're Set Up · 6 Installation
 *
 * Step 6 is the odd one and deliberately in the list anyway. Every step before it is
 * something the gym does; 6 is something we do, and the gym's copy of it is read-only —
 * which unit was allocated, when it is going in, and what gets verified on site. It is a
 * step rather than a dashboard panel because it is the answer to the question every gym
 * asks the day after signing, and because the emailed link is where they will look for it.
 * Nothing completes it from the client: the server marks it done when the Installation
 * Certificate exists (agreement §17.2, Schedule A).
 */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [1, 2, 3, 4, 5, 6];

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

/**
 * `unregistered` added 2026-08-24, for a gym with no registered entity behind it.
 *
 * It is an answer, not the absence of one: without it, a one-person gym had to claim
 * `proprietorship`, which names a constitution someone could be asked to evidence. Nothing
 * contractual turns on the choice — the agreement identifies the parties by `legalEntityName` and
 * the signatory's §32 representation, and never prints the entity type — so this only changes what
 * we know about who we are invoicing.
 *
 * Mirrored in `ENTITY_TYPES` in mbp-backend's `domain/contract.ts`, which is what actually accepts
 * or refuses the value, and in `entityType` in `shared/admin/gymsSchema.ts`.
 */
export type EntityType = "proprietorship" | "partnership" | "llp" | "pvt_ltd" | "unregistered";

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

  /**
   * The issued document, set when the gym becomes entitled to see it rather than when
   * it signs — because the client cannot render a hashable agreement until the server
   * has told it which version and, critically, which date.
   *
   * Null before issuance, and non-null in one piece afterwards. There is no state where
   * a version exists without a hash: the server renders and hashes in the same call
   * that fixes the date, so a half-issued document is not representable.
   */
  agreement: IssuedAgreement | null;
};

/**
 * The document the server has pinned for this gym: which version, dated when, and the
 * exact bytes it renders to.
 *
 * **The server computes `contentHash`, not the client.** This is the direction that
 * matters and it is the reverse of what the mock originally did. A hash the browser
 * supplied and the server stored proves only that some client did some arithmetic —
 * the server cannot verify a signature against a hash it never computed, and a browser
 * running stale JavaScript would have quietly signed a different document from the one
 * on the record. Now the server renders the text at issuance, stores the hash, and at
 * signing renders it again and compares. See `mbp-backend`'s
 * `docs/gym-onboarding-api-design.md` §2.9.
 *
 * `effectiveDate` is server-owned for the same reason: §4.1's Effective Date is rendered
 * *into* the agreement text, so it is part of what gets hashed. Taking it from the
 * browser's clock made the hash non-deterministic — a gym opening the reader at 23:58
 * IST and signing four minutes later hashed a document dated yesterday, while the
 * signature record said today, and a machine with a skewed clock or a different timezone
 * produced a different hash again for the identical agreement. Re-rendering server-side
 * to verify would then never reproduce it. The server's own clock is not off the hook
 * either: it must resolve the date in `Asia/Kolkata`, because a Lambda running UTC dates
 * a 03:00 IST signature to the previous day.
 */
export type IssuedAgreement = {
  version: string;
  /** ISO date, resolved in `Asia/Kolkata`. Enters the hashed text. */
  effectiveDate: string;
  /** SHA-256 of the rendered plain text, lowercase hex. Computed server-side. */
  contentHash: string;
  /**
   * Character count of the same rendering. Not decoration: it is what tells a mismatch
   * apart from a substitution when the client's own rendering disagrees.
   */
  length: number;
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
   * SHA-256 of the exact text that was on screen, computed independently by this client.
   *
   * Still sent, and still required, but its job changed with the inversion: it is no
   * longer what gets stored. The server stores the hash *it* computed at issuance and
   * compares this one against it, answering `content_mismatch` if they differ. Echoing
   * `state.agreement.contentHash` back would satisfy the type and check nothing, so
   * clients compute it — the value of the field is precisely that it came from somewhere
   * else. See `checkIssuedAgreement` in `issuedAgreement.ts`.
   */
  contentHash: string;
  /**
   * Proves control of the address the agreement was sent to, at the moment of signing.
   *
   * Optional, and currently never sent: signing ships without OTP because SES is not
   * live, and the endpoint **rejects** a payload that carries this field rather than
   * ignoring it — a client sending a code that nothing verifies is worse than no code,
   * because the screen tells the gym its address was checked. `SIGNING_REQUIRES_OTP` is
   * the switch; see its docstring.
   */
  otpCode?: string;
};

/**
 * Whether the signing panel asks for an emailed code.
 *
 * False until SES is live. The backend rejects `otpCode` outright while this is false,
 * so the two must be flipped in the right order: backend first to accept the field,
 * frontend second to start sending it. Flipping this alone makes every signature fail.
 *
 * It is a constant rather than a deleted feature because OTP is an added precondition on
 * the same endpoint, not a redesign of it — the panel's second phase, the resend button
 * and `requestSigningOtp` all stay wired and tested behind it. Deleting them and
 * rebuilding later is how the §41-notices-address reasoning gets lost.
 */
export const SIGNING_REQUIRES_OTP: boolean = false;

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
  /**
   * The hash the client computed is not the hash the server pinned — the document on
   * screen is not the document on the record.
   *
   * Its own code rather than a `validation` error with a `contentHash` field error,
   * because nothing the gym typed is wrong and the wizard would otherwise highlight a
   * field nobody filled in. The realistic cause is legitimate: `PATCH .../terms` is
   * blocked only by `signedAt`, so an admin can re-price a gym between the moment the
   * reader loaded and the moment it signed. The recovery is to reload the step and read
   * the reissued document, which is a different instruction from "fix your input".
   */
  | "content_mismatch"
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
