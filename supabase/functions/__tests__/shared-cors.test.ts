/**
 * Tests for supabase/functions/_shared/cors.ts
 * Uses the web Response API, available in the happy-dom environment.
 */
import { describe, it, expect } from "vitest";
import { corsHeaders, corsResponse, jsonResponse } from "../_shared/cors.ts";

describe("corsHeaders", () => {
  it("allows all origins", () => {
    expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("allows the expected request headers", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("authorization");
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("content-type");
  });

  it("allows POST, GET, and OPTIONS methods", () => {
    expect(corsHeaders["Access-Control-Allow-Methods"]).toContain("POST");
    expect(corsHeaders["Access-Control-Allow-Methods"]).toContain("GET");
    expect(corsHeaders["Access-Control-Allow-Methods"]).toContain("OPTIONS");
  });
});

describe("corsResponse()", () => {
  it("returns a Response with status 200", async () => {
    const res = corsResponse();
    expect(res.status).toBe(200);
  });

  it("returns 'ok' as the body", async () => {
    const res = corsResponse();
    expect(await res.text()).toBe("ok");
  });

  it("includes CORS headers", () => {
    const res = corsResponse();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("jsonResponse()", () => {
  it("serialises the body as JSON with status 200 by default", async () => {
    const res = jsonResponse({ message: "hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ message: "hello" });
  });

  it("uses the provided status code", async () => {
    const res = jsonResponse({ message: "not found" }, 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("includes CORS headers", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("handles array bodies", async () => {
    const res = jsonResponse([1, 2, 3]);
    expect(await res.json()).toEqual([1, 2, 3]);
  });

  it("handles null body", async () => {
    const res = jsonResponse(null);
    expect(await res.json()).toBeNull();
  });

  it("serialises nested objects correctly", async () => {
    const payload = { user: { id: "u1", email: "a@b.com" }, ok: true };
    const res = jsonResponse(payload);
    expect(await res.json()).toEqual(payload);
  });
});
