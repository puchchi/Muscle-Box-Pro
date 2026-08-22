/**
 * Guards on the partnership terms that /gym-partnership publishes.
 *
 * These are not tests of arithmetic for its own sake. The public page states a
 * ratio and then shows a worked example; if the two ever disagree we have
 * published a misleading commercial claim, which is a legal problem rather than
 * a rendering bug. Every assertion here exists to make that disagreement fail
 * loudly in CI. See docs/gym-onboarding.md §2.
 */
import { describe, it, expect } from "vitest";
import {
  PARTNERSHIP,
  INDICATIVE_ECONOMICS,
  workedMonth,
  bindingMilestone,
  formatInr,
} from "@shared/partnership/summary";

describe("PARTNERSHIP terms", () => {
  it("costs the gym nothing for the machine", () => {
    expect(PARTNERSHIP.machineCostInr).toBe(0);
  });

  it("matches the commercials in agreement v2.1", () => {
    expect(PARTNERSHIP.securityDepositInr).toBe(50_000);
    expect(PARTNERSHIP.initialTermMonths).toBe(24);
    expect(PARTNERSHIP.gymNetProfitSharePct.beforeMilestone).toBe(20);
    expect(PARTNERSHIP.gymNetProfitSharePct.afterMilestone).toBe(50);
    expect(PARTNERSHIP.milestone.cups).toBe(15_000);
    expect(PARTNERSHIP.milestone.cumulativeNetProfitInr).toBe(500_000);
    expect(PARTNERSHIP.settlementDaysAfterMonthEnd).toBe(15);
    expect(PARTNERSHIP.noticeDays.gymExit).toBe(30);
  });

  it("keeps the advertising split flat — §9.4 never re-ratios", () => {
    expect(PARTNERSHIP.advertisingGymSharePct).toBe(
      PARTNERSHIP.gymNetProfitSharePct.beforeMilestone,
    );
  });

  it("treats electricity as a three-month reimbursement, not a monthly one", () => {
    // §10.4. If this ever becomes 1 the public page's wording is wrong: we would
    // be understating a monthly payment as a quarterly one.
    expect(PARTNERSHIP.electricity.reviewWindowMonths).toBe(3);
    expect(PARTNERSHIP.electricity.carryForward).toBe(false);
  });
});

describe("workedMonth", () => {
  it("derives the example from the published unit economics", () => {
    const m = workedMonth();
    expect(m.cups).toBe(400);
    expect(m.grossInr).toBe(48_000);
    expect(m.directCostsInr).toBe(22_000);
    expect(m.netProfitInr).toBe(26_000);
    expect(m.gymShareInr).toBe(5_200);
  });

  it("applies exactly the percentage the page prints above it", () => {
    const m = workedMonth(400);
    expect(m.gymSharePct).toBe(PARTNERSHIP.gymNetProfitSharePct.beforeMilestone);
    expect(m.gymShareInr).toBe(Math.round((m.netProfitInr * m.gymSharePct) / 100));
  });

  it("switches to the post-milestone share on request", () => {
    const after = workedMonth(400, true);
    expect(after.gymSharePct).toBe(50);
    expect(after.gymShareInr).toBe(13_000);
  });

  it("scales linearly with volume", () => {
    expect(workedMonth(800).gymShareInr).toBe(workedMonth(400).gymShareInr * 2);
  });

  it("lands inside the ₹3,000–₹12,000 monthly range published on the retention blog", () => {
    // BlogGymRetention.tsx quotes this band for the gym's share. A worked example
    // outside it would contradict a page we already serve.
    const share = workedMonth().gymShareInr;
    expect(share).toBeGreaterThanOrEqual(3_000);
    expect(share).toBeLessThanOrEqual(12_000);
  });

  it("uses a selling price and cost inside the ranges published on the vending blog", () => {
    // BlogWhyGymVending.tsx: ASP ₹100–150, cost per shake ₹45–70.
    expect(INDICATIVE_ECONOMICS.avgSellingPriceInr).toBeGreaterThanOrEqual(100);
    expect(INDICATIVE_ECONOMICS.avgSellingPriceInr).toBeLessThanOrEqual(150);
    expect(INDICATIVE_ECONOMICS.directCostPerCupInr).toBeGreaterThanOrEqual(45);
    expect(INDICATIVE_ECONOMICS.directCostPerCupInr).toBeLessThanOrEqual(70);
  });
});

describe("bindingMilestone", () => {
  it("is the profit trigger at the indicative margin", () => {
    // ₹5,00,000 of net profit at ₹65 a cup ≈ 7,693 cups, still short of 15,000.
    expect(bindingMilestone()).toEqual({ trigger: "netProfit", cups: 7_693 });
  });

  it("defaults to the margin in INDICATIVE_ECONOMICS, not to the selling price", () => {
    // The regression this guards is passing ₹120 where ₹65 belongs, which would put
    // the milestone at 4,167 cups — the answer the old cumulative-gross test gave, and
    // 3,500 cups earlier than the deal actually steps up.
    const margin =
      INDICATIVE_ECONOMICS.avgSellingPriceInr - INDICATIVE_ECONOMICS.directCostPerCupInr;
    expect(bindingMilestone()).toEqual(bindingMilestone(margin));
    expect(bindingMilestone()).not.toEqual(
      bindingMilestone(INDICATIVE_ECONOMICS.avgSellingPriceInr),
    );
  });

  it("lets the cup count bind below ₹33.33 of profit a cup", () => {
    // ₹5,00,000 / 15,000 cups = ₹33.33. This is the crossover that makes both §6.1
    // tests live: against cumulative *gross* it sat at ₹33 of revenue a cup, which no
    // machine sells at, so the cup gate was dead text. Against margin it is inside the
    // real operating range.
    expect(bindingMilestone(34).trigger).toBe("netProfit");
    expect(bindingMilestone(33).trigger).toBe("cups");
    expect(bindingMilestone(33).cups).toBe(15_000);
  });

  it("falls back to the cup count for a machine at or below break-even", () => {
    // A zero or negative margin never reaches a profit threshold. Reported as the cup
    // test rather than as a division by zero.
    expect(bindingMilestone(0)).toEqual({ trigger: "cups", cups: 15_000 });
    expect(bindingMilestone(-10)).toEqual({ trigger: "cups", cups: 15_000 });
  });

  it("never reports a threshold above the contractual cup cap", () => {
    for (const margin of [1, 10, 33, 34, 65, 100, 120, 500]) {
      expect(bindingMilestone(margin).cups).toBeLessThanOrEqual(PARTNERSHIP.milestone.cups);
    }
  });

  it("settles Schedule B's early-termination charge at nil", () => {
    // Was `[TO BE AGREED]`, which left §36.1's right to exit priced at nothing the
    // document stated. Zero is the agreed term; null in `gym_terms` still means
    // "genuinely unagreed" for a negotiated gym.
    expect(PARTNERSHIP.earlyTerminationChargeInr).toBe(0);
  });
});

describe("formatInr", () => {
  it("groups digits the Indian way", () => {
    expect(formatInr(5_200)).toBe("₹5,200");
    expect(formatInr(48_000)).toBe("₹48,000");
    expect(formatInr(500_000)).toBe("₹5,00,000");
  });

  it("shows no paise", () => {
    expect(formatInr(5_199.6)).toBe("₹5,200");
    expect(formatInr(0)).toBe("₹0");
  });
});
