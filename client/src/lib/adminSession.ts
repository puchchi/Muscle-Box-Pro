/**
 * The admin session, behind one seam.
 *
 * Three operations against the three routes that make up §2.8 of `mbp-backend`
 * `docs/gym-onboarding-api-design.md`: `POST /admin/login`, `GET /admin/me`,
 * `POST /admin/logout`. Nothing under `app/admin/` talks to `apiClient` directly.
 *
 * ## Why this has no Supabase branch
 *
 * [gymSession.ts](./gymSession.ts) carries two implementations because the gym portal is
 * mid-migration off Supabase Auth (TODO A2). There is no such history here: the thing this
 * replaces is `local_dashboard/server.js`'s `x-dashboard-password` — one shared plaintext
 * password, defaulting to `"admin"`, compared with `===`. So this seam is live-only, and
 * the switch that would let it fall back to something weaker is deliberately absent.
 *
 * ## What an admin session is, and what it is not
 *
 * The same rules as the gym one, for the same reasons. The session is an `HttpOnly` cookie
 * in production, so **"am I signed in?" is a request, not a synchronous read** — there is
 * nothing for script to inspect, which is the point of the cookie. And `role` comes from
 * the server's own `ADMIN#` row on every call rather than from a claim inside the cookie:
 * an admin who is disabled or demoted stops being one on the next request instead of at
 * the next login.
 *
 * `expiresAt` is exposed because §9.3 sessions do not refresh. Twelve hours in, an admin
 * halfway through an invite form gets a 401 with no warning unless something reads this.
 *
 * ## The one thing that differs from production, in sandbox only
 *
 * On an `execute-api` host a browser can neither read nor return the session cookie, so
 * login also hands back a `sessionToken` and `rememberBearerSession` keeps it for the life of
 * the tab. That is conditional on the field being present, which is what makes this same code
 * work in production where it is absent — see rule 4 in [apiClient.ts](./apiClient.ts).
 */

import {
  apiRequest,
  forgetBearerSession,
  rememberBearerSession,
} from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";

/**
 * Who is signed in.
 *
 * `displayName` is not decoration: it is denormalised onto every invite this admin creates
 * as `invitedByName` (§2.7), so the name shown here is the name a gym owner will read in
 * their invite email. The server falls back to the email rather than sending a blank.
 */
export type AdminSession = {
  email: string;
  role: string;
  displayName: string;
  /** ISO timestamp. The session lapses then, and does not renew (§9.3). */
  expiresAt: string;
};

/** The TanStack Query key. Exported so signing in or out can invalidate it. */
export const ADMIN_SESSION_QUERY_KEY = ["admin-session"] as const;

/**
 * The login response, before it is trusted.
 *
 * `sessionToken` is sandbox-only and typed `unknown` on purpose: `rememberBearerSession`
 * is the one place that decides whether a value is a usable token, and typing it as
 * `string | undefined` here would invite a call site to send it without asking.
 */
type AdminLoginResponse = Partial<AdminSession> & { sessionToken?: unknown };

/**
 * Is there a session, and whose?
 *
 * `null` for both "not signed in" and "we could not ask", because the caller does the same
 * thing with either: show the login screen. Telling them apart would let a network blip
 * render an admin shell with no data in it — worse than a login form, since every action on
 * that shell would then fail one by one.
 *
 * Cheap by design (§2.8): one signature verification and one `ADMIN#` read, so calling it
 * on every page load is the intended usage rather than something to cache around.
 */
export async function fetchAdminSession(): Promise<AdminSession | null> {
  const result = await apiRequest<Partial<AdminSession>>("GET", "/admin/me");
  if (!result.ok) return null;
  return asSession(result.data, null);
}

/**
 * Sign in.
 *
 * The server's message is passed through rather than replaced, which is the opposite of
 * what `signInToPortal` does — and correct here for a reason that is worth stating, because
 * the asymmetry looks like an oversight. `POST /admin/login` already answers with one fixed
 * generic message for "no such admin", "wrong password" and "disabled account" alike, so
 * there is no enumeration oracle to suppress on this side. It also has a message the client
 * genuinely cannot reconstruct: a 429 means "you are throttled, this password may well work
 * in a minute", and overwriting that with "incorrect email or password" would have a locked-
 * out admin retyping a correct password until they gave up.
 *
 * A `network` code keeps `apiClient`'s own copy, since the request never arrived and the
 * server said nothing at all.
 */
export async function signInAsAdmin(
  email: string,
  password: string,
): Promise<OnboardingResult<AdminSession>> {
  const result = await apiRequest<AdminLoginResponse>("POST", "/admin/login", {
    body: { email, password },
  });
  if (!result.ok) return result;

  // Before anything else, and before any read: every subsequent request in a sandbox tab
  // depends on it, and in production this is a no-op twice over — the field is absent and
  // the hatch is off.
  rememberBearerSession(result.data?.sessionToken);

  const session = asSession(result.data, email);
  if (!session) {
    // A 2xx that does not describe a session. There is no honest way to render a signed-in
    // admin from it, and `apiClient` casts rather than validates response bodies (its own
    // docstring says so), so this is the only place the shape is checked.
    return { ok: false, error: MALFORMED_SESSION };
  }
  return { ok: true, data: session };
}

const MALFORMED_SESSION = {
  code: "network" as const,
  message: "Signed in, but we couldn't read the response. Please try again.",
};

/**
 * Sign out.
 *
 * Two halves, and both are needed. The round trip is the one that matters in production:
 * **only the server can expire an `HttpOnly` cookie**, so skipping it would leave the
 * session live for its full 12 hours on a machine whose user believes they have signed out.
 * `forgetBearerSession` handles the sandbox, where the token is ours to drop.
 *
 * Never throws and never reports failure. The caller's next act is to navigate to the login
 * screen, and an admin stuck on a page they are trying to leave is worse than a cookie that
 * outlives the redirect. The route itself is built to succeed on an absent or expired
 * cookie, so there is very little left to fail.
 */
export async function signOutAsAdmin(): Promise<void> {
  await apiRequest("POST", "/admin/logout");
  forgetBearerSession();
}

/**
 * A session, or null if the body was not one.
 *
 * `email` is the field that decides: without it there is nobody signed in, whatever else
 * arrived. `fallbackEmail` exists for the login response, where we know the address that
 * was submitted — but it is deliberately not used by `fetchAdminSession`, which has no
 * candidate and must not invent one.
 *
 * `role` has no fallback for the same reason it is read from the server every time: a
 * default of `"admin"` here would be this file granting a role, which is an authorisation
 * decision made in the wrong process.
 */
function asSession(
  body: Partial<AdminSession> | undefined,
  fallbackEmail: string | null,
): AdminSession | null {
  const email = typeof body?.email === "string" && body.email.length > 0 ? body.email : fallbackEmail;
  if (!email) return null;
  if (typeof body?.role !== "string" || body.role.length === 0) return null;

  return {
    email,
    role: body.role,
    displayName:
      typeof body.displayName === "string" && body.displayName.length > 0
        ? body.displayName
        : email,
    // Not defaulted to a computed 12 hours from now: a fabricated expiry is worse than an
    // empty one, because the thing reading it is a "your session is about to lapse" warning
    // and a made-up timestamp makes that warning wrong rather than absent.
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : "",
  };
}
