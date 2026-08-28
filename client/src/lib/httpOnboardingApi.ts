/**
 * `OnboardingApi` over the real endpoints.
 *
 * The counterpart to `createMockOnboardingApi`, satisfying the same interface, so the
 * wizard cannot tell them apart and swapping one for the other is the one-line change in
 * [onboardingApi.ts](./onboardingApi.ts) that the seam was built for. Routes and codes come
 * from `mbp-backend` `docs/gym-onboarding-api-design.md` §§2.2, 2.5 and 4.4; the transport
 * rules — cookies, JSON content type, error mapping — all live in
 * [apiClient.ts](./apiClient.ts) and are not repeated per call.
 *
 * ## Two things this file asks of the backend
 *
 * **1. Every mutating route returns the whole `OnboardingState`.** Not a patch, not just
 * the thing it wrote. `useOnboarding`'s `run()` folds the response straight into React
 * state, which is what makes `types.ts`'s invariant true: *the server owns `currentStep`*.
 * A route that returned only what it changed would force this client to merge — and a
 * client that merges is a client that computes its own step, which is the one thing the
 * whole contract is arranged to prevent. It is also nearly free server-side: each of these
 * handlers has already read and written the item.
 *
 * The design as written specifies partial responses for `details`, `ack`, `agreement/view`,
 * `sign`, `deposit` and `account`. Rather than assume, `commit()` below checks and falls
 * back to a re-read — see its note on why that fallback is a compatibility shim and not the
 * intended path.
 *
 * **2. `POST /gym/account` takes the email from the caller.** §2.5 describes the route as
 * taking `{ email, password }`, and the deployed handler means it: a request without one is
 * a 400 carrying `fieldErrors.email`, on a screen that has no email input to highlight. This
 * client used to send only the password on the argument that the address is the gym's §41
 * notices email, already on the profile the handle is scoped to, so the server should read it
 * there — which is the better design and is not what is deployed. Sending nothing made step 5
 * impossible to finish rather than making the point.
 *
 * The value comes from `state.details.noticesEmail` — the state the server itself returned,
 * threaded through `useOnboarding`, not a field anyone types at this end. That is worth
 * keeping if the route is ever changed to derive it: the reason the browser should not name
 * the address is that a browser choosing it is a browser choosing which address can later
 * reset the password on the account, and that is an authorisation decision.
 */

import { apiRequest } from "./apiClient";
import type {
  DepositChoice,
  DepositLink,
  DraftKey,
  DraftSaveResult,
  OnboardingApi,
  OnboardingResult,
  OnboardingState,
  SignatureInput,
  StateResult,
  StepDrafts,
  GymDetails,
} from "@shared/onboarding/types";

/**
 * **TEMPORARY, and it overstates what the gym did. Remove with the checkboxes (2026-08-24).**
 *
 * `POST /onboarding/ack` requires four affirmative acknowledgements, each literally `true`:
 * `REQUIRED_ACKS` in `mbp-backend` `services/onboarding/src/handlers/onboardingAck.ts`. Its
 * own comment says why — *"Every acknowledgment must be affirmative. An unticked box is not a
 * 'no' we record, it is a step that has not happened"* — and it names the keys server-side so
 * a client cannot narrow what the gym agreed to by quietly dropping one.
 *
 * This client sent `{}`, because the frontend was built to `docs/gym-onboarding.md`'s step 2:
 * "No input. Continuing records `partnership_ack_at`." So every Continue on step 2 came back
 * 400 with "Please check the highlighted fields." on a screen that has no fields — the bug
 * this replaced, and the reason the banner work that chased the message was reverted.
 *
 * Sending them hard-coded unblocks the flow and is the wrong permanent answer: the four keys
 * become `partnershipAck` on the onboarding item, with the gym's IP, user-agent and a server
 * timestamp beside them, and that row is what anyone would point at if the acceptance were
 * ever questioned. It would be asserting four separate acknowledgements the gym was never
 * shown a box for.
 *
 * The fix is four checkboxes on step 2 — one per commercial fact the screen already explains,
 * which is what the backend was built expecting — passed in from `StepPartnership` instead of
 * being invented here. Until then this constant is the whole of the debt, in one place, under
 * a name that cannot be mistaken for a real acknowledgement.
 */
const PLACEHOLDER_ACKS = {
  understandsRevenueShare: true,
  understandsDeposit: true,
  understandsElectricity: true,
  understandsTerm: true,
} as const;

export function createHttpOnboardingApi(): OnboardingApi {
  return {
    /**
     * The wizard's only read.
     *
     * Under Supabase the page queried tables directly and RLS decided what it could see.
     * There is no equivalent here — the browser holds no AWS credentials — so this one
     * response is the whole of what the wizard knows, and the handle check in the handler
     * is the authorisation that RLS used to do (§2.5).
     */
    getState(token) {
      return apiRequest<OnboardingState>("GET", "/onboarding", { handle: token });
    },

    /**
     * Autosave.
     *
     * `step` carries the *draft key* — `"details"`, `"signature"` — not a step number.
     * `StepDrafts` is keyed by name on purpose, so that renumbering the wizard cannot
     * silently repoint a draft at the wrong step, and §2.5's own description of the
     * handler ("merges into `ONBOARDING.drafts[step]`") only works if the two agree. The
     * field name is the backend's; the value is the frontend's key.
     */
    saveDraft<K extends DraftKey>(
      token: string,
      key: K,
      value: NonNullable<StepDrafts[K]>,
    ): Promise<DraftSaveResult> {
      return apiRequest<{ savedAt: string }>("PUT", "/onboarding/draft", {
        handle: token,
        body: { step: key, data: value },
      });
    },

    submitDetails(token: string, input: GymDetails) {
      return commit(token, "POST", "/onboarding/details", input);
    },

    ackPartnership(token: string) {
      return commit(token, "POST", "/onboarding/ack", PLACEHOLDER_ACKS);
    },

    /**
     * Step 3a. A `POST` because serving it *pins the version that will be signed*.
     *
     * The response the wizard needs is the state with `agreement` populated: version,
     * server-resolved `effectiveDate`, `contentHash` and `length`. §2.5 has the route
     * returning those four plus `fields`. `fields` is not wanted here — the reader derives
     * them from the state it already has, and a second copy arriving on this response is a
     * second answer to "what does the document say" with nothing deciding between them.
     */
    markAgreementViewed(token: string) {
      return commit(token, "POST", "/onboarding/agreement/view");
    },

    /**
     * Not wired, because there is no route.
     *
     * Signing ships without OTP: it needs SES, which the service does not have (§8.1,
     * settled 2026-08-23). `SIGNING_REQUIRES_OTP` is false, so nothing calls this — and
     * returning a failure rather than throwing keeps that true if something ever does. The
     * method stays on the interface because OTP is an added precondition on
     * `POST /onboarding/sign` when SES lands, not a redesign, and the panel's second phase
     * is still built and tested behind the flag.
     */
    async requestSigningOtp() {
      return {
        ok: false as const,
        error: {
          code: "network" as const,
          message: "Signing codes aren't available yet.",
        },
      };
    },

    /**
     * Step 3b.
     *
     * `input.contentHash` is this client's own SHA-256 of the text that was on screen, and
     * the server compares it against the hash it pinned at 3a. Echoing back
     * `state.agreement.contentHash` would satisfy the type and verify nothing — the value
     * of the field is precisely that it was computed somewhere else. A mismatch comes back
     * as `content_mismatch`, whose recovery is to re-view rather than to re-type, which is
     * why it is its own code and not a `validation` error against a field nobody filled in.
     *
     * `otpCode` is absent, not empty: the endpoint **rejects** a payload carrying it while
     * §8.1 holds, because a signature record that reads as OTP-verified when no code was
     * checked is worse evidence than one that never claimed to be.
     */
    signAgreement(token: string, input: SignatureInput) {
      return commit(token, "POST", "/onboarding/sign", input);
    },

    /**
     * Step 4.
     *
     * The amount is not in the request and must never be: it comes from that gym's
     * `TERMS.securityDepositPaise`, written by an admin-authenticated call. That is what
     * makes "a gym cannot influence its own deposit" a property rather than an intention.
     *
     * `pay_later` is a real answer rather than the absence of one — the deposit is
     * skippable and `POST /admin/gyms/{id}/activate` consults the choice — so it goes
     * through the same route and comes back with a null link.
     */
    async chooseDeposit(token: string, choice: DepositChoice) {
      const result = await apiRequest<unknown>("POST", "/gym/deposit", {
        handle: token,
        body: { choice },
      });
      if (!result.ok) return result;

      const envelope = isRecord(result.data) ? result.data : {};
      // Either shape: `{ state, link }` as the interface wants, or the bare link the route
      // is specified to return today.
      const link = asDepositLink(isRecord(envelope.link) ? envelope.link : envelope);
      if (link === MALFORMED_LINK) {
        // A payment URL we will not put in an `href`. `StepDeposit` renders it as a link
        // on a page mid-onboarding, so a `javascript:` scheme here is script execution —
        // the same reasoning that makes `portalSchema.ts` check the dashboard's copy of
        // this field. Refusing to show a link is a support call; showing a bad one is an
        // incident.
        return {
          ok: false as const,
          error: {
            code: "network" as const,
            message: "We couldn't set up the deposit payment just now. Please try again.",
          },
        };
      }

      const state: StateResult = isOnboardingState(envelope.state)
        ? { ok: true, data: envelope.state }
        : await reread(token);
      if (!state.ok) return state;

      return { ok: true as const, data: { state: state.data, link } };
    },

    /**
     * The deposit poll.
     *
     * `GET /onboarding` rather than `GET /gym/deposit/status`, which is not an oversight.
     * The wizard needs the whole state back — `useOnboarding` folds it in, and
     * `depositStatus` moving to `paid` is what advances step 4 — whereas
     * `/gym/deposit/status` answers with a deposit record, because its other caller is a
     * logged-in gym on the dashboard that has no onboarding state at all. One request that
     * returns what the caller needs beats two that have to be stitched together.
     *
     * Safe to call on a timer: `GET /onboarding`'s first-open telemetry is written with
     * `if_not_exists`, so polling cannot rewrite it.
     */
    refreshDepositStatus(token: string) {
      return apiRequest<OnboardingState>("GET", "/onboarding", { handle: token });
    },

    /**
     * Step 5 — and also a login: the route sets the gym session cookie, so the end of the
     * wizard leaves the browser able to reach the dashboard without typing the password
     * again. That is why `credentials: "include"` matters on a call that appears to be
     * sending rather than receiving a credential.
     */
    createAccount(token: string, password: string, email: string) {
      return commit(token, "POST", "/gym/account", { email, password });
    },
  };
}

// ── Folding a write's response back into state ───────────────────────────────

/**
 * Run a mutating call and return the state it produced.
 *
 * The check-then-re-read is a compatibility shim, and it is worth being clear about which
 * half is which. The intended path is the first: the route returns the state and this is a
 * single request. The fallback exists so that a backend returning §2.5's narrower responses
 * still drives a working wizard rather than folding a `{ savedAt }` or a `{ contentHash }`
 * into `state` and rendering a blank step.
 *
 * The fallback is not somewhere to settle, for a reason that has nothing to do with
 * elegance: DynamoDB reads are eventually consistent by default, so a `GET /onboarding`
 * issued immediately after `POST /onboarding/details` can legitimately answer with the
 * item as it was *before* the write. The wizard would then re-render step 1 — with the form
 * empty, because committing the step cleared the draft. Two requests per mutation is the
 * visible cost; a step that silently un-completes itself is the real one.
 */
async function commit(
  token: string,
  method: "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<StateResult> {
  const result = await apiRequest<unknown>(method, path, { handle: token, body });
  if (!result.ok) return result;
  if (isOnboardingState(result.data)) return { ok: true, data: result.data };
  return reread(token);
}

function reread(token: string): Promise<StateResult> {
  return apiRequest<OnboardingState>("GET", "/onboarding", { handle: token });
}

/**
 * Is this response a state at all?
 *
 * Three fields, not a schema. `currentStep` and `completedSteps` are what the wizard
 * navigates on and `status` is the ladder, so a response carrying all three is a state and
 * one carrying none of them is a different route's reply. This is emphatically *not*
 * validation of the state's contents — `terms` could still arrive with a string where a
 * rupee figure belongs and render "₹NaN", exactly as the dashboard would without
 * `portalSchema.ts`. That schema does not exist for `OnboardingState` yet, and this
 * function is not a substitute for it.
 */
function isOnboardingState(value: unknown): value is OnboardingState {
  if (!isRecord(value)) return false;
  return (
    typeof value.currentStep === "number" &&
    Array.isArray(value.completedSteps) &&
    typeof value.status === "string"
  );
}

// ── The deposit link ────────────────────────────────────────────────────────

/** Distinct from `null`: a link was offered and we are refusing to render it. */
const MALFORMED_LINK = Symbol("malformed deposit link");

/**
 * A deposit link, `null` when there is none (`pay_later`), or `MALFORMED_LINK`.
 *
 * `paymentUrl` is scheme-checked with an allowlist rather than a blocklist, for the same
 * reason as `httpUrl` in `portalSchema.ts`: the unsafe set is open-ended and the safe set
 * is two entries.
 */
function asDepositLink(value: unknown): DepositLink | null | typeof MALFORMED_LINK {
  if (!isRecord(value)) return null;
  const { paymentUrl, linkId, amountPaise } = value;
  if (paymentUrl === undefined || paymentUrl === null) return null;
  if (typeof paymentUrl !== "string" || typeof linkId !== "string") return MALFORMED_LINK;
  if (!Number.isInteger(amountPaise)) return MALFORMED_LINK;

  let scheme: string;
  try {
    scheme = new URL(paymentUrl).protocol;
  } catch {
    return MALFORMED_LINK;
  }
  if (scheme !== "https:") return MALFORMED_LINK;

  return { paymentUrl, linkId, amountPaise: amountPaise as number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Re-exported so a caller can name the result type without importing the interface. */
export type { OnboardingResult };
