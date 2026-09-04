import { describe, it, expect } from "vitest";
import {
  franchisePortalSnapshotSchema,
  parseFranchisePortalSnapshot,
} from "@shared/franchise/portalSchema";
import type { FranchisePortalSnapshot, UnbuiltSection } from "@shared/franchise/portal";

/**
 * The boundary check on `GET /franchise/portal`.
 *
 * Written from the direction of harm, like `gym-portal-schema.test.ts`: for each field, what
 * does `FranchiseDashboard` actually *do* with a bad value? A float in `receivedPaise` formats
 * as a plausible ₹12,49,500 that reconciles against nothing. An unlisted `docType` or `signType`
 * indexes a label map and renders `undefined` on a page about somebody's ₹12,50,000. An empty
 * `refusal` renders the amber "we couldn't confirm this" panel with no reason inside it, which
 * is the one state on the page a franchisee has to act on.
 *
 * **The valid snapshot is built here rather than imported.** There is deliberately no franchise
 * portal fixture: a demo dashboard that looks exactly like a real one is how a screenshot of
 * made-up money ends up in a deck (`client/src/lib/franchisePortalApi.ts`). So this file owns
 * one, and it is a test fixture with no route to a screen.
 */

const ABSENT = { available: false, reason: "not_implemented" } as const satisfies UnbuiltSection;

function valid(): FranchisePortalSnapshot {
  return structuredClone({
    franchiseId: "FR-0001",
    franchiseDisplayName: "MuscleBoxPro South Delhi",
    onboardingStatus: "payment_verified",
    user: { email: "owner@southdelhi.in", role: "franchise_owner" },

    terms: {
      tier: "territory",
      investmentPaise: 250_000_000,
      machineAllocation: 25,
      paymentSchedule: [
        { pct: 50, trigger: "On signing" },
        { pct: 50, trigger: "Before dispatch" },
      ],
      capitalRecoveryPaise: 295_000_000,
      proteinSharePctDuringRecovery: 100,
      proteinSharePctAfterRecovery: 50,
      advertisingFranchiseeSharePct: 25,
      advertisingMbpSharePct: 75,
    },
    territory: {
      territory: "South Delhi",
      territoryBoundary: "The districts of South Delhi and South East Delhi.",
      decidedAt: "2026-07-14T09:12:00.000Z",
    },
    operations: {
      warehouseNotIdentified: false,
      warehouseAddress: "Plot 14, Okhla Phase II, New Delhi 110020",
      warehouseAreaSqft: 1_800,
      temperatureControl: "yes",
      operationsContactName: "Ravi Menon",
      operationsContactPhone: "9810012345",
      deploymentPlan: "Ten machines into gyms in the first quarter, the rest by month nine.",
      logisticsArrangement: "contracted",
    },
    documents: [
      {
        docId: "DOC-1",
        docType: "pan_card",
        fileName: "pan.pdf",
        sizeBytes: 84_213,
        contentType: "application/pdf",
        uploadedAt: "2026-07-02T11:04:00.000Z",
      },
    ],
    payments: [
      {
        instalment: 1,
        expectedPaise: 125_000_000,
        claim: {
          utr: "SBIN226001234567",
          amountPaise: 125_000_000,
          paidOn: "2026-08-11",
          proofDocId: "DOC-2",
          claimedAt: "2026-08-11T05:20:00.000Z",
        },
        receivedPaise: 124_950_000,
        verifiedAt: "2026-08-12T07:45:00.000Z",
        refusal: null,
      },
    ],
    agreement: {
      version: "1.0",
      effectiveDate: "2026-08-01",
      validUntil: "2026-10-30",
      contentHash: "a".repeat(64),
      signedAt: "2026-08-01T10:30:00.000Z",
      signerName: "Ravi Menon",
      signType: "aadhaar",
    },

    sales: ABSENT,
    consumption: ABSENT,
    costs: ABSENT,
    advertising: ABSENT,
    profit: ABSENT,
    payouts: ABSENT,
    capitalRecoveryProgress: ABSENT,
    machines: ABSENT,
    statements: ABSENT,
    alerts: ABSENT,

    asOf: "2026-09-03T04:15:00.000Z",
  });
}

/** The paths that failed, for asserting *why* a response was rejected. */
function reject(payload: unknown): string[] {
  const result = parseFranchisePortalSnapshot(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function firstPayment(snapshot: FranchisePortalSnapshot) {
  const payment = snapshot.payments[0];
  if (!payment) throw new Error("expected the snapshot under test to carry an instalment");
  return payment;
}

describe("the franchise portal response boundary", () => {
  it("accepts a full response", () => {
    const snapshot = valid();
    expect(parseFranchisePortalSnapshot(snapshot)).toEqual({ ok: true, snapshot });
  });

  it("accepts the sparsest real response", () => {
    // A franchise whose login exists and whose record holds nothing else yet. Every one of
    // these nulls is a window the record genuinely passes through, and a schema that rejected
    // them would blank a working dashboard.
    const snapshot: FranchisePortalSnapshot = {
      ...valid(),
      territory: null,
      operations: null,
      documents: [],
      payments: [],
      agreement: null,
    };
    expect(parseFranchisePortalSnapshot(snapshot).ok).toBe(true);
  });

  it("rejects a response that is not an object at all", () => {
    for (const payload of [null, undefined, "", 0, [], "ok"]) {
      expect(parseFranchisePortalSnapshot(payload).ok).toBe(false);
    }
  });

  it("reports every problem at once, with the path to each", () => {
    const issues = reject({ ...valid(), franchiseDisplayName: "", asOf: "yesterday" });
    expect(issues).toHaveLength(2);
    expect(issues.some((issue) => issue.startsWith("franchiseDisplayName:"))).toBe(true);
    expect(issues.some((issue) => issue.startsWith("asOf:"))).toBe(true);
  });

  // ── Money ─────────────────────────────────────────────────────────────────

  describe("amounts that get reconciled against a bank transfer", () => {
    it.each([
      ["a float", 124_950_000.5],
      ["a numeric string", "124950000"],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["negative", -1],
    ])("rejects a received amount sent as %s", (_label, value) => {
      const snapshot = valid();
      (firstPayment(snapshot) as Record<string, unknown>).receivedPaise = value;
      expect(reject(snapshot)[0]).toMatch(/^payments.0.receivedPaise:/);
    });

    it("rejects a fractional investment", () => {
      const snapshot = valid();
      // Renders as a plausible ₹25,00,000 and reconciles against nothing.
      snapshot.terms.investmentPaise = 250_000_000.0001;
      expect(reject(snapshot)[0]).toMatch(/^terms.investmentPaise:/);
    });

    it("keeps a short transfer, which is a real state", () => {
      const snapshot = valid();
      // A bank that deducted charges. The record's job is to make the shortfall visible, and
      // the dashboard shows both figures for exactly this case.
      firstPayment(snapshot).receivedPaise = 124_950_000;
      expect(parseFranchisePortalSnapshot(snapshot).ok).toBe(true);
    });

    it("keeps an overpayment too", () => {
      const snapshot = valid();
      firstPayment(snapshot).receivedPaise = 125_100_000;
      expect(parseFranchisePortalSnapshot(snapshot).ok).toBe(true);
    });

    it("rejects a share outside 0 to 100", () => {
      const snapshot = valid();
      snapshot.terms.proteinSharePctAfterRecovery = 150;
      expect(reject(snapshot)[0]).toMatch(/^terms.proteinSharePctAfterRecovery:/);
    });
  });

  // ── Null as an answer ─────────────────────────────────────────────────────

  describe("terms the definitive agreement is left to settle", () => {
    it("accepts a null recovery threshold and a null schedule", () => {
      const snapshot = valid();
      // Both are null where the program document leaves them to the agreement. The dashboard
      // reads "Set in your agreement" and "As agreed in writing" off exactly this.
      snapshot.terms.capitalRecoveryPaise = null;
      snapshot.terms.paymentSchedule = null;
      const result = parseFranchisePortalSnapshot(snapshot);
      expect(result.ok && result.snapshot.terms.capitalRecoveryPaise).toBeNull();
    });

    it("rejects a terms row with the recovery threshold missing entirely", () => {
      const snapshot = valid();
      // Null is an answer; an absent key is a record that never had one, and defaulting it
      // would print a Territory figure to a City franchisee.
      delete (snapshot.terms as Partial<FranchisePortalSnapshot["terms"]>).capitalRecoveryPaise;
      expect(reject(snapshot)).toEqual(["terms.capitalRecoveryPaise: Required"]);
    });
  });

  // ── Values that index a label map ─────────────────────────────────────────

  describe("values the dashboard looks up rather than prints", () => {
    it("rejects an unknown onboarding status", () => {
      const snapshot = valid();
      (snapshot as Record<string, unknown>).onboardingStatus = "renewing";
      // Indexes `STATUS_LABEL` and `STATUS_TONE`, so an unlisted rung renders an empty pill
      // with no dot.
      expect(reject(snapshot)[0]).toMatch(/^onboardingStatus:/);
    });

    it("rejects an unknown document type", () => {
      const snapshot = valid();
      (snapshot.documents[0] as Record<string, unknown>).docType = "gst_certificate";
      expect(reject(snapshot)[0]).toMatch(/^documents.0.docType:/);
    });

    it("rejects an unknown signature type", () => {
      const snapshot = valid();
      (snapshot.agreement as Record<string, unknown>).signType = "wet_ink";
      expect(reject(snapshot)[0]).toMatch(/^agreement.signType:/);
    });

    it("rejects an unknown logistics arrangement", () => {
      const snapshot = valid();
      (snapshot.operations as Record<string, unknown>).logisticsArrangement = "third_party";
      expect(reject(snapshot)[0]).toMatch(/^operations.logisticsArrangement:/);
    });

    it("accepts an unanswered temperature question, which is its own value", () => {
      const snapshot = valid();
      // `""` means the question was never put, because there is no warehouse to ask it about.
      // Not the same as "no", and the card says so.
      snapshot.operations = { ...snapshot.operations!, temperatureControl: "" };
      expect(parseFranchisePortalSnapshot(snapshot).ok).toBe(true);
    });
  });

  // ── Dates, references and the refusal ─────────────────────────────────────

  describe("dates and references", () => {
    it("rejects a date where the wire carries a timestamp", () => {
      const snapshot = valid();
      // `verifiedAt` is formatted in IST. A date-only value has no instant to place in a
      // timezone, so "confirmed on" would be off by a day for anything after 05:30.
      firstPayment(snapshot).verifiedAt = "2026-08-12";
      expect(reject(snapshot)[0]).toMatch(/^payments.0.verifiedAt:/);
    });

    it("rejects a timestamp where the wire carries a date", () => {
      const snapshot = valid();
      // `paidOn` goes through `formatAgreementDate`, which formats in UTC: fed a timestamp,
      // a transfer at 01:00 IST prints as the previous day.
      firstPayment(snapshot).claim!.paidOn = "2026-08-11T05:20:00.000Z";
      expect(reject(snapshot)[0]).toMatch(/^payments.0.claim.paidOn:/);
    });

    it.each([
      ["too short", "3f9a1c7e"],
      ["65 characters", "a".repeat(65)],
      ["upper case", "A".repeat(64)],
      ["not hex", "z".repeat(64)],
    ])("rejects an agreement reference that is %s", (_label, value) => {
      const snapshot = valid();
      (snapshot.agreement as Record<string, unknown>).contentHash = value;
      // The card shows the first twelve characters so a franchisee can match them against
      // their emailed copy. A malformed digest renders as a reference that matches nothing,
      // which defeats the only thing it is for.
      expect(reject(snapshot)[0]).toMatch(/^agreement.contentHash:/);
    });

    it("rejects an empty refusal", () => {
      const snapshot = valid();
      // Null is "not refused". An empty string renders the amber panel and its "What we
      // found" label with nothing under it, on the one row a franchisee has to act on.
      firstPayment(snapshot).refusal = "";
      expect(reject(snapshot)[0]).toMatch(/^payments.0.refusal:/);
    });

    it("rejects an instalment numbered from zero", () => {
      const snapshot = valid();
      // The schedule is 1-based and the number is rendered as "Instalment 0".
      firstPayment(snapshot).instalment = 0;
      expect(reject(snapshot)[0]).toMatch(/^payments.0.instalment:/);
    });
  });

  // ── The ten sections that have no pipeline ────────────────────────────────

  describe("sections that cannot have data yet", () => {
    it("rejects one that arrives available", () => {
      const snapshot = valid();
      (snapshot as Record<string, unknown>).payouts = {
        available: true,
        data: { totalPaise: 0 },
      };
      // The shape the first version of a settlement endpoint produces. Left to pass, the
      // dashboard would drop a section it has no card for and a franchisee would be none the
      // wiser; failing loudly is what forces the type and the card to be written together.
      expect(reject(snapshot).length).toBeGreaterThan(0);
    });

    it("accepts a section that is built but has nothing for this franchise", () => {
      const snapshot = valid();
      // Different fact, different words: the panel reads "None yet" rather than "Coming".
      snapshot.statements = { available: false, reason: "no_data_yet" };
      const result = parseFranchisePortalSnapshot(snapshot);
      expect(result.ok && result.snapshot.statements).toEqual({
        available: false,
        reason: "no_data_yet",
      });
    });

    it("rejects an absence with a reason nothing on screen knows how to phrase", () => {
      const snapshot = valid();
      (snapshot as Record<string, unknown>).sales = { available: false, reason: "maintenance" };
      expect(reject(snapshot)[0]).toMatch(/^sales.reason:/);
    });

    it("rejects a section with no discriminant at all", () => {
      const snapshot = valid();
      // The payload, unwrapped.
      (snapshot as Record<string, unknown>).alerts = [];
      expect(reject(snapshot).length).toBeGreaterThan(0);
    });
  });

  it("ignores fields it does not know about rather than failing", () => {
    // A forwards-compatible response is the normal case during a deploy, not an error.
    const result = franchisePortalSnapshotSchema.safeParse({
      ...valid(),
      payoutAccount: { ifsc: "HDFC0000123" },
    });
    expect(result.success).toBe(true);
    expect(result.success && "payoutAccount" in result.data).toBe(false);
  });
});
