/**
 * The gym portal's session, behind one seam.
 *
 * Two implementations of three operations — sign in, sign out, who am I — chosen by the same
 * build-time flag as [onboardingApi.ts](./onboardingApi.ts): the cookie sessions on
 * `api.muscleboxpro.com`, or Supabase Auth, which is what the portal runs on today and what
 * TODO A2 exists to remove. Nothing in `pages/gym/` knows which is active.
 *
 * ## The one thing that changes for callers
 *
 * **You cannot ask synchronously whether someone is signed in.** The Supabase session is a
 * JSON blob in `localStorage`, so `hasAccessTokenSync()` could read it during render. The
 * replacement is an `HttpOnly` cookie, which script cannot read *by design* — that is the
 * entire reason for using one. The frontend's CSP carries `'unsafe-inline'` and
 * `'unsafe-eval'` on `script-src`, so an XSS here is materially more likely to be
 * exploitable; a bearer token in `localStorage` is exfiltratable by any script that runs,
 * and an `HttpOnly` cookie is not readable at all. That does not make XSS harmless — a
 * script can still *use* the ambient cookie — but it turns credential theft into session
 * riding, which ends when the session does.
 *
 * So "am I signed in?" becomes a request, and every caller becomes async. That is not a
 * regression to work around with a mirrored non-`HttpOnly` flag cookie: a second copy of the
 * answer is a second thing to keep in sync, it can be stale in exactly the case that
 * matters (a session revoked server-side), and the cost it saves is one cheap GET on a route
 * designed to be called on every page load.
 *
 * ## What a session is allowed to tell us
 *
 * `gymId` and `role` come from the server's own user record, not from a claim inside the
 * cookie, even though we signed the cookie ourselves. A session carries *identity*; business
 * state is read at use time. That is what makes revoking a gym user or changing its role take
 * effect on the next request instead of the next login — and it is the same rule that keeps
 * payout figures out of `user_metadata`, which the account holder can write to (TODO A2).
 *
 * ## The one thing that differs from production, in sandbox only
 *
 * On an `execute-api` host a browser can neither read nor return the session cookie, so login
 * also hands back a `sessionToken` and `rememberBearerSession` keeps it for the life of the
 * tab. That is conditional on the field being present, which is what makes this same code work
 * in production where it is absent — see rule 4 in [apiClient.ts](./apiClient.ts).
 *
 * `gymId` is here to render, never to ask with. `fetchGymPortalSnapshot` takes no gym
 * parameter and must not gain one: the endpoint resolves the gym from the cookie, and a gym
 * identifier travelling from the browser would be an authorisation decision made in the
 * wrong process.
 */

import { apiRequest, forgetBearerSession, rememberBearerSession } from "./apiClient";
import { supabase } from "./supabase";
import type { OnboardingResult } from "@shared/onboarding/types";

/** Same build-time switch as the wizard's — see `onboardingApi.ts` for why it is opt-in. */
const USE_LIVE_API = process.env.NEXT_PUBLIC_MBP_API_MODE === "live";

/** True while the portal is signing in through Supabase rather than the cookie sessions. */
export const IS_SUPABASE_SESSION = !USE_LIVE_API;

/**
 * Who is signed in.
 *
 * `gymStatus` is the onboarding ladder — a gym that signed but has not paid its deposit is
 * `signed`, not a lapsed lead — and it is optional because Supabase has no equivalent to
 * report while that path is still live.
 */
export type GymSession = {
  email: string;
  /** For display and for support calls. Never sent back as a parameter. */
  gymId: string | null;
  role: string | null;
  gymStatus: string | null;
};

/** The TanStack Query key. Exported so signing in or out can invalidate it. */
export const GYM_SESSION_QUERY_KEY = ["gym-session"] as const;

/**
 * The wire shape of `POST /gym/login` and `GET /gym/session`, before it is trusted.
 *
 * **The server calls the onboarding status `status`, and this module calls it `gymStatus`.**
 * Not a typo to tidy in either direction: `session.status` on this side reads as the status
 * *of the session* — live, expired — which is the one thing it does not mean. The rename
 * happens here, at the boundary, so `GymSession` says which status it is everywhere else.
 *
 * `sessionToken` is sandbox-only and typed `unknown` on purpose: `rememberBearerSession` is
 * the one place that decides whether a value is a usable token, and typing it as
 * `string | undefined` here would invite a call site to send it without asking.
 */
type GymSessionResponse = {
  email?: unknown;
  gymId?: unknown;
  role?: unknown;
  status?: unknown;
  sessionToken?: unknown;
};

/**
 * Is there a session, and whose?
 *
 * `null` for "not signed in" rather than a thrown error, because that is the ordinary case
 * on the login page and an unauthenticated visitor is not a failure. A genuine failure —
 * the API unreachable — also returns `null`, and the consequence is the same for the
 * caller: send them to sign in. Distinguishing the two would let a network blip render a
 * dashboard shell with no data in it.
 */
export async function fetchGymSession(): Promise<GymSession | null> {
  if (!USE_LIVE_API) {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (!email) return null;
    // Deliberately not reading `user_metadata` for the rest. It is writable by the account
    // holder, so anything business-relevant taken from it is a figure the gym can edit.
    return { email, gymId: null, role: null, gymStatus: null };
  }

  const result = await apiRequest<GymSessionResponse>("GET", "/gym/session");
  if (!result.ok || typeof result.data?.email !== "string") return null;
  return asSession(result.data, result.data.email);
}

/** The four fields we are willing to take from a session body, with the rename explained above. */
function asSession(body: GymSessionResponse | undefined, fallbackEmail: string): GymSession {
  return {
    email: typeof body?.email === "string" ? body.email : fallbackEmail,
    gymId: typeof body?.gymId === "string" ? body.gymId : null,
    role: typeof body?.role === "string" ? body.role : null,
    gymStatus: typeof body?.status === "string" ? body.status : null,
  };
}

/**
 * Sign in.
 *
 * One message for every failure, and it names neither the email nor the password: a response
 * that distinguishes "no such account" from "wrong password" is an account-enumeration
 * oracle, and the server is built not to give one (a single generic message plus a per-email
 * attempt counter). Reproducing that distinction on this side would hand back what the
 * server declined to leak.
 *
 * On success the API's `Set-Cookie` is what signed the browser in — there is no token here to
 * store, and nothing for a caller to do with the returned session except render it.
 */
export async function signInToPortal(
  email: string,
  password: string,
): Promise<OnboardingResult<GymSession>> {
  if (!USE_LIVE_API) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { ok: false, error: SIGN_IN_FAILED };
    return {
      ok: true,
      data: { email: data.session.user.email ?? email, gymId: null, role: null, gymStatus: null },
    };
  }

  const result = await apiRequest<GymSessionResponse>("POST", "/gym/login", {
    body: { email, password },
  });
  if (!result.ok) {
    // The network case is worth telling apart, and only here: "check your connection" is
    // actionable and "incorrect email or password" is actively misleading when the request
    // never arrived — the gym retypes a correct password until it gives up.
    return { ok: false, error: result.error.code === "network" ? result.error : SIGN_IN_FAILED };
  }

  // Before anything else. In sandbox this is the credential every later request runs on: the
  // cookie the route also sets cannot come back from an `execute-api` host, so dropping the
  // token here signs the gym straight back out — a 200 from this route, then a 401 from
  // `GET /gym/session`, then the dashboard bouncing to the login page that sent them. In
  // production it is a no-op twice over: the field is absent and the hatch is off.
  rememberBearerSession(result.data?.sessionToken);

  return { ok: true, data: asSession(result.data, email) };
}

const SIGN_IN_FAILED = {
  code: "invalid_token" as const,
  message: "Incorrect email or password. Please try again.",
};

/**
 * Sign out.
 *
 * A round trip, not a `localStorage` delete, because **only the server can expire an
 * `HttpOnly` cookie.** Clearing state on this side without calling the route would leave the
 * session live for its full 12 hours on a machine whose user believes they have signed out —
 * which is the whole point of the button on a shared gym office computer.
 *
 * Never throws and never reports failure. The caller's next act is to navigate away from
 * the dashboard, and a gym stuck on a screen it is trying to leave because the logout call
 * failed is worse than one whose cookie outlives the redirect.
 */
export async function signOutOfPortal(): Promise<void> {
  if (!USE_LIVE_API) {
    await supabase.auth.signOut();
    return;
  }
  await apiRequest("POST", "/gym/logout");
  // The sandbox half of the same act. The route above expires the cookie; this drops the
  // bearer copy, which is the only credential a `localhost` tab actually had.
  forgetBearerSession();
}

/**
 * Set a password against a single-use handle.
 *
 * The same `POST /gym/account` the onboarding wizard's step 5 calls, reached the other way
 * round: there, the handle is the onboarding invite and setting a password is the last thing
 * the gym does before installation; here, an admin has issued a set-password handle for a gym
 * that has forgotten its password, and a person has relayed the link. One route, because from
 * the server's side both are "this handle proves who you are, take a password".
 *
 * **There is no self-service reset, and this function is not one.** It cannot be reached
 * without a handle somebody at MuscleBoxPro deliberately issued. Delivery is a human — the
 * design (§9.2) has the mechanism working and the email not, so nothing on this side should
 * imply an automated link is coming. See `GymForgotPassword`.
 *
 * The errors that matter are the handle's, and they arrive as the codes `apiClient` already
 * maps: `expired_token` for a link that sat too long, `revoked_token` for one already used —
 * single-use means the second attempt fails, which happens for real when a gym clicks a
 * bookmarked link. `validation` carries `fieldErrors.password`.
 */
export async function setPortalPassword(
  handle: string,
  password: string,
): Promise<OnboardingResult<void>> {
  const result = await apiRequest<unknown>("POST", "/gym/account", { handle, body: { password } });
  if (!result.ok) return result;
  // The body is deliberately ignored. A reset has no onboarding state to fold in and no
  // session to return — the gym signs in afterwards like anyone else, which is also the
  // check that the new password is the one they think they typed.
  return { ok: true, data: undefined };
}
