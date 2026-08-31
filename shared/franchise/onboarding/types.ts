/**
 * The franchise onboarding API contract.
 *
 * Same shape and the same discipline as `shared/onboarding/types.ts`, which should be read
 * first: the wizard talks to `FranchiseOnboardingApi` and nothing else, so swapping the mock
 * for HTTP is a one-file change in `client/src/lib/franchiseOnboardingApi.ts`. See
 * docs/franchise-onboarding.md §10.
 *
 * The invariant that file exists to protect carries over unchanged: **the server owns
 * `currentStep`.** Nothing here lets a client assert which step it is on.
 *
 * Two invariants are new, and both come from steps this flow has that the gym flow does not.
 *
 * **A franchisee cannot complete a step whose completion is our assertion.** Step 4 (approval)
 * and step 8 (the first instalment) are ours, so there is no method below that completes
 * either. They complete on read, from the approval record and from a verified payment, the way
 * `withInstallationComplete` completes the gym flow's step 6 (§7.4). If a method is ever added
 * that writes 4 or 8 into `completedSteps`, that rule is gone.
 *
 * **The signature is not ours to affix.** `requestEsign` hands off to Digio and
 * `refreshEsignStatus` reads our own record. There is deliberately no `sign()` — nothing a
 * client calls may mark a term sheet signed, exactly as no client callback may mark a gym's
 * deposit paid (§6.4).
 */

import type { FranchiseTierId } from "../program";
// The gym flow's answer to "what kind of entity is this", reused verbatim rather than
// re-declared, including `unregistered`. A franchisee is a counterparty of the same kinds.
import type { EntityType } from "../../onboarding/types";

// ── Steps and status ────────────────────────────────────────────────────────

/**
 * 1 Your details · 2 Your territory · 3 KYC and documents · 4 Approval ·
 * 5 Your franchise · 6 Operations readiness · 7 Review and sign ·
 * 8 First instalment · 9 You're set up
 *
 * Nine, grouped into four phases by `shared/franchise/onboarding/steps.ts`. The grouping is
 * not decoration: nine equally-weighted steps read as a long ladder, and the phase is the
 * real answer to "how far through am I" (docs/franchise-onboarding.md §3).
 */
export type FranchiseOnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const FRANCHISE_ONBOARDING_STEPS: readonly FranchiseOnboardingStep[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
];

/**
 * Lifecycle. Forward-only, with exactly one cycle and one absorbing state — see
 * `./status.ts`, which is the only place that decides whether a transition is allowed.
 *
 * `signed` is the commercial milestone rather than `payment_verified`, on the gym flow's
 * reasoning about `signed` versus `deposit_paid`: a franchisee who executed a binding term
 * sheet and has not yet transferred is a counterparty with a receivable.
 */
export type FranchiseOnboardingStatus =
  | "invited"
  | "opened"
  | "details_submitted"
  | "territory_submitted"
  | "kyc_submitted"
  | "under_review"
  /** The three outcomes of step 4. `declined` is terminal; `on_hold` is not. */
  | "approved"
  | "on_hold"
  | "declined"
  | "franchise_ack"
  | "operations_submitted"
  | "termsheet_viewed"
  | "esign_requested"
  | "signed"
  | "payment_claimed"
  | "payment_verified"
  | "active";

// ── What the franchisee submits ──────────────────────────────────────────────

/**
 * Step 1. The gym flow's `GymDetails` plus what a ₹25 lakh counterparty needs.
 *
 * Every field is present-but-possibly-empty rather than optional, so `franchiseDetailsSchema`
 * has matching input and output types and can drive a react-hook-form resolver directly.
 * `cin` and `llpin` are therefore blank rather than absent for an entity type that has
 * neither.
 *
 * **No bank details.** The franchisee's payout account is a portal setting after activation
 * and there is nothing to pay out during onboarding. Collecting one here would put a bank
 * account behind a handle that travels in a URL (§3).
 */
export type FranchiseDetails = {
  legalEntityName: string;
  entityType: EntityType;
  /** The name the territory trades under, and the source of the URL slug. */
  tradeName: string;
  /** Mandatory: the term sheet identifies its counterparty by PAN, and Digio needs it. */
  pan: string;
  gstin: string;
  /** Companies only. */
  cin: string;
  /** LLPs only. */
  llpin: string;
  registeredAddress: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatoryPan: string;
  /**
   * The last four digits, and never more.
   *
   * Aadhaar eSign binds a signature to an Aadhaar identity, and this is how we know which
   * identity we asked Digio to bind. The full number is a regulated identifier with storage
   * obligations we have no reason to take on, and Digio holds the audit trail that is the
   * actual evidence. Collected for reconciliation, not for verification (§6.5).
   */
  signatoryAadhaarLast4: string;
  noticesEmail: string;
  noticesPhone: string;
};

/**
 * Step 2. What the franchisee asks for.
 *
 * Deliberately **not** what they get: the granted territory lives on `ApprovalView` as
 * separate strings. They are usually the same and must stay separately representable,
 * because the case that matters is the one where we approve three suburbs of five and a
 * record that overwrote the request would lose the fact that anything was cut (§3).
 *
 * Free text, and no map. A drawn boundary looks precise and is not, and exclusivity would
 * then turn on whether a gym falls inside a shape somebody dragged in a browser.
 */
export type TerritoryProposal = {
  tier: FranchiseTierId;
  proposedTerritory: string;
  proposedBoundary: string;
  existingRelationships: string;
};

/** Step 6. §24, §27 and §28 of the program document, collected before the term sheet is issued. */
export type OperationsReadiness = {
  warehouseAddress: string;
  warehouseAreaSqft: number;
  /**
   * An answer, not the absence of one — the `unregistered` argument in `EntityType` applied
   * to a checkbox. A boolean defaulting to false records "no" from a franchisee who was
   * never asked, and §24 makes storage conditions load-bearing.
   */
  temperatureControl: "yes" | "no";
  /** Frequently not the signatory: this is whoever actually refills machines. */
  operationsContactName: string;
  operationsContactPhone: string;
  deploymentPlan: string;
  /**
   * "Undecided" is allowed and is not a blocker. A franchisee who has not contracted
   * logistics before signing is normal; one who cannot say where the protein will be stored
   * is a §24 problem, which is why the warehouse fields are required and this is not.
   */
  logisticsArrangement: "own_vehicle" | "contracted" | "undecided";
};

/** Step 8. What the franchisee tells us they transferred (§7.3). */
export type PaymentClaimInput = {
  /** The bank's reference for the transfer. Permissive by design — see the schema. */
  utr: string;
  /** In paise, as claimed. Deliberately not the amount we credit. */
  amountPaise: number;
  /** ISO date of the transfer, as the franchisee reports it. */
  paidOn: string;
  /** A `DOCUMENT#` id for a screenshot of the transfer, if they attached one. */
  proofDocId: string | null;
};

// ── Documents ───────────────────────────────────────────────────────────────

export type FranchiseDocumentType =
  | "pan_card"
  | "entity_proof"
  | "address_proof"
  | "signatory_id"
  /** Optional on purpose: it is the field a serious applicant supplies and a hesitant one abandons over (§3). */
  | "financial_evidence"
  | "payment_proof";

/**
 * What the franchisee is shown about a file they uploaded: that it arrived, and nothing else.
 *
 * **There is no URL on this type, and adding one would be a mistake.** The onboarding handle
 * travels in a URL — browser history, a forwarded email, a support ticket — and a handle that
 * authorises reading someone's identity documents has a blast radius the same handle
 * authorising a nine-step form does not. Nothing in the flow requires re-reading an upload.
 * Admins read through a short-lived presigned GET behind an admin session (§9).
 */
export type UploadedDocument = {
  docId: string;
  docType: FranchiseDocumentType;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
};

export type DocumentUploadInput = {
  docType: FranchiseDocumentType;
  fileName: string;
  file: Blob;
};

// ── Approval ────────────────────────────────────────────────────────────────

export type ApprovalOutcome = "approved" | "on_hold" | "declined";

/**
 * Step 4 as the franchisee sees it. A union rather than one object with optional fields,
 * so the shapes cannot be mixed.
 *
 * **`declined` carries no reason, and the type is what enforces that.** The reason is
 * recorded on the `APPROVAL` item for us. A generated sentence explaining a commercial
 * judgment is the kind of text that gets quoted back, and territory availability is often
 * the real reason and is not ours to publish (§3). With a single object shape, someone
 * would eventually populate a `reason` field that was already on the wire.
 */
export type ApprovalView =
  | {
      outcome: "approved";
      decidedAt: string;
      /**
       * The **granted** territory, and the only place it exists. This is what the term sheet
       * renders, which is also what stops one being issued for an unapproved franchise:
       * without an approval there is no value for the token.
       *
       * The tier and the machine allocation are deliberately not repeated here. They live on
       * `FranchiseTerms`, which is the record that binds and the record `PATCH …/terms`
       * refuses to change after signing; a second copy on the decision would be free to
       * disagree with it.
       */
      territory: string;
      territoryBoundary: string;
    }
  | {
      outcome: "on_hold";
      decidedAt: string;
      /** What we still need, in the franchisee's own terms. */
      outstanding: string[];
      /** Who is in touch, so the screen is not a dead end. */
      contactName: string;
    }
  | { outcome: "declined"; decidedAt: string };

// ── Terms ───────────────────────────────────────────────────────────────────

/**
 * That franchise's own commercials, never `shared/franchise/program.ts`.
 *
 * The gym flow's `OnboardingTerms` argument, and it matters more here: the program document
 * leaves the City Franchise's capital recovery threshold and payment schedule to the
 * definitive agreement (§6, §21), so a screen rendering the published figures would show a
 * Territory number to a City franchisee. `program.ts` supplies the **defaults** a new record
 * starts from.
 *
 * Money is integer **paise** throughout. Rupees are a rendering, and a float that has been
 * through a percentage split is not something to reconcile a ₹12,50,000 transfer against.
 */
export type FranchiseTerms = {
  tier: FranchiseTierId;
  investmentPaise: number;
  machineAllocation: number;
  /**
   * Percentages, so a change to `investmentPaise` cannot leave a stale instalment behind —
   * the reason `program.ts` stores them that way. Null where the schedule is
   * agreement-specific, which makes the instalment fields unresolved tokens and stops the
   * term sheet being issued at all (§5).
   */
  paymentSchedule: { pct: number; trigger: string }[] | null;
  capitalRecoveryPaise: number | null;
  proteinSharePctDuringRecovery: number;
  proteinSharePctAfterRecovery: number;
  advertisingFranchiseeSharePct: number;
  advertisingMbpSharePct: number;
};

// ── The issued term sheet ───────────────────────────────────────────────────

/**
 * The document the server has pinned: which version, dated when, and the exact bytes.
 *
 * `IssuedAgreement`'s rules apply without amendment — **the server computes `contentHash`,
 * not the client**, and `effectiveDate` is server-owned because it is rendered into the
 * hashed text and must be resolved in `Asia/Kolkata`. Read that type's docstring; the
 * reasoning is not repeated here.
 *
 * What is new is that a provider affixes the signature to a file, so the plain-text hash no
 * longer answers "what was signed" on its own. Three hashes, one job each (§6.1).
 */
export type IssuedTermSheet = {
  version: string;
  /** ISO date, resolved in `Asia/Kolkata`. Enters the hashed text. */
  effectiveDate: string;
  /**
   * ISO date this term sheet lapses if the definitive agreement is not executed. Also
   * rendered into the hashed text, so it is fixed at issuance rather than computed by
   * whatever reads the record later.
   */
  validUntil: string;
  /** SHA-256 of the rendered plain text. Answers: is the document on screen the one on the record? */
  contentHash: string;
  /** Diagnostic, not evidence — see `IssuedAgreement.length`. */
  length?: number;
  /**
   * SHA-256 of the PDF bytes we hand Digio. Answers: is the file Digio signed the file we
   * generated? It is what links the text we rendered to the file that came back signed.
   *
   * Null while no PDF exists. The frontend mock cannot produce one — there is no PDF
   * renderer in this repo — and it stores null rather than a plausible-looking string,
   * because a fabricated hash in a preview is a hash someone will later trust.
   */
  pdfHash: string | null;
};

// ── E-sign ──────────────────────────────────────────────────────────────────

export type EsignSignType = "aadhaar" | "electronic" | "dsc";

export type EsignStatus = "not_requested" | "requested" | "expired" | "declined" | "signed";

export type EsignRequest = {
  provider: "digio";
  providerDocumentId: string;
  signType: EsignSignType;
  requestedAt: string;
  expiresAt: string;
};

/**
 * The executed document, written by the webhook and by nothing else (§6.4).
 *
 * `signedPdfHash` is over the file Digio returned: what exactly is in our custody as the
 * executed term sheet.
 */
export type ExecutedTermSheet = {
  signedAt: string;
  signerName: string;
  signType: EsignSignType;
  /**
   * Null only where no PDF is in custody, which in the live flow cannot happen — the webhook
   * downloads the file and hashes it in the same call that writes this record. The frontend
   * mock has no file and stores null rather than a plausible-looking string, for the reason
   * `IssuedTermSheet.pdfHash` gives.
   */
  signedPdfHash: string | null;
  /** Digio's audit trail is the real evidence of the Aadhaar OTP; this says we hold a copy. */
  auditTrailStored: boolean;
};

export type EsignState = {
  status: EsignStatus;
  request: EsignRequest | null;
  executed: ExecutedTermSheet | null;
};

/**
 * The signing URL, returned **once** by `requestEsign` and deliberately absent from
 * `EsignState`.
 *
 * A deposit link is forwardable by design, because the signatory frequently is not the
 * payer. A signing link is the opposite: it authorises an Aadhaar eSign in a named person's
 * identity. Keeping it off the state means no `getState` response, cache entry or log line
 * carries one, and the screen has nothing to invite anyone to forward (§6.4).
 */
export type EsignHandoff = { signingUrl: string; expiresAt: string };

// ── Payment ─────────────────────────────────────────────────────────────────

/**
 * One instalment. Stored as `PAYMENT#<n>` from the first commit, not `PAYMENT#1`, so the
 * second instalment is a step and a screen rather than a migration (§7.6).
 *
 * `expectedPaise` and `receivedPaise` are separate fields because under- and over-payment
 * must be representable: a franchisee whose bank deducted charges sends ₹12,49,500, and a
 * record storing one number would either reject a real payment or record a full one. Whether
 * a shortfall blocks progression is a commercial call per franchise; the record's job is to
 * make the shortfall visible.
 */
export type FranchisePayment = {
  /** 1-based, matching `paymentSchedule`. */
  instalment: number;
  expectedPaise: number;
  claim: PaymentClaim | null;
  /**
   * What arrived in our account, as an admin read it off a bank statement. **Not the amount
   * the franchisee typed** — that is on the claim. `RZPPAY#`'s discipline applied to a human
   * verifier (§7.3).
   */
  receivedPaise: number | null;
  verifiedAt: string | null;
  /**
   * Why we could not confirm the claim — a UTR that does not exist, or a transfer that never
   * arrived. It returns the franchisee to the claim form and does **not** move the status
   * backwards, because a ladder that can go backwards is a ladder a bug can walk down (§7.3).
   */
  refusal: string | null;
};

export type PaymentClaim = PaymentClaimInput & { claimedAt: string };

/** Where to send the money, and the reference that makes reconciliation a lookup (§7.2). */
export type BankAccount = {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
};

/**
 * Step 8's screen, served by its own call rather than folded into `getState`.
 *
 * Bank details are only needed on one step, and keeping them off every state response keeps
 * them out of caches and logs belonging to the other eight. They come from server config,
 * never from the client bundle.
 */
export type PaymentInstructions = {
  bankAccount: BankAccount;
  /**
   * `MBPF-<8 chars>`, derived from the franchise id so it can be recomputed and never needs
   * its own row. It is what turns reconciliation from a name match against a list of
   * applicants into a lookup (§7.2).
   */
  reference: string;
  expectedPaise: number;
};

// ── Drafts ──────────────────────────────────────────────────────────────────

/**
 * Keyed by name rather than step number, so renumbering the wizard cannot repoint a draft at
 * the wrong step. Always `Partial`: a draft is by definition incomplete, and the submitted
 * value lives outside `drafts` so a half-typed step cannot overwrite a submitted one.
 */
export type FranchiseStepDrafts = {
  details?: Partial<FranchiseDetails>;
  territory?: Partial<TerritoryProposal>;
  operations?: Partial<OperationsReadiness>;
  paymentClaim?: Partial<PaymentClaimInput>;
};

export type FranchiseDraftKey = keyof FranchiseStepDrafts;

// ── The state ───────────────────────────────────────────────────────────────

/** One per transition, so the admin funnel comes for free. */
export type FranchiseOnboardingTimestamps = {
  invitedAt: string | null;
  firstOpenedAt: string | null;
  detailsSubmittedAt: string | null;
  territorySubmittedAt: string | null;
  kycSubmittedAt: string | null;
  reviewStartedAt: string | null;
  /** The first freeze point: step 2 stops being editable here (§4). */
  approvedAt: string | null;
  heldAt: string | null;
  declinedAt: string | null;
  franchiseAckAt: string | null;
  operationsSubmittedAt: string | null;
  termSheetViewedAt: string | null;
  esignRequestedAt: string | null;
  /** The second freeze point: steps 1, 2, 3, 5 and 6 stop being editable here (§4). */
  signedAt: string | null;
  paymentClaimedAt: string | null;
  paymentVerifiedAt: string | null;
  accountCreatedAt: string | null;
};

export type FranchiseOnboardingState = {
  handleId: string;
  franchiseId: string;
  /** Stored, not derived — it is in the invite URL and must not move if the trade name does. */
  slug: string;

  /** Authoritative. The client renders this; it never computes it. */
  currentStep: FranchiseOnboardingStep;
  /** Includes 4 and 8, which are completed on read from our own records (§7.4). */
  completedSteps: FranchiseOnboardingStep[];
  status: FranchiseOnboardingStatus;

  /**
   * The two freeze points, as booleans the UI can mirror so a field is read-only exactly
   * when the server would refuse it. Enforced server-side regardless — the UI is not a
   * security boundary.
   */
  isApproved: boolean;
  isSigned: boolean;

  invitedByName: string;
  franchiseDisplayName: string;

  details: FranchiseDetails;
  territory: TerritoryProposal;
  approval: ApprovalView | null;
  terms: FranchiseTerms;
  documents: UploadedDocument[];
  operations: OperationsReadiness | null;
  termSheet: IssuedTermSheet | null;
  esign: EsignState;
  /** Indexed by instalment. Only instalment 1 is in scope for this flow (§7.6). */
  payments: FranchisePayment[];
  drafts: FranchiseStepDrafts;
  timestamps: FranchiseOnboardingTimestamps;
};

// ── Results ─────────────────────────────────────────────────────────────────

export type FranchiseOnboardingErrorCode =
  /** No such handle, or the signature does not verify. */
  | "invalid_handle"
  /** Past its TTL. */
  | "expired_handle"
  /** Superseded by a resend, or voided by admin. */
  | "revoked_handle"
  /** Submitted a step the server is not on. Carries `currentStep` so the UI can recover. */
  | "wrong_step"
  /** Past one of the two freeze points (§4). */
  | "frozen"
  /** A step 5-or-later action before the approval record says approved. */
  | "not_approved"
  /**
   * The application was declined. Terminal, and answered by every mutating call.
   *
   * Its own code because the screen for it is not an error screen: a declined franchisee
   * reading "something went wrong" will email support, and the answer will be worse coming
   * from support than from the screen (§3).
   */
  | "declined"
  /**
   * Our own terms record is incomplete, so the term sheet has a token with no value and
   * cannot be rendered. Nothing the franchisee typed is wrong.
   *
   * This is the City-tier mechanism from §5, surfacing: a franchise whose payment schedule
   * and recovery threshold an admin has not set cannot reach a signature, and needs no
   * separate check to stop it.
   */
  | "not_issuable"
  /** The conditional `signedAt is null` write lost, or the webhook already landed. */
  | "already_signed"
  /** The hash the client echoed is not the hash we pinned — see `OnboardingErrorCode`. */
  | "content_mismatch"
  /** A claim is already outstanding and has not been refused (§7.3). */
  | "already_claimed"
  | "unsupported_document"
  | "document_too_large"
  | "validation"
  | "network";

export type FranchiseOnboardingError = {
  code: FranchiseOnboardingErrorCode;
  message: string;
  /** Present on `wrong_step`. */
  currentStep?: FranchiseOnboardingStep;
  /** Present on `validation`, keyed by field name. */
  fieldErrors?: Record<string, string>;
};

export type FranchiseOnboardingResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FranchiseOnboardingError };

export type FranchiseStateResult = FranchiseOnboardingResult<FranchiseOnboardingState>;

export type FranchiseDraftSaveResult = FranchiseOnboardingResult<{ savedAt: string }>;

// ── The interface ───────────────────────────────────────────────────────────

/**
 * Every call takes the handle. There is no session — the handle *is* the authorisation,
 * scoped to exactly one `franchiseId`.
 *
 * Every mutating call re-returns the whole state rather than a patch, so the client cannot
 * drift from the server by applying an update optimistically and getting it subtly wrong.
 */
export interface FranchiseOnboardingApi {
  /** Also records first open, IP and user-agent on first call. */
  getState(handle: string): Promise<FranchiseStateResult>;

  /**
   * Debounced draft write. Deliberately NOT part of step progression: it never advances
   * `currentStep`, never touches `completedSteps` and never moves `status`. That is one of
   * the five properties §8.5 says gets its own test.
   */
  saveDraft<K extends FranchiseDraftKey>(
    handle: string,
    key: K,
    value: NonNullable<FranchiseStepDrafts[K]>,
  ): Promise<FranchiseDraftSaveResult>;

  submitDetails(handle: string, input: FranchiseDetails): Promise<FranchiseStateResult>;

  submitTerritory(handle: string, input: TerritoryProposal): Promise<FranchiseStateResult>;

  /**
   * Uploads one file and records what it is.
   *
   * The presigned-PUT dance — ask for a URL, PUT the bytes, confirm the metadata — is three
   * routes and belongs to the HTTP implementation. Exposing it here would put an S3 URL in a
   * component and make the mock/live seam something more than a one-file swap.
   */
  uploadDocument(handle: string, input: DocumentUploadInput): Promise<FranchiseStateResult>;

  /** Replacing a file that was wrong is normal. Refused once step 3 is submitted. */
  removeDocument(handle: string, docId: string): Promise<FranchiseStateResult>;

  /** Commits step 3 once the required uploads are in. */
  submitKyc(handle: string): Promise<FranchiseStateResult>;

  /** Step 5 has no input; continuing is itself the evidence the commercials were shown. */
  ackFranchise(handle: string): Promise<FranchiseStateResult>;

  submitOperations(handle: string, input: OperationsReadiness): Promise<FranchiseStateResult>;

  /**
   * Pins the term sheet — version, effective date, validity and hash — and records the view.
   * Idempotent, and the pin is immutable once signed.
   */
  markTermSheetViewed(handle: string): Promise<FranchiseStateResult>;

  /**
   * Creates the Digio request and returns the handoff. Idempotent: an existing live request
   * is returned rather than a second one created.
   *
   * `contentHash` is the pinned hash echoed back, so a term sheet re-priced between the
   * reader loading and the franchisee clicking through is caught before Digio ever sees a
   * PDF. Nothing the client sends is stored.
   */
  requestEsign(
    handle: string,
    input: { signType: EsignSignType; contentHash: string },
  ): Promise<FranchiseOnboardingResult<{ state: FranchiseOnboardingState; handoff: EsignHandoff }>>;

  /** Reads **our** record. The webhook is the only thing that may mark it signed (§6.4). */
  refreshEsignStatus(handle: string): Promise<FranchiseStateResult>;

  getPaymentInstructions(
    handle: string,
  ): Promise<FranchiseOnboardingResult<PaymentInstructions>>;

  /** Stores a claim and moves `status`. Does **not** complete step 8 (§7.4). */
  claimPayment(handle: string, input: PaymentClaimInput): Promise<FranchiseStateResult>;

  /** Reads our own record for a verification an admin performed by hand. */
  refreshPaymentStatus(handle: string): Promise<FranchiseStateResult>;

  /** Step 9. Creates the portal login. */
  createAccount(handle: string, password: string, email: string): Promise<FranchiseStateResult>;
}
