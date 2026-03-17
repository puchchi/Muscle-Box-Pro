/**
 * Tests for the shared Zod validation schemas used by the Supabase edge functions.
 * These live in /shared/validation/ and are plain Node-compatible TypeScript.
 */
import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/validation/auth";
import { demoRequestSchema } from "@shared/validation/demo";
import { campaignRequestSchema } from "@shared/validation/campaign";
import { contactRequestSchema } from "@shared/validation/contact";

// ─── signUpSchema ─────────────────────────────────────────────────────────────
describe("signUpSchema", () => {
  const valid = {
    name: "John Doe",
    email: "john@example.com",
    password: "secret123",
  };

  it("accepts a valid signup payload", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional mobile and gymName", () => {
    expect(
      signUpSchema.safeParse({ ...valid, mobile: "9876543210", gymName: "Power Gym" }).success
    ).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signUpSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/2 characters/i);
  });

  it("rejects invalid email", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/email/i);
  });

  it("rejects password shorter than 6 characters", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "abc" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/6 characters/i);
  });

  it("rejects missing name", () => {
    const { name: _n, ...noName } = valid;
    expect(signUpSchema.safeParse(noName).success).toBe(false);
  });

  it("rejects missing email", () => {
    const { email: _e, ...noEmail } = valid;
    expect(signUpSchema.safeParse(noEmail).success).toBe(false);
  });
});

// ─── signInSchema ─────────────────────────────────────────────────────────────
describe("signInSchema", () => {
  const valid = { email: "user@example.com", password: "secret123" };

  it("accepts valid credentials", () => {
    expect(signInSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({ ...valid, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signInSchema.safeParse({ ...valid, password: "ab" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/6 characters/i);
  });

  it("rejects empty payload", () => {
    expect(signInSchema.safeParse({}).success).toBe(false);
  });
});

// ─── resendVerificationSchema ─────────────────────────────────────────────────
describe("resendVerificationSchema", () => {
  it("accepts a valid email", () => {
    expect(resendVerificationSchema.safeParse({ email: "u@e.com" }).success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = resendVerificationSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = resendVerificationSchema.safeParse({ email: "not-valid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing email field", () => {
    expect(resendVerificationSchema.safeParse({}).success).toBe(false);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────
describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "reset@example.com" }).success).toBe(true);
  });

  it("rejects empty email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(forgotPasswordSchema.safeParse({ email: "notanemail" }).success).toBe(false);
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────
describe("resetPasswordSchema", () => {
  const valid = { token: "abc123token", password: "newpass1" };

  it("accepts valid token and password", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty token", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, token: "" }).success).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, password: "abc" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/6 characters/i);
  });

  it("rejects missing token", () => {
    const { token: _t, ...noToken } = valid;
    expect(resetPasswordSchema.safeParse(noToken).success).toBe(false);
  });
});

// ─── demoRequestSchema ────────────────────────────────────────────────────────
describe("demoRequestSchema", () => {
  const valid = {
    name: "John Smith",
    gymName: "Power Gym",
    email: "john@gym.com",
    mobile: "9876543210",
    location: "Delhi",
  };

  it("accepts a fully valid demo request", () => {
    expect(demoRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional message", () => {
    expect(
      demoRequestSchema.safeParse({ ...valid, message: "Looking forward to the demo!" }).success
    ).toBe(true);
  });

  it("accepts without message (optional)", () => {
    expect(demoRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = demoRequestSchema.safeParse({ ...valid, name: "J" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/name is required/i);
  });

  it("rejects gymName shorter than 2 characters", () => {
    const result = demoRequestSchema.safeParse({ ...valid, gymName: "G" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/gym name is required/i);
  });

  it("rejects invalid email", () => {
    const result = demoRequestSchema.safeParse({ ...valid, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects mobile shorter than 10 digits", () => {
    const result = demoRequestSchema.safeParse({ ...valid, mobile: "12345" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/valid mobile number/i);
  });

  it("rejects location shorter than 2 characters", () => {
    const result = demoRequestSchema.safeParse({ ...valid, location: "X" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/location is required/i);
  });

  it("rejects empty payload", () => {
    expect(demoRequestSchema.safeParse({}).success).toBe(false);
  });
});

// ─── campaignRequestSchema ────────────────────────────────────────────────────
describe("campaignRequestSchema", () => {
  const valid = {
    brandName: "FitBrand",
    email: "ads@fitbrand.com",
    mobile: "9876543210",
  };

  it("accepts a valid campaign request", () => {
    expect(campaignRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects brandName shorter than 2 characters", () => {
    const result = campaignRequestSchema.safeParse({ ...valid, brandName: "F" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/brand name is required/i);
  });

  it("rejects invalid email", () => {
    const result = campaignRequestSchema.safeParse({ ...valid, email: "notvalid" });
    expect(result.success).toBe(false);
  });

  it("rejects mobile shorter than 10 digits", () => {
    const result = campaignRequestSchema.safeParse({ ...valid, mobile: "123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/valid mobile number/i);
  });

  it("rejects empty payload", () => {
    expect(campaignRequestSchema.safeParse({}).success).toBe(false);
  });
});

// ─── contactRequestSchema ─────────────────────────────────────────────────────
describe("contactRequestSchema", () => {
  const valid = {
    name: "Alice",
    email: "alice@example.com",
    message: "Hello there, I have a question.",
  };

  it("accepts a valid contact request", () => {
    expect(contactRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = contactRequestSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/name is required/i);
  });

  it("rejects invalid email", () => {
    const result = contactRequestSchema.safeParse({ ...valid, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects message shorter than 5 characters", () => {
    const result = contactRequestSchema.safeParse({ ...valid, message: "Hi" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/message is required/i);
  });

  it("rejects empty payload", () => {
    expect(contactRequestSchema.safeParse({}).success).toBe(false);
  });
});
