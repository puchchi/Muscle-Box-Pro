import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  ENV_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  EMAIL_VERIFICATION_SECRET: "test-verification-secret-32-chars!!",
  EMAIL_VERIFICATION_URL_BASE: "https://test.supabase.co/functions/v1/verify-email",
  SMTP_HOST: "smtp.test.com",
  SMTP_USER: "user@test.com",
  SMTP_PASS: "pass",
};

// ─── Stub Deno global ─────────────────────────────────────────────────────────
type Handler = (req: Request) => Promise<Response>;
let handler: Handler;

vi.stubGlobal("Deno", {
  serve: vi.fn((fn: Handler) => { handler = fn; }),
  env: { get: vi.fn((k: string) => mockEnv[k]) },
});

// ─── Mock dependencies ────────────────────────────────────────────────────────
const mockListUsers = vi.fn();
vi.mock("../_shared/supabase.ts", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

const mockSendVerificationEmail = vi.fn();
vi.mock("../_shared/verificationEmail.ts", () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  createVerificationToken: vi.fn(async () => "mock-token"),
  verifyVerificationToken: vi.fn(),
}));

beforeAll(async () => {
  await import("../resend-verification/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown) {
  return new Request("https://fn.example.com/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("resend-verification handler", () => {
  it("returns 200 on OPTIONS", async () => {
    const res = await handler(new Request("https://fn.example.com/resend-verification", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const res = await handler(new Request("https://fn.example.com/resend-verification"));
    expect(res.status).toBe(405);
  });

  // ── Validation ──
  it("returns 400 for invalid email", async () => {
    const res = await handler(makeRequest({ email: "notvalid" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/valid email/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is null", async () => {
    const req = new Request("https://fn.example.com/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  // ── listUsers error ──
  it("returns 500 when listUsers returns an error", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: { users: [] },
      error: { message: "DB error" },
    });
    const res = await handler(makeRequest({ email: "u@example.com" }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to process/i);
  });

  // ── User not found (silent) ──
  it("returns 200 with silent message when user is not found", async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });
    const res = await handler(makeRequest({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Silent — doesn't reveal if account exists
    expect(body.message).toMatch(/if your account exists/i);
  });

  // ── Already verified ──
  it("returns 400 when email is already confirmed", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ id: "u1", email: "verified@example.com", email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: {} }],
      },
      error: null,
    });
    const res = await handler(makeRequest({ email: "verified@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/already verified/i);
  });

  // ── Happy path ──
  it("returns 200 and sends verification email for unconfirmed user", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{
          id: "u2",
          email: "unverified@example.com",
          email_confirmed_at: null,
          user_metadata: { full_name: "Alice" },
        }],
      },
      error: null,
    });
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    const res = await handler(makeRequest({ email: "unverified@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/verification link has been sent/i);
  });

  it("calls sendVerificationEmail with user details", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{
          id: "u3",
          email: "bob@example.com",
          email_confirmed_at: null,
          user_metadata: { full_name: "Bob" },
        }],
      },
      error: null,
    });
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    await handler(makeRequest({ email: "bob@example.com" }));
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u3", email: "bob@example.com" })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendVerificationEmail throws", async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [{ id: "u4", email: "u@example.com", email_confirmed_at: null, user_metadata: {} }],
      },
      error: null,
    });
    mockSendVerificationEmail.mockRejectedValueOnce(new Error("SMTP failure"));

    const res = await handler(makeRequest({ email: "u@example.com" }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to send verification email/i);
  });
});
