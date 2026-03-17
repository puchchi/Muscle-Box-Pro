import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  ENV_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  EMAIL_VERIFICATION_SECRET: "test-verification-secret-32-chars!!",
  FRONTEND_URL: "https://app.test.com",
};

// ─── Stub Deno global ─────────────────────────────────────────────────────────
type Handler = (req: Request) => Promise<Response>;
let handler: Handler;

vi.stubGlobal("Deno", {
  serve: vi.fn((fn: Handler) => { handler = fn; }),
  env: { get: vi.fn((k: string) => mockEnv[k]) },
});

// ─── Mock dependencies ────────────────────────────────────────────────────────
const mockUpdateUserById = vi.fn();
vi.mock("../_shared/supabase.ts", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  })),
}));

const mockVerifyVerificationToken = vi.fn();
vi.mock("../_shared/verificationEmail.ts", () => ({
  createVerificationToken: vi.fn(async () => "mock-token"),
  sendVerificationEmail: vi.fn(),
  verifyVerificationToken: mockVerifyVerificationToken,
}));

beforeAll(async () => {
  await import("../verify-email/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeGetRequest(token?: string) {
  const url = token
    ? `https://fn.example.com/verify-email?token=${token}`
    : "https://fn.example.com/verify-email";
  return new Request(url, { method: "GET" });
}

describe("verify-email handler", () => {
  it("returns 200 on OPTIONS preflight", async () => {
    const res = await handler(new Request("https://fn.example.com/verify-email", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for POST requests", async () => {
    const res = await handler(new Request("https://fn.example.com/verify-email", { method: "POST" }));
    expect(res.status).toBe(405);
    expect((await res.json()).message).toMatch(/method not allowed/i);
  });

  // ── Token validation ──
  it("returns 400 when token is missing", async () => {
    const res = await handler(makeGetRequest());
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/missing verification token/i);
  });

  it("returns 400 with plain text when token is invalid/expired", async () => {
    mockVerifyVerificationToken.mockRejectedValueOnce(new Error("jwt expired"));
    const res = await handler(makeGetRequest("bad-token"));
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/invalid or expired/i);
  });

  it("returns 400 when token type is not email_verification", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "password_reset", sub: "u1" },
    });
    const res = await handler(makeGetRequest("valid-token"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/invalid verification token type/i);
  });

  it("returns 400 when token payload has no sub", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "email_verification", sub: undefined },
    });
    const res = await handler(makeGetRequest("valid-token"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/invalid verification token payload/i);
  });

  // ── updateUserById error ──
  it("returns 400 when updateUserById returns an error", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "email_verification", sub: "u1" },
    });
    mockUpdateUserById.mockResolvedValueOnce({ error: { message: "User not found" } });
    const res = await handler(makeGetRequest("valid-token"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/user not found/i);
  });

  // ── Happy path ──
  it("redirects to login on successful verification", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "email_verification", sub: "u1" },
    });
    mockUpdateUserById.mockResolvedValueOnce({ error: null });
    const res = await handler(makeGetRequest("valid-token"));
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toMatch(/login\?verified=1/);
  });

  it("uses FRONTEND_URL env var in redirect", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "email_verification", sub: "u2" },
    });
    mockUpdateUserById.mockResolvedValueOnce({ error: null });
    const res = await handler(makeGetRequest("valid-token"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/app\.test\.com/);
  });

  it("calls updateUserById with correct userId and email_confirm true", async () => {
    mockVerifyVerificationToken.mockResolvedValueOnce({
      payload: { type: "email_verification", sub: "u99" },
    });
    mockUpdateUserById.mockResolvedValueOnce({ error: null });
    await handler(makeGetRequest("valid-token"));
    expect(mockUpdateUserById).toHaveBeenCalledWith("u99", { email_confirm: true });
  });
});
