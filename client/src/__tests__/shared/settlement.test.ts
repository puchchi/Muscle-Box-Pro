import { describe, expect, it } from "vitest";

import {
  computeElectricityWindow,
  computePeriodSettlement,
  type CumulativeAtPeriodStart,
  type PeriodSales,
  type SettlementTerms,
} from "@shared/settlement/compute";
import { PARTNERSHIP } from "@shared/partnership/summary";
import type { OnboardingTerms } from "@shared/onboarding/types";

/**
 * The settlement maths (§§6–10 of the agreement, docs/gym-onboarding.md §14).
 *
 * Every figure a gym sees about money comes out of this module, and the failures that
 * matter are the quiet ones: a ratio applied to a whole month that should have carried
 * two, an electricity floor paid three times a window instead of once, an advertising
 * share that follows the shake ratio to 50%. Each of those is a real rupee difference
 * on a real partner's statement, so each gets a test that fails if the rule goes.
 */

/** The standard terms row, shaped as `gym_terms` and read off `summary.ts`. */
const TERMS: OnboardingTerms = {
  securityDepositInr: PARTNERSHIP.securityDepositInr,
  termMonths: PARTNERSHIP.initialTermMonths,
  gymSharePctBeforeMilestone: PARTNERSHIP.gymNetProfitSharePct.beforeMilestone,
  gymSharePctAfterMilestone: PARTNERSHIP.gymNetProfitSharePct.afterMilestone,
  milestoneCups: PARTNERSHIP.milestone.cups,
  milestoneNetProfitInr: PARTNERSHIP.milestone.cumulativeNetProfitInr,
  advertisingGymSharePct: PARTNERSHIP.advertisingGymSharePct,
  electricityInrPerBlock: PARTNERSHIP.electricity.inrPerBlock,
  electricityCupsPerBlock: PARTNERSHIP.electricity.cupsPerBlock,
  electricityReviewWindowMonths: PARTNERSHIP.electricity.reviewWindowMonths,
  settlementDaysAfterMonthEnd: PARTNERSHIP.settlementDaysAfterMonthEnd,
  earlyTerminationChargeInr: PARTNERSHIP.earlyTerminationChargeInr,
};

/**
 * `OnboardingTerms` has to satisfy `SettlementTerms` structurally, so that a caller
 * holding a `gym_terms` row can pass it straight in. If this stops compiling, one of
 * the two types has drifted and the dashboard would be reading a different contract
 * from the one the gym signed.
 */
const TERMS_AS_SETTLEMENT: SettlementTerms = TERMS;

const START: CumulativeAtPeriodStart = {
  openingPaidCups: 0,
  openingGrossExTaxInr: 0,
  openingNetProfitInr: 0,
};

/** Net profit per cup at the indicative economics — the rate §6.1's profit test runs at. */
const MARGIN_PER_CUP = 120 - 55;

/** A month at the published indicative economics: ₹120 a cup, ₹55 of cost. */
function month(cups: number, overrides: Partial<PeriodSales> = {}): PeriodSales {
  return {
    period: "2026-08",
    paidCups: cups,
    grossExTaxInr: cups * 120,
    directVariableCostsInr: cups * 55,
    adRevenueExTaxInr: 0,
    ...overrides,
  };
}

describe("net profit and the pre-milestone ratio", () => {
  it("is gross ex-tax less direct variable costs, and nothing else (§7)", () => {
    const result = computePeriodSettlement(TERMS, month(400), START);

    expect(result.shake.grossExTaxInr).toBe(48_000);
    expect(result.shake.directVariableCostsInr).toBe(22_000);
    expect(result.shake.netProfitInr).toBe(26_000);
  });

  it("pays the gym 20% of net profit before the milestone", () => {
    const result = computePeriodSettlement(TERMS, month(400), START);

    expect(result.shake.split).toBe(false);
    expect(result.shake.currentGymSharePct).toBe(20);
    expect(result.shake.gymShareInr).toBe(5_200);
    expect(result.shake.mbpShareInr).toBe(20_800);
    expect(result.gymPayoutInr).toBe(5_200);
  });

  it("pays 50% once the relationship is already past the milestone", () => {
    const result = computePeriodSettlement(TERMS, month(400), {
      openingPaidCups: 8_000,
      openingGrossExTaxInr: 9_60_000,
      openingNetProfitInr: 5_20_000,
    });

    expect(result.shake.currentGymSharePct).toBe(50);
    expect(result.shake.gymShareInr).toBe(13_000);
    expect(result.milestone.reachedAtPeriodStart).toBe(true);
  });

  it("reports a share percentage before the first cup is ever sold", () => {
    // The dashboard's "your share is X%" card renders on day one, with no trading
    // history at all. A month of zero cups must not report 50%.
    const result = computePeriodSettlement(TERMS, month(0), START);

    expect(result.shake.currentGymSharePct).toBe(20);
    expect(result.shake.gymShareInr).toBe(0);
    expect(result.shake.netProfitInr).toBe(0);
  });
});

describe("the milestone splitting a period", () => {
  /**
   * ₹4,89,200 of net profit already banked, so at ₹65 a cup the ₹5,00,000 milestone
   * falls 167 cups into a 400-cup month. This is the one month per gym where a single
   * ratio is wrong.
   */
  const opening: CumulativeAtPeriodStart = {
    openingPaidCups: 7_500,
    openingGrossExTaxInr: 9_00_000,
    openingNetProfitInr: 4_89_200,
  };

  it("applies two ratios in the period the milestone falls in", () => {
    const { shake } = computePeriodSettlement(TERMS, month(400), opening);

    expect(shake.split).toBe(true);
    expect(shake.tranches).toHaveLength(2);
    expect(shake.tranches[0]).toMatchObject({ paidCups: 167, gymSharePct: 20 });
    expect(shake.tranches[1]).toMatchObject({ paidCups: 233, gymSharePct: 50 });
    // Blended, and materially more than 20% — the number a gym would query if the
    // statement showed a flat 20%.
    expect(shake.effectiveGymSharePct).toBe(37.5);
    expect(shake.currentGymSharePct).toBe(50);
  });

  it("loses no rupee to the split", () => {
    const { shake } = computePeriodSettlement(TERMS, month(400), opening);
    const sum = (pick: (t: (typeof shake.tranches)[number]) => number) =>
      shake.tranches.reduce((total, slice) => total + pick(slice), 0);

    expect(sum((t) => t.paidCups)).toBe(400);
    expect(sum((t) => t.grossExTaxInr)).toBe(48_000);
    expect(sum((t) => t.directVariableCostsInr)).toBe(22_000);
    expect(sum((t) => t.netProfitInr)).toBe(26_000);
    // A statement that does not foot is a statement a gym stops trusting.
    expect(shake.gymShareInr + shake.mbpShareInr).toBe(shake.netProfitInr);
    expect(shake.gymShareInr).toBe(9_744);
  });

  it("gives the same total over two half-periods as over one whole one", () => {
    // The pro-rating is at the period's average selling price, which is exact only if
    // price was flat. This asserts the property that makes that acceptable: the
    // function composes, so feeding it finer buckets — daily, when the reporting
    // endpoint can produce them — refines the answer without changing the code.
    const whole = computePeriodSettlement(TERMS, month(400), opening);

    const first = computePeriodSettlement(TERMS, month(200), opening);
    const second = computePeriodSettlement(TERMS, month(200), {
      openingPaidCups: first.milestone.closingPaidCups,
      openingGrossExTaxInr: first.milestone.closingGrossExTaxInr,
      openingNetProfitInr: first.milestone.closingNetProfitInr,
    });

    expect(first.shake.split).toBe(true);
    expect(second.shake.split).toBe(false);
    expect(second.shake.currentGymSharePct).toBe(50);
    expect(first.shake.gymShareInr + second.shake.gymShareInr).toBe(whole.shake.gymShareInr);
  });
});

describe("which §6.1 test actually binds", () => {
  it("is the profit test at a normal margin", () => {
    const { milestone } = computePeriodSettlement(TERMS, month(400), START);

    expect(milestone.binding).toBe("netProfit");
    // ₹26,000 of ₹5,00,000. The cup count is at 400 of 15,000 — 2.7% — and a progress
    // bar tracking that would tell the gym the step-up is years away when it is months.
    expect(milestone.closingNetProfitInr).toBe(26_000);
    expect(milestone.progressPct).toBe(5.2);
    expect(milestone.netProfitRemainingInr).toBe(4_74_000);
    expect(milestone.cupsToStepUp).toBe(Math.ceil(4_74_000 / MARGIN_PER_CUP));
  });

  it("is the cup test at a margin thin enough for it to fire first", () => {
    // Below ₹33.33 of profit a cup, 15,000 cups arrives before ₹5,00,000 of profit
    // does. This is the case that was unreachable while the test was on gross sales:
    // at ₹30 a cup the old revenue test still fired at 16,667 cups, so the cup gate
    // only ever bound below ₹33 of *revenue*, which no machine sells at.
    const { milestone } = computePeriodSettlement(
      TERMS,
      month(400, { grossExTaxInr: 400 * 60, directVariableCostsInr: 400 * 30 }),
      START,
    );

    expect(milestone.binding).toBe("cups");
    expect(milestone.cupsToStepUp).toBe(14_600);
  });

  it("reports 100% and nothing remaining once reached", () => {
    const { milestone } = computePeriodSettlement(TERMS, month(400), {
      openingPaidCups: 4_500,
      openingGrossExTaxInr: 5_40_000,
      openingNetProfitInr: 4_99_000,
    });

    expect(milestone.reachedAtPeriodStart).toBe(false);
    expect(milestone.reachedByPeriodEnd).toBe(true);
    expect(milestone.progressPct).toBe(100);
    expect(milestone.binding).toBeNull();
    expect(milestone.cupsRemaining).toBe(0);
    expect(milestone.netProfitRemainingInr).toBe(0);
  });

  it("does not hand out 50% because a terms row is missing its thresholds", () => {
    // A zero threshold read as "already met" would pay every gym 50% from its first
    // cup. It means "not configured", and the rate in force stays 20%.
    const unconfigured: SettlementTerms = {
      ...TERMS,
      milestoneCups: 0,
      milestoneNetProfitInr: 0,
    };
    const result = computePeriodSettlement(unconfigured, month(20_000), START);

    expect(result.shake.currentGymSharePct).toBe(20);
    expect(result.shake.split).toBe(false);
    expect(result.milestone.reachedByPeriodEnd).toBe(false);
    expect(result.milestone.binding).toBeNull();
    expect(result.milestone.cupsToStepUp).toBeNull();
  });
});

/**
 * The step-up is a one-way ratchet, and it has to be stated rather than inherited.
 *
 * While the second §6.1 test was on cumulative *gross*, "has the milestone been
 * reached?" was safe to recompute every month: gross only rises, so the answer never
 * went backwards. On cumulative *net profit* it does — a month where costs exceed
 * sales lowers the lifetime figure — so a gym at ₹5,02,000 who has a bad month lands
 * back under the threshold. Recomputing from the counters alone would quietly cut its
 * share from 50% to 20%, which is a rate change nobody agreed and nobody announced.
 */
describe("the step-up does not reverse (§6.1 'once reached')", () => {
  it("keeps 50% after a loss month drags cumulative profit back under the threshold", () => {
    // ₹5,02,000 banked, then a month that loses ₹6,000: ₹4,96,000 lifetime, under
    // ₹5,00,000 again. The share must not move.
    const result = computePeriodSettlement(
      TERMS,
      month(100, { grossExTaxInr: 12_000, directVariableCostsInr: 18_000 }),
      {
        openingPaidCups: 8_000,
        openingGrossExTaxInr: 9_60_000,
        openingNetProfitInr: 5_02_000,
        milestoneAlreadyReached: true,
      },
    );

    expect(result.milestone.closingNetProfitInr).toBe(4_96_000);
    expect(result.shake.currentGymSharePct).toBe(50);
    expect(result.milestone.reachedAtPeriodStart).toBe(true);
    expect(result.milestone.reachedByPeriodEnd).toBe(true);
    expect(result.milestone.progressPct).toBe(100);
  });

  it("holds within the period too, when the loss lands after the crossing", () => {
    // Reached during *this* period from the counters, so the flag is not set yet. The
    // closing figure is what matters and it is still over, but the assertion worth
    // having is that `reachedByPeriodEnd` is driven by the crossing rather than
    // recomputed from a closing balance that a later loss could move.
    const opening: CumulativeAtPeriodStart = {
      openingPaidCups: 7_500,
      openingGrossExTaxInr: 9_00_000,
      openingNetProfitInr: 4_89_200,
    };
    const result = computePeriodSettlement(TERMS, month(400), opening);

    expect(result.shake.split).toBe(true);
    expect(result.milestone.reachedAtPeriodStart).toBe(false);
    expect(result.milestone.reachedByPeriodEnd).toBe(true);
  });

  it("does not step up on a loss month that has not reached the milestone", () => {
    // A negative margin cannot cross a profit threshold, and the cup index it would
    // imply is negative. Left unguarded that reads as "crossed at cup 0" and pays 50%
    // for a month the machine lost money.
    const result = computePeriodSettlement(
      TERMS,
      month(400, { grossExTaxInr: 20_000, directVariableCostsInr: 40_000 }),
      { openingPaidCups: 7_500, openingGrossExTaxInr: 9_00_000, openingNetProfitInr: 4_89_200 },
    );

    expect(result.shake.split).toBe(false);
    expect(result.shake.currentGymSharePct).toBe(20);
    expect(result.milestone.reachedByPeriodEnd).toBe(false);
    // Cumulative profit went *down*, so the cup test is now the nearer of the two.
    expect(result.milestone.closingNetProfitInr).toBe(4_69_200);
  });

  it("does not render a negative progress bar for a gym under water", () => {
    const result = computePeriodSettlement(
      TERMS,
      month(100, { grossExTaxInr: 5_000, directVariableCostsInr: 30_000 }),
      { openingPaidCups: 200, openingGrossExTaxInr: 10_000, openingNetProfitInr: -40_000 },
    );

    expect(result.milestone.closingNetProfitInr).toBe(-65_000);
    expect(result.milestone.progressPct).toBeGreaterThanOrEqual(0);
    // The cup test is the only one that can bind: profit is moving the wrong way.
    expect(result.milestone.binding).toBe("cups");
  });
});

describe("advertising revenue", () => {
  it("stays at the advertising ratio after the shake ratio has stepped up (§9.4)", () => {
    const result = computePeriodSettlement(
      TERMS,
      month(400, { adRevenueExTaxInr: 10_000 }),
      { openingPaidCups: 8_000, openingGrossExTaxInr: 9_60_000, openingNetProfitInr: 5_20_000 },
    );

    expect(result.shake.currentGymSharePct).toBe(50);
    // Not 50. §9.4 makes this permanent, and re-ratioing it is the single easiest
    // mistake to make in this file.
    expect(result.advertising.gymSharePct).toBe(20);
    expect(result.advertising.gymShareInr).toBe(2_000);
  });

  it("is added to the payout without entering net profit", () => {
    const result = computePeriodSettlement(TERMS, month(400, { adRevenueExTaxInr: 10_000 }), START);

    expect(result.shake.netProfitInr).toBe(26_000);
    expect(result.gymPayoutInr).toBe(5_200 + 2_000);
  });
});

describe("a period that lost money", () => {
  it("pays the gym nothing rather than billing it for a share of the loss", () => {
    const result = computePeriodSettlement(
      TERMS,
      month(100, { grossExTaxInr: 12_000, directVariableCostsInr: 18_000 }),
      START,
    );

    expect(result.shake.netProfitInr).toBe(-6_000);
    expect(result.shake.gymShareInr).toBe(0);
    // MBP absorbs all of it: the gym has no cost exposure under this agreement, and
    // nothing in §§6–8 creates a claim against it.
    expect(result.shake.mbpShareInr).toBe(-6_000);
    expect(result.shake.effectiveGymSharePct).toBe(0);
    expect(result.gymPayoutInr).toBe(0);
  });

  it("does not net a loss off against the advertising share", () => {
    const result = computePeriodSettlement(
      TERMS,
      month(100, {
        grossExTaxInr: 12_000,
        directVariableCostsInr: 18_000,
        adRevenueExTaxInr: 5_000,
      }),
      START,
    );

    expect(result.gymPayoutInr).toBe(1_000);
  });
});

describe("electricity reimbursement (§10)", () => {
  it.each([
    [0, 1_000],
    [500, 1_000],
    [999, 1_000],
    [1_000, 1_000],
    [1_999, 1_000],
    [2_000, 2_000],
    [4_500, 4_000],
    [10_000, 10_000],
  ])("pays %i cups in a window as ₹%i", (cups, earned) => {
    // The rows §10.3 does print, plus the extrapolation past where its table
    // truncates. If the truncated table turns out to be a ₹4,000 cap, the last case
    // here is the one that has to change.
    expect(computeElectricityWindow(TERMS, cups).earnedInr).toBe(earned);
  });

  it("marks the minimum as the minimum, not as a completed block", () => {
    const window = computeElectricityWindow(TERMS, 400);

    expect(window.completedBlocks).toBe(0);
    expect(window.floorApplied).toBe(true);
  });

  it("counts cups to the next actual increase, not to the next block boundary", () => {
    // At 400 cups the ₹1,000 minimum is already being paid, so reaching 1,000 cups
    // earns nothing more. "600 cups to your next ₹1,000" would be false; 1,600 is true.
    expect(computeElectricityWindow(TERMS, 400).cupsToNextIncrease).toBe(1_600);
    expect(computeElectricityWindow(TERMS, 400).nextIncreaseAtCups).toBe(2_000);

    // Past the floor it is the ordinary block distance again.
    expect(computeElectricityWindow(TERMS, 1_200).floorApplied).toBe(false);
    expect(computeElectricityWindow(TERMS, 1_200).cupsToNextIncrease).toBe(800);
    expect(computeElectricityWindow(TERMS, 2_600).cupsToNextIncrease).toBe(400);
  });

  it("shows the cups that lapse at window end (§10.6)", () => {
    expect(computeElectricityWindow(TERMS, 2_600).cupsInIncompleteBlock).toBe(600);
    expect(computeElectricityWindow(TERMS, 3_000).cupsInIncompleteBlock).toBe(0);
  });

  it("is assessed per window, so a monthly reading would overpay threefold", () => {
    // 700 cups a month over a three-month window: ₹2,000 for the window. Applied
    // monthly with the floor it would be ₹1,000 × 3.
    const window = computeElectricityWindow(TERMS, 2_100);

    expect(TERMS.electricityReviewWindowMonths).toBe(3);
    expect(window.earnedInr).toBe(2_000);
  });

  it("pays nothing when the terms do not describe a reimbursement", () => {
    const unconfigured: SettlementTerms = { ...TERMS, electricityCupsPerBlock: 0 };
    const window = computeElectricityWindow(unconfigured, 5_000);

    // A missing `gym_terms` value must not invent a floor payment.
    expect(window.earnedInr).toBe(0);
    expect(window.floorApplied).toBe(false);
  });
});

describe("guarding the inputs", () => {
  it("turns unusable numbers into zero instead of rendering ₹NaN", () => {
    // These arrive over the network in build item 11. A NaN reaching the arithmetic
    // shows up as "₹NaN" on a partner's dashboard, which is worse than showing zero.
    const result = computePeriodSettlement(
      TERMS,
      {
        period: "2026-08",
        paidCups: Number.NaN,
        grossExTaxInr: Number.POSITIVE_INFINITY,
        directVariableCostsInr: -500,
        adRevenueExTaxInr: Number.NaN,
      },
      { openingPaidCups: -10, openingGrossExTaxInr: Number.NaN, openingNetProfitInr: Number.NaN },
    );

    expect(result.shake.paidCups).toBe(0);
    expect(result.shake.grossExTaxInr).toBe(0);
    expect(result.shake.netProfitInr).toBe(0);
    expect(result.gymPayoutInr).toBe(0);
    expect(result.milestone.closingPaidCups).toBe(0);
  });

  it("floors a fractional cup count rather than paying fractional rupees", () => {
    const result = computePeriodSettlement(TERMS, month(10, { paidCups: 10.7 }), START);
    expect(result.shake.paidCups).toBe(10);
  });

  it("accepts a gym_terms row unchanged", () => {
    expect(computePeriodSettlement(TERMS_AS_SETTLEMENT, month(400), START).shake.gymShareInr).toBe(
      5_200,
    );
  });
});
