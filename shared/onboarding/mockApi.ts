/**
 * In-memory implementation of `OnboardingApi` for phase 1.
 *
 * This is not a stub that returns canned objects. It models the *state machine* —
 * step advancement, draft isolation, the frozen-after-signing rule, the conditional
 * signing write — because those are the behaviours the wizard has to get right, and
 * they would otherwise go untested until the real backend lands (§8).
 *
 * Two rules it enforces the same way the edge functions will have to:
 *
 *   - The step comes from the record, never from the caller.
 *   - A draft write never advances a step, and a submitted step is never stored in
 *     `drafts`, so a half-typed step 1 cannot overwrite a submitted step 1.
 *
 * Persistence is a module-level Map, so it survives client-side navigation within a
 * session and resets on a hard reload. That is enough to exercise resume in
 * development; real cross-device resume needs the database.
 */

import { PARTNERSHIP } from "../partnership/summary";
import { fingerprintIssuedAgreement, issuanceDateInIndia } from "./issuedAgreement";
import { gymDetailsSchema, portalPasswordSchema, signatureSchema, toFieldErrors } from "./schema";
import { SIGNING_REQUIRES_OTP } from "./types";
import type {
  DepositChoice,
  DepositLink,
  DraftKey,
  DraftSaveResult,
  GymDetails,
  OnboardingApi,
  OnboardingError,
  OnboardingResult,
  OnboardingState,
  OnboardingStep,
  SignatureInput,
  StateResult,
  StepDrafts,
} from "./types";

/** Walk the flow in development at `/onboarding/demo`. */
export const DEMO_TOKEN = "demo";

/**
 * Tokens that exercise the failure screens without needing a backend. Every one of
 * these is a real state a gym can land in — a link sat on for a month, or a link
 * superseded by a resend — and each needs its own copy, so they are worth being
 * able to see on demand.
 */
export const MOCK_TOKENS = {
  valid: DEMO_TOKEN,
  expired: "expired-demo",
  revoked: "revoked-demo",
  /** Anything not listed here is treated as `invalid_token`. */
} as const;

/** The step 3 code, fixed in the mock. The real one is emailed and rate-limited (§7). */
export const MOCK_OTP = "123456";

type MockRecord = {
  state: OnboardingState;
  /** Set by `requestSigningOtp`; the mock always issues MOCK_OTP. */
  otpIssued: boolean;
  depositLink: DepositLink | null;
  /**
   * Polls seen since the link was issued. Stands in for the webhook's travel time:
   * the first poll after a gym returns from the gateway reports the money as not yet
   * seen, which is the common case in reality and therefore a state the UI has to
   * have. A mock that confirms instantly hides it (§5).
   */
  depositPolls: number;
};

/** How many polls the mock makes a gym wait before the webhook has "landed". */
const MOCK_DEPOSIT_POLLS_TO_CONFIRM = 2;

const store = new Map<string, MockRecord>();

/** Clears the in-memory store. Tests call this; nothing in the app should. */
export function resetMockOnboarding(): void {
  store.clear();
}

// ── Seed ────────────────────────────────────────────────────────────────────

/**
 * A gym as it exists the moment the link is sent: a row created from a demo
 * request, with the fields the sales call already established and the rest blank.
 *
 * Blank on purpose — a prefilled form that is entirely correct never exercises the
 * validation, and a real demo request does not carry a GSTIN.
 */
function seedState(tokenId: string, now: string): OnboardingState {
  const details: GymDetails = {
    legalEntityName: "",
    entityType: "pvt_ltd",
    tradeName: "Iron Temple Fitness",
    gstin: "",
    fssaiLicenceNumber: "",
    registeredAddress: "",
    installationAddress: "12 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
    signatoryName: "",
    signatoryDesignation: "",
    noticesEmail: "owner@irontemple.example",
    noticesPhone: "+91 98450 12345",
  };

  return {
    tokenId,
    gymId: "gym_mock_0001",
    currentStep: 1,
    completedSteps: [],
    status: "invited",
    isSigned: false,
    depositStatus: "not_started",
    depositReceipt: null,
    invitedByName: "Anurag from MuscleBoxPro",
    gymDisplayName: "Iron Temple Fitness",
    details,
    // Defaults come from the same constants the public page reads, so a new gym's
    // terms and /gym-partnership start identical (§11). The real row can diverge.
    terms: {
      securityDepositInr: PARTNERSHIP.securityDepositInr,
      termMonths: PARTNERSHIP.initialTermMonths,
      gymSharePctBeforeMilestone: PARTNERSHIP.gymNetProfitSharePct.beforeMilestone,
      gymSharePctAfterMilestone: PARTNERSHIP.gymNetProfitSharePct.afterMilestone,
      milestoneCups: PARTNERSHIP.milestone.cups,
      milestoneNetProfitInr: PARTNERSHIP.milestone.cumulativeNetProfitInr,
      advertisingGymSharePct: PARTNERSHIP.advertisingGymSharePct,
      electricityInrPerBlock: PARTNERSHIP.electricity.inrPerBlock,
      electricityCupsPerBlock: PARTNERSHIP.electricity.cupsPerBlock,
      electricityReviewWindowMonths: PARTNERSHIP.electricity.reviewWindowMonths,
      settlementDaysAfterMonthEnd: PARTNERSHIP.settlementDaysAfterMonthEnd,
      // Zero rather than the old null: Schedule B's `[TO BE AGREED]` is now settled at
      // nil, conditional on §36.1's 30 days' notice. Null stays reachable in the type
      // for a gym whose charge really is unagreed.
      earlyTerminationChargeInr: PARTNERSHIP.earlyTerminationChargeInr,
    },
    machine: {
      model: "MuscleBoxPro MBP-1",
      deviceNo: null,
      serialNumber: null,
      valueInr: 4_50_000,
      accessories: "Cup dispenser, water line kit",
      installationDate: null,
    },
    drafts: {},
    timestamps: {
      invitedAt: now,
      firstOpenedAt: null,
      detailsSubmittedAt: null,
      partnershipAckAt: null,
      agreementViewedAt: null,
      signedAt: null,
      depositInitiatedAt: null,
      depositPaidAt: null,
      accountCreatedAt: null,
    },
    agreement: null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fail(code: OnboardingError["code"], message: string, extra: Partial<OnboardingError> = {}) {
  return { ok: false as const, error: { code, message, ...extra } };
}

/**
 * `currentStep` is always the lowest step not yet completed.
 *
 * Derived rather than incremented, which matters when a gym goes back and
 * re-submits step 1 while sitting on step 3: recomputing leaves them on 3, whereas
 * `currentStep + 1` would knock them backwards.
 */
function recomputeStep(completed: OnboardingStep[]): OnboardingStep {
  for (const step of [1, 2, 3, 4, 5] as OnboardingStep[]) {
    if (!completed.includes(step)) return step;
  }
  return 5;
}

function complete(state: OnboardingState, step: OnboardingStep): void {
  if (!state.completedSteps.includes(step)) state.completedSteps.push(step);
  state.completedSteps.sort();
  state.currentStep = recomputeStep(state.completedSteps);
}

/**
 * Issues the document, once, when the gym becomes entitled to read it — version,
 * effective date **and hash**, all fixed in one call.
 *
 * The hash is computed here rather than accepted at signing, and that inversion is the
 * whole point. A hash the browser supplied and the server stored proved only that some
 * client had done some arithmetic: the server could not verify a signature against a
 * number it never computed. So this renders the text itself, exactly as the reader will
 * render it — same version module, same `ISSUED_RENDER_OPTIONS`, same field bridge, all
 * reached through `fingerprintIssuedAgreement` so there is one code path and not two.
 *
 * Async for that reason, and it is worth the awkwardness: `sha256Hex` goes through
 * `crypto.subtle`, which is a promise everywhere it exists. The alternative — a
 * synchronous hash implementation — is a second implementation of the one thing that
 * must not have two.
 *
 * The effective date is fixed *here*, on the server's clock, before any client renders
 * the text, because §4.1's Effective Date is rendered into the agreement and therefore
 * into the hash. It is the Indian calendar date, not the UTC one: see
 * `issuanceDateInIndia`.
 *
 * Idempotent, and deliberately so: it is called both when step 2 completes and when
 * step 3 is first viewed, because a record that resumes straight into step 3 must find
 * a document waiting rather than mint a second one with a later date. Re-issuing would
 * move the date and the hash underneath a gym mid-read, so an existing row is never
 * touched — not even after the terms change. Reissuing on a terms change is a real
 * decision the real backend has to make; the honest failure mode meanwhile is
 * `content_mismatch` at signing, which tells the gym to reload rather than silently
 * swapping the document it read.
 */
async function issueAgreement(state: OnboardingState, nowIso: string): Promise<void> {
  if (state.agreement) return;
  state.agreement = await fingerprintIssuedAgreement(state, issuanceDateInIndia(nowIso));
}

/** Steps 1 and 2 after signing. The hash covers the values they set (§4). */
function isFrozen(state: OnboardingState, step: OnboardingStep): boolean {
  return state.isSigned && (step === 1 || step === 2);
}

/**
 * A step may be submitted if it is the current step, or an earlier one being
 * corrected before signing. Anything ahead of `currentStep` is refused — that is
 * the check that stops a stale tab or an edited URL from skipping the agreement.
 */
function assertSubmittable(state: OnboardingState, step: OnboardingStep) {
  if (isFrozen(state, step)) {
    return fail(
      "frozen",
      "This can't be changed now that the agreement is signed. Contact us and we'll issue an amendment.",
    );
  }
  if (step > state.currentStep) {
    return fail("wrong_step", "Please complete the earlier steps first.", {
      currentStep: state.currentStep,
    });
  }
  return null;
}

export type MockOnboardingOptions = {
  /** Simulated round-trip, so the saving indicator and disabled states are real. */
  latencyMs?: number;
  /** Injected clock, so tests get stable timestamps. */
  now?: () => string;
};

// ── The implementation ──────────────────────────────────────────────────────

export function createMockOnboardingApi(options: MockOnboardingOptions = {}): OnboardingApi {
  const { latencyMs = 0, now = () => new Date().toISOString() } = options;

  const delay = () =>
    latencyMs > 0 ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve();

  /** Resolves a token to its record, seeding on first sight of a valid one. */
  function load(token: string): OnboardingResult<MockRecord> {
    if (token === MOCK_TOKENS.expired) {
      return fail("expired_token", "This link has expired. We can send you a fresh one.");
    }
    if (token === MOCK_TOKENS.revoked) {
      return fail("revoked_token", "This link is no longer valid. A newer one was sent.");
    }
    if (token !== MOCK_TOKENS.valid) {
      return fail("invalid_token", "We couldn't find this onboarding link.");
    }

    let record = store.get(token);
    if (!record) {
      record = {
        state: seedState(token, now()),
        otpIssued: false,
        depositLink: null,
        depositPolls: 0,
      };
      store.set(token, record);
    }
    return { ok: true, data: record };
  }

  /** Snapshot, so a caller mutating what it got back cannot corrupt the store. */
  const snapshot = (state: OnboardingState): OnboardingState =>
    JSON.parse(JSON.stringify(state)) as OnboardingState;

  const ok = (state: OnboardingState): StateResult => ({ ok: true, data: snapshot(state) });

  return {
    async getState(token) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // First open is an audit fact, recorded once. The real implementation also
      // stores IP and user-agent, which a browser cannot supply about itself.
      if (!state.timestamps.firstOpenedAt) {
        state.timestamps.firstOpenedAt = now();
        if (state.status === "invited") state.status = "opened";
      }
      return ok(state);
    },

    async saveDraft<K extends DraftKey>(
      token: string,
      key: K,
      value: NonNullable<StepDrafts[K]>,
    ): Promise<DraftSaveResult> {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Frozen steps stop accepting drafts too, otherwise the UI would show
      // "Saved" for edits the server will later refuse.
      if (state.isSigned && key === "details") {
        return fail("frozen", "Your details are locked now that the agreement is signed.");
      }

      // Merged, not replaced: the wizard sends the whole form on each debounce
      // today, but a partial patch must not wipe fields it doesn't mention.
      state.drafts = { ...state.drafts, [key]: { ...(state.drafts[key] ?? {}), ...value } };
      return { ok: true, data: { savedAt: now() } };
    },

    async submitDetails(token, input) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 1);
      if (blocked) return blocked;

      const parsed = gymDetailsSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Some details need fixing.", {
          fieldErrors: toFieldErrors(parsed.error),
        });
      }

      state.details = parsed.data;
      state.gymDisplayName = parsed.data.tradeName || parsed.data.legalEntityName;
      state.timestamps.detailsSubmittedAt = now();
      if (state.status === "opened" || state.status === "invited") state.status = "details_submitted";
      // The submitted value supersedes the draft, so a later resume shows what was
      // submitted rather than whatever was mid-edit when they last typed.
      delete state.drafts.details;
      complete(state, 1);
      return ok(state);
    },

    async ackPartnership(token) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      const blocked = assertSubmittable(state, 2);
      if (blocked) return blocked;

      // Cheap to store, and it is the evidence that the commercials were shown
      // before the contract was (§3, step 2).
      state.timestamps.partnershipAckAt = now();
      if (state.status === "details_submitted") state.status = "partnership_ack";
      complete(state, 2);
      // The document is issued as the gym becomes entitled to read it, so step 3 has a
      // version, an effective date and a hash to render and check against on its very
      // first paint.
      await issueAgreement(state, now());
      return ok(state);
    },

    async markAgreementViewed(token) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Idempotent, and it does not complete step 3 — viewing is not signing.
      if (!state.timestamps.agreementViewedAt) {
        state.timestamps.agreementViewedAt = now();
        if (state.status === "partnership_ack") state.status = "agreement_viewed";
      }
      // Backstop for a record that reaches step 3 without a document — a resume, or a
      // row created before this call existed. Issuing here as well means the reader
      // never has to invent a date, and the idempotence means it cannot move one.
      await issueAgreement(state, now());
      return ok(state);
    },

    async requestSigningOtp(token) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      if (state.isSigned) return fail("already_signed", "This agreement is already signed.");
      // Kept behind the same switch as the field itself, so a UI that starts asking for
      // a code while the backend still rejects one fails here — at the request, before
      // the gym has typed anything — rather than at the signature.
      if (!SIGNING_REQUIRES_OTP) {
        return fail("validation", "Signing codes aren't in use yet.");
      }
      loaded.data.otpIssued = true;
      return { ok: true, data: { sentTo: state.details.noticesEmail } };
    },

    async signAgreement(token, input: SignatureInput) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // The conditional write. Checked first, before validation, because two tabs
      // racing must produce one signature and one clear error — not two
      // signatures, and not a validation message that hides what happened (§4).
      if (state.timestamps.signedAt) {
        return fail("already_signed", "This agreement has already been signed.");
      }
      if (state.currentStep < 3) {
        return fail("wrong_step", "Please complete the earlier steps first.", {
          currentStep: state.currentStep,
        });
      }

      const parsed = signatureSchema.safeParse(input);
      if (!parsed.success) {
        return fail("validation", "Check the signature panel.", {
          fieldErrors: toFieldErrors(parsed.error),
        });
      }

      // Refused rather than issued-on-the-fly. A client with no pinned document had
      // nothing to render and therefore nothing to hash, so whatever it sent came from
      // somewhere else — and issuing here would date the agreement at the instant of
      // signing, which is precisely the browser-clock bug the inversion removed.
      if (!state.agreement) {
        return fail("wrong_step", "Open the agreement before signing it.", { currentStep: 3 });
      }

      // The code is rejected, not ignored, while OTP is off. A signature accepted
      // alongside an unverified code is a signature whose audit trail claims a check
      // that never happened, and the panel would have told the gym it was emailed one.
      if (!SIGNING_REQUIRES_OTP) {
        if (parsed.data.otpCode !== undefined) {
          return fail("validation", "Signing codes aren't in use yet.", {
            fieldErrors: { otpCode: "Remove this field. It is not verified yet." },
          });
        }
      } else if (!loaded.data.otpIssued || parsed.data.otpCode !== MOCK_OTP) {
        return fail("otp_invalid", "That code isn't right. Request a new one and try again.");
      }

      // The comparison the whole inversion exists for. The server re-renders the
      // document it pinned and checks the client's independently computed hash against
      // its own — so what gets stored is never what the client asserted, and a client
      // rendering different text cannot get a signature recorded against a document it
      // did not display.
      const recomputed = await fingerprintIssuedAgreement(state, state.agreement.effectiveDate);
      if (parsed.data.contentHash !== recomputed.contentHash) {
        return fail(
          "content_mismatch",
          "Your copy of the agreement is out of date. Reload this page to read the current version. Nothing has been signed.",
        );
      }

      state.timestamps.signedAt = now();
      state.isSigned = true;
      state.status = "signed";
      // Nothing is written to `state.agreement`. The version, the date and the hash were
      // all fixed at issuance and the signature attaches to them; a write here could only
      // move what was already agreed.
      complete(state, 3);
      return ok(state);
    },

    async chooseDeposit(token, choice: DepositChoice) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // §5.1 makes the deposit an obligation arising under the agreement, so it
      // cannot be collected before there is one.
      if (!state.isSigned) {
        return fail("wrong_step", "The deposit comes after the agreement is signed.", {
          currentStep: state.currentStep,
        });
      }

      if (choice === "pay_later") {
        // Deferring completes the step. A delayed ₹50,000 must never orphan a gym
        // that has already signed — the signature is the milestone, the deposit is
        // a receivable (§3, step 4).
        state.depositStatus = "deferred";
        complete(state, 4);
        return { ok: true, data: { state: snapshot(state), link: null } };
      }

      state.depositStatus = "pending";
      state.timestamps.depositInitiatedAt = now();
      const amountPaise = state.terms.securityDepositInr * 100;
      // Amount comes off the terms row in paise, never from the browser (§5).
      loaded.data.depositLink = {
        paymentUrl: `https://rzp.io/i/mock-${state.gymId}`,
        linkId: `plink_mock_${state.gymId}`,
        amountPaise,
      };
      loaded.data.depositPolls = 0;
      // Step 4 stays incomplete until the money is confirmed by our own record.
      return { ok: true, data: { state: snapshot(state), link: loaded.data.depositLink } };
    },

    async refreshDepositStatus(token) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Reads our own record, exactly as the real poll must. It never trusts a
      // redirect or a client callback — the webhook is the source of truth (§5).
      if (state.depositStatus === "pending") {
        loaded.data.depositPolls += 1;
        if (loaded.data.depositPolls >= MOCK_DEPOSIT_POLLS_TO_CONFIRM) {
          state.depositStatus = "paid";
          state.timestamps.depositPaidAt = now();
          // Never backwards. A gym that deferred, created its account and paid a week
          // later is `active`, and `deposit_paid` is behind that on the lifecycle —
          // writing it here would regress the record on the one path we most expect.
          if (state.status !== "active") state.status = "deposit_paid";
          // Written from the record on the server's side of the wire. The real one
          // comes off the `deposits` row the webhook wrote, with the amount the
          // gateway settled — not the amount the browser last saw.
          state.depositReceipt = {
            receiptNo: `MBP-DEP-${state.gymId.slice(-4)}`,
            amountPaise: loaded.data.depositLink?.amountPaise ?? state.terms.securityDepositInr * 100,
            method: "UPI",
            paidAt: state.timestamps.depositPaidAt,
          };
          complete(state, 4);
        }
      }
      return ok(state);
    },

    async createAccount(token, password) {
      await delay();
      const loaded = load(token);
      if (!loaded.ok) return loaded;
      const { state } = loaded.data;

      // Lands after signing and before the deposit clears, so skipping step 4
      // still leaves a usable account (§3, step 5).
      if (!state.isSigned) {
        return fail("wrong_step", "The account is created once the agreement is signed.", {
          currentStep: state.currentStep,
        });
      }
      const parsed = portalPasswordSchema.safeParse(password);
      if (!parsed.success) {
        // A bare string schema puts its issues at the root path, so there is no key
        // for `toFieldErrors` to build; the field name is supplied here instead.
        return fail("validation", "Choose a longer password.", {
          fieldErrors: { password: parsed.error.issues[0].message },
        });
      }

      state.timestamps.accountCreatedAt = now();
      state.status = "active";
      complete(state, 5);
      return ok(state);
    },
  };
}
