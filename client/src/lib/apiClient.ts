/**
 * The one place this app speaks HTTP to `api.muscleboxpro.com`.
 *
 * Everything that reaches the onboarding API — the wizard, the deposit panel, the gym
 * dashboard — goes through `apiRequest`. Not for tidiness: four of the rules below fail
 * *only in a real browser against a real origin*, so a second call site that forgot one
 * would pass every test in this repo and break on deploy. Concentrating them here means
 * there is one thing to get right and one thing to review.
 *
 * The rules, each with the failure it prevents (`mbp-backend`
 * `docs/gym-onboarding-api-design.md` §§4.2–4.4):
 *
 * 1. **`credentials: "include"`, always.** Sessions are `HttpOnly` cookies set on
 *    `api.muscleboxpro.com`, and `www.` → `api.` is cross-*origin*. Fetch does not send
 *    cookies cross-origin unless asked, so a call without this is an anonymous call — a
 *    401 on a perfectly good session. It is unconditional rather than per-call because the
 *    handle-authenticated routes are harmless with it and the cookie routes are broken
 *    without it, so there is no reason to make it a decision anyone can get wrong.
 *
 * 2. **`Content-Type: application/json` on every write.** This is a CSRF control, not a
 *    convention (§4.2): the API *rejects* a state-changing request without it, because
 *    requiring it guarantees a CORS preflight that a non-allowlisted origin fails. So a
 *    write with nothing to say still sends `{}` — a bodyless POST would be refused.
 *
 * 3. **The onboarding handle travels in `Authorization: Bearer`.** Never in a path
 *    segment, never in a query string. API Gateway access logs archive paths and query
 *    strings, and a 30-day credential in a log is a 30-day credential in a log (§4.3).
 *
 * 4. **The sandbox bearer hatch is conditional, tab-scoped, and cannot exist in production.**
 *    Where the API is not on our own registrable domain, a browser can neither read nor
 *    return the session cookie, so the sandbox hands back a `sessionToken` and this module
 *    sends it. It is gated on the API hostname rather than on a flag, so there is nothing to
 *    switch on by accident. See `BEARER_SESSION_ALLOWED` and
 *    `BEARER_SESSION_STORAGE_KEY` — the token lives in `sessionStorage`, which is what lets
 *    a reload keep you signed in without letting a closed tab keep a credential.
 *
 * 5. **A failure is a value, never an exception.** Every call resolves to
 *    `OnboardingResult`, because `OnboardingError` *is* the wizard's error surface — it
 *    picks the terminal screen, the field markers and the recovery copy. A thrown fetch
 *    would bypass all of it and land in a React error boundary, which tells a gym owner
 *    nothing and loses the distinction between an expired link and a dropped connection.
 *
 * What this module deliberately does not do is validate the response body. `T` is a cast.
 * That is a real gap and it is the same one `shared/gym/portalSchema.ts` exists to close on
 * the dashboard side — the wizard renders rupee figures out of `terms`, so a renamed field
 * arrives as "₹NaN" rather than as an error. An `OnboardingState` schema is the symmetric
 * piece of work and is not written yet; until it is, the boundary here is the status code
 * and nothing else.
 */

import { ONBOARDING_STEPS } from "@shared/onboarding/types";
import type {
  OnboardingError,
  OnboardingErrorCode,
  OnboardingResult,
  OnboardingStep,
} from "@shared/onboarding/types";
import { FRANCHISE_ONBOARDING_STEPS } from "@shared/franchise/onboarding/types";
import type {
  FranchiseOnboardingError,
  FranchiseOnboardingErrorCode,
  FranchiseOnboardingResult,
  FranchiseOnboardingStep,
} from "@shared/franchise/onboarding/types";

/**
 * Where the API lives.
 *
 * The custom domain is not cosmetic and this default should not be swapped for an
 * `execute-api.<region>.amazonaws.com` URL: `www.muscleboxpro.com` and
 * `api.muscleboxpro.com` share one registrable domain, which is what makes the session
 * cookies same-site and keeps `SameSite=Lax`'s CSRF protection. On an `amazonaws.com`
 * host the requests become cross-site, the cookie would need `SameSite=None`, and that
 * protection is gone (§4.2). The domain *is* the security control.
 *
 * Also: whatever origin this resolves to must be in `connect-src` in `next.config.mjs`,
 * which is an allowlist that fails in production only.
 */
export const MBP_API_BASE_URL = (
  process.env.NEXT_PUBLIC_MBP_API_URL ?? "https://api.muscleboxpro.com"
).replace(/\/+$/, "");

/** The one host that serves real gyms. Everything about the hatch below hangs off this. */
const PRODUCTION_API_HOSTNAME = "api.muscleboxpro.com";

/**
 * The hostname of a base URL, or the production one if it cannot be parsed.
 *
 * Falling back to production rather than to `null` is the fail-closed half of property 2
 * below: a value nobody can parse is a misconfiguration, and the safe reading of a
 * misconfiguration is "assume this is the host with real gyms on it".
 */
function hostnameOf(base: string): string {
  try {
    return new URL(base).hostname;
  } catch {
    return PRODUCTION_API_HOSTNAME;
  }
}

/**
 * Whether this build talks to the API that serves real gyms.
 *
 * Derived from the host and fail-closed for the reasons under `BEARER_SESSION_ALLOWED` below,
 * which is now its inverse.
 */
export const IS_PRODUCTION_API = hostnameOf(MBP_API_BASE_URL) === PRODUCTION_API_HOSTNAME;

/**
 * The three APIs this app talks to, and why there are three rather than one.
 *
 * One service, three CloudFormation stacks. `MbpOnboarding-<env>` reached 486 of CloudFormation's 500
 * resources, so the franchise admin routes moved to `MbpFranchiseAdmin-<env>`; the wizard's fourteen
 * routes then went to a third stack for a different reason — one of them can sign an upload into the
 * bucket of identity documents and one can read the bank account a franchisee wires ₹12,50,000 to, and
 * neither belongs in the blast radius of the admin routes that read those documents and verify that
 * transfer. See `mbp-backend` `infra/lib/stacks/franchise-wizard-stack.ts`.
 *
 * In production all three are one origin: API Gateway base path mappings put them on
 * `api.muscleboxpro.com`, at `/`, `/franchise-admin` and `/franchise-wizard`. That is the arrangement the
 * session cookie needs and it is why the paths look doubled — `/franchise-wizard/franchise/onboarding`
 * is the wizard's own route under the wizard stack's base path.
 *
 * **The admin base path was `/franchise` until 2026-09-04.** A custom domain matches the longest base
 * path before it falls through to the root mapping, so `/franchise` swallowed every onboarding route
 * beginning `/franchise/` — in practice one, `POST /franchise/applications`, the enquiry form in
 * [franchiseApi.ts](./franchiseApi.ts). It answered 403 from the gateway with no
 * `Access-Control-Allow-Origin`, which reaches the browser as a CORS error about a route whose CORS is
 * fine. If a franchise screen 403s after a base path changes here, that is the shape of it.
 *
 * In sandbox they are three different `execute-api` hosts, which cannot be derived from each other.
 */
export type ApiTarget = "onboarding" | "franchiseAdmin" | "franchiseWizard";

/** The base path each stack is mapped onto where there is a custom domain to map onto. */
const BASE_PATHS: Record<ApiTarget, string> = {
  onboarding: "",
  franchiseAdmin: "/franchise-admin",
  franchiseWizard: "/franchise-wizard",
};

/**
 * Resolve one target's base URL, or `null` where this build cannot know it.
 *
 * Appending the base path is right on a custom domain and wrong everywhere else: the sandbox's three
 * stacks are three unrelated `execute-api` hostnames, so `…amazonaws.com/sandbox/franchise` is not a
 * longer path to the franchise API, it is a 403 from the onboarding one. So the explicit variable wins,
 * derivation happens only against our own domain, and anything else resolves to `null` — which every
 * caller turns into an error naming the variable to set.
 *
 * Failing loudly is the point. A silently wrong host is a developer watching a franchise screen 403 and
 * concluding the routes are not deployed.
 */
function resolveBase(target: ApiTarget, explicit: string | undefined): string | null {
  const configured = explicit?.replace(/\/+$/, "");
  if (configured !== undefined && configured.length > 0) return configured;
  if (hostnameOf(MBP_API_BASE_URL) !== PRODUCTION_API_HOSTNAME) return null;
  return `${MBP_API_BASE_URL}${BASE_PATHS[target]}`;
}

const BASE_URLS: Record<ApiTarget, string | null> = {
  onboarding: MBP_API_BASE_URL,
  franchiseAdmin: resolveBase("franchiseAdmin", process.env.NEXT_PUBLIC_MBP_FRANCHISE_API_URL),
  franchiseWizard: resolveBase(
    "franchiseWizard",
    process.env.NEXT_PUBLIC_MBP_FRANCHISE_WIZARD_API_URL,
  ),
};

/** The env var a caller is told to set when a target has no base URL. */
const BASE_URL_VARS: Record<ApiTarget, string> = {
  onboarding: "NEXT_PUBLIC_MBP_API_URL",
  franchiseAdmin: "NEXT_PUBLIC_MBP_FRANCHISE_API_URL",
  franchiseWizard: "NEXT_PUBLIC_MBP_FRANCHISE_WIZARD_API_URL",
};

export function apiBaseUrl(target: ApiTarget): string | null {
  return BASE_URLS[target];
}

/**
 * Whether this build may fall back to a bearer session — **sandbox only.**
 *
 * The problem it solves is a browser one, not a convenience one. Against the sandbox's
 * `execute-api.ap-south-1.amazonaws.com` host a page on `localhost:3000` can neither
 * *read* `Set-Cookie` (a forbidden response header, stripped by the Fetch spec no matter
 * what `Access-Control-Expose-Headers` says) nor have a `SameSite=Lax` cookie *sent*
 * back, because that pairing is cross-site. So the sandbox stack sets
 * `AllowBearerSessions=true` and its three session-minting routes also return
 * `sessionToken` in the body; see `mbp-backend` `docs/onboarding-testing.md` §3.
 *
 * Three properties, each deliberate:
 *
 * 1. **Derived from the host, not from `NODE_ENV` or a flag of its own.** The condition
 *    that makes a bearer necessary *is* "the API is not on our registrable domain", so
 *    that is the thing to test. A production build accidentally pointed at the sandbox
 *    still works; a sandbox-flavoured build pointed at `api.muscleboxpro.com` still
 *    refuses. There is no env var anyone can set to turn this on in production.
 * 2. **Fail-closed default.** `NEXT_PUBLIC_MBP_API_URL` unset means the production host,
 *    which means off. An unparseable value is treated as production too.
 * 3. **The header stays conditional even where it is allowed.** Prod omits `sessionToken`
 *    from the body entirely, so nothing is ever remembered there and the cookie does the
 *    work. A client that *required* the token would pass in sandbox and fail in prod —
 *    the worst order in which to find out.
 */
export const BEARER_SESSION_ALLOWED = !IS_PRODUCTION_API;

/**
 * Where the sandbox session token is kept: `sessionStorage`, mirrored in memory.
 *
 * **Not `localStorage`, and never in production.** An earlier version of this module held
 * the token in a module variable only, which meant a page reload signed you out — and
 * signed you out of `/admin`, where the cookie cannot stand in for it. That made the one
 * environment the hatch exists to serve unusable for actually building against.
 *
 * The reasoning that rejected persistence was about production, and in production
 * `BEARER_SESSION_ALLOWED` is `false`, so nothing here is ever written. What is actually
 * being weighed is a *sandbox* token, on a developer's `localhost`, exposed to a script
 * injected into our own dev build. `sessionStorage` rather than `localStorage` keeps the
 * blast radius at one tab: it dies when the tab closes, so a token does not sit on a laptop
 * overnight waiting to be found.
 */
const BEARER_SESSION_STORAGE_KEY = "mbp:sandbox-session";

/**
 * `sessionStorage`, or null where there isn't one.
 *
 * Three ways there isn't one, and all three are ordinary rather than exceptional: this
 * build is pointed at production (so the hatch is off), the module is being evaluated on
 * the server during SSR (`"use client"` components are still rendered there), or the
 * browser refuses storage access outright — Safari's private mode *throws* on the property
 * access itself, not on the read, which is why the `try` wraps the access and not the call.
 */
function bearerSessionStore(): Storage | null {
  if (!BEARER_SESSION_ALLOWED) return null;
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Forget the stored copy — **ungated**, unlike reading and writing.
 *
 * Removing a credential needs no permission and is never the wrong thing to do, so this
 * does not consult `BEARER_SESSION_ALLOWED`. That also makes it the reliable way to reset
 * between tests, where one module instance may have written a token that another instance
 * would otherwise inherit through the shared storage.
 */
function clearStoredBearerSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BEARER_SESSION_STORAGE_KEY);
  } catch {
    // No storage to clear is the same outcome as having cleared it.
  }
}

/**
 * The in-memory mirror, seeded from storage the first time it is wanted.
 *
 * Lazily rather than at module load because module load happens during SSR, where there is
 * no storage to read and the answer would be cached as `null` for the life of the process.
 */
let bearerSession: string | null = null;
let bearerSessionSeeded = false;

function currentBearerSession(): string | null {
  if (!BEARER_SESSION_ALLOWED) return null;
  if (!bearerSessionSeeded) {
    const stored = bearerSessionStore()?.getItem(BEARER_SESSION_STORAGE_KEY);
    bearerSession = typeof stored === "string" && stored.length > 0 ? stored : null;
    // Only once there is somewhere to read from. On the server there never is, and marking
    // it seeded there would leave the browser half of a hydrated page reading `null`.
    if (typeof window !== "undefined") bearerSessionSeeded = true;
  }
  return bearerSession;
}

/**
 * Hold on to a `sessionToken` from a login response, if there is one and we are allowed to.
 *
 * Takes `unknown` on purpose: callers pass the response field straight in, so the "is it
 * actually a non-empty string" check lives here rather than being repeated — and forgotten
 * once — at each of the three call sites. In production the field is absent, so this is a
 * no-op twice over: nothing to store, and storing disabled anyway.
 */
export function rememberBearerSession(token: unknown): void {
  if (!BEARER_SESSION_ALLOWED) return;
  if (typeof token !== "string" || token.length === 0) return;
  bearerSession = token;
  bearerSessionSeeded = true;
  try {
    bearerSessionStore()?.setItem(BEARER_SESSION_STORAGE_KEY, token);
  } catch {
    // Storage full or refused mid-session. The in-memory copy above still works for this
    // tab, so the degradation is exactly the old behaviour: a reload signs you out.
  }
}

/**
 * Drop it — on sign-out, and on any 401, so a dead token stops being sent.
 *
 * This is *not* a substitute for calling the logout route: only the server can expire the
 * cookie that production actually runs on. See `signOutOfPortal`.
 */
export function forgetBearerSession(): void {
  bearerSession = null;
  bearerSessionSeeded = false;
  clearStoredBearerSession();
}

/** For tests and for deciding whether a sandbox session is worth optimistically rendering. */
export function hasBearerSession(): boolean {
  return currentBearerSession() !== null;
}

/**
 * How long to wait before calling it a failure.
 *
 * Generous on purpose: `POST /gym/deposit` creates a Razorpay Payment Link, so a cold
 * Lambda plus a third-party round trip is the slow path, and a gym that has just clicked
 * "pay the deposit" would rather wait than be told to try again. It exists at all because
 * `fetch` has no default timeout — without it the wizard's saving indicator spins forever
 * on a dropped connection, which is the one failure mode a user cannot distinguish from a
 * hung app.
 */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * The codes we are willing to take from a response body.
 *
 * An allowlist because `error.code` selects the copy and the recovery: an unrecognised
 * value falls through to whatever branch a component happened to write last, which is how
 * a gym gets told something untrue about why its link did not work. Anything not in here
 * is mapped from the status instead.
 *
 * `network` is excluded deliberately. §4.4: the server never emits it, it means "this
 * request did not complete", and honouring a server-sent `network` would let a response
 * that plainly did arrive claim it hadn't.
 */
const RECOGNISED_CODES: ReadonlySet<string> = new Set<OnboardingErrorCode>([
  "invalid_token",
  "expired_token",
  "revoked_token",
  "wrong_step",
  "frozen",
  "already_signed",
  "content_mismatch",
  "validation",
  "otp_invalid",
]);

/**
 * `PATCH` earns its place here for exactly one route: `PATCH /admin/gyms/{gymId}/terms`.
 *
 * It matters for rule 2 rather than for tidiness. `sendsBody` below is `method !== "GET"`, so
 * adding it to this union is also what gives the request its `Content-Type: application/json` —
 * and the API *refuses* a state-changing request without that header, because requiring it
 * guarantees the CORS preflight a non-allowlisted origin fails (§4.2).
 */
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  /**
   * The onboarding handle. Sent as `Authorization: Bearer`; omitted for the cookie-
   * authenticated routes, which carry their session in `credentials: "include"` — or, in
   * sandbox only, in a stored bearer session (rule 4). Supplying a handle takes precedence
   * over that: the two share one header and this route is about the handle.
   */
  handle?: string;
  /**
   * The request body, JSON-encoded. Any non-GET sends one even when this is undefined —
   * see rule 2. Ignored on GET, where a body would make the request non-simple and buy
   * an extra preflight for nothing.
   */
  body?: unknown;
  /**
   * Which of the three APIs this route belongs to. Defaults to the onboarding API, which is
   * where every gym route lives.
   *
   * A parameter rather than a full URL for the reason `path` is a route: a caller that could
   * pass a URL could point a credentialed request anywhere.
   */
  api?: ApiTarget;
};

/**
 * The transport, with no error vocabulary attached.
 *
 * Split out because there are two vocabularies and one set of transport rules. The gym flow answers
 * `invalid_token` where the franchise flow answers `invalid_handle`; the frontend switches terminal
 * screens on the exact string, so they cannot be merged, and the five rules at the top of this file
 * must not be written twice to keep them apart. What comes back here is the raw outcome — the request
 * did not complete, or it did and here is the status and body — and the two exported functions below
 * are each one mapping of that onto one contract.
 */
type RawOutcome =
  | { kind: "ok"; data: unknown }
  | { kind: "network" }
  | { kind: "status"; status: number; body: unknown };

async function rawRequest(
  method: ApiMethod,
  path: string,
  options: ApiRequestOptions,
): Promise<RawOutcome> {
  const target = options.api ?? "onboarding";
  const base = BASE_URLS[target];
  // No host to call. Distinguished from every other failure only in the log: for the user it is the
  // same "we could not reach us", and there is nothing they can do about a missing env var.
  if (base === null) {
    console.error(
      `[apiClient] no base URL for the ${target} API. Set ${BASE_URL_VARS[target]} to the API's origin.`,
    );
    return { kind: "network" };
  }

  const headers: Record<string, string> = {};
  // The handle wins. Both credentials travel in `Authorization`, and where a caller has
  // supplied a handle that route is handle-authenticated — `POST /gym/account` is the one
  // that can plausibly be reached with both a stored sandbox session and a set-password
  // handle, and it is the handle that route reads. A signed-in admin's token must not
  // displace the credential the request is actually about.
  const session = currentBearerSession();
  const usesBearerSession = !options.handle && session !== null;
  if (options.handle) headers.Authorization = `Bearer ${options.handle}`;
  else if (usesBearerSession) headers.Authorization = `Bearer ${session}`;

  // Writes always carry a JSON body, reads never do. `{}` rather than nothing, because
  // the API refuses a state-changing request that arrives without `Content-Type:
  // application/json` and there is no such thing as a content type for no content.
  const sendsBody = method !== "GET";
  if (sendsBody) headers["Content-Type"] = "application/json";

  // No `Accept` header. The API answers JSON regardless, and adding it to a GET would
  // turn a simple request into a preflighted one — an extra round trip on every dashboard
  // load in exchange for restating what the route already does.

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: sendsBody ? JSON.stringify(options.body ?? {}) : undefined,
      // Rule 1. Not conditional, not per-route.
      credentials: "include",
      // Never a cached wizard state. A resumed onboarding reading a cached `currentStep`
      // would render a step the server has already moved past.
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // DNS, TLS, offline, CORS rejection, and the timeout above all land here, and fetch
    // deliberately tells us apart from none of them — a CORS failure is opaque by design.
    // They share one answer for the user, so they share one code.
    return { kind: "network" };
  }

  let body: unknown;
  try {
    const text = await response.text();
    body = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    // A truncated or non-JSON body. On a 2xx there is nothing to render; on an error
    // status it is a gateway page rather than our envelope. Either way the request did
    // not usefully complete.
    return { kind: "network" };
  }

  if (response.ok) {
    if (body === undefined) return { kind: "network" };
    return { kind: "ok", data: body };
  }

  // A bearer session the server has rejected is a dead one — expired, or minted by a stack
  // that has since been redeployed. Dropping it here stops it being sent for the rest of
  // the tab's life and keeps `hasBearerSession()` truthful, which is what the sandbox's
  // "am I signed in?" check reads. Narrow on purpose: only when *this* request was
  // authenticated by the token, so a 401 about an onboarding handle leaves it alone.
  if (response.status === 401 && usesBearerSession) forgetBearerSession();

  return { kind: "status", status: response.status, body };
}

/**
 * One request against the onboarding API.
 *
 * `path` is a route, not a URL: `"/onboarding"`, `"/gym/portal"`. It is joined to
 * `MBP_API_BASE_URL` so no caller can accidentally point a credentialed request somewhere
 * else.
 */
export async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<OnboardingResult<T>> {
  const outcome = await rawRequest(method, path, options);
  if (outcome.kind === "ok") return { ok: true, data: outcome.data as T };
  if (outcome.kind === "network") return { ok: false, error: NETWORK_ERROR };
  return { ok: false, error: toOnboardingError(outcome.status, outcome.body) };
}

/**
 * One request against a franchise API, in the franchise flow's error vocabulary.
 *
 * The same transport and a different contract, which is the whole reason this is a second function
 * rather than a generic parameter. `FranchiseOnboardingErrorCode` shares five spellings with the gym
 * flow's and disagrees on the credential ones — `invalid_handle` where a gym route says
 * `invalid_token` — and it has six codes the gym contract has no word for: `not_approved`,
 * `declined`, `not_issuable`, `already_claimed`, `unsupported_document`, `document_too_large`.
 * `mbp-backend` `services/onboarding/src/domain/errors.ts` calls them two vocabularies rather than a
 * superset, and each of those six selects a screen. Mapping them through the gym allowlist would turn
 * `declined` — which has its own non-error screen, because a declined franchisee reading "something
 * went wrong" emails support — into a generic `network`.
 */
export async function franchiseApiRequest<T>(
  method: ApiMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<FranchiseOnboardingResult<T>> {
  const outcome = await rawRequest(method, path, { ...options, api: options.api ?? "franchiseWizard" });
  if (outcome.kind === "ok") return { ok: true, data: outcome.data as T };
  if (outcome.kind === "network") return { ok: false, error: FRANCHISE_NETWORK_ERROR };
  return { ok: false, error: toFranchiseError(outcome.status, outcome.body) };
}

/**
 * One request, one message. Phrased for a gym owner because `ActionError` in
 * `OnboardingFlow` renders `error.message` verbatim.
 */
const NETWORK_ERROR: OnboardingError = {
  code: "network",
  message: "We couldn't reach us just now. Check your connection and try again.",
};

/**
 * Turn a failed response into the error the wizard already knows how to render.
 *
 * The body is the better source — it carries `currentStep` and `fieldErrors`, without
 * which the wizard cannot recover or mark a field (§4.4) — but it is also network input,
 * so every field is checked before use rather than after it has reached a component.
 */
function toOnboardingError(status: number, body: unknown): OnboardingError {
  const envelope = isRecord(body) ? body : {};
  const code = typeof envelope.code === "string" && RECOGNISED_CODES.has(envelope.code)
    ? (envelope.code as OnboardingErrorCode)
    : null;

  if (code === null) {
    // No usable envelope: a 502 from API Gateway, a WAF block page, a Lambda that threw.
    // The status is all we have, and the message is *ours* — `envelope.message` here
    // would put "Internal server error" or a proxy's boilerplate in front of a gym owner
    // as if we had written it for them.
    return { code: codeForStatus(status), message: messageForStatus(status) };
  }

  const error: OnboardingError = {
    code,
    message:
      typeof envelope.message === "string" && envelope.message.trim().length > 0
        ? envelope.message
        : messageForStatus(status),
  };

  // Only where it means something. `wrong_step` is the code that carries it, and a
  // `currentStep` attached to an unrelated failure would move the wizard for no reason.
  const currentStep = asStep(envelope.currentStep);
  if (currentStep !== null) error.currentStep = currentStep;

  const fieldErrors = asFieldErrors(envelope.fieldErrors);
  if (fieldErrors) error.fieldErrors = fieldErrors;

  return error;
}

/**
 * The code to use when the body told us nothing.
 *
 * 401 becomes `invalid_token` rather than one of `expired_token` / `revoked_token`: the
 * three have distinct terminal screens and only the body can tell them apart, so the
 * fallback has to be the one that does not claim a link was deliberately voided.
 *
 * Everything unmapped — 5xx especially — becomes `network`, which is exactly right for
 * what the user is told: "something went wrong, try again in a moment". A server fault
 * and a dropped connection differ for us and not for them.
 */
function codeForStatus(status: number): OnboardingErrorCode {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 409) return "wrong_step";
  return "network";
}

function messageForStatus(status: number): string {
  if (status === 400) return "Some details need fixing.";
  if (status === 401 || status === 403) return "This link is no longer usable.";
  if (status === 409) return "That step has already moved on. We've refreshed it for you.";
  return NETWORK_ERROR.message;
}

/**
 * A step number, or null.
 *
 * Range-checked because it is used to render: `currentStep: 9` from a confused server
 * would drive the wizard to a step that does not exist, and the recovery for a
 * `wrong_step` we cannot place is to leave the client where it is and show the message.
 */
function asStep(value: unknown): OnboardingStep | null {
  return ONBOARDING_STEPS.includes(value as OnboardingStep) ? (value as OnboardingStep) : null;
}

/**
 * Field errors, or null if they are not a flat map of strings.
 *
 * Not paranoia about types: these are rendered as React children, and React *throws* on
 * an object child — "Objects are not valid as a React child". A nested `fieldErrors` from
 * a server that serialised a Zod tree would take out the whole form rather than mark one
 * input, so anything that is not a string is dropped here.
 */
function asFieldErrors(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── The franchise vocabulary ────────────────────────────────────────────────

/**
 * The franchise codes we are willing to take from a response body.
 *
 * An allowlist for the same reason the gym one is: `error.code` picks the screen, and an unrecognised
 * value falls through to whichever branch a component wrote last. `network` is excluded for the same
 * reason too — the server never emits it, and honouring a server-sent `network` would let a response
 * that plainly arrived claim it had not.
 *
 * Checked against `mbp-backend`'s `EmittableFranchiseCode`, which is
 * `Exclude<FranchiseOnboardingErrorCode, "network">` and so is exactly this set by construction on that
 * side. Two shared codes are here because the franchise routes do raise them: `frozen` for either of
 * the two freeze points, `content_mismatch` for an echoed hash that no longer matches.
 */
const RECOGNISED_FRANCHISE_CODES: ReadonlySet<string> = new Set<FranchiseOnboardingErrorCode>([
  "invalid_handle",
  "expired_handle",
  "revoked_handle",
  "wrong_step",
  "frozen",
  "not_approved",
  "declined",
  "not_issuable",
  "already_signed",
  "content_mismatch",
  "already_claimed",
  "unsupported_document",
  "document_too_large",
  "validation",
]);

const FRANCHISE_NETWORK_ERROR: FranchiseOnboardingError = {
  code: "network",
  message: "We couldn't reach us just now. Check your connection and try again.",
};

function toFranchiseError(status: number, body: unknown): FranchiseOnboardingError {
  const envelope = isRecord(body) ? body : {};
  const code =
    typeof envelope.code === "string" && RECOGNISED_FRANCHISE_CODES.has(envelope.code)
      ? (envelope.code as FranchiseOnboardingErrorCode)
      : null;

  if (code === null) {
    // No usable envelope: a 502 from API Gateway, a WAF block page, a Lambda that threw. The message is
    // ours rather than `envelope.message`, which at this point is a proxy's boilerplate.
    return { code: franchiseCodeForStatus(status), message: franchiseMessageForStatus(status) };
  }

  const error: FranchiseOnboardingError = {
    code,
    message:
      typeof envelope.message === "string" && envelope.message.trim().length > 0
        ? envelope.message
        : franchiseMessageForStatus(status),
  };

  const currentStep = asFranchiseStep(envelope.currentStep);
  if (currentStep !== null) error.currentStep = currentStep;

  const fieldErrors = asFieldErrors(envelope.fieldErrors);
  if (fieldErrors) error.fieldErrors = fieldErrors;

  return error;
}

/**
 * 401 becomes `invalid_handle`, never `expired_handle` or `revoked_handle`.
 *
 * The same reasoning as `codeForStatus`: the three have distinct terminal screens, only the body can
 * tell them apart, and the fallback must not be the one that claims a link was deliberately voided.
 * 415 and 413 are mapped because the API answers them for a rejected upload, and S3 answers them for
 * the same two facts if the browser ignores the presigned policy — so a `PUT` that fails without our
 * envelope still reaches the right message.
 */
function franchiseCodeForStatus(status: number): FranchiseOnboardingErrorCode {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "invalid_handle";
  if (status === 409) return "wrong_step";
  if (status === 413) return "document_too_large";
  if (status === 415) return "unsupported_document";
  return "network";
}

function franchiseMessageForStatus(status: number): string {
  if (status === 400) return "Some details need fixing.";
  if (status === 401 || status === 403) return "This link is no longer usable.";
  if (status === 409) return "That step has already moved on. We've refreshed it for you.";
  if (status === 413) return "Files are limited to 8 MB.";
  if (status === 415) return "Upload a PDF, a JPEG or a PNG.";
  return FRANCHISE_NETWORK_ERROR.message;
}

function asFranchiseStep(value: unknown): FranchiseOnboardingStep | null {
  return FRANCHISE_ONBOARDING_STEPS.includes(value as FranchiseOnboardingStep)
    ? (value as FranchiseOnboardingStep)
    : null;
}
