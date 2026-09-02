import { describe, it, expect } from "vitest";
import {
  inviteHrefForApplication,
  invitePrefillFrom,
} from "@/pages/admin/franchiseInviteLink";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";

/**
 * The contract between the enquiry list and the invite form.
 *
 * Worth its own file because both halves are silent when they disagree: a renamed parameter does not
 * throw, it opens a blank form and an admin retypes what we already knew. The two properties pinned
 * here are the ones that would cost something real:
 *
 * - **The legal entity name never crosses.** It is what the term sheet identifies its counterparty by
 *   and what Leegality binds a signature against, so it is typed deliberately or not at all.
 * - **A tier id the program no longer publishes does not select commercials.** The two prefilled
 *   figures come from the tier, and an unknown one falling through would put a franchise on numbers
 *   from nowhere.
 */

const APPLICATION = franchiseApplicationPageFixture().applications[1];

function prefillFor(row = APPLICATION) {
  const href = inviteHrefForApplication(row);
  return { href, ...invitePrefillFrom(new URLSearchParams(href.split("?")[1])) };
}

describe("inviteHrefForApplication", () => {
  it("points at the invite form and carries the application id", () => {
    const href = inviteHrefForApplication(APPLICATION);
    expect(href.startsWith("/admin/franchises/new?")).toBe(true);
    expect(new URLSearchParams(href.split("?")[1]).get("application")).toBe(
      APPLICATION.applicationId,
    );
  });

  it("escapes an email and a plus-prefixed phone rather than emitting them raw", () => {
    // `+919632440118` through a bare template string would arrive as a space.
    const href = inviteHrefForApplication(APPLICATION);
    expect(href).toContain("phone=%2B919632440118");
    expect(href).toContain("email=vikram%40shettyfitness.in");
  });

  it("omits company entirely when the applicant left it blank", () => {
    const href = inviteHrefForApplication({ ...APPLICATION, company: "   " });
    expect(new URLSearchParams(href.split("?")[1]).has("company")).toBe(false);
  });

  it("never carries a legal entity name", () => {
    const params = new URLSearchParams(inviteHrefForApplication(APPLICATION).split("?")[1]);
    expect([...params.keys()]).toEqual(["application", "email", "phone", "tier", "applicant", "company"]);
  });
});

describe("invitePrefillFrom", () => {
  it("round-trips the three fields the form may hold", () => {
    const { defaults } = prefillFor();
    expect(defaults.sourceApplicationId).toBe(APPLICATION.applicationId);
    expect(defaults.noticesEmail).toBe("vikram@shettyfitness.in");
    expect(defaults.noticesPhone).toBe("+919632440118");
  });

  it("leaves the legal entity name empty and puts the answers beside it instead", () => {
    const { defaults, source } = prefillFor();
    expect(defaults.legalEntityName).toBe("");
    expect(defaults.tradeName).toBe("");
    expect(source?.applicantName).toBe("Vikram Shetty");
    expect(source?.company).toBe("Shetty Fitness Ventures");
  });

  it("selects the tier's own commercials when the tier is one we publish", () => {
    const city = franchiseApplicationPageFixture().applications[0];
    const { defaults } = prefillFor(city);
    expect(defaults.tier).toBe("city");
    expect(defaults.investmentInr).toBe(50_00_000);
    expect(defaults.machineAllocation).toBe(10);
  });

  it("falls back to Territory for a tier the program no longer publishes", () => {
    // The application still carries what that applicant was quoted, but this form's two figures come
    // from the live table, and a retired id must not put a franchise on numbers from nowhere.
    const retired = franchiseApplicationPageFixture().applications[2];
    const { defaults } = prefillFor(retired);
    expect(defaults.tier).toBe("territory");
    expect(defaults.investmentInr).toBe(25_00_000);
  });

  it("reports company as null when the applicant gave none", () => {
    const { source } = prefillFor({ ...APPLICATION, company: undefined });
    expect(source?.company).toBeNull();
  });

  it("is a blank Territory invite when there are no parameters at all", () => {
    const { defaults, source } = invitePrefillFrom(null);
    expect(source).toBeNull();
    expect(defaults.tier).toBe("territory");
    expect(defaults.sourceApplicationId).toBe("");
    expect(defaults.noticesEmail).toBe("");
  });

  it("ignores every other parameter when the application id is missing", () => {
    // A hand-edited or truncated URL must not half-prefill a form whose `sourceApplicationId` is empty,
    // which would create a franchise that looks converted and is counted twice.
    const { defaults, source } = invitePrefillFrom(
      new URLSearchParams({ email: "someone@example.com", tier: "city", applicant: "Someone" }),
    );
    expect(source).toBeNull();
    expect(defaults.noticesEmail).toBe("");
    expect(defaults.tier).toBe("territory");
  });
});
