import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const { mockGetSession, mockFunctionsInvoke } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFunctionsInvoke: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    functions: { invoke: mockFunctionsInvoke },
  },
}));

// ─── Mock global fetch ───────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  apiRequest,
  getQueryFn,
  invokeEdgeFunction,
  queryClient,
} from "@/lib/queryClient";

function makeResponse(
  status: number,
  body: unknown,
  statusText = ""
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe("invokeEdgeFunction()", () => {
  it("calls supabase.functions.invoke with function name and serialised body", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const result = await invokeEdgeFunction("my-fn", { key: "value" });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("my-fn", {
      body: JSON.stringify({ key: "value" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual({ data: { ok: true }, error: null });
  });

  it("omits body when data argument is not provided", async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: null });
    await invokeEdgeFunction("no-data-fn");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("no-data-fn", {
      body: undefined,
      headers: { "Content-Type": "application/json" },
    });
  });

  it("passes through the error returned by supabase", async () => {
    const err = new Error("Edge function failed");
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: err });

    const result = await invokeEdgeFunction("bad-fn");
    expect(result.error).toBe(err);
  });
});

describe("apiRequest()", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "bearer-token" } },
    });
  });

  it("sends GET request with Authorization header when token is present", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { data: "ok" }));

    await apiRequest("GET", "/api/test");

    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
      body: undefined,
    });
  });

  it("sends POST request with JSON body and Content-Type header", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { created: true }));

    await apiRequest("POST", "/api/items", { name: "Shake" });

    expect(mockFetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer bearer-token",
      },
      body: JSON.stringify({ name: "Shake" }),
    });
  });

  it("omits Authorization header when no session token exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFetch.mockResolvedValue(makeResponse(200, {}));

    await apiRequest("GET", "/api/public");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws an error with status and message when response is not ok", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(404, { message: "Not found" }, "Not Found")
    );

    await expect(apiRequest("GET", "/api/missing")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("falls back to statusText when response body has no message field", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(500, { error: "oops" }, "Internal Server Error")
    );

    await expect(apiRequest("GET", "/api/crash")).rejects.toMatchObject({
      status: 500,
      message: "Internal Server Error",
    });
  });

  it("handles non-JSON error response bodies gracefully", async () => {
    const badRes = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: vi.fn().mockRejectedValue(new SyntaxError("Not JSON")),
    } as unknown as Response;
    mockFetch.mockResolvedValue(badRes);

    await expect(apiRequest("GET", "/api/timeout")).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe("getQueryFn()", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "qf-token" } },
    });
  });

  it("fetches data and returns parsed JSON on 200", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { items: [1, 2, 3] }));

    const fn = getQueryFn({ on401: "throw" });
    const result = await fn({ queryKey: ["/api", "items"], signal: new AbortController().signal, meta: undefined });

    expect(result).toEqual({ items: [1, 2, 3] });
    expect(mockFetch).toHaveBeenCalledWith("/api/items", {
      headers: { Authorization: "Bearer qf-token" },
    });
  });

  it("joins queryKey segments with '/' to build the URL", async () => {
    mockFetch.mockResolvedValue(makeResponse(200, {}));

    const fn = getQueryFn({ on401: "returnNull" });
    await fn({ queryKey: ["https://api.example.com", "v1", "users"], signal: new AbortController().signal, meta: undefined });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/users",
      expect.any(Object)
    );
  });

  it("returns null on 401 when on401 is 'returnNull'", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
    } as unknown as Response);

    const fn = getQueryFn({ on401: "returnNull" });
    const result = await fn({ queryKey: ["/api/protected"], signal: new AbortController().signal, meta: undefined });

    expect(result).toBeNull();
  });

  it("throws on 401 when on401 is 'throw'", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
    } as unknown as Response);

    const fn = getQueryFn({ on401: "throw" });
    await expect(
      fn({ queryKey: ["/api/protected"], signal: new AbortController().signal, meta: undefined })
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("queryClient configuration", () => {
  it("has retry disabled for queries", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(false);
  });

  it("has staleTime set to Infinity", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(Infinity);
  });

  it("has refetchOnWindowFocus disabled", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("has retry disabled for mutations", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(false);
  });
});
