import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The gym portal's session seam, on the live path.
 *
 * Mocked at `apiRequest`, so what is under test is the seam's own judgement — which routes it
 * calls, what it takes from a response body, and what it does with a sandbox token — and not
 * the transport, which `apiClient.test.ts` covers.
 *
 * Both cases here are ones that were live in a sandbox tab and could not fail in any existing
 * test, because both need a real cross-site origin to bite:
 *
 * - **Dropping `sessionToken`.** `POST /gym/login` answered 200, and every request after it
 *   was anonymous, so `GET /gym/session` 401'd and the dashboard bounced back to the login
 *   page that had just sent the gym there. A login that succeeds and signs nobody in.
 * - **Reading `gymStatus` off the wire.** The server calls that field `status`. Nothing
 *   renders it today, which is exactly why a rename at this boundary needs a test: the first
 *   thing to read it would find `null` on a gym mid-onboarding and show the wrong portal.
 *
 * `USE_LIVE_API` is read once at module scope, so the module is imported per test through
 * `gymSessionLive()` rather than at the top of the file.
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

// Never reached on the live path, and unmocked it would build a real Supabase client at
// import time.
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

/** A complete `GET /gym/session` body, as the deployed handler sends it. */
const LIVE_SESSION = {
  email: "owner@testgym7.com",
  gymId: "04e97b8c-641b-4707-914e-f9294d8aed4a",
  role: "owner",
  gymDisplayName: "test gym 7",
  status: "deposit_paid",
  expiresAt: "2026-08-27T06:03:53.102Z",
};

async function gymSessionLive() {
  vi.stubEnv("NEXT_PUBLIC_MBP_API_MODE", "live");
  vi.resetModules();
  return await import("@/lib/gymSession");
}

function resolves(data: unknown) {
  mockApiRequest.mockResolvedValue({ ok: true, data });
}

function fails(code: string, message: string) {
  mockApiRequest.mockResolvedValue({ ok: false, error: { code, message } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("signing in", () => {
  it("posts the credentials to the gym login route", async () => {
    resolves(LIVE_SESSION);
    const { signInToPortal } = await gymSessionLive();
    await signInToPortal("owner@testgym7.com", "correct horse");

    const [method, path, options] = mockApiRequest.mock.calls[0] as [string, string, { body?: unknown; handle?: unknown }];
    expect(method).toBe("POST");
    expect(path).toBe("/gym/login");
    expect(options?.body).toEqual({ email: "owner@testgym7.com", password: "correct horse" });
    // Never as a handle. The password is not a bearer credential, and the route reads the body.
    expect(options?.handle).toBeUndefined();
  });

  it("hands a sandbox session token to the client to hold", async () => {
    // The bug this file was written for. `rememberBearerSession` decides whether to keep it;
    // what matters here is that the field is offered rather than dropped, because without it
    // every request after the login is anonymous and the dashboard is unreachable.
    resolves({ ...LIVE_SESSION, sessionToken: "sandbox-token-9f2c" });
    const { signInToPortal } = await gymSessionLive();
    await signInToPortal("owner@testgym7.com", "correct horse");
    expect(mockRemember).toHaveBeenCalledWith("sandbox-token-9f2c");
  });

  it("offers the absent field just the same in production", async () => {
    // The production shape: no `sessionToken` at all. Passing `undefined` through rather than
    // branching is what keeps one code path for both, and the hatch is off on that host
    // anyway. A client that *required* the token would work in sandbox and 401 in production.
    resolves(LIVE_SESSION);
    const { signInToPortal } = await gymSessionLive();
    await signInToPortal("owner@testgym7.com", "correct horse");
    expect(mockRemember).toHaveBeenCalledWith(undefined);
  });

  it("stores nothing from a failed login", async () => {
    fails("validation", "Email or password is incorrect.");
    const { signInToPortal } = await gymSessionLive();
    await signInToPortal("owner@testgym7.com", "wrong");
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it("replaces the server's credential message but keeps the network one", async () => {
    // One generic message for every credential failure, so this side is not the thing that
    // turns the server's deliberate silence into an enumeration oracle. The exception is a
    // request that never arrived: "incorrect email or password" would be actively untrue.
    fails("validation", "Email or password is incorrect.");
    const { signInToPortal } = await gymSessionLive();
    const rejected = await signInToPortal("owner@testgym7.com", "wrong");
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe("invalid_token");

    fails("network", "We couldn't reach us just now. Check your connection and try again.");
    const offline = await signInToPortal("owner@testgym7.com", "correct horse");
    expect(offline.ok).toBe(false);
    if (!offline.ok) expect(offline.error.code).toBe("network");
  });
});

describe("asking who is signed in", () => {
  it("reads the guard route", async () => {
    resolves(LIVE_SESSION);
    const { fetchGymSession } = await gymSessionLive();
    await fetchGymSession();
    const [method, path] = mockApiRequest.mock.calls[0] as [string, string];
    expect(method).toBe("GET");
    expect(path).toBe("/gym/session");
  });

  it("answers null when there is no session and when we could not ask", async () => {
    // Both, deliberately conflated: the caller sends them to sign in either way, and telling
    // them apart would let a network blip render a dashboard shell with no data in it.
    const { fetchGymSession } = await gymSessionLive();
    fails("invalid_token", "This link is no longer usable.");
    expect(await fetchGymSession()).toBeNull();
    fails("network", "We couldn't reach us just now.");
    expect(await fetchGymSession()).toBeNull();
    // And a 200 that describes nobody. `apiRequest` casts rather than validates.
    resolves({ gymId: "gym_1", role: "owner" });
    expect(await fetchGymSession()).toBeNull();
  });

  it("takes the onboarding status from the field the server actually sends", async () => {
    // `status` on the wire, `gymStatus` here. A gym that has signed but not paid its deposit
    // is `signed`, not a lapsed lead, and the dashboard's "your machine is being installed"
    // state is what reads this — a silent `null` shows an empty portal instead.
    const { fetchGymSession, signInToPortal } = await gymSessionLive();

    resolves(LIVE_SESSION);
    expect(await fetchGymSession()).toEqual({
      email: "owner@testgym7.com",
      gymId: "04e97b8c-641b-4707-914e-f9294d8aed4a",
      role: "owner",
      gymStatus: "deposit_paid",
    });

    // The login response carries it too, and the login page renders from that one.
    const signedIn = await signInToPortal("owner@testgym7.com", "correct horse");
    expect(signedIn.ok && signedIn.data.gymStatus).toBe("deposit_paid");
  });

  it("nulls the fields a body left out rather than guessing them", async () => {
    // `gymId` is for display and for support calls, never sent back as a parameter, so an
    // absent one is renderable. Inventing any of these would be the browser deciding what
    // it may reach.
    resolves({ email: "owner@testgym7.com" });
    const { fetchGymSession } = await gymSessionLive();
    expect(await fetchGymSession()).toEqual({
      email: "owner@testgym7.com",
      gymId: null,
      role: null,
      gymStatus: null,
    });
  });
});

describe("signing out", () => {
  it("calls the route and drops the sandbox token", async () => {
    // Both halves. Only the server can expire an `HttpOnly` cookie, and only this side can
    // drop the bearer copy — which is the sole credential a `localhost` tab ever had.
    resolves({});
    const { signOutOfPortal } = await gymSessionLive();
    await signOutOfPortal();
    const [method, path] = mockApiRequest.mock.calls[0] as [string, string];
    expect(method).toBe("POST");
    expect(path).toBe("/gym/logout");
    expect(mockForget).toHaveBeenCalled();
  });

  it("drops the token even when the route fails", async () => {
    // A gym on a shared office computer clicked sign out. Leaving a live token behind
    // because the round trip 500'd is the failure that matters.
    fails("network", "We couldn't reach us just now.");
    const { signOutOfPortal } = await gymSessionLive();
    await expect(signOutOfPortal()).resolves.toBeUndefined();
    expect(mockForget).toHaveBeenCalled();
  });
});
