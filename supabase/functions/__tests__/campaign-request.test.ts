import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  ENV_SUPABASE_URL: "https://test.supabase.co",
  ENV_SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  CAMPAIGN_REQUEST_CC: "contact@muscleboxpro.com",
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
  await import("../campaign-request/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, method = "POST") {
  return new Request("https://fn.example.com/campaign-request", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { brandName: "FitBrand", email: "ads@fitbrand.com", mobile: "9876543210" };

describe("campaign-request handler", () => {
  it("returns 200 on OPTIONS preflight", async () => {
    const res = await handler(new Request("https://fn.example.com/campaign-request", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET", async () => {
    const res = await handler(new Request("https://fn.example.com/campaign-request"));
    expect(res.status).toBe(405);
  });

  // ── Validation ──
  it("returns 400 when brandName is missing", async () => {
    const { brandName: _b, ...noName } = validBody;
    const res = await handler(makeRequest(noName));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await handler(makeRequest({ ...validBody, email: "bad" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email/i);
  });

  it("returns 400 when mobile is too short", async () => {
    const res = await handler(makeRequest({ ...validBody, mobile: "123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/valid mobile/i);
  });

  // ── DB error ──
  it("returns 500 when DB insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "duplicate key" } });
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to save campaign request/i);
  });

  // ── Happy path ──
  it("returns 200 with success message on valid request", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/campaign inquiry/i);
  });

  it("inserts correct columns into campaign_requests", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        brand_name: "FitBrand",
        email: "ads@fitbrand.com",
        mobile: "9876543210",
      })
    );
  });

  it("sends email to the submitted address", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ads@fitbrand.com" })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendMail throws after DB insert", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockSendMail.mockRejectedValueOnce(new Error("SMTP down"));
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/campaign request saved, but email failed/i);
  });
});
