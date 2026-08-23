import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MBP_API_BASE_URL, apiRequest } from "@/lib/apiClient";

/**
 * The transport rules for `api.muscleboxpro.com`.
 *
 * Written because four of the things this module does fail **only in a real browser
 * against a real origin** — a missing `credentials: "include"` is an anonymous request,
 * a missing `Content-Type` is a refused write, a handle in a URL is a credential in an
 * access log — and none of those show up in a component test. `fetch` is mocked here so
 * that what the module *sends* is the thing under test, not what a server does with it.
 *
 * The error tests are the other half, and they are written from what each code makes the
 * wizard do: `expired_token` and `revoked_token` have different terminal screens,
 * `wrong_step` without `currentStep` leaves the wizard unable to recover, `validation`
 * without `fieldErrors` cannot mark a field. Getting the mapping wrong is not a cosmetic
 * failure — it is a gym told its link was deliberately voided when it merely lapsed.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A response in the shape `fetch` returns: `apiRequest` reads `.ok`, `.status`, `.text()`. */
function respond(status: number, body: unknown, { raw }: { raw?: string } = {}) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => raw ?? (body === undefined ? "" : JSON.stringify(body)),
  });
}

/** The `RequestInit` the module handed to `fetch`. */
function sentInit(): RequestInit & { headers: Record<string, string> } {
  return fetchMock.mock.calls[0][1];
}

function sentUrl(): string {
  return fetchMock.mock.calls[0][0] as string;
}

describe("what every request carries", () => {
  it("sends the session cookie cross-origin, on reads as well as writes", async () => {
    // `www.muscleboxpro.com` → `api.muscleboxpro.com` is cross-*origin*, so fetch omits
    // cookies unless asked. Without this the dashboard's own snapshot request is
    // anonymous and answers 401 on a perfectly good session.
    respond(200, { ok: true });
    await apiRequest("GET", "/gym/portal");
    expect(sentInit().credentials).toBe("include");

    fetchMock.mockReset();
    respond(200, { ok: true });
    await apiRequest("POST", "/gym/logout");
    expect(sentInit().credentials).toBe("include");
  });

  it("declares JSON on a write even when there is nothing to send", async () => {
    // Not a convention — a CSRF control (§4.2). The API *rejects* a state-changing request
    // without `Content-Type: application/json`, because requiring it guarantees a CORS
    // preflight that a non-allowlisted origin fails. `POST /onboarding/ack` has no payload,
    // so a bodyless POST is precisely the request that would be refused.
    respond(200, {});
    await apiRequest("POST", "/onboarding/ack");
    expect(sentInit().headers["Content-Type"]).toBe("application/json");
    expect(sentInit().body).toBe("{}");
  });

  it("serialises the body it was given", async () => {
    respond(200, {});
    await apiRequest("PUT", "/onboarding/draft", { body: { step: "details", data: { gstin: "29" } } });
    expect(JSON.parse(sentInit().body as string)).toEqual({
      step: "details",
      data: { gstin: "29" },
    });
  });

  it("sends no body and no content type on a read", async () => {
    // A GET carrying either would stop being a simple request and buy a preflight round
    // trip on every dashboard load, in exchange for restating what the route already does.
    respond(200, {});
    await apiRequest("GET", "/onboarding", { body: { ignored: true } });
    expect(sentInit().body).toBeUndefined();
    expect(sentInit().headers["Content-Type"]).toBeUndefined();
  });

  it("never caches a wizard read", async () => {
    // A resumed onboarding served a cached `currentStep` renders a step the server has
    // already moved past, and the gym cannot get off it by reloading.
    respond(200, {});
    await apiRequest("GET", "/onboarding");
    expect(sentInit().cache).toBe("no-store");
  });

  it("gives up rather than spinning forever", async () => {
    // `fetch` has no default timeout. Without a signal the wizard's saving indicator spins
    // indefinitely on a dropped connection — the one failure a user cannot tell apart from
    // a hung app.
    respond(200, {});
    await apiRequest("GET", "/onboarding");
    expect(sentInit().signal).toBeInstanceOf(AbortSignal);
  });
});

describe("where the onboarding handle travels", () => {
  const handle = "3f7c9a1e5b2d4068a5c3e7f9b2d4068a";

  it("sends it as a bearer header", async () => {
    respond(200, {});
    await apiRequest("GET", "/onboarding", { handle });
    expect(sentInit().headers.Authorization).toBe(`Bearer ${handle}`);
  });

  it("keeps it out of the path and the query string", async () => {
    // API Gateway access logs archive paths and query strings. A 30-day credential in a
    // log is a 30-day credential in a log (§4.3), and this is the assertion that stops a
    // later convenience — `?token=` — from being added without anyone noticing.
    respond(200, {});
    await apiRequest("GET", "/onboarding", { handle });
    expect(sentUrl()).toBe(`${MBP_API_BASE_URL}/onboarding`);
    expect(sentUrl()).not.toContain(handle);
  });

  it("omits the header entirely for the cookie-authenticated routes", async () => {
    // Not an empty bearer: `Authorization: Bearer ` is a malformed credential, and a
    // handler that parses before it checks may answer `invalid_token` to a request that
    // was properly authenticated by its cookie.
    respond(200, {});
    await apiRequest("GET", "/gym/portal");
    expect("Authorization" in sentInit().headers).toBe(false);
  });

  it("targets the custom domain, not an execute-api host", async () => {
    // `www.` and `api.muscleboxpro.com` share one registrable domain, which is what makes
    // the session cookies same-site and keeps `SameSite=Lax`'s CSRF protection. On an
    // `execute-api.<region>.amazonaws.com` host the requests are cross-site, the cookie
    // needs `SameSite=None`, and that protection is gone. The domain *is* the control.
    expect(MBP_API_BASE_URL).toBe("https://api.muscleboxpro.com");
    expect(MBP_API_BASE_URL).not.toContain("amazonaws.com");
    expect(MBP_API_BASE_URL.endsWith("/")).toBe(false);
  });
});

describe("a response that arrived", () => {
  it("returns the parsed body on success", async () => {
    respond(200, { currentStep: 2, status: "details_submitted" });
    const result = await apiRequest<{ currentStep: number }>("GET", "/onboarding");
    expect(result).toEqual({ ok: true, data: { currentStep: 2, status: "details_submitted" } });
  });

  it("treats an empty 200 as a failed request", async () => {
    // A 204 or a truncated response where the wizard expected its whole state. There is
    // nothing to render, and `{ ok: true, data: undefined }` would be folded into React
    // state and blank the page.
    respond(200, undefined);
    const result = await apiRequest("GET", "/onboarding");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("network");
  });

  it("treats a 200 that is not JSON as a failed request", async () => {
    respond(200, undefined, { raw: "<html>Service Unavailable</html>" });
    const result = await apiRequest("GET", "/onboarding");
    expect(result.ok === false && result.error.code).toBe("network");
  });
});

describe("codes the wizard acts on", () => {
  it.each([
    ["invalid_token", 401],
    ["expired_token", 401],
    ["revoked_token", 401],
    ["frozen", 409],
    ["already_signed", 409],
    ["content_mismatch", 409],
    ["validation", 400],
  ] as const)("passes %s through from the body", async (code, status) => {
    // The three 401s share a status and have three different terminal screens, so the body
    // is the only thing that can tell them apart. Collapsing them tells a gym whose link
    // lapsed that it was deliberately voided.
    respond(status, { code, message: "Server copy." });
    const result = await apiRequest("POST", "/onboarding/sign");
    expect(result.ok === false && result.error).toEqual({ code, message: "Server copy." });
  });

  it("keeps currentStep on a wrong_step, which is the whole recovery", async () => {
    respond(409, { code: "wrong_step", message: "You're on step 2.", currentStep: 2 });
    const result = await apiRequest("POST", "/onboarding/sign");
    expect(result.ok === false && result.error.currentStep).toBe(2);
  });

  it("keeps fieldErrors on a validation failure, which is what marks the input", async () => {
    respond(400, {
      code: "validation",
      message: "Some details need fixing.",
      fieldErrors: { gstin: "Not a valid GSTIN.", noticesEmail: "Required." },
    });
    const result = await apiRequest("POST", "/onboarding/details");
    expect(result.ok === false && result.error.fieldErrors).toEqual({
      gstin: "Not a valid GSTIN.",
      noticesEmail: "Required.",
    });
  });
});

describe("what it refuses to take from the network", () => {
  it("drops a step number that is not a step", async () => {
    // `currentStep` drives which screen renders. A 9 from a confused server would send the
    // wizard to a step that does not exist; leaving it absent keeps the gym where it is and
    // shows the message, which is recoverable.
    for (const currentStep of [0, 6, 9, "2", 2.5, null]) {
      fetchMock.mockReset();
      respond(409, { code: "wrong_step", message: "Moved on.", currentStep });
      const result = await apiRequest("POST", "/onboarding/ack");
      expect(result.ok === false && "currentStep" in result.error).toBe(false);
    }
  });

  it("drops field errors that are not strings", async () => {
    // These are rendered as React children, and React *throws* on an object child. A
    // serialised Zod tree in `fieldErrors` would take out the whole form rather than mark
    // one input — so the nested entry goes and the usable one stays.
    respond(400, {
      code: "validation",
      message: "Some details need fixing.",
      fieldErrors: { gstin: "Not a valid GSTIN.", registeredAddress: { _errors: ["Required"] } },
    });
    const result = await apiRequest("POST", "/onboarding/details");
    expect(result.ok === false && result.error.fieldErrors).toEqual({
      gstin: "Not a valid GSTIN.",
    });
  });

  it("refuses to believe a response that says the request did not happen", async () => {
    // §4.4: the server never emits `network`. It means "this did not complete", and a
    // response that plainly arrived must not be able to claim otherwise — so it falls
    // through to the status, where a 409 is a step conflict.
    respond(409, { code: "network", message: "Nope." });
    const result = await apiRequest("POST", "/onboarding/ack");
    expect(result.ok === false && result.error.code).toBe("wrong_step");
  });

  it("falls back to the status for a code nothing on screen can phrase", async () => {
    respond(400, { code: "quota_exceeded", message: "Too many." });
    const result = await apiRequest("POST", "/onboarding/details");
    expect(result.ok === false && result.error.code).toBe("validation");
  });

  it("does not put a gateway's words in front of a gym owner", async () => {
    // `ActionError` renders `error.message` verbatim. An API Gateway 502 body says
    // "Internal server error", and shown as-is it reads as copy we wrote for this moment.
    // With no recognised code, the message is ours.
    respond(502, { message: "Internal server error" });
    const result = await apiRequest("GET", "/onboarding");
    expect(result.ok === false && result.error.code).toBe("network");
    expect(result.ok === false && result.error.message).toContain("couldn't reach us");
  });

  it("supplies its own copy when a recognised code arrives with a blank message", async () => {
    respond(400, { code: "validation", message: "   " });
    const result = await apiRequest("POST", "/onboarding/details");
    expect(result.ok === false && result.error.message).toBe("Some details need fixing.");
  });
});

describe("statuses with no body to go on", () => {
  it.each([
    [400, "validation"],
    [401, "invalid_token"],
    [403, "invalid_token"],
    [409, "wrong_step"],
    [500, "network"],
    [502, "network"],
    [418, "network"],
  ] as const)("maps a bare %i to %s", async (status, code) => {
    // 401 becomes `invalid_token` rather than expired or revoked: only the body can tell
    // those apart, and the fallback must not be the one that claims a link was voided
    // on purpose.
    respond(status, undefined, { raw: "" });
    const result = await apiRequest("GET", "/onboarding");
    expect(result.ok === false && result.error.code).toBe(code);
  });

  it("maps an error body that is an array rather than an object", async () => {
    respond(400, [{ code: "validation" }]);
    const result = await apiRequest("POST", "/onboarding/details");
    expect(result.ok === false && result.error.code).toBe("validation");
  });
});

describe("a request that never completed", () => {
  it("returns a value rather than throwing", async () => {
    // `OnboardingError` *is* the wizard's error surface — it picks the terminal screen, the
    // field markers and the recovery copy. A thrown fetch bypasses all of it and lands in
    // an error boundary, which tells a gym owner nothing.
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await apiRequest("GET", "/onboarding");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "network",
        message: "We couldn't reach us just now. Check your connection and try again.",
      },
    });
  });

  it("treats a timeout the same way", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" }),
    );
    const result = await apiRequest("POST", "/gym/deposit");
    expect(result.ok === false && result.error.code).toBe("network");
  });

  it("treats an unreadable body the same way", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => {
        throw new TypeError("network error");
      },
    });
    const result = await apiRequest("GET", "/gym/portal");
    expect(result.ok === false && result.error.code).toBe("network");
  });
});

describe("the configured origin", () => {
  it("strips a trailing slash so paths do not double up", async () => {
    // `https://api.example.com/` + `/onboarding` is `//onboarding`, which is a different
    // path and answers 403 from API Gateway. Read at module scope, so this needs a fresh
    // module rather than a stub.
    vi.stubEnv("NEXT_PUBLIC_MBP_API_URL", "https://api.staging.muscleboxpro.com///");
    vi.resetModules();
    const fresh = await import("@/lib/apiClient");
    expect(fresh.MBP_API_BASE_URL).toBe("https://api.staging.muscleboxpro.com");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
