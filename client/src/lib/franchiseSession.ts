/**
 * The franchise portal's session, behind one seam.
 *
 * [gymSession.ts](./gymSession.ts) is the model and everything it argues holds here unchanged:
 * you cannot ask synchronously whether someone is signed in, because the credential is an
 * `HttpOnly` cookie that script cannot read by design; business state is read at use time
 * rather than taken from a claim inside the cookie; and the sandbox's `sessionToken` is kept
 * only because a browser can neither store nor return a cookie set by an `execute-api` host.
 * Read that file rather than have it restated here.
 *
 * What is different is the vocabulary. Every call below goes through `franchiseApiRequest`,
 * which maps a failed response onto `FranchiseOnboardingError` — `invalid_handle` where a gym
 * route says `invalid_token`. The two are two contracts and not a superset, and the pages
 * switch screens on the exact string, so a franchise page that reached for `apiRequest`
 * instead would silently get the gym's words for the same refusals.
 *
 * `franchiseId` is here to render and never to ask with. `fetchFranchisePortalSnapshot` takes
 * no franchise parameter and must not gain one: `GET /franchise/portal` resolves the franchise
 * from the session, and an identifier travelling from the browser would be an authorisation
 * decision made in the wrong process.
 *
 * **One bearer slot for the whole app.** `rememberBearerSession` writes a single
 * `sessionStorage` key shared with the gym and admin flows, so in sandbox signing in here
 * replaces a gym token in the same tab. That is the hatch's existing shape rather than
 * something this file chose, and it is harmless in the only place the hatch is on: production
 * runs on cookies, which are per-name and do not collide.
 */

import { forgetBearerSession, franchiseApiRequest, rememberBearerSession } from "./apiClient";
import type { FranchiseOnboardingResult } from "@shared/franchise/onboarding/types";

/**
 * Who is signed in.
 *
 * `franchiseStatus` is the onboarding ladder, not the state of the session, and the rename
 * from the server's `status` happens at the boundary below for that reason.
 *
 * **Nothing should branch on it.** `GET /franchise/session` sends it and `POST
 * /franchise/login` does not, so it is null for exactly as long as the cache holds the login
 * response and non-null afterwards. The status worth rendering is `onboardingStatus` on the
 * portal snapshot, which is read from the record every time it is asked for.
 */
export type FranchiseSession = {
  email: string;
  /** For display and for support calls. Never sent back as a parameter. */
  franchiseId: string | null;
  role: string | null;
  /** The trade name, or the legal entity name behind it. Empty where the profile row is gone. */
  franchiseDisplayName: string;
  franchiseStatus: string | null;
  /**
   * ISO, and null on a body that omits it.
   *
   * Sessions do not refresh, so this is the only way the app can know it is about to lapse
   * mid-page rather than discovering it from a 401 halfway through a form.
   */
  expiresAt: string | null;
};

/** The TanStack Query key. Exported so signing in or out can write or drop it. */
export const FRANCHISE_SESSION_QUERY_KEY = ["franchise-session"] as const;

/**
 * The wire shape of `POST /franchise/login` and `GET /franchise/session`, before it is trusted.
 *
 * **The server calls the onboarding status `status`, and this module calls it
 * `franchiseStatus`.** `session.status` on this side reads as the status *of the session* —
 * live, expired — which is the one thing it does not mean.
 *
 * `sessionToken` is sandbox-only and typed `unknown` on purpose: `rememberBearerSession` is the
 * one place that decides whether a value is a usable token.
 */
type FranchiseSessionResponse = {
  email?: unknown;
  franchiseId?: unknown;
  role?: unknown;
  franchiseDisplayName?: unknown;
  status?: unknown;
  expiresAt?: unknown;
  sessionToken?: unknown;
};

/**
 * Is there a session, and whose?
 *
 * `null` for "not signed in" rather than a thrown error, because that is the ordinary case on
 * the login page. A genuine failure — the API unreachable — also returns `null`, and the
 * consequence for the caller is the same: send them to sign in. Telling the two apart would let
 * a network blip render a dashboard shell with no figures in it.
 */
export async function fetchFranchiseSession(): Promise<FranchiseSession | null> {
  const result = await franchiseApiRequest<FranchiseSessionResponse>("GET", "/franchise/session");
  if (!result.ok || typeof result.data?.email !== "string") return null;
  return asSession(result.data, result.data.email);
}

/** The six fields we are willing to take from a session body, with the rename explained above. */
function asSession(
  body: FranchiseSessionResponse | undefined,
  fallbackEmail: string,
): FranchiseSession {
  return {
    email: typeof body?.email === "string" ? body.email : fallbackEmail,
    franchiseId: typeof body?.franchiseId === "string" ? body.franchiseId : null,
    role: typeof body?.role === "string" ? body.role : null,
    franchiseDisplayName:
      typeof body?.franchiseDisplayName === "string" ? body.franchiseDisplayName : "",
    franchiseStatus: typeof body?.status === "string" ? body.status : null,
    expiresAt: typeof body?.expiresAt === "string" ? body.expiresAt : null,
  };
}

/**
 * Sign in.
 *
 * One message for every failure, and it names neither the email nor the password. The server
 * already refuses to distinguish them — `franchiseLogin.ts` answers a single generic
 * `validation` for "no such account", "wrong password" and "disabled" alike, and 429 with the
 * same code when a caller is throttled — so there is nothing here to tell apart and nothing to
 * be gained by inventing a difference. A franchise list is a shorter and more valuable one to
 * enumerate than the gym list.
 *
 * `SIGN_IN_FAILED` rather than `result.error.message` for the same reason it exists on the gym
 * side: the server's own generic sentence is fine, but a future refusal that arrived with a
 * more specific one would then be rendered verbatim without anyone deciding it should be.
 */
export async function signInToFranchisePortal(
  email: string,
  password: string,
): Promise<FranchiseOnboardingResult<FranchiseSession>> {
  const result = await franchiseApiRequest<FranchiseSessionResponse>("POST", "/franchise/login", {
    body: { email, password },
  });
  if (!result.ok) {
    // The network case is worth telling apart, and only here: "check your connection" is
    // actionable, and "incorrect email or password" is actively misleading when the request
    // never arrived — a franchisee retypes a correct password until they give up.
    return { ok: false, error: result.error.code === "network" ? result.error : SIGN_IN_FAILED };
  }

  // Before anything else. In sandbox this is the credential every later request runs on: the
  // cookie the route also sets cannot come back from an `execute-api` host, so dropping the
  // token here signs the franchisee straight back out — a 200 from this route, then a 401 from
  // `GET /franchise/session`, then the dashboard bouncing to the login page that sent them.
  rememberBearerSession(result.data?.sessionToken);

  return { ok: true, data: asSession(result.data, email) };
}

const SIGN_IN_FAILED = {
  code: "validation" as const,
  message: "Incorrect email or password. Please try again.",
};

/**
 * Sign out.
 *
 * A round trip, not a `sessionStorage` delete, because **only the server can expire an
 * `HttpOnly` cookie.** Clearing state on this side alone would leave the session live for its
 * full term on a machine whose user believes they have signed out.
 *
 * Never throws and never reports failure: the caller's next act is to leave the dashboard, and
 * a franchisee stuck on a screen they are trying to leave is worse than a cookie that outlives
 * the redirect by a moment.
 */
export async function signOutOfFranchisePortal(): Promise<void> {
  await franchiseApiRequest("POST", "/franchise/logout");
  // The sandbox half of the same act. The route above expires the cookie; this drops the
  // bearer copy, which is the only credential a `localhost` tab actually had.
  forgetBearerSession();
}

/**
 * Spend a reset link and set a new password.
 *
 * `POST /franchise/password`, which is **not** the wizard's `POST /franchise/account`. Step 9
 * of onboarding got that path first, and the two do different things: one creates the login for
 * a franchise that has just signed, this one changes the password of a login that already
 * exists.
 *
 * The handle travels in `Authorization`, which is `franchiseApiRequest`'s doing, and the errors
 * that matter are the handle's. All three arrive as 401 and are told apart only by the code:
 * `expired_handle` for a link that sat too long, `revoked_handle` for one already spent — a
 * bookmarked link is the ordinary way to get there — and `invalid_handle` for one we do not
 * recognise, including a gym link opened on this page. `validation` carries
 * `fieldErrors.password`.
 */
export async function setFranchisePortalPassword(
  handle: string,
  password: string,
): Promise<FranchiseOnboardingResult<void>> {
  const result = await franchiseApiRequest<unknown>("POST", "/franchise/password", {
    handle,
    body: { password },
  });
  if (!result.ok) return result;
  // The body is deliberately ignored, and the route deliberately opens no session: the
  // franchisee signs in afterwards like anyone else, which is also the only check that the new
  // password is the one they think they typed.
  return { ok: true, data: undefined };
}

/**
 * Ask for a set-password link by email.
 *
 * **A success here means the request was accepted, not that an account exists.** The route
 * answers `202 { requested: true }` for every outcome it has — unknown address, disabled
 * account, missing profile, throttled, mailed — and this function must not gain a signal that
 * tells them apart, or the caller becomes an oracle for who holds a MuscleBoxPro franchise.
 *
 * **A throttled caller therefore gets a success too.** A 429 would tell a script exactly which
 * addresses it had already spent, which is the same list by a slower route. So the only
 * failures reachable here are a malformed address, which `validation` carries in
 * `fieldErrors.email`, and a request that never arrived.
 */
export async function requestFranchisePasswordReset(
  email: string,
): Promise<FranchiseOnboardingResult<void>> {
  const result = await franchiseApiRequest<unknown>("POST", "/franchise/password-reset", {
    body: { email },
  });
  if (!result.ok) return result;
  return { ok: true, data: undefined };
}
