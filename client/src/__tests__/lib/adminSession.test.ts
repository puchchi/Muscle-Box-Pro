import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The admin session seam.
 *
 * Mocked at `apiRequest`, so what is under test is the seam's own judgement — which routes
 * it calls, what it takes from a response body, and what it does with a sandbox token — and
 * not the transport, which `apiClient.test.ts` covers.
 *
 * The cases are chosen from what goes wrong when this file is careless. Two of them are the
 * expensive kind:
 *
 * - **Trusting the body.** `apiRequest` casts rather than validates, by its own admission,
 *   so a 200 that does not describe a session must not become a signed-in admin. The
 *   consequence of getting this wrong is a console that renders an empty name and a blank
 *   role, and then 401s on the first thing anyone clicks.
 * - **Inventing a role.** `role` is read from the server's `ADMIN#` row on every call so
 *   that a demoted admin is demoted on the next request. A default on this side would be
 *   the browser granting itself a role.
 */

const { mockApiRequest, mockRemember, mockForget } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockRemember: vi.fn(),
  mockForget: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  apiRequest: mockApiRequest,
  rememberBearerSession: mockRemember,
  forgetBearerSession: mockForget,
}));

import {
  fetchAdminSession,
  signInAsAdmin,
  signOutAsAdmin,
  ADMIN_SESSION_QUERY_KEY,
} from "@/lib/adminSession";

/** A complete `POST /admin/login` / `GET /admin/me` body, as the deployed handlers send it. */
const LIVE_SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-08-23T19:30:00.000Z",
};

function resolves(data: unknown) {
  mockApiRequest.mockResolvedValue({ ok: true, data });
}

function fails(code: string, message: string) {
  mockApiRequest.mockResolvedValue({ ok: false, error: { code, message } });
}

/** The `(method, path, options)` of the first call. */
function called(): [string, string, Record<string, unknown> | undefined] {
  return mockApiRequest.mock.calls[0] as [string, string, Record<string, unknown> | undefined];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signing in", () => {
  it("posts the credentials to the admin login route", async () => {
    resolves(LIVE_SESSION);
    await signInAsAdmin("ops@muscleboxpro.com", "correct horse");

    const [method, path, options] = called();
    expect(method).toBe("POST");
    expect(path).toBe("/admin/login");
    expect(options?.body).toEqual({ email: "ops@muscleboxpro.com", password: "correct horse" });
    // Never as a handle. The password is not a bearer credential and `Authorization` is not
    // where it goes — the route reads the body.
    expect(options?.handle).toBeUndefined();
  });

  it("returns the identity the server sent", async () => {
    resolves(LIVE_SESSION);
    const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(result).toEqual({ ok: true, data: LIVE_SESSION });
  });

  it("hands a sandbox session token to the client to hold", async () => {
    // Sandbox only. `rememberBearerSession` is the thing that decides whether to keep it —
    // what matters here is that the field is offered rather than dropped on the floor,
    // because without it every subsequent request in a sandbox tab is anonymous.
    resolves({ ...LIVE_SESSION, sessionToken: "sandbox-token-9f2c" });
    await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(mockRemember).toHaveBeenCalledWith("sandbox-token-9f2c");
  });

  it("offers the absent field just the same in production", async () => {
    // The production shape: no `sessionToken` at all. Passing `undefined` through rather
    // than branching here is what keeps one code path for both — and the hatch is off on
    // that host anyway, so this is a no-op twice over.
    resolves(LIVE_SESSION);
    await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(mockRemember).toHaveBeenCalledWith(undefined);
  });

  it("passes the server's message through, including the throttle one", async () => {
    // `POST /admin/login` already answers one generic message for every credential failure,
    // so there is no enumeration oracle to suppress on this side — and it says something on
    // a 429 that this page could not reconstruct. Replacing it with "incorrect email or
    // password" would have a locked-out admin retyping a password that works.
    fails("validation", "Too many attempts. Try again shortly.");
    const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Too many attempts. Try again shortly.");
  });

  it("keeps the client's own copy when the request never arrived", async () => {
    fails("network", "We couldn't reach us just now. Check your connection and try again.");
    const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("network");
  });

  it("stores nothing from a failed login", async () => {
    fails("validation", "Email or password is incorrect.");
    await signInAsAdmin("ops@muscleboxpro.com", "wrong");
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it("refuses a 200 that does not describe a session", async () => {
    // A proxy page, a handler half-deployed, a route renamed. `apiRequest` casts rather than
    // validates, so this is the only place the shape is checked — and a signed-in admin with
    // a blank role would 401 on the first thing they clicked.
    //
    // `{ role: "admin" }` on its own is deliberately *not* in this list: the email was just
    // typed into the form, so a body missing it is recoverable and the next test covers it.
    // `role` is the field with no fallback, which is why it is the one that decides.
    for (const body of [undefined, {}, { email: "ops@muscleboxpro.com" }]) {
      mockApiRequest.mockResolvedValue({ ok: true, data: body });
      const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
      expect(result.ok).toBe(false);
    }
  });

  it("never invents a role", async () => {
    // Not a paranoid check: `role` is re-read from the server's own row on every call
    // precisely so that revoking or demoting an admin takes effect on the next request. A
    // default of "admin" here would be this file granting the role instead.
    resolves({ ...LIVE_SESSION, role: "" });
    expect((await signInAsAdmin("ops@muscleboxpro.com", "x")).ok).toBe(false);
  });

  it("falls back to the submitted email and to the email for a name", async () => {
    // The email is known — it was just typed in — so a body missing it is recoverable.
    // `displayName` matters because it is denormalised onto every invite this admin
    // creates as `invitedByName` (§2.7); a blank there reaches a gym owner's inbox.
    resolves({ role: "admin", expiresAt: LIVE_SESSION.expiresAt });
    const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("ops@muscleboxpro.com");
      expect(result.data.displayName).toBe("ops@muscleboxpro.com");
    }
  });

  it("leaves a missing expiry empty rather than guessing one", async () => {
    // The thing that reads `expiresAt` is a "your session is about to lapse" warning. A
    // fabricated 12-hours-from-now makes that warning wrong, which is worse than absent.
    resolves({ email: LIVE_SESSION.email, role: "admin", displayName: "Ops Team" });
    const result = await signInAsAdmin("ops@muscleboxpro.com", "correct horse");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.expiresAt).toBe("");
  });
});

describe("asking who is signed in", () => {
  it("reads the identity route", async () => {
    resolves(LIVE_SESSION);
    await fetchAdminSession();
    const [method, path] = called();
    expect(method).toBe("GET");
    expect(path).toBe("/admin/me");
  });

  it("answers null when there is no session and when we could not ask", async () => {
    // Both, deliberately conflated: the caller shows the login screen either way, and
    // telling them apart would let a network blip render an admin shell whose every action
    // then fails one at a time.
    fails("invalid_token", "This link is no longer usable.");
    expect(await fetchAdminSession()).toBeNull();

    fails("network", "We couldn't reach us just now.");
    expect(await fetchAdminSession()).toBeNull();
  });

  it("invents no email here, unlike login", async () => {
    // There is no submitted address to fall back on, so a body without one is nobody.
    resolves({ role: "admin", displayName: "Ops Team" });
    expect(await fetchAdminSession()).toBeNull();
  });

  it("returns the identity when there is one", async () => {
    resolves(LIVE_SESSION);
    expect(await fetchAdminSession()).toEqual(LIVE_SESSION);
  });
});

describe("signing out", () => {
  it("calls the route and then drops the local token", async () => {
    // The round trip is the half that matters in production: only the server can expire an
    // `HttpOnly` cookie, so a client-side clear alone would leave the session live for its
    // full 12 hours on a machine whose user believes they signed out.
    resolves({ ok: true });
    await signOutAsAdmin();

    const [method, path] = called();
    expect(method).toBe("POST");
    expect(path).toBe("/admin/logout");
    expect(mockForget).toHaveBeenCalled();
  });

  it("neither throws nor reports failure", async () => {
    // The caller's next act is to navigate to the login screen. An admin stranded on a page
    // they are trying to leave is worse than a cookie that outlives the redirect.
    fails("network", "We couldn't reach us just now.");
    await expect(signOutAsAdmin()).resolves.toBeUndefined();
    expect(mockForget).toHaveBeenCalled();
  });
});

describe("the query key", () => {
  it("is distinct from the gym portal's", async () => {
    // Both sessions can exist in one browser during testing, and a shared key would have
    // signing out of one clearing the other's cache — or worse, answering for it.
    expect(ADMIN_SESSION_QUERY_KEY).toEqual(["admin-session"]);
  });
});
