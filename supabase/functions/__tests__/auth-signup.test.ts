import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  ENV_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  EMAIL_VERIFICATION_SECRET: "test-verification-secret-32-chars!!",
  EMAIL_VERIFICATION_TTL_MINUTES: "60",
  EMAIL_VERIFICATION_URL_BASE: "https://test.supabase.co/functions/v1/verify-email",
  SMTP_HOST: "smtp.test.com",
  SMTP_USER: "user@test.com",
  SMTP_PASS: "pass",
  SMTP_FROM: "no-reply@test.com",
};

// ─── Stub Deno global ─────────────────────────────────────────────────────────
type Handler = (req: Request) => Promise<Response>;
let handler: Handler;

vi.stubGlobal("Deno", {
  serve: vi.fn((fn: Handler) => { handler = fn; }),
  env: { get: vi.fn((k: string) => mockEnv[k]) },
});

// ─── Mock dependencies ────────────────────────────────────────────────────────
const mockCreateUser = vi.fn();
vi.mock("../_shared/supabase.ts", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { createUser: mockCreateUser } },
  })),
}));

const mockSendVerificationEmail = vi.fn();
vi.mock("../_shared/verificationEmail.ts", () => ({
  createVerificationToken: vi.fn(async () => "mock-token"),
  verifyVerificationToken: vi.fn(),
  sendVerificationEmail: mockSendVerificationEmail,
}));

beforeAll(async () => {
  await import("../auth-signup/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, method = "POST") {
  return new Request("https://fn.example.com/auth-signup", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auth-signup handler", () => {
  // ── OPTIONS preflight ──
  it("returns 200 ok on OPTIONS", async () => {
    const res = await handler(new Request("https://fn.example.com/auth-signup", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  // ── Method guard ──
  it("returns 405 for GET requests", async () => {
    const res = await handler(new Request("https://fn.example.com/auth-signup"));
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ message: "Method not allowed" });
  });

  // ── Validation ──
  it("returns 400 when name is missing", async () => {
    const res = await handler(makeRequest({ email: "a@b.com", password: "pass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/name is required/i);
  });

  it("returns 400 when name is too short", async () => {
    const res = await handler(makeRequest({ name: "A", email: "a@b.com", password: "pass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/name is required/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await handler(makeRequest({ name: "John", email: "notvalid", password: "pass123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/valid email/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await handler(makeRequest({ name: "John", email: "j@e.com", password: "abc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/6 characters/i);
  });

  it("returns 400 when mobile is provided but too short", async () => {
    const res = await handler(makeRequest({ name: "John", email: "j@e.com", password: "pass123", mobile: "123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/valid mobile/i);
  });

  it("returns 400 when body is not an object", async () => {
    const req = new Request("https://fn.example.com/auth-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '"just-a-string"',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  // ── Supabase error ──
  it("returns 400 when createUser returns an error", async () => {
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Email already registered" },
    });
    const res = await handler(makeRequest({ name: "John Doe", email: "j@e.com", password: "pass123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email already registered/i);
  });

  it("returns 500 when createUser returns no user", async () => {
    mockCreateUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await handler(makeRequest({ name: "John Doe", email: "j@e.com", password: "pass123" }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to create user/i);
  });

  // ── Happy path ──
  it("returns 201 with success message on valid signup", async () => {
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "john@example.com" } },
      error: null,
    });
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    const res = await handler(makeRequest({
      name: "John Doe",
      email: "john@example.com",
      password: "secret123",
      mobile: "9876543210",
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toMatch(/verification link/i);
    expect(body.user).toEqual({ id: "u1", email: "john@example.com" });
  });

  it("calls sendVerificationEmail with correct params on success", async () => {
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "u42", email: "jane@example.com" } },
      error: null,
    });
    mockSendVerificationEmail.mockResolvedValueOnce(undefined);

    await handler(makeRequest({ name: "Jane Doe", email: "jane@example.com", password: "pass123" }));

    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u42", email: "jane@example.com", name: "Jane Doe" })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendVerificationEmail throws", async () => {
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "j@e.com" } },
      error: null,
    });
    mockSendVerificationEmail.mockRejectedValueOnce(new Error("SMTP connection refused"));

    const res = await handler(makeRequest({ name: "John Doe", email: "j@e.com", password: "pass123" }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to send verification email/i);
  });
});
