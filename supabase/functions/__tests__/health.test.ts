import { describe, it, expect, vi, beforeAll } from "vitest";

// ─── Stub Deno global ─────────────────────────────────────────────────────────
type Handler = (req: Request) => Promise<Response>;
let handler: Handler;

vi.stubGlobal("Deno", {
  serve: vi.fn((fn: Handler) => { handler = fn; }),
  env: { get: vi.fn(() => undefined) },
});

beforeAll(async () => {
  await import("../health/index.ts");
});

describe("health handler", () => {
  it("responds with { ok: true } on GET", async () => {
    const req = new Request("https://fn.example.com/health");
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responds with { ok: true } on POST (no method restriction)", async () => {
    const req = new Request("https://fn.example.com/health", { method: "POST" });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  it("returns CORS headers", async () => {
    const req = new Request("https://fn.example.com/health");
    const res = await handler(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("handles OPTIONS preflight", async () => {
    const req = new Request("https://fn.example.com/health", { method: "OPTIONS" });
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
