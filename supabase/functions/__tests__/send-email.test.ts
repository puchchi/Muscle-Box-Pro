import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
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
const mockGetUser = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockSendMail = vi.fn();
vi.mock("../_shared/email.ts", () => ({
  sendMail: mockSendMail,
}));

beforeAll(async () => {
  await import("../send-email/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validBody = {
  to: "recipient@example.com",
  subject: "Test Subject",
  html: "<p>Hello world</p>",
};

function makeRequest(body: unknown, authHeader = "Bearer valid-token") {
  return new Request("https://fn.example.com/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeAuthedRequest(body: unknown) {
  mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
  return makeRequest(body);
}

describe("send-email handler", () => {
  it("returns 200 on OPTIONS preflight", async () => {
    const res = await handler(new Request("https://fn.example.com/send-email", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET requests", async () => {
    const res = await handler(new Request("https://fn.example.com/send-email"));
    expect(res.status).toBe(405);
    expect((await res.json()).message).toMatch(/method not allowed/i);
  });

  // ── Auth checks ──
  it("returns 401 when authorization header is missing", async () => {
    const res = await handler(new Request("https://fn.example.com/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toMatch(/missing authorization header/i);
  });

  it("returns 401 when getUser returns an error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "invalid token" } });
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toMatch(/unauthorized/i);
  });

  it("returns 401 when getUser returns no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toMatch(/unauthorized/i);
  });

  // ── Payload validation ──
  it("returns 400 when 'to' is missing", async () => {
    const { to: _t, ...noTo } = validBody;
    const res = await handler(makeAuthedRequest(noTo));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/to is required/i);
  });

  it("returns 400 when 'subject' is missing", async () => {
    const { subject: _s, ...noSubject } = validBody;
    const res = await handler(makeAuthedRequest(noSubject));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/subject is required/i);
  });

  it("returns 400 when 'html' is missing", async () => {
    const { html: _h, ...noHtml } = validBody;
    const res = await handler(makeAuthedRequest(noHtml));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/html is required/i);
  });

  it("returns 400 when body is not an object", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    const req = new Request("https://fn.example.com/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
      body: '"just-a-string"',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  // ── Happy path ──
  it("returns 200 with success message when email is sent", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/email sent/i);
  });

  it("calls sendMail with correct payload", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Hello world</p>",
      })
    );
  });

  it("passes optional cc field to sendMail when provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest({ ...validBody, cc: "cc@example.com" }));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ cc: "cc@example.com" })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendMail throws", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection failed"));
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/smtp connection failed/i);
  });
});
