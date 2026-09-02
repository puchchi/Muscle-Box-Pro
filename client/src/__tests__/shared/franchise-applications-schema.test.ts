import { describe, it, expect } from "vitest";
import { parseFranchiseApplicationPage } from "@shared/admin/franchiseApplicationsSchema";
import {
  franchiseTriageFormSchema,
  toFranchiseTriageBody,
  MAX_TRIAGE_NOTE,
} from "@shared/admin/franchiseApplications";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";

/**
 * The boundary check on `GET /admin/franchise-applications`, and the triage form's own rule.
 *
 * `admin-leads-schema.test.ts`'s brief, with the difference that makes this list riskier than that one:
 * every row here is **joined in the handler out of two tables**, field by field, so a rename on either
 * side arrives as a missing key rather than as an error. The cases worth pinning are therefore the ones
 * where rejecting is expensive and the ones where accepting is:
 *
 * - **A tier the program no longer publishes must not fail the list.** The figures on the row are what
 *   the applicant was quoted, not what the current table says, so a retired id is an ordinary row.
 * - **`triage: null` is a status, not a gap.** It is what `new` is made of.
 * - **A missing `applicationId` must fail**, because it is the React key and the id the triage write and
 *   the invite link are both built from.
 */

function accept(payload: unknown) {
  const result = parseFranchiseApplicationPage(payload);
  expect(result.ok, result.ok ? "" : result.issues.join("; ")).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  return result.data;
}

function reject(payload: unknown): string[] {
  const result = parseFranchiseApplicationPage(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

/** The fixture as loose JSON, for the cases that have to break a field. */
function loose(): Record<string, any> {
  return franchiseApplicationPageFixture() as unknown as Record<string, any>;
}

describe("parseFranchiseApplicationPage", () => {
  it("takes the fixture whole, all four statuses", () => {
    const page = accept(franchiseApplicationPageFixture());
    expect(page.applications.map((row) => row.status)).toEqual([
      "new",
      "reviewed",
      "rejected",
      "converted",
    ]);
    expect(page.statuses).toEqual(["new", "reviewed", "rejected", "converted"]);
  });

  it("accepts a tier id the program no longer publishes, with no name beside it", () => {
    // `tier` is a plain string on purpose. The investment on the row is what this applicant was quoted,
    // and an enum would blank the whole list the day a tier is renamed.
    const page = accept(franchiseApplicationPageFixture());
    expect(page.applications[2].tier).toBe("metro");
    expect(page.applications[2].tierName).toBeNull();
  });

  it("accepts a row with no company and no background at all", () => {
    // Absent, not null: both are optional on the public form, so the attribute was never written and the
    // key is simply missing.
    const page = accept(franchiseApplicationPageFixture());
    expect("company" in page.applications[0]).toBe(false);
    expect(page.applications[0].triage).toBeNull();
  });

  it("accepts an empty page, which is what an unworked filter answers with", () => {
    const page = accept({ ...franchiseApplicationPageFixture(), applications: [], scanned: 0 });
    expect(page.applications).toEqual([]);
  });

  it("carries capped through, because it is the only sign the list went short", () => {
    const page = accept({ ...franchiseApplicationPageFixture(), capped: true, scanned: 400 });
    expect(page.capped).toBe(true);
    expect(page.scanned).toBe(400);
  });

  it("rejects a row with no applicationId, naming the row", () => {
    const payload = loose();
    payload.applications[1].applicationId = "";
    expect(reject(payload).join(" ")).toContain("applications.1.applicationId");
  });

  it("rejects a status outside the four the server publishes", () => {
    const payload = loose();
    payload.applications[0].status = "in_review";
    expect(reject(payload).join(" ")).toContain("applications.0.status");
  });

  it("rejects investmentPaise sent as a string, which is how it is stored", () => {
    // The mismatch worth pinning: DynamoDB numbers arrive as strings through a handler that spreads a
    // stored item, and the screen formats this as money.
    const payload = loose();
    payload.applications[0].investmentPaise = "500000000";
    expect(reject(payload).join(" ")).toContain("applications.0.investmentPaise");
  });

  it("rejects a triage row missing franchiseId, since its presence is what makes a row terminal", () => {
    const payload = loose();
    delete payload.applications[3].triage.franchiseId;
    expect(reject(payload).join(" ")).toContain("applications.3.triage.franchiseId");
  });

  it("rejects an empty statuses list rather than rendering no filters", () => {
    expect(reject({ ...franchiseApplicationPageFixture(), statuses: [] }).join(" ")).toContain(
      "statuses",
    );
  });
});

describe("franchiseTriageFormSchema", () => {
  it("takes a review with no note", () => {
    const parsed = franchiseTriageFormSchema.parse({ status: "reviewed", note: "" });
    expect(toFranchiseTriageBody(parsed)).toEqual({ status: "reviewed", note: "" });
  });

  it("refuses a rejection with no note", () => {
    // Nobody is told they were rejected, so this note is the only surviving record of why, and it is
    // what the next person reads when the same applicant enquires again.
    const result = franchiseTriageFormSchema.safeParse({ status: "rejected", note: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["note"]);
  });

  it("refuses a rejection whose note is a shrug", () => {
    expect(franchiseTriageFormSchema.safeParse({ status: "rejected", note: "no" }).success).toBe(
      false,
    );
  });

  it("takes a rejection that says why", () => {
    const parsed = franchiseTriageFormSchema.parse({
      status: "rejected",
      note: "No capital evidence after two asks.",
    });
    expect(parsed.status).toBe("rejected");
  });

  it("refuses converted, which is the server's to write and not ours", () => {
    expect(franchiseTriageFormSchema.safeParse({ status: "converted", note: "" }).success).toBe(
      false,
    );
    expect(franchiseTriageFormSchema.safeParse({ status: "new", note: "" }).success).toBe(false);
  });

  it("trims the note and holds it to the route's own cap", () => {
    expect(franchiseTriageFormSchema.parse({ status: "reviewed", note: "  spoke on 24 Aug  " }).note)
      .toBe("spoke on 24 Aug");
    expect(
      franchiseTriageFormSchema.safeParse({ status: "reviewed", note: "x".repeat(MAX_TRIAGE_NOTE + 1) })
        .success,
    ).toBe(false);
  });
});
