/**
 * Tests for the shared email template functions.
 * These are pure TypeScript functions with no external dependencies.
 */
import { describe, it, expect } from "vitest";
import { getVerificationEmailTemplate } from "@shared/email/verification";
import { getPasswordResetEmailTemplate } from "@shared/email/passwordReset";
import { getContactRequestEmailTemplate } from "@shared/email/contactRequest";
import { getDemoRequestEmailTemplate } from "@shared/email/demoRequest";
import { getCampaignRequestEmailTemplate } from "@shared/email/campaignRequest";

// ─── Verification email ───────────────────────────────────────────────────────
describe("getVerificationEmailTemplate()", () => {
  const url = "https://example.com/verify?token=abc123";

  it("returns the correct subject", () => {
    const { subject } = getVerificationEmailTemplate({ verificationUrl: url });
    expect(subject).toBe("Verify your MuscleBoxPro account");
  });

  it("includes the verification URL in the HTML", () => {
    const { html } = getVerificationEmailTemplate({ verificationUrl: url });
    expect(html).toContain(url);
  });

  it("uses the provided name in the greeting", () => {
    const { html, text } = getVerificationEmailTemplate({ name: "Alice", verificationUrl: url });
    expect(html).toContain("Alice");
    expect(text).toContain("Hi Alice");
  });

  it("falls back to 'there' when name is not provided", () => {
    const { html, text } = getVerificationEmailTemplate({ verificationUrl: url });
    expect(html).toContain("there");
    expect(text).toContain("Hi there");
  });

  it("falls back to 'there' when name is empty string", () => {
    const { html } = getVerificationEmailTemplate({ name: "  ", verificationUrl: url });
    expect(html).toContain("there");
  });

  it("includes a Verify Email button link", () => {
    const { html } = getVerificationEmailTemplate({ verificationUrl: url });
    expect(html).toContain("Verify Email");
    expect(html).toContain(`href="${url}"`);
  });

  it("returns text with the verification URL", () => {
    const { text } = getVerificationEmailTemplate({ verificationUrl: url });
    expect(text).toContain(url);
  });
});

// ─── Password reset email ─────────────────────────────────────────────────────
describe("getPasswordResetEmailTemplate()", () => {
  const url = "https://example.com/reset?token=xyz789";

  it("returns the correct subject", () => {
    const { subject } = getPasswordResetEmailTemplate({ resetUrl: url });
    expect(subject).toBe("Reset your MuscleBoxPro password");
  });

  it("includes the reset URL in the HTML", () => {
    const { html } = getPasswordResetEmailTemplate({ resetUrl: url });
    expect(html).toContain(url);
  });

  it("uses the provided name in the greeting", () => {
    const { html, text } = getPasswordResetEmailTemplate({ name: "Bob", resetUrl: url });
    expect(html).toContain("Bob");
    expect(text).toContain("Hi Bob");
  });

  it("falls back to 'there' when name is absent", () => {
    const { html } = getPasswordResetEmailTemplate({ resetUrl: url });
    expect(html).toContain("there");
  });

  it("includes a Reset Password button link", () => {
    const { html } = getPasswordResetEmailTemplate({ resetUrl: url });
    expect(html).toContain("Reset Password");
    expect(html).toContain(`href="${url}"`);
  });

  it("returns text mentioning the reset link", () => {
    const { text } = getPasswordResetEmailTemplate({ resetUrl: url });
    expect(text).toContain(url);
    expect(text).toContain("reset");
  });
});

// ─── Contact request email ────────────────────────────────────────────────────
describe("getContactRequestEmailTemplate()", () => {
  const input = { name: "Alice", email: "alice@example.com", message: "I have a question." };

  it("returns the correct subject", () => {
    const { subject } = getContactRequestEmailTemplate(input);
    expect(subject).toBe("We received your message - MuscleBoxPro");
  });

  it("includes the name in the HTML", () => {
    const { html } = getContactRequestEmailTemplate(input);
    expect(html).toContain("Alice");
  });

  it("includes the email in the HTML", () => {
    const { html } = getContactRequestEmailTemplate(input);
    expect(html).toContain("alice@example.com");
  });

  it("includes the message in the HTML", () => {
    const { html } = getContactRequestEmailTemplate(input);
    expect(html).toContain("I have a question.");
  });

  it("returns text with all contact details", () => {
    const { text } = getContactRequestEmailTemplate(input);
    expect(text).toContain("Alice");
    expect(text).toContain("alice@example.com");
    expect(text).toContain("I have a question.");
  });

  it("returns valid HTML structure", () => {
    const { html } = getContactRequestEmailTemplate(input);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });
});

// ─── Demo request email ───────────────────────────────────────────────────────
describe("getDemoRequestEmailTemplate()", () => {
  const input = {
    name: "Raj",
    gymName: "Iron Palace",
    email: "raj@gym.com",
    mobile: "9876543210",
    location: "Mumbai",
  };

  it("returns the correct subject", () => {
    const { subject } = getDemoRequestEmailTemplate(input);
    expect(subject).toBe("Your MuscleBoxPro demo request is received");
  });

  it("includes name and gym name in the HTML", () => {
    const { html } = getDemoRequestEmailTemplate(input);
    expect(html).toContain("Raj");
    expect(html).toContain("Iron Palace");
  });

  it("includes location and mobile in the HTML", () => {
    const { html } = getDemoRequestEmailTemplate(input);
    expect(html).toContain("Mumbai");
    expect(html).toContain("9876543210");
  });

  it("omits message section when message is not provided", () => {
    const { html } = getDemoRequestEmailTemplate(input);
    expect(html).not.toContain("<strong>Message:");
  });

  it("includes message in HTML when provided", () => {
    const { html } = getDemoRequestEmailTemplate({ ...input, message: "Best time: 3pm" });
    expect(html).toContain("Best time: 3pm");
  });

  it("returns text with key fields", () => {
    const { text } = getDemoRequestEmailTemplate(input);
    expect(text).toContain("Iron Palace");
    expect(text).toContain("Mumbai");
  });

  it("filters empty lines from text when message is absent", () => {
    const { text } = getDemoRequestEmailTemplate(input);
    // .filter(Boolean) removes empty message line
    expect(text).not.toMatch(/Message:/);
  });
});

// ─── Campaign request email ───────────────────────────────────────────────────
describe("getCampaignRequestEmailTemplate()", () => {
  const input = { brandName: "FitBrand", email: "ads@fitbrand.com", mobile: "9876543210" };

  it("returns the correct subject", () => {
    const { subject } = getCampaignRequestEmailTemplate(input);
    expect(subject).toBe("Your MuscleBoxPro campaign inquiry is received");
  });

  it("includes brand name in the HTML", () => {
    const { html } = getCampaignRequestEmailTemplate(input);
    expect(html).toContain("FitBrand");
  });

  it("includes work email in the HTML", () => {
    const { html } = getCampaignRequestEmailTemplate(input);
    expect(html).toContain("ads@fitbrand.com");
  });

  it("includes mobile in the HTML", () => {
    const { html } = getCampaignRequestEmailTemplate(input);
    expect(html).toContain("9876543210");
  });

  it("returns text with all campaign details", () => {
    const { text } = getCampaignRequestEmailTemplate(input);
    expect(text).toContain("FitBrand");
    expect(text).toContain("ads@fitbrand.com");
    expect(text).toContain("9876543210");
  });

  it("greets using brand name team in text", () => {
    const { text } = getCampaignRequestEmailTemplate(input);
    expect(text).toContain("Hi FitBrand team");
  });
});
