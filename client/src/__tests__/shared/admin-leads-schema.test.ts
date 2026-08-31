import { describe, it, expect } from "vitest";
import { parseLeadPage } from "@shared/admin/leadsSchema";
import type { Lead, LeadKind } from "@shared/admin/leads";

/**
 * The boundary check on `GET /admin/leads/{kind}`.
 *
 * What makes this worth a file is that one route is now assembled by two different mappings in
 * mbp-backend: `providers/supabaseLeads.ts` for demo and campaign, `domain/leads.ts` for investor
 * since the form moved to DynamoDB on 2026-08-31. Six of the ten fields are legitimately `null`, so
 * a renamed field mostly cannot be told apart from an unanswered one, and the failures worth pinning
 * are the two coarse ones at either end:
 *
 * - **A row that is not a row.** `id` is the React key, so duplicate empty ids silently render the
 *   wrong rows; `email` is the only thing the panel exists to hand back to a human.
 * - **Rejecting a true response**, which is the more expensive direction. An investor enquiry with no
 *   firm, no type and no message is one real row of the nineteen that migrated, and a campaign
 *   enquiry is nothing but a brand name and an address. Both parse, and each says so here.
 */

function investorLead(overrides: Partial<Lead> = {}): Record<string, unknown> {
  return {
    id: "3f1c9e0a-0000-4000-8000-000000000001",
    kind: "investor",
    name: "Rahul Sharma",
    email: "rahul@fund.com",
    phone: null,
    createdAt: "2026-08-31T06:21:00.000Z",
    organisation: "Acme Capital",
    location: null,
    investorType: "Family Office",
    message: "Interested in the ad revenue.",
    reference: "MBP-IN-a1b2c3d4e5",
    ...overrides,
  };
}

function page(leads: Record<string, unknown>[], over: Record<string, unknown> = {}) {
  return { kind: "investor", kinds: ["demo", "campaign", "investor"], leads, total: leads.length, ...over };
}

function reject(payload: unknown): string[] {
  const result = parseLeadPage(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function accept(payload: unknown) {
  const result = parseLeadPage(payload);
  // The issues, not just `false`, so a failure here says which field moved.
  expect(result.ok, result.ok ? "" : result.issues.join("; ")).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  return result.data;
}

describe("parseLeadPage", () => {
  it("carries the investor reference through, since it is the string the enquirer was given", () => {
    const parsed = accept(page([investorLead()]));
    expect(parsed.leads[0]?.reference).toBe("MBP-IN-a1b2c3d4e5");
  });

  /*
   * The two Supabase kinds send an explicit `null` rather than omitting the field, so a `null`
   * reference is the normal case on two of the three tabs.
   */
  it("accepts a null reference, which is what demo and campaign rows carry", () => {
    const demo = investorLead({ kind: "demo", phone: "9876543210", location: "Indore", reference: null });
    expect(accept(page([demo], { kind: "demo" })).leads[0]?.reference).toBeNull();
  });

  /*
   * Required-but-nullable is a deliberate choice over optional: every backend that has this field
   * sends it for all three kinds, so an absent one means the API is older than the frontend calling
   * `POST /investor/enquiries`. That is worth failing on rather than rendering as a blank cell.
   */
  it("rejects a row with no reference field at all", () => {
    const { reference: _omitted, ...withoutReference } = investorLead();
    expect(reject(page([withoutReference]))).toContainEqual(expect.stringContaining("reference"));
  });

  it("rejects a row with no usable id or email, which are the two the panel cannot render without", () => {
    expect(reject(page([investorLead({ id: "" })]))).toContainEqual(expect.stringContaining("id"));
    expect(reject(page([investorLead({ email: "" })]))).toContainEqual(expect.stringContaining("email"));
  });

  it("accepts an investor enquiry that answered nothing optional", () => {
    const bare = investorLead({ organisation: null, investorType: null, message: null });
    const parsed = accept(page([bare]));
    expect(parsed.leads[0]?.organisation).toBeNull();
    expect(parsed.leads[0]?.reference).toBe("MBP-IN-a1b2c3d4e5");
  });

  /*
   * DynamoDB can only report a total when the page turned out to be the whole collection, so `null`
   * is a real answer and not a malformed one.
   */
  it("accepts a null total", () => {
    expect(accept(page([investorLead()], { total: null })).total).toBeNull();
  });

  it("rejects an empty kinds list, which would leave the panel with no tabs", () => {
    expect(reject(page([investorLead()], { kinds: [] })).length).toBeGreaterThan(0);
  });

  it("rejects a kind the panel has no column layout for", () => {
    const kinds: LeadKind[] = ["demo", "campaign", "investor"];
    expect(kinds).not.toContain("franchise");
    expect(reject(page([investorLead({ kind: "franchise" as LeadKind })])).length).toBeGreaterThan(0);
  });
});
