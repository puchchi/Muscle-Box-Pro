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
 * 4. **A failure is a value, never an exception.** Every call resolves to
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

import type {
  OnboardingError,
  OnboardingErrorCode,
  OnboardingResult,
  OnboardingStep,
} from "@shared/onboarding/types";

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

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export type ApiRequestOptions = {
  /**
   * The onboarding handle. Sent as `Authorization: Bearer`; omitted for the cookie-
   * authenticated routes, which carry their session in `credentials: "include"`.
   */
  handle?: string;
  /**
   * The request body, JSON-encoded. Any non-GET sends one even when this is undefined —
   * see rule 2. Ignored on GET, where a body would make the request non-simple and buy
   * an extra preflight for nothing.
   */
  body?: unknown;
};

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
  const headers: Record<string, string> = {};
  if (options.handle) headers.Authorization = `Bearer ${options.handle}`;

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
    response = await fetch(`${MBP_API_BASE_URL}${path}`, {
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
    return { ok: false, error: NETWORK_ERROR };
  }

  let body: unknown;
  try {
    const text = await response.text();
    body = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    // A truncated or non-JSON body. On a 2xx there is nothing to render; on an error
    // status it is a gateway page rather than our envelope. Either way the request did
    // not usefully complete.
    return { ok: false, error: NETWORK_ERROR };
  }

  if (response.ok) {
    if (body === undefined) return { ok: false, error: NETWORK_ERROR };
    return { ok: true, data: body as T };
  }

  return { ok: false, error: toOnboardingError(response.status, body) };
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
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;
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
