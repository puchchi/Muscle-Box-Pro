import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  ENV_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  DEMO_REQUEST_CC: "contact@muscleboxpro.com",
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
const mockInsert = vi.fn();
vi.mock("../_shared/supabase.ts", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}));

const mockSendMail = vi.fn();
vi.mock("../_shared/email.ts", () => ({
  sendMail: mockSendMail,
}));

beforeAll(async () => {
  await import("../demo-request/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, method = "POST") {
  return new Request("https://fn.example.com/demo-request", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Raj",
  gymName: "Iron Palace",
  email: "raj@gym.com",
  mobile: "9876543210",
  location: "Delhi",
};

describe("demo-request handler", () => {
  it("returns 200 on OPTIONS preflight", async () => {
    const res = await handler(new Request("https://fn.example.com/demo-request", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const res = await handler(new Request("https://fn.example.com/demo-request"));
    expect(res.status).toBe(405);
  });

  // ── Validation ──
  it("returns 400 when name is missing", async () => {
    const { name: _n, ...noName } = validBody;
    const res = await handler(makeRequest(noName));
    expect(res.status).toBe(400);
  });

  it("returns 400 when gymName is missing", async () => {
    const { gymName: _g, ...noGym } = validBody;
    const res = await handler(makeRequest(noGym));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await handler(makeRequest({ ...validBody, email: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when mobile is too short", async () => {
    const res = await handler(makeRequest({ ...validBody, mobile: "12345" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/valid mobile/i);
  });

  it("returns 400 when location is missing", async () => {
    const { location: _l, ...noLoc } = validBody;
    const res = await handler(makeRequest(noLoc));
    expect(res.status).toBe(400);
  });

  // ── DB error ──
  it("returns 500 when database insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "constraint violation" } });
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to save demo request/i);
  });

  // ── Happy path ──
  it("returns 200 with success message on valid request", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/demo request/i);
  });

  it("inserts the correct columns into demo_requests", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Raj",
        gym_name: "Iron Palace",
        email: "raj@gym.com",
        mobile: "9876543210",
        location: "Delhi",
        message: null,
      })
    );
  });

  it("passes optional message to insert when provided", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest({ ...validBody, message: "Call me at 3pm" }));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Call me at 3pm" })
    );
  });

  it("calls sendMail with correct recipient", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "raj@gym.com" })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendMail throws after successful DB insert", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockRejectedValueOnce(new Error("SMTP error"));
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to send demo email/i);
  });
});
