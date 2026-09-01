/**
 * In-memory implementation of `FranchiseOnboardingApi`.
 *
 * Not a stub that returns canned objects: it models the state machine, because the state
 * machine is what the wizard has to get right and it is also the **specification for the
 * backend** (docs/franchise-onboarding.md §11, phase 4). Where this file and a handler
 * disagree, one of them is wrong and the test suite beside it is the argument.
 *
 * Four rules it enforces the way the handlers will have to:
 *
 *   - the step comes from the record, never from the caller;
 *   - a draft write never advances a step and never moves `status`;
 *   - nothing a franchisee calls completes step 4, 7 or 8 — those are read out of the
 *     approval, the signature and the verified payment (§7.4);
 *   - every status write goes through `advance`, so the forward-only ladder holds even for the
 *     preview hatches at the bottom of this file.
 *
 * Persistence is a module-level Map: it survives client-side navigation within a session and
 * resets on a hard reload, which is enough to exercise resume in development.
 *
 * ## Where the mock knowingly differs from the live flow
 *
 * `refreshEsignStatus` eventually reports a signature, after a couple of polls. Live, that
 * call is a pure read and only the Digio webhook may write one (§6.4). The poll counter is
 * standing in for the webhook's travel time, exactly as the gym deposit mock's does, because a
 * mock that confirms instantly hides the state the return-trip screen exists for. It is the
 * one place in this file where the mock writes something a client-facing route must not.
 *
 * `refreshPaymentStatus` deliberately does **not** do the same. Verification is a person
 * reading a bank statement, and there is no travel time to simulate — a poll that eventually
 * succeeded would teach the screen to expect an outcome that really takes working hours, which
 * is the thing §7.5 says not to imply. `previewVerifyPayment` is how that state is reached.
 */

import { FRANCHISE, franchiseTier } from "../program";
import { fingerprintIssuedTermSheet, canIssueTermSheet } from "../termsheet/issued";
import { issuanceDateInIndia } from "../../onboarding/issuedAgreement";
import {
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  MAX_DOCUMENT_BYTES,
  franchiseDetailsSchema,
  franchiseEmailSchema,
  franchisePasswordSchema,
  franchiseTerritoryGrantDraft,
  franchiseTerritoryLabel,
  operationsReadinessSchema,
  paymentClaimSchema,
  territoryProposalSchema,
  toFranchiseFieldErrors,
} from "./schema";
import {
  FIRST_STEP_REQUIRING_APPROVAL,
  completedStepsOnRead,
  deriveCurrentStep,
  franchiseeCommits,
  freezeReason,
  isDeclined,
  isForwardStatus,
  missingRequiredDocuments,
  statusForStepCommit,
} from "./status";
import type {
  DocumentUploadInput,
  EsignHandoff,
  EsignSignType,
  FranchiseDetails,
  FranchiseDraftKey,
  FranchiseDraftSaveResult,
  FranchiseOnboardingApi,
  FranchiseOnboardingError,
  FranchiseOnboardingResult,
  FranchiseOnboardingState,
  FranchiseOnboardingStatus,
  FranchiseOnboardingStep,
  FranchiseStateResult,
  FranchiseStepDrafts,
  OperationsReadiness,
  PaymentClaimInput,
  PaymentInstructions,
  TerritoryProposal,
} from "./types";

/** Walk the flow in development at `/franchise/onboarding/demo/demo`. */
export const FRANCHISE_DEMO_HANDLE = "demo";

/**
 * Handles that exercise the failure screens without a backend. Each is a real state a
 * franchisee can land in, and each needs its own copy.
 *
 * Only these three fail. **Any other handle opens a fresh application**, so a link minted on
 * the admin invite screen can be walked: the two mocks are separate in-memory stores and a
 * copied link lands in a new tab with a new store, so matching handles between them is not a
 * thing that can work. `invalid` is reserved rather than being the default because "we couldn't
 * find this link" is a screen a franchisee with a mangled URL really sees, and a fixture that
 * accepts everything cannot show it.
 *
 * There is no `declined` handle: `previewDecline` reaches that state from a live record, which
 * is the only way to see the screen with the franchisee's own details on it, and it exercises
 * the ladder rather than side-stepping it.
 */
export const MOCK_FRANCHISE_HANDLES = {
  valid: FRANCHISE_DEMO_HANDLE,
  expired: "expired-demo",
  revoked: "revoked-demo",
  invalid: "invalid-demo",
} as const;

/** How many polls the mock makes a franchisee wait before the stand-in webhook lands. */
const MOCK_ESIGN_POLLS_TO_CONFIRM = 2;

/** How long a Digio signing request stays open in the mock. */
const MOCK_ESIGN_VALIDITY_MS = 7 * 86_400_000;

/**
 * Obviously fake, and that is the requirement.
 *
 * Live, these come from server config and never from the client bundle. A real receiving
 * account in a repo is a real receiving account in every preview deploy and every git clone.
 */
const MOCK_BANK_ACCOUNT = {
  accountName: "BlendBox Innovations LLP (MOCK)",
  accountNumber: "0000 0000 0000",
  ifsc: "MOCK0000000",
  bankName: "Mock Bank, Preview Branch",
} as const;

type MockRecord = {
  state: FranchiseOnboardingState;
  /**
   * The steps the franchisee actually submitted. `state.completedSteps` is a projection of
   * this plus what our own records imply, recomputed on every read — see `project`.
   */
  committed: FranchiseOnboardingStep[];
  /** Polls since the signing request was created. Stands in for the webhook's travel time. */
  esignPolls: number;
};

const store = new Map<string, MockRecord>();

/** Clears the in-memory store. Tests call this; nothing in the app should. */
export function resetMockFranchiseOnboarding(): void {
  store.clear();
}

// ── Seed ────────────────────────────────────────────────────────────────────

/**
 * A franchise as it exists the moment the invite is sent: a record created from a
 * `FRANCHISEAPP#` enquiry, carrying what the application already told us and nothing else.
 *
 * Blank on purpose. A prefilled form that is entirely correct never exercises the validation,
 * and a franchise application carries no PAN, no CIN and no registered address.
 */
function seedState(handle: string, now: string): FranchiseOnboardingState {
  const tier = franchiseTier("territory");
  const investmentPaise = tier.investmentInr * 100;
  const schedule = tier.paymentSchedule;

  const details: FranchiseDetails = {
    legalEntityName: "",
    entityType: "pvt_ltd",
    tradeName: "Northline Ventures",
    pan: "",
    gstin: "",
    cin: "",
    llpin: "",
    registeredAddress: "",
    signatoryName: "",
    signatoryDesignation: "",
    signatoryPan: "",
    signatoryAadhaarLast4: "",
    noticesEmail: "r.mehta@northline.example",
    noticesPhone: "+91 98450 12345",
  };

  return {
    handleId: handle,
    franchiseId: "fr_mock_0001",
    slug: "northline-ventures",

    currentStep: 1,
    completedSteps: [],
    status: "invited",
    isApproved: false,
    isSigned: false,

    invitedByName: "Anurag from MuscleBox Pro",
    franchiseDisplayName: "Northline Ventures",

    details,
    territory: {
      // `tier` is prefilled from the application and changeable here. The market is not: the
      // application's `targetMarket` is free text, so there is nothing in it to preselect a
      // district from.
      tier: "territory",
      proposedState: "",
      proposedDistricts: [],
      proposedPincodes: [],
      proposedBoundary: "",
      existingRelationships: "",
    },
    approval: null,
    // Defaults from the same constants the public page reads, so a new franchise's terms and
    // /franchise start identical. The real record can diverge, and for a City franchise it
    // must — `program.ts` publishes no schedule or threshold for that tier.
    terms: {
      tier: tier.id,
      investmentPaise,
      machineAllocation: tier.initialMachines,
      paymentSchedule: schedule ? schedule.map((s) => ({ ...s })) : null,
      capitalRecoveryPaise:
        tier.capitalRecoveryInr === null ? null : tier.capitalRecoveryInr * 100,
      proteinSharePctDuringRecovery: FRANCHISE.proteinProfitSharePct.duringRecovery,
      proteinSharePctAfterRecovery: FRANCHISE.proteinProfitSharePct.afterRecovery,
      advertisingFranchiseeSharePct: FRANCHISE.advertising.franchiseeSharePct,
      advertisingMbpSharePct: FRANCHISE.advertising.mbpSharePct,
    },
    documents: [],
    operations: null,
    termSheet: null,
    esign: { status: "not_requested", request: null, executed: null },
    payments: [
      {
        instalment: 1,
        // Off the schedule, in paise, never from anything a browser sends.
        expectedPaise: schedule
          ? Math.round((investmentPaise * schedule[0].pct) / 100)
          : investmentPaise,
        claim: null,
        receivedPaise: null,
        verifiedAt: null,
        refusal: null,
      },
    ],
    drafts: {},
    timestamps: {
      invitedAt: now,
      firstOpenedAt: null,
      detailsSubmittedAt: null,
      territorySubmittedAt: null,
      kycSubmittedAt: null,
      reviewStartedAt: null,
      approvedAt: null,
      heldAt: null,
      declinedAt: null,
      franchiseAckAt: null,
      operationsSubmittedAt: null,
      termSheetViewedAt: null,
      esignRequestedAt: null,
      signedAt: null,
      paymentClaimedAt: null,
      paymentVerifiedAt: null,
      accountCreatedAt: null,
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fail(
  code: FranchiseOnboardingError["code"],
  message: string,
  extra: Partial<FranchiseOnboardingError> = {},
) {
  return { ok: false as const, error: { code, message, ...extra } };
}

/**
 * Recompute everything derived, on every read.
 *
 * The three steps we complete rather than the franchisee are read out of the records that
 * prove them, so there is no latch to get wrong and no call that has to remember to notice.
 */
function project(record: MockRecord): void {
  const { state } = record;
  state.completedSteps = completedStepsOnRead(record.committed, state);
  state.currentStep = deriveCurrentStep(state.completedSteps);
  state.isApproved = state.approval?.outcome === "approved";
  state.isSigned = state.timestamps.signedAt !== null;
}

/** The only way `status` moves. Refuses anything the ladder refuses (`./status.ts`). */
function advance(state: FranchiseOnboardingState, to: FranchiseOnboardingStatus): void {
  if (isForwardStatus(state.status, to)) state.status = to;
}

function commit(record: MockRecord, step: FranchiseOnboardingStep): void {
  if (!franchiseeCommits(step)) {
    // Unreachable: no method below passes 4, 7 or 8. Here because the whole two-party design
    // rests on it, and a future step added carelessly should fail loudly rather than quietly
    // hand a franchisee a step that is ours to complete (§7.4).
    throw new Error(`Step ${step} is completed from our own record, not by a submission`);
  }
  if (!record.committed.includes(step)) record.committed.push(step);
  record.committed.sort((a, b) => a - b);
  const next = statusForStepCommit(step);
  if (next) advance(record.state, next);
  project(record);
}

/**
 * Whether a franchisee submission for `step` may be accepted.
 *
 * Order matters. Frozen first, because a franchisee past a freeze point should be told the
 * document is signed rather than told to complete an earlier step. Approval next, because
 * "please complete the earlier steps first" is untrue when the step they are waiting on is
 * ours.
 */
function assertSubmittable(state: FranchiseOnboardingState, step: FranchiseOnboardingStep) {
  const frozen = freezeReason(state, step);
  if (frozen) return fail("frozen", frozen);

  if (step >= FIRST_STEP_REQUIRING_APPROVAL && !state.isApproved) {
    return fail("not_approved", "This opens once your franchise has been approved.");
  }
  if (step > state.currentStep) {
    return fail("wrong_step", "Please complete the earlier steps first.", {
      currentStep: state.currentStep,
    });
  }
  return null;
}

/**
 * Pins the term sheet, once, when the franchisee becomes entitled to read it.
 *
 * `issueAgreement` in the gym mock is the model and its docstring is the argument: the hash is
 * computed here rather than accepted at signing; the effective date is fixed on the server's
 * clock in `Asia/Kolkata` before any client renders the text; and while nothing is signed an
 * existing pin is checked and refreshed if it no longer describes what we would render now.
 * Once signed the pin is immutable, full stop.
 *
 * What is different: this can refuse. An unresolved token means our own record is incomplete —
 * an unapproved territory, or a City tier nobody has priced — and there is nothing to render.
 * Blockers are deliberately **not** checked here: `canIssue` also refuses on the document's
 * own `todo` markers, and v1 carries one that is a decision for us rather than a fact about
 * this franchise. The live handler gates on the full `canIssue`, which is what stops a term
 * sheet being sent for signature before clause 5.6 is approved; gating here would make the
 * preview unwalkable and teach nobody anything.
 */
async function issueTermSheet(
  state: FranchiseOnboardingState,
  nowIso: string,
): Promise<FranchiseOnboardingError | null> {
  if (state.isSigned && state.termSheet) return null;

  const pinnedDate = state.termSheet?.effectiveDate ?? issuanceDateInIndia(nowIso);
  const check = canIssueTermSheet(state, pinnedDate);
  if (check.ok === false && check.unresolvedTokens.length > 0) {
    return {
      code: "not_issuable",
      message:
        "We can't show your term sheet yet. Someone at MuscleBox Pro still has to complete your terms, and we'll be in touch.",
    };
  }

  if (!state.termSheet) {
    state.termSheet = await fingerprintIssuedTermSheet(state, issuanceDateInIndia(nowIso));
    return null;
  }

  // Asked at the *pinned* date rather than today's, or every view after midnight IST would
  // look like a drift and re-date the document daily.
  const current = await fingerprintIssuedTermSheet(state, state.termSheet.effectiveDate);
  const drifted =
    current.version !== state.termSheet.version ||
    current.contentHash !== state.termSheet.contentHash;
  if (drifted) {
    state.termSheet = await fingerprintIssuedTermSheet(state, issuanceDateInIndia(nowIso));
  }
  return null;
}

/**
 * `MBPF-<8>`, derived from the franchise id so it can be recomputed and never needs its own
 * row (§7.2).
 *
 * The client only ever displays what it was given; this exists so the mock's step 8 screen has
 * the same shape of reference the live one will. The two need not agree on the algorithm —
 * they need to agree that it is stable per franchise.
 */
function paymentReference(franchiseId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < franchiseId.length; i += 1) {
    hash ^= franchiseId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `MBPF-${hash.toString(36).toUpperCase().padStart(8, "0").slice(-8)}`;
}

export type MockFranchiseOnboardingOptions = {
  /** Simulated round-trip, so the saving indicator and disabled states are real. */
  latencyMs?: number;
  /** Injected clock, so tests get stable timestamps. */
  now?: () => string;
};

// ── The implementation ──────────────────────────────────────────────────────

export function createMockFranchiseOnboardingApi(
  options: MockFranchiseOnboardingOptions = {},
): FranchiseOnboardingApi {
  const { latencyMs = 0, now = () => new Date().toISOString() } = options;

  const delay = () =>
    latencyMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
      : Promise.resolve();

  function load(handle: string): FranchiseOnboardingResult<MockRecord> {
    if (handle === MOCK_FRANCHISE_HANDLES.expired) {
      return fail("expired_handle", "This link has expired. We can send you a fresh one.");
    }
    if (handle === MOCK_FRANCHISE_HANDLES.revoked) {
      return fail("revoked_handle", "This link is no longer valid. A newer one was sent.");
    }
    if (handle === MOCK_FRANCHISE_HANDLES.invalid) {
      return fail("invalid_handle", "We couldn't find this onboarding link.");
    }
    // Every other handle seeds its own application. See `MOCK_FRANCHISE_HANDLES`.
    let record = store.get(handle);
    if (!record) {
      record = { state: seedState(handle, now()), committed: [], esignPolls: 0 };
      project(record);
      store.set(handle, record);
    }
    return { ok: true, data: record };
  }

  /**
   * Load, and refuse if the application was declined.
   *
   * Every mutating call goes through this. `declined` is absorbing, so a record that reaches it
   * accepts nothing further — but `getState` still has to succeed, or the one screen a declined
   * franchisee needs cannot render.
   */
  function loadForWrite(handle: string): FranchiseOnboardingResult<MockRecord> {
    const loaded = load(handle);
    if (!loaded.ok) return loaded;
    if (isDeclined(loaded.data.state.status)) {
      return fail(
        "declined",
        "This application was not taken forward. Please get in touch if you'd like to talk about it.",
      );
    }
    return loaded;
  }

  /** Snapshot, so a caller mutating what it got back cannot corrupt the store. */
  const snapshot = (state: FranchiseOnboardingState): FranchiseOnboardingState =>
    JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;

  const ok = (record: MockRecord): FranchiseStateResult => {
    project(record);
    return { ok: true, data: snapshot(record.state) };
  };

  return {
    async getState(handle) {
      await delay();
      const loaded = load(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // First open is an audit fact, recorded once. The real implementation also stores IP and
      // user-agent, which a browser cannot supply about itself.
      if (!state.timestamps.firstOpenedAt) {
        state.timestamps.firstOpenedAt = now();
        advance(state, "opened");
      }
      return ok(loaded.data);
    },

    async saveDraft<K extends FranchiseDraftKey>(
      handle: string,
      key: K,
      value: NonNullable<FranchiseStepDrafts[K]>,
    ): Promise<FranchiseDraftSaveResult> {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Frozen steps stop accepting drafts too, otherwise the UI shows "Saved" for edits the
      // server will later refuse.
      const step: Record<FranchiseDraftKey, FranchiseOnboardingStep> = {
        details: 1,
        territory: 2,
        operations: 6,
        paymentClaim: 8,
      };
      const frozen = freezeReason(state, step[key]);
      if (frozen) return fail("frozen", frozen);

      // Merged, not replaced: a partial patch must not wipe fields it does not mention.
      state.drafts = { ...state.drafts, [key]: { ...(state.drafts[key] ?? {}), ...value } };
      // Nothing else. No `completedSteps`, no `status`, no `currentStep` — §8.5's fourth test.
      return { ok: true, data: { savedAt: now() } };
    },

    async submitDetails(handle, input: FranchiseDetails) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 1);
      if (blocked) return blocked;

      const parsed = franchiseDetailsSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Some details need fixing.", {
          fieldErrors: toFranchiseFieldErrors(parsed.error),
        });
      }

      state.details = parsed.data;
      state.franchiseDisplayName = parsed.data.tradeName || parsed.data.legalEntityName;
      state.timestamps.detailsSubmittedAt = now();
      // The submitted value supersedes the draft, so a later resume shows what was submitted
      // rather than whatever was mid-edit when they last typed.
      delete state.drafts.details;
      commit(loaded.data, 1);
      // These values are rendered into the term sheet, so a correction made after it was
      // pinned has invalidated its hash. Re-pinned here rather than left for the next view, so
      // step 7 never paints a stale fingerprint. Only where a document already exists —
      // issuing one at step 1 would hand over a contract before step 5 showed the terms.
      if (state.termSheet) await issueTermSheet(state, now());
      return ok(loaded.data);
    },

    async submitTerritory(handle, input: TerritoryProposal) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 2);
      if (blocked) return blocked;

      const parsed = territoryProposalSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Tell us a little more about the territory.", {
          fieldErrors: toFranchiseFieldErrors(parsed.error),
        });
      }

      state.territory = parsed.data as TerritoryProposal;
      // The tier selects which commercials this application is evaluated against, so the terms
      // record follows it — until an approval fixes it, at which point step 2 is frozen and
      // this cannot run again.
      if (parsed.data.tier !== state.terms.tier) {
        const tier = franchiseTier(parsed.data.tier as TerritoryProposal["tier"]);
        state.terms = {
          ...state.terms,
          tier: tier.id,
          investmentPaise: tier.investmentInr * 100,
          machineAllocation: tier.initialMachines,
          paymentSchedule: tier.paymentSchedule
            ? tier.paymentSchedule.map((s) => ({ ...s }))
            : null,
          capitalRecoveryPaise:
            tier.capitalRecoveryInr === null ? null : tier.capitalRecoveryInr * 100,
        };
        const first = state.payments.find((p) => p.instalment === 1);
        if (first) {
          first.expectedPaise = tier.paymentSchedule
            ? Math.round((tier.investmentInr * 100 * tier.paymentSchedule[0].pct) / 100)
            : tier.investmentInr * 100;
        }
      }
      state.timestamps.territorySubmittedAt = now();
      delete state.drafts.territory;
      commit(loaded.data, 2);
      return ok(loaded.data);
    },

    async uploadDocument(handle, input: DocumentUploadInput) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 3);
      if (blocked) return blocked;

      // Their own codes rather than `validation`, because these two bounds are the ones the
      // presigned PUT policy carries and a client that got them wrong will be refused by S3
      // itself (§9). Nothing typed into a form is wrong here.
      if (!ALLOWED_DOCUMENT_CONTENT_TYPES.includes(input.file.type)) {
        return fail("unsupported_document", "Upload a PDF, a JPEG or a PNG.");
      }
      if (input.file.size > MAX_DOCUMENT_BYTES) {
        return fail("document_too_large", "Files are limited to 8 MB.");
      }
      if (input.file.size === 0) {
        return fail("validation", "That file appears to be empty.", {
          fieldErrors: { file: "That file appears to be empty." },
        });
      }

      // One document per type: re-uploading means the first one was wrong, and keeping both
      // leaves an admin to guess which is current.
      state.documents = state.documents.filter((d) => d.docType !== input.docType);
      state.documents.push({
        docId: `doc_mock_${state.documents.length + 1}_${input.docType}`,
        docType: input.docType,
        fileName: input.fileName,
        sizeBytes: input.file.size,
        contentType: input.file.type,
        uploadedAt: now(),
      });
      return ok(loaded.data);
    },

    async removeDocument(handle, docId) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 3);
      if (blocked) return blocked;

      const before = state.documents.length;
      state.documents = state.documents.filter((d) => d.docId !== docId);
      if (state.documents.length === before) {
        return fail("validation", "We couldn't find that file.");
      }
      return ok(loaded.data);
    },

    async submitKyc(handle) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Answered before the freeze check, because submitting step 3 is what freezes step 3: a
      // double-clicked button must be a no-op rather than "your documents are with us".
      if (state.timestamps.kycSubmittedAt && state.status !== "on_hold") {
        return ok(loaded.data);
      }

      const blocked = assertSubmittable(state, 3);
      if (blocked) return blocked;

      const missing = missingRequiredDocuments(state.details.entityType, state.documents);
      if (missing.length > 0) {
        return fail("validation", "A few documents are still missing.", {
          fieldErrors: Object.fromEntries(missing.map((type) => [type, "This one is required"])),
        });
      }

      state.timestamps.kycSubmittedAt = now();
      commit(loaded.data, 3);
      return ok(loaded.data);
    },

    async ackFranchise(handle) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 5);
      if (blocked) return blocked;

      // Cheap to store, and it is the evidence that the commercials were shown before the
      // term sheet was.
      state.timestamps.franchiseAckAt = now();
      commit(loaded.data, 5);
      return ok(loaded.data);
    },

    async submitOperations(handle, input: OperationsReadiness) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 6);
      if (blocked) return blocked;

      const parsed = operationsReadinessSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Some of this still needs filling in.", {
          fieldErrors: toFranchiseFieldErrors(parsed.error),
        });
      }

      state.operations = parsed.data as OperationsReadiness;
      state.timestamps.operationsSubmittedAt = now();
      delete state.drafts.operations;
      commit(loaded.data, 6);
      // The warehouse and the operations contact are rendered into Schedule 2, so a document
      // pinned before this step existed no longer describes what we would render.
      if (state.termSheet) await issueTermSheet(state, now());
      return ok(loaded.data);
    },

    async markTermSheetViewed(handle) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      if (!state.isApproved) {
        return fail("not_approved", "Your term sheet is prepared once your franchise is approved.");
      }
      if (state.currentStep < 7) {
        return fail("wrong_step", "Please complete the earlier steps first.", {
          currentStep: state.currentStep,
        });
      }

      const problem = await issueTermSheet(state, now());
      if (problem) return { ok: false as const, error: problem };

      // Idempotent, and it does not complete step 7 — viewing is not signing. Step 7 completes
      // when there is a signature, and only the webhook writes one.
      if (!state.timestamps.termSheetViewedAt) {
        state.timestamps.termSheetViewedAt = now();
      }
      advance(state, "termsheet_viewed");
      return ok(loaded.data);
    },

    async requestEsign(handle, input: { signType: EsignSignType; contentHash: string }) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Checked first, before anything else, because two tabs racing must produce one
      // signature and one clear error.
      if (state.timestamps.signedAt) {
        return fail("already_signed", "This term sheet has already been signed.");
      }
      if (state.currentStep < 7) {
        return fail("wrong_step", "Please complete the earlier steps first.", {
          currentStep: state.currentStep,
        });
      }
      // Refused rather than pinned on the fly. A client with no pinned document had nothing to
      // render and therefore nothing to echo, so whatever it sent came from somewhere else.
      if (!state.termSheet) {
        return fail("wrong_step", "Open your term sheet before signing it.", { currentStep: 7 });
      }
      if (input.contentHash !== state.termSheet.contentHash) {
        return fail(
          "content_mismatch",
          "Your copy of the term sheet is out of date. Reload this page to read the current version. Nothing has been signed.",
        );
      }

      const nowIso = now();
      const existing = state.esign.request;
      const live =
        state.esign.status === "requested" &&
        existing !== null &&
        Date.parse(existing.expiresAt) > Date.parse(nowIso);

      // Idempotent in the document, not in the URL. A second call must not create a second
      // Digio request — but the handoff URL is short-lived and per request, and is deliberately
      // not stored on the state for anyone to forward (§6.4).
      const request = live
        ? existing
        : {
            provider: "digio" as const,
            providerDocumentId: `DID-mock-${state.franchiseId}-${state.esign.request ? 2 : 1}`,
            signType: input.signType,
            requestedAt: nowIso,
            expiresAt: new Date(Date.parse(nowIso) + MOCK_ESIGN_VALIDITY_MS).toISOString(),
          };

      state.esign = { ...state.esign, status: "requested", request };
      if (!live) {
        loaded.data.esignPolls = 0;
        state.timestamps.esignRequestedAt = nowIso;
      }
      advance(state, "esign_requested");
      project(loaded.data);

      const handoff: EsignHandoff = {
        signingUrl: `https://mock.digio.invalid/sign/${request.providerDocumentId}?t=${Date.parse(nowIso)}`,
        expiresAt: request.expiresAt,
      };
      return { ok: true as const, data: { state: snapshot(state), handoff } };
    },

    async refreshEsignStatus(handle) {
      await delay();
      const loaded = load(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const request = state.esign.request;
      if (state.esign.status !== "requested" || !request) return ok(loaded.data);

      const nowIso = now();
      if (Date.parse(request.expiresAt) <= Date.parse(nowIso)) {
        state.esign = { ...state.esign, status: "expired" };
        return ok(loaded.data);
      }

      // The stand-in webhook. See this module's header for why it is here and why the live
      // version of this call cannot do it.
      loaded.data.esignPolls += 1;
      if (loaded.data.esignPolls >= MOCK_ESIGN_POLLS_TO_CONFIRM) {
        signInMock(loaded.data, nowIso);
      }
      return ok(loaded.data);
    },

    async getPaymentInstructions(handle) {
      await delay();
      const loaded = load(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      if (!state.isSigned) {
        return fail("wrong_step", "The first instalment comes after the term sheet is signed.", {
          currentStep: state.currentStep,
        });
      }

      const first = state.payments.find((p) => p.instalment === 1);
      const instructions: PaymentInstructions = {
        bankAccount: { ...MOCK_BANK_ACCOUNT },
        reference: paymentReference(state.franchiseId),
        expectedPaise: first?.expectedPaise ?? state.terms.investmentPaise,
      };
      return { ok: true as const, data: instructions };
    },

    async claimPayment(handle, input: PaymentClaimInput) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // The term sheet is the instrument the money is paid under, so it cannot be collected
      // before there is one.
      if (!state.isSigned) {
        return fail("wrong_step", "The first instalment comes after the term sheet is signed.", {
          currentStep: state.currentStep,
        });
      }

      const first = state.payments.find((p) => p.instalment === 1);
      if (!first) return fail("validation", "We couldn't find an instalment to record.");
      if (first.verifiedAt) {
        return fail("wrong_step", "This instalment is already confirmed.", {
          currentStep: state.currentStep,
        });
      }
      // A refused claim reopens the form; an outstanding one does not, or a franchisee gets two
      // UTRs on the record for one transfer and an admin has to guess.
      if (first.claim && !first.refusal) {
        return fail(
          "already_claimed",
          "We already have your transfer details and we're checking them against our bank statement.",
        );
      }

      const parsed = paymentClaimSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Check the transfer details.", {
          fieldErrors: toFranchiseFieldErrors(parsed.error),
        });
      }

      first.claim = { ...parsed.data, claimedAt: now() };
      first.refusal = null;
      state.timestamps.paymentClaimedAt = now();
      delete state.drafts.paymentClaim;
      advance(state, "payment_claimed");
      // Deliberately no `commit(8)`. Step 8 completes when `verifiedAt` exists, which is an
      // admin reading a bank statement (§7.4). `commit` would throw if this tried.
      return ok(loaded.data);
    },

    async refreshPaymentStatus(handle) {
      await delay();
      // A pure read, and it stays one. See this module's header.
      const loaded = load(handle);
      if (!loaded.ok) return loaded;
      return ok(loaded.data);
    },

    async createAccount(handle, password, email) {
      await delay();
      const loaded = loadForWrite(handle);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Signing is the gate, not verification. A franchisee who executed the term sheet and has
      // ₹12,50,000 in flight should not be locked out of their own portal while an admin reads a
      // bank statement — the gym flow's "the signature is the milestone" reasoning, at 25 times
      // the amount.
      if (!state.isSigned) {
        return fail("wrong_step", "Your account is created once the term sheet is signed.", {
          currentStep: state.currentStep,
        });
      }
      if (!franchiseEmailSchema.safeParse(email).success) {
        return fail("validation", "Please check the highlighted fields.", {
          fieldErrors: { email: "That does not look like an email address." },
        });
      }
      const parsed = franchisePasswordSchema.safeParse(password);
      if (!parsed.success) {
        // A bare string schema puts its issues at the root path, so there is no key for
        // `toFranchiseFieldErrors` to build; the field name is supplied here instead.
        return fail("validation", "Choose a longer password.", {
          fieldErrors: { password: parsed.error.issues[0].message },
        });
      }

      state.timestamps.accountCreatedAt = now();
      // The timestamp only. `active` comes from `POST /admin/franchises/{id}/activate` and
      // `statusForStepCommit(9)` returns null for exactly this reason.
      commit(loaded.data, 9);
      return ok(loaded.data);
    },
  };
}

// ── Preview escape hatches ──────────────────────────────────────────────────

/**
 * Three of the nine steps move because *we* did something — an approval, a webhook, an admin
 * reading a bank statement — and a preview cannot wait for a person. These stand in, for the
 * same reason `advanceMockInstallation` exists in the gym mock.
 *
 * Each is reached through `client/src/lib/franchiseOnboardingApi.ts` rather than imported from
 * this module at the call site, and every caller has to be behind
 * `IS_MOCK_FRANCHISE_ONBOARDING` — against the live API there is no store to move.
 *
 * They go through `advance`, so the ladder applies to them too: `previewDecline` after an
 * approval is refused, because withdrawing an approval is not a status write.
 */
function requireRecord(handle: string): MockRecord | null {
  return store.get(handle) ?? null;
}

function signInMock(record: MockRecord, nowIso: string): void {
  const { state } = record;
  if (state.timestamps.signedAt) return;
  state.esign = {
    status: "signed",
    request: state.esign.request,
    executed: {
      signedAt: nowIso,
      signerName: state.details.signatoryName || state.franchiseDisplayName,
      signType: state.esign.request?.signType ?? "aadhaar",
      // No PDF exists in a preview, so there is nothing to hash. See `ExecutedTermSheet`.
      signedPdfHash: null,
      auditTrailStored: false,
    },
  };
  state.timestamps.signedAt = nowIso;
  advance(state, "signed");
  project(record);
}

/** Approves, granting the territory as proposed unless something narrower is passed. */
export function previewApprove(
  handle: string,
  granted?: { territory?: string; territoryBoundary?: string },
): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  const { state } = record;
  const nowIso = new Date().toISOString();

  state.approval = {
    outcome: "approved",
    decidedAt: nowIso,
    // What an admin would see prefilled on the approval form, which is the label rather than the
    // districts: the grant is prose because the definitive agreement is.
    territory: granted?.territory ?? franchiseTerritoryLabel(state.territory),
    territoryBoundary: granted?.territoryBoundary ?? franchiseTerritoryGrantDraft(state.territory),
  };
  state.timestamps.reviewStartedAt ??= nowIso;
  state.timestamps.approvedAt = nowIso;
  advance(state, "approved");
  project(record);
  return JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;
}

/**
 * Puts the application on hold, which is the state that reopens steps 1 to 3.
 *
 * Not in the plan's list of hatches, and added because `on_hold` is otherwise the one screen in
 * the flow that cannot be looked at — and it is the screen that has to avoid reading as an
 * error.
 */
export function previewHold(
  handle: string,
  outstanding: string[] = ["A clearer boundary description for the northern suburbs"],
  contactName = "Anurag from MuscleBox Pro",
): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  const { state } = record;
  const nowIso = new Date().toISOString();

  state.approval = { outcome: "on_hold", decidedAt: nowIso, outstanding, contactName };
  state.timestamps.reviewStartedAt ??= nowIso;
  state.timestamps.heldAt = nowIso;
  advance(state, "on_hold");
  project(record);
  return JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;
}

export function previewDecline(handle: string): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  const { state } = record;
  const nowIso = new Date().toISOString();

  // Refused by the ladder once approved, so this is checked rather than assumed: writing the
  // record and then failing to move the status would leave a declined decision under an
  // approved status.
  if (!isForwardStatus(state.status, "declined")) return null;

  state.approval = { outcome: "declined", decidedAt: nowIso };
  state.timestamps.reviewStartedAt ??= nowIso;
  state.timestamps.declinedAt = nowIso;
  advance(state, "declined");
  project(record);
  return JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;
}

/** Stands in for `POST /webhook/digio/esign`. */
export function previewCompleteEsign(handle: string): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  if (!record.state.esign.request) return null;
  signInMock(record, new Date().toISOString());
  return JSON.parse(JSON.stringify(record.state)) as FranchiseOnboardingState;
}

/**
 * Stands in for `POST /admin/franchises/{id}/payments/{n}/verify` — the write that completes
 * step 8.
 *
 * `receivedPaise` defaults to the expected amount and is a parameter because the interesting
 * case is the one where it does not match: a franchisee whose bank deducted charges (§7.3).
 */
export function previewVerifyPayment(
  handle: string,
  receivedPaise?: number,
): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  const { state } = record;
  const first = state.payments.find((p) => p.instalment === 1);
  if (!first) return null;

  first.receivedPaise = receivedPaise ?? first.expectedPaise;
  first.verifiedAt = new Date().toISOString();
  first.refusal = null;
  state.timestamps.paymentVerifiedAt = first.verifiedAt;
  advance(state, "payment_verified");
  project(record);
  return JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;
}

/** Stands in for a verification that could not find the transfer (§7.3). */
export function previewRefusePayment(
  handle: string,
  refusal = "We couldn't find a transfer with that UTR in our account.",
): FranchiseOnboardingState | null {
  const record = requireRecord(handle);
  if (!record) return null;
  const { state } = record;
  const first = state.payments.find((p) => p.instalment === 1);
  if (!first) return null;

  first.refusal = refusal;
  // The status stays at `payment_claimed`. A ladder that can go backwards is a ladder a bug can
  // walk down, so the refusal is a field rather than a state (§7.3).
  project(record);
  return JSON.parse(JSON.stringify(state)) as FranchiseOnboardingState;
}
