import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Mock env ─────────────────────────────────────────────────────────────────
const mockEnv: Record<string, string> = {
  CONTACT_REQUEST_CC: "contact@muscleboxpro.com",
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
const mockSendMail = vi.fn();
vi.mock("../_shared/email.ts", () => ({
  sendMail: mockSendMail,
}));

beforeAll(async () => {
  await import("../contact-request/index.ts");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, method = "POST") {
  return new Request("https://fn.example.com/contact-request", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { name: "Alice", email: "alice@example.com", message: "I have a question." };

describe("contact-request handler", () => {
  it("returns 200 on OPTIONS preflight", async () => {
    const res = await handler(new Request("https://fn.example.com/contact-request", { method: "OPTIONS" }));
    expect(res.status).toBe(200);
  });

  it("returns 405 for GET requests", async () => {
    const res = await handler(new Request("https://fn.example.com/contact-request"));
    expect(res.status).toBe(405);
  });

  // ── Validation ──
  it("returns 400 when name is missing", async () => {
    const { name: _n, ...noName } = validBody;
    const res = await handler(makeRequest(noName));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await handler(makeRequest({ ...validBody, email: "bad" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/email/i);
  });

  it("returns 400 when message is too short", async () => {
    const res = await handler(makeRequest({ ...validBody, message: "Hi" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/message/i);
  });

  // ── Happy path ──
  it("returns 200 with success message on valid request", async () => {
    mockSendMail.mockResolvedValueOnce(undefined);
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/thanks for reaching out/i);
  });

  it("calls sendMail with correct to and cc", async () => {
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        cc: "contact@muscleboxpro.com",
      })
    );
  });

  it("uses correct email subject", async () => {
    mockSendMail.mockResolvedValueOnce(undefined);
    await handler(makeRequest(validBody));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "We received your message - Muscle Box Pro",
      })
    );
  });

  // ── Email failure ──
  it("returns 500 when sendMail throws", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP timeout"));
    const res = await handler(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/unable to send contact email/i);
  });
});
