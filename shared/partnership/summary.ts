/**
 * Standard commercial terms for the gym machine-placement partnership.
 *
 * This is the single source of truth for every headline number a gym is shown
 * before it signs. Two consumers:
 *
 *   1. /gym-partnership — the public, indicative explanation of the deal
 *   2. the defaults used when admin creates a gym's `gym_terms` row
 *
 * Per-gym terms diverge from here deliberately, in the database. Nothing in the
 * UI should hardcode a rupee figure or a percentage — read it from here, or from
 * that gym's `gym_terms`. See docs/gym-onboarding.md §2 and the §17 checklist.
 *
 * Clause references are to the Machine Placement & Profit Sharing Agreement
 * v2.1 (docs/MuscleBoxPro_Machine_Placement_Profit_Sharing_Agreement_v2_1.pdf).
 */

export const PARTNERSHIP = {
  /** The gym pays nothing for the machine, installation or maintenance. */
  machineCostInr: 0,

  /** Refundable security deposit — §5.1, Schedule B. */
  securityDepositInr: 50_000,

  /**
   * §4.1. The clock starts on the later of the Effective Date (signing) and the
   * installation date, which is why the data model keeps those separate.
   */
  initialTermMonths: 24,

  /** Share of net profit on shake sales — §6. */
  gymNetProfitSharePct: { beforeMilestone: 20, afterMilestone: 50 },

  /**
   * §6. The gym's share rises on the **earlier** of these two triggers.
   *
   * The second test is cumulative **Net Profit as §7 defines it** — gross customer
   * sales, less taxes collected for the Government, less agreed direct variable
   * costs — and not cumulative gross sales. It is the profit *pool* before the
   * 80:20 split, not either party's share of it.
   *
   * That distinction is the whole reason both tests are live. Against cumulative
   * gross, ₹5,00,000 arrived at ~4,167 cups and the 15,000-cup figure was dead
   * text at any selling price above ~₹33. Against net profit the crossover moves
   * to ₹33.33 of *margin* per cup, which is inside the real operating range: a
   * machine earning ₹55 a cup hits the profit test at ~9,100 cups, one earning ₹30
   * hits the cup test first. See `bindingMilestone()`.
   */
  milestone: {
    cups: 15_000,
    cumulativeNetProfitInr: 5_00_000,
    basis: "earlier-of" as const,
  },

  /** §9.4. Advertising revenue stays at this split permanently — it never re-ratios. */
  advertisingGymSharePct: 20,

  /**
   * §10.4–10.6. Paid per *completed* block of cups, assessed over a three-month
   * review window rather than monthly, with a floor and no carry-forward.
   */
  electricity: {
    inrPerBlock: 1_000,
    cupsPerBlock: 1_000,
    reviewWindowMonths: 3,
    floorInrPerWindow: 1_000,
    carryForward: false,
  },

  /** §8.3. The monthly statement is the amount actually owed. */
  settlementDaysAfterMonthEnd: 15,

  /** §36.1 — the gym may exit on notice. §12.4 — MBP may remove an underperforming machine. */
  noticeDays: { gymExit: 30, mbpUnderperformance: 15 },

  /**
   * §36.2 and Schedule B. Nil — the gym's exit price is the notice, not a payment.
   *
   * Schedule B carried `[TO BE AGREED]` here, which meant §36.1 granted a right to
   * exit at an undefined cost. Settled at zero, conditional on the 30 days' written
   * notice §36.1 already requires; where that notice is not given, §37.6 lets MBP
   * recover its actual transportation and retrieval costs, so the notice obligation
   * has a consequence without needing a liquidated figure.
   */
  earlyTerminationChargeInr: 0,

  /** Included at no cost to the gym: restocking, cleaning, servicing, water, consumables. */
  includedInService: [
    "Machine, delivery and installation",
    "Restocking and ingredients",
    "Cleaning and sanitisation",
    "Servicing, repairs and spare parts",
    "Water and consumables",
    "Payment processing",
  ],

  /**
   * What the gym provides — the full obligation set is §§13–24.
   *
   * Metric first on the floor space, feet in brackets. Onboarding step 2 puts this list
   * a few hundred pixels above the machine's own dimensions from `MACHINE_SPEC`, which
   * are centimetres ("76 cm wide, 60 cm deep, 180 cm tall") — so a gym owner deciding
   * whether it fits against a particular wall was being asked to convert one of the two
   * figures. The feet stay because that is what a floor gets measured in here.
   */
  gymProvides: [
    // Escapes rather than literal U+00A0, which is invisible in an editor and gets
    // "tidied" back to a space. In step 2's two-column layout the parenthetical wrapped
    // after the "×" and left "ft)" alone on a line.
    "Floor space of roughly 90 × 90 cm (3\u00A0ft\u00A0×\u00A03\u00A0ft)",
    "A standard power point",
    "Reasonable access for restocking and servicing",
  ],
} as const;

/**
 * Indicative unit economics for the worked example on /gym-partnership.
 *
 * These are midpoints of the ranges already published on the site (see
 * BlogWhyGymVending: ASP ₹100–150, cost per shake ₹45–70, MuscleBoxPro internal
 * partner data Q1 2026). Keep them consistent with that page — a visitor who
 * reads both should not find two different sets of numbers.
 *
 * 600 cups/month is ~20 a day, and lands the gym's share (₹6,600) inside the
 * ₹3,000–₹12,000 range published on BlogGymRetention.
 *
 * Schedule C of the agreement carries its own worked example at 400 cups and ₹55
 * a cup. **That divergence is deliberate and must not be "fixed" in `v2_3.ts`.** The
 * agreement text is hashed and frozen once a gym signs against it, so editing it
 * means minting a new version; and its example exists to show the clause 7 arithmetic,
 * not to publish a volume. This constant is the marketing-side illustration and is
 * free to move as the real partner data does.
 */
export const INDICATIVE_ECONOMICS = {
  avgSellingPriceInr: 120,
  directCostPerCupInr: 65,
  exampleCupsPerMonth: 600,

  /**
   * The vintage of the three figures above, rendered in the /gym-partnership disclaimer.
   *
   * Here rather than typed into that sentence so that revising the numbers and revising
   * the quarter they are "as of" are one edit. A date written into page copy is a date
   * nobody notices going a year stale, and this one is load-bearing: it is what makes
   * "typical volumes" a dated estimate rather than an open-ended claim.
   */
  asOf: "Q1 2026",
} as const;

export type WorkedMonth = {
  cups: number;
  grossInr: number;
  directCostsInr: number;
  netProfitInr: number;
  gymShareInr: number;
  gymSharePct: number;
};

/**
 * The worked month shown on the public page. Shake profit only — the electricity
 * reimbursement is deliberately excluded because it is assessed per three-month
 * window (§10.4), so folding it into a monthly figure would overstate it by ~3x.
 */
export function workedMonth(
  cups: number = INDICATIVE_ECONOMICS.exampleCupsPerMonth,
  afterMilestone = false,
): WorkedMonth {
  const grossInr = cups * INDICATIVE_ECONOMICS.avgSellingPriceInr;
  const directCostsInr = cups * INDICATIVE_ECONOMICS.directCostPerCupInr;
  const netProfitInr = grossInr - directCostsInr;
  const gymSharePct = afterMilestone
    ? PARTNERSHIP.gymNetProfitSharePct.afterMilestone
    : PARTNERSHIP.gymNetProfitSharePct.beforeMilestone;

  return {
    cups,
    grossInr,
    directCostsInr,
    netProfitInr,
    gymSharePct,
    gymShareInr: Math.round((netProfitInr * gymSharePct) / 100),
  };
}

/**
 * Which of the two §6 triggers fires first at a given margin per cup.
 *
 * Takes net profit per cup rather than selling price, because the §6 test is on
 * §7 Net Profit. A gym asking "when does my share go up?" is asking about this
 * function's answer, and the honest answer depends on the machine's margin, not
 * its shelf price: ₹5,00,000 of profit is ~9,100 cups at ₹55 a cup and ~16,700 at
 * ₹30, and only in the second case does the 15,000-cup ceiling bind.
 *
 * So the public page says "whichever comes first" and prints the real number for
 * the indicative economics — quoting 15,000 to a gym whose share then rises at
 * 9,100 undersells the deal, and quoting 9,100 to one whose margin is thinner
 * oversells it.
 */
export function bindingMilestone(
  netProfitPerCupInr: number = INDICATIVE_ECONOMICS.avgSellingPriceInr -
    INDICATIVE_ECONOMICS.directCostPerCupInr,
): { trigger: "cups" | "netProfit"; cups: number } {
  // A machine at or below zero margin never reaches a profit threshold, so the cup
  // test is the only one that can fire. Guarding here rather than dividing by zero.
  if (netProfitPerCupInr <= 0) return { trigger: "cups", cups: PARTNERSHIP.milestone.cups };

  const cupsToHitProfit = Math.ceil(
    PARTNERSHIP.milestone.cumulativeNetProfitInr / netProfitPerCupInr,
  );
  return cupsToHitProfit <= PARTNERSHIP.milestone.cups
    ? { trigger: "netProfit", cups: cupsToHitProfit }
    : { trigger: "cups", cups: PARTNERSHIP.milestone.cups };
}

/** ₹48,000 → "₹48,000". Indian digit grouping, no decimals. */
export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
