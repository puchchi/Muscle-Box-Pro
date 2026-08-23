import { describe, it, expect } from "vitest";
import { DEMO_GYM_PORTAL, PARTIAL_GYM_PORTAL } from "@shared/gym/fixtures";
import {
  gymPortalSnapshotSchema,
  parseGymPortalSnapshot,
} from "@shared/gym/portalSchema";
import type { GymPortalSnapshot, Statement, TradingFigures } from "@shared/gym/portal";

/**
 * The boundary check on the reporting endpoint's response (§15, build item 11).
 *
 * These tests are written from the direction of harm, not of coverage: for each field,
 * what does the dashboard actually *do* with a bad value? A cup count that is a string
 * becomes a per-cup average and then a plausible wrong price. A `javascript:` URL
 * becomes script execution on a page holding a Supabase session. A missing
 * `electricityInr` becomes the literal text "₹NaN" beside a gym owner's payout, because
 * `statementTotalInr` adds it directly and never passes it through `compute.ts`.
 *
 * Where a value is *legitimately* surprising — negative lifetime profit, a zero
 * early-termination charge, `paid` with no receipt yet — it has a test saying so, since
 * the expensive failure of a validator is the one that rejects a true response.
 */

/** A deep clone so a mutation in one test cannot reach another. */
function valid(): GymPortalSnapshot {
  return structuredClone(DEMO_GYM_PORTAL);
}

/**
 * Reach inside the two `PortalSection` wrappers a test wants to corrupt.
 *
 * These throw rather than returning a default. A test that mutates a field which is not
 * there proves nothing while still passing, and `DEMO_GYM_PORTAL` reporting every section
 * is a precondition of most of the assertions below — so it is worth failing loudly if
 * that ever changes.
 */
function salesOf(snapshot: GymPortalSnapshot): TradingFigures {
  if (!snapshot.sales.available) throw new Error("expected the fixture to report trading figures");
  return snapshot.sales.data;
}

function statementsOf(snapshot: GymPortalSnapshot): Statement[] {
  if (!snapshot.statements.available) throw new Error("expected the fixture to report statements");
  return snapshot.statements.data;
}

/** The paths that failed, for asserting *why* a response was rejected. */
function reject(payload: unknown): string[] {
  const result = parseGymPortalSnapshot(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

describe("the reporting response boundary", () => {
  it("accepts the fixture", () => {
    // Not a formality. The fixture is what the dashboard renders until the endpoint
    // exists, and it is typed as the endpoint's response — so if it cannot pass this,
    // either the fixture is lying about the shape or the schema is wrong about it.
    // First run of this test found the fixture's `contentHash` was 65 characters.
    const result = parseGymPortalSnapshot(valid());
    expect(result).toEqual({ ok: true, snapshot: DEMO_GYM_PORTAL });
  });

  it("rejects a response that is not an object at all", () => {
    for (const payload of [null, undefined, "", 0, [], "ok"]) {
      expect(parseGymPortalSnapshot(payload).ok).toBe(false);
    }
  });

  it("reports every problem at once, with the path to each", () => {
    const issues = reject({
      ...valid(),
      gymDisplayName: "",
      asOf: "yesterday",
    });
    // One round trip should tell us everything wrong with a response. Reporting the
    // first failure only turns a schema mismatch into a sequence of deploys.
    expect(issues).toHaveLength(2);
    expect(issues.some((issue) => issue.startsWith("gymDisplayName:"))).toBe(true);
    expect(issues.some((issue) => issue.startsWith("asOf:"))).toBe(true);
  });

  // ── The ₹NaN class ────────────────────────────────────────────────────────

  describe("figures that would render as ₹NaN or a wrong number", () => {
    it("rejects a missing statement figure", () => {
      const snapshot = valid();
      // `statementTotalInr` is `gymPayoutInr + electricityInr` with nothing in between,
      // and `formatInr(NaN)` is the string "₹NaN".
      delete (statementsOf(snapshot)[0] as Partial<Statement>).electricityInr;
      expect(reject(snapshot)).toEqual(["statements.data.0.electricityInr: Required"]);
    });

    it.each([
      ["a numeric string", "31200"],
      ["null", null],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
    ])("rejects gross sales sent as %s", (_label, value) => {
      const snapshot = valid();
      (salesOf(snapshot).currentPeriod as Record<string, unknown>).grossExTaxInr = value;
      expect(reject(snapshot)[0]).toMatch(/^sales.data.currentPeriod.grossExTaxInr:/);
    });

    it("rejects a fractional cup count", () => {
      const snapshot = valid();
      // 260.5 cups divides into gross to produce an average selling price that is
      // wrong but entirely believable.
      salesOf(snapshot).currentPeriod.paidCups = 260.5;
      expect(reject(snapshot)[0]).toMatch(/^sales.data.currentPeriod.paidCups:/);
    });

    it("rejects a negative cup count and a negative payout", () => {
      const negativeCups = valid();
      salesOf(negativeCups).currentPeriod.paidCups = -1;
      expect(reject(negativeCups)[0]).toMatch(/^sales.data.currentPeriod.paidCups:/);

      const negativePayout = valid();
      statementsOf(negativePayout)[0].gymPayoutInr = -5_870;
      expect(reject(negativePayout)[0]).toMatch(/^statements.data.0.gymPayoutInr:/);
    });

    it("keeps a negative lifetime net profit, which is a real state", () => {
      const snapshot = valid();
      // A gym with two loss-making months genuinely has this. Clamping it to zero would
      // move it *closer* to §6.1's ₹5,00,000 milestone than it is — an unagreed rate
      // rise arrived at by arithmetic.
      salesOf(snapshot).opening.openingNetProfitInr = -12_000;
      const result = parseGymPortalSnapshot(snapshot);
      expect(result.ok).toBe(true);
    });

    it("rejects an advertising figure sent as a string", () => {
      const snapshot = valid();
      // Its own section now, so its own path. `computeAdvertisingShare` clamps a
      // non-finite input to zero, which reads as "no advertising this month" — the exact
      // silent-zero this boundary exists to turn into a failure.
      (snapshot.adRevenue as Record<string, unknown>).data = {
        period: "2026-08",
        revenueExTaxInr: "4000",
      };
      expect(reject(snapshot)[0]).toMatch(/^adRevenue.data.revenueExTaxInr:/);
    });

    it("rejects a share outside 0–100", () => {
      const snapshot = valid();
      snapshot.terms.gymSharePctAfterMilestone = 150;
      expect(reject(snapshot)[0]).toMatch(/^terms.gymSharePctAfterMilestone:/);
    });
  });

  // ── The terms row ─────────────────────────────────────────────────────────

  describe("the terms row", () => {
    it("rejects a terms row missing the milestone", () => {
      const snapshot = valid();
      delete (snapshot.terms as Partial<GymPortalSnapshot["terms"]>).milestoneCups;
      // `compute.ts` reads a non-positive `milestoneCups` as "this test is not
      // configured" and skips it — correct for a term that is genuinely nil, and
      // catastrophic for one that merely failed to arrive: the gym stays on 20% past
      // 15,000 cups and nothing on screen looks wrong.
      expect(reject(snapshot)).toEqual(["terms.milestoneCups: Required"]);
    });

    it("accepts a zero early-termination charge and a null one, which differ", () => {
      // §36.1 / Schedule B: zero is "nil, and that is the agreed term"; null is
      // "genuinely unagreed". A blank printing as "₹0" is how a placeholder becomes a
      // term nobody chose, so both have to survive the boundary distinctly.
      const zero = valid();
      zero.terms.earlyTerminationChargeInr = 0;
      expect(parseGymPortalSnapshot(zero).ok).toBe(true);

      const unagreed = valid();
      unagreed.terms.earlyTerminationChargeInr = null;
      const parsed = parseGymPortalSnapshot(unagreed);
      expect(parsed.ok && parsed.snapshot.terms.earlyTerminationChargeInr).toBeNull();
    });
  });

  // ── Links ─────────────────────────────────────────────────────────────────

  describe("URLs that reach an href", () => {
    it.each([
      "javascript:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "not a url",
    ])("rejects %j as a statement PDF link", (url) => {
      const snapshot = valid();
      statementsOf(snapshot)[0].documentUrl = url;
      // Rendered as `<a href={statement.documentUrl}>Download PDF</a>` on a page
      // holding a live Supabase session.
      expect(reject(snapshot)[0]).toMatch(/^statements.data.0.documentUrl:/);
    });

    it("rejects a scheme-smuggling deposit payment link", () => {
      const snapshot = valid();
      snapshot.deposit = { ...snapshot.deposit, paymentUrl: "javascript:void(0)" };
      expect(reject(snapshot)[0]).toMatch(/^deposit.paymentUrl:/);
    });

    it("accepts https, and null for a link that does not exist yet", () => {
      const snapshot = valid();
      statementsOf(snapshot)[0].documentUrl = "https://example.supabase.co/storage/stmt.pdf";
      snapshot.deposit = { ...snapshot.deposit, paymentUrl: null };
      expect(parseGymPortalSnapshot(snapshot).ok).toBe(true);
    });
  });

  // ── Dates, hashes and states ──────────────────────────────────────────────

  describe("dates and identifiers", () => {
    it.each(["11-08-2026", "2026-8-11", "2026-13-01", "August 2026", ""])(
      "rejects %j as a settlement date",
      (value) => {
        const snapshot = valid();
        statementsOf(snapshot)[0].settledOn = value;
        expect(reject(snapshot)[0]).toMatch(/^statements.data.0.settledOn:/);
      },
    );

    it("rejects a date where a timestamp is required", () => {
      const snapshot = valid();
      // `asOf` is rendered as "Figures as at …". A date-only value would silently
      // present month-old figures as today's.
      snapshot.asOf = "2026-08-22";
      expect(reject(snapshot)[0]).toMatch(/^asOf:/);
    });

    it.each([
      ["too short", "3f9a1c7e"],
      ["65 characters", `${"a".repeat(65)}`],
      ["upper case", "A".repeat(64)],
      ["not hex", "z".repeat(64)],
    ])("rejects an agreement fingerprint that is %s", (_label, value) => {
      const snapshot = valid();
      snapshot.agreement = { version: "2.2", signedOn: "2026-04-27", contentHash: value };
      // The card shows the first twelve characters so a gym can match it against the
      // emailed copy. A malformed digest renders as a plausible fingerprint that
      // matches nothing, which defeats the only thing it is for.
      expect(reject(snapshot)[0]).toMatch(/^agreement.contentHash:/);
    });

    it("accepts a null agreement, which is a real window", () => {
      const snapshot = valid();
      // Between account creation and the PDF being issued.
      snapshot.agreement = null;
      expect(parseGymPortalSnapshot(snapshot).ok).toBe(true);
    });

    it("rejects an unknown machine status", () => {
      const snapshot = valid();
      (snapshot.machine as Record<string, unknown>).status = "decommissioned";
      // The status indexes a label map, so an unlisted value renders `undefined`.
      expect(reject(snapshot)[0]).toMatch(/^machine.status:/);
    });
  });

  describe("the deposit", () => {
    it("rejects a receipt beside a status that is not paid", () => {
      const snapshot = valid();
      snapshot.deposit = { ...snapshot.deposit, status: "deferred" };
      // A receipt says money arrived. Shown next to "deferred" one of the two is
      // false, and the receipt is the one that must not be displayed.
      expect(reject(snapshot)[0]).toMatch(/^deposit.receipt:/);
    });

    it("accepts paid with no receipt yet", () => {
      const snapshot = valid();
      // The converse is a real state, briefly: money in, receipt still being generated.
      snapshot.deposit = { ...snapshot.deposit, receipt: null };
      expect(parseGymPortalSnapshot(snapshot).ok).toBe(true);
    });

    it("rejects fractional paise", () => {
      const snapshot = valid();
      snapshot.deposit = {
        ...snapshot.deposit,
        receipt: { ...snapshot.deposit.receipt!, amountPaise: 5_000_000.5 },
      };
      expect(reject(snapshot)[0]).toMatch(/^deposit.receipt.amountPaise:/);
    });
  });

  describe("what it deliberately allows", () => {
    it("ignores fields it does not know about rather than failing", () => {
      // The endpoint gaining a field must not take the dashboard down — a forwards-
      // compatible response is the normal case during a deploy, not an error.
      const result = gymPortalSnapshotSchema.safeParse({
        ...valid(),
        somethingNew: { added: "by a later version of the endpoint" },
      });
      expect(result.success).toBe(true);
      expect(result.success && "somethingNew" in result.data).toBe(false);
    });

    it("accepts an empty statement list", () => {
      const snapshot = valid();
      // A gym in its first month has none. The dashboard reads `data[0]`, which is
      // `undefined` and handled — this is not the schema's problem to reject. An empty
      // list is emphatically not the same thing as an absent section: one says "no month
      // has settled", the other says "we are not telling you about settled months".
      snapshot.statements = { available: true, data: [] };
      expect(parseGymPortalSnapshot(snapshot).ok).toBe(true);
    });
  });

  // ── Absent sections ───────────────────────────────────────────────────────

  /**
   * `GET /gym/portal` ships partial: cups, advertising revenue, electricity and settled
   * statements are four separate feeds and none of them is built (`mbp-backend`
   * `docs/gym-onboarding-api-design.md` §2.6). Before this wrapper existed, that response
   * failed validation outright and the dashboard showed its error state — a gym would have
   * been told its figures were broken when in fact its account was fine.
   */
  describe("sections the endpoint cannot answer yet", () => {
    it("accepts the response the endpoint actually returns today", () => {
      const result = parseGymPortalSnapshot(structuredClone(PARTIAL_GYM_PORTAL));
      expect(result).toEqual({ ok: true, snapshot: PARTIAL_GYM_PORTAL });
    });

    it.each(["sales", "adRevenue", "electricity", "statements"] as const)(
      "accepts %s marked absent on its own",
      (key) => {
        const snapshot = valid();
        // One at a time, because they are four independent feeds and will not arrive
        // together — advertising has no source at all, while cup telemetry is next.
        snapshot[key] = { available: false, reason: "not_implemented" };
        expect(parseGymPortalSnapshot(snapshot).ok).toBe(true);
      },
    );

    it("accepts a section that is built but has no data for this gym", () => {
      const snapshot = valid();
      // A machine allocated but not installed has genuinely sold no cups. Different fact,
      // different copy — see `PortalAbsence`.
      snapshot.sales = { available: false, reason: "no_data_yet" };
      const result = parseGymPortalSnapshot(snapshot);
      expect(result.ok && result.snapshot.sales).toEqual({
        available: false,
        reason: "no_data_yet",
      });
    });

    it("rejects an absence with a reason nothing on screen knows how to phrase", () => {
      const snapshot = valid();
      (snapshot as Record<string, unknown>).sales = {
        available: false,
        reason: "maintenance",
      };
      // The reason selects the copy. An unrecognised one would fall through to whichever
      // branch the card wrote last, which is how a gym gets told something untrue about
      // why its figures are missing.
      expect(reject(snapshot)[0]).toMatch(/^sales.reason:/);
    });

    it("rejects a section that claims to be available and carries nothing", () => {
      const snapshot = valid();
      (snapshot as Record<string, unknown>).electricity = { available: true };
      // The half-response. Left to pass, `electricity.data.paidCups` is `undefined`,
      // `computeElectricityWindow` clamps it to zero, and the card confidently reports
      // the ₹1,000 §10.2 floor for a window nobody measured.
      expect(reject(snapshot)[0]).toMatch(/^electricity.data:/);
    });

    it("rejects a section with no discriminant at all", () => {
      const snapshot = valid();
      // The shape a first attempt at the endpoint produces: the payload, unwrapped.
      (snapshot as Record<string, unknown>).statements = [];
      expect(reject(snapshot).length).toBeGreaterThan(0);
    });
  });
});
