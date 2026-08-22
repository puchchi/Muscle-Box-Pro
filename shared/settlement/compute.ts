/**
 * Settlement maths for the machine-placement partnership — §§6–10 of the agreement.
 *
 * Everything a gym is shown about money is derived here. The dashboard renders the
 * output of these functions and computes nothing itself; when the reporting endpoint
 * lands (build item 11, §15) the *inputs* change source from a fixture to a BFF
 * response and the maths does not move. That is the whole reason this is a separate
 * pure module rather than logic inside a card component: the same figures have to be
 * produced identically by the dashboard, by the monthly statement, and by whatever
 * eventually reconciles a payout — and three implementations of §6 is three answers.
 *
 * Pure by construction: no dates, no clock, no I/O, no rounding of anything except
 * final rupee amounts. It never asks what month it is; the caller says which period
 * it is describing.
 *
 * The rules, from docs/gym-onboarding.md §14:
 *
 *   - `net_profit = gross_ex_tax − direct_variable_costs` (§7). Overheads, salaries,
 *     depreciation, financing and general marketing are explicitly out (§7.2).
 *   - 80:20 until the **earlier of** 15,000 completed paid cups or ₹5,00,000 cumulative
 *     **net profit**; 50:50 after (§6.1, §6.3, Schedule C step 4).
 *   - The milestone can fall **inside** a period, so one settlement can carry two
 *     ratios. See `cupsBeforeStepUp`.
 *   - **The step-up is a ratchet.** §6.1 steps up when the milestone "is reached", and
 *     nothing steps it back down. That was implicit while the second test was on
 *     cumulative gross, which only ever rises; on cumulative net profit it has to be
 *     explicit, because a loss period lowers the cumulative figure. See
 *     `CumulativeAtPeriodStart.milestoneAlreadyReached`.
 *   - Advertising revenue is always the advertising ratio, never re-ratioed (§9.4).
 *   - Electricity is ₹1,000 per completed 1,000 paid cups **per three-month review
 *     window**, with a ₹1,000 minimum and no carry-forward (§10.4–10.6).
 *   - Cumulative counters are per gym-machine relationship, not per installation:
 *     relocation does not reset them (§21.5). That is the caller's job — this module
 *     just takes the opening counters it is given.
 *   - The cup count excludes cancelled, refunded, failed-payment, failed-dispense,
 *     test, internal-test and complimentary transactions (§6.4). Also the caller's
 *     job: `paidCups` here means already-filtered.
 *
 * Two things this module decides that the agreement does not say outright, both
 * flagged at their implementation and in §14 of the doc:
 *
 *   1. A period in which costs exceed gross pays the gym nothing rather than billing
 *      it for a share of the loss.
 *   2. §10.3's rate table truncated mid-row in the source PDF; this extrapolates it
 *      linearly rather than reading the last printed row as a cap. Since confirmed as
 *      the intent and made explicit in v2.2's table.
 */

// ── Inputs ──────────────────────────────────────────────────────────────────

/**
 * The commercial terms this maths needs, as a structural subset of `gym_terms`.
 *
 * Deliberately not `OnboardingTerms`: this module has no business knowing about
 * security deposits or notice periods, and a narrower type means a statement
 * generator can call it with whatever row shape it already has. `OnboardingTerms`
 * satisfies it as-is — see the type test in the spec file.
 */
export type SettlementTerms = {
  gymSharePctBeforeMilestone: number;
  gymSharePctAfterMilestone: number;
  /** §6.1's cup test. Non-positive means "not configured", not "already met". */
  milestoneCups: number;
  /**
   * §6.1's profit test: cumulative **Net Profit** as §7 defines it, which is the
   * pool before the split and not the gym's share of it. Non-positive means "not
   * configured".
   */
  milestoneNetProfitInr: number;
  advertisingGymSharePct: number;
  electricityInrPerBlock: number;
  electricityCupsPerBlock: number;
  electricityReviewWindowMonths: number;
};

/**
 * One period's raw trading figures — the shape the reporting endpoint will return.
 *
 * A "period" is a month in every current caller, but nothing here depends on that.
 * Fed daily buckets instead, the milestone split below stops being an average-price
 * approximation and becomes exact, with no change to this code.
 */
export type PeriodSales = {
  /** A label, e.g. "2026-08". Never parsed — this module has no calendar. */
  period: string;
  /** Completed paid cups, already filtered per §6.4. */
  paidCups: number;
  /** Gross customer sales excluding GST (§7.1). */
  grossExTaxInr: number;
  /**
   * §7.3's agreed direct variable costs, as a single total.
   *
   * A total and not a per-unit schedule on purpose: §40 confidentiality runs both
   * ways, and the gym needs this figure to verify net profit, not our cost card.
   */
  directVariableCostsInr: number;
  /** §9 advertising and promotional revenue attributable to this machine, ex-tax. */
  adRevenueExTaxInr: number;
};

/**
 * Cumulative totals at the start of the period, over the life of the relationship.
 *
 * These are what make the milestone answerable at all, and why §21.5 matters: a
 * machine moved from one room of the gym to another carries its counters with it.
 */
export type CumulativeAtPeriodStart = {
  openingPaidCups: number;
  /** Lifetime gross ex-tax. Not a milestone input — the dashboard's "Lifetime" figure. */
  openingGrossExTaxInr: number;
  /**
   * Lifetime §7 Net Profit. This is what §6.1's profit test is measured against, and
   * it is **not** derivable from `openingGrossExTaxInr` — the cost history has to
   * come from the server with the rest of the counters.
   */
  openingNetProfitInr: number;
  /**
   * The persisted fact that the step-up has already happened, if it has.
   *
   * §6.1 steps up when the milestone "is reached" and no clause steps it back, so the
   * ratio is a ratchet. Cumulative net profit can *fall* — a month where costs exceed
   * sales reduces it — so recomputing "reached?" from the counters alone would drop a
   * gym back to 20% after a bad month. That would be a rate cut applied retroactively
   * by arithmetic, which is exactly the kind of thing a partner notices and never
   * trusts again.
   *
   * Optional so a caller with no history can omit it; the counters still decide the
   * first crossing. Once true it is sticky, and the date it became true belongs in
   * the settlement record.
   */
  milestoneAlreadyReached?: boolean;
};

// ── Outputs ─────────────────────────────────────────────────────────────────

/** One ratio applied to one slice of a period. A period has one or two. */
export type Tranche = {
  paidCups: number;
  grossExTaxInr: number;
  directVariableCostsInr: number;
  netProfitInr: number;
  gymSharePct: number;
  gymShareInr: number;
};

export type ShakeSettlement = {
  paidCups: number;
  grossExTaxInr: number;
  directVariableCostsInr: number;
  /** §7. Negative in a period where costs exceeded sales. */
  netProfitInr: number;
  /** Pre-milestone slice first. Length 2 only when the milestone split the period. */
  tranches: Tranche[];
  /** True when two ratios applied — the one month per gym that is easy to get wrong. */
  split: boolean;
  /**
   * Gross ex-tax per paid cup, to one decimal. Zero for a period with no cups.
   *
   * Exposed rather than left to the caller because it is the figure that decides which
   * of §6.1's two tests binds, and because a dashboard dividing it out itself is a
   * dashboard doing arithmetic this module is supposed to own.
   */
  averageSellingPriceInr: number;
  gymShareInr: number;
  /** The remainder. Negative in a loss period, because MBP absorbs the whole loss. */
  mbpShareInr: number;
  /** The ratio in force at the end of the period — the "your share is X%" figure. */
  currentGymSharePct: number;
  /**
   * What the gym was actually paid, as a percentage of net profit. Equals
   * `currentGymSharePct` unless the period split; 0 in a loss period.
   */
  effectiveGymSharePct: number;
};

export type AdvertisingSettlement = {
  revenueExTaxInr: number;
  gymSharePct: number;
  gymShareInr: number;
};

export type MilestoneProgress = {
  reachedAtPeriodStart: boolean;
  reachedByPeriodEnd: boolean;
  /**
   * Which of §6.1's two tests fires first from the closing position, at this
   * period's margin per cup. Null once reached, or if neither is configured.
   */
  binding: "cups" | "netProfit" | null;
  closingPaidCups: number;
  /** Lifetime gross ex-tax. Reported for the revenue card, not a milestone input. */
  closingGrossExTaxInr: number;
  /** Lifetime §7 Net Profit — the figure §6.1's profit test is measured against. */
  closingNetProfitInr: number;
  cupsRemaining: number;
  netProfitRemainingInr: number;
  /** 0–100 against whichever test binds, so the progress bar tracks the real one. */
  progressPct: number;
  /** Cups still to sell before the share steps up. Null when nothing binds. */
  cupsToStepUp: number | null;
};

export type PeriodSettlement = {
  period: string;
  shake: ShakeSettlement;
  advertising: AdvertisingSettlement;
  milestone: MilestoneProgress;
  /**
   * Shake share plus advertising share.
   *
   * Electricity is **not** in here. It is assessed per three-month window (§10.4),
   * so folding a window figure into a monthly payout would overstate it roughly
   * threefold. Call `computeElectricityWindow` and show it separately, which is also
   * what §13 asks the dashboard to do.
   */
  gymPayoutInr: number;
};

export type ElectricityWindow = {
  cupsInWindow: number;
  completedBlocks: number;
  earnedInr: number;
  /** True when §10.2's minimum is doing the paying rather than completed blocks. */
  floorApplied: boolean;
  /**
   * Cups until `earnedInr` actually rises — not cups to the next block boundary.
   *
   * Below two blocks these differ, because the minimum already pays what the first
   * block would. Telling a gym at 400 cups that 600 more cups earns another ₹1,000
   * would be false.
   */
  cupsToNextIncrease: number;
  nextIncreaseAtCups: number;
  /** §10.6: cups in the incomplete block lapse at window end, they do not carry. */
  cupsInIncompleteBlock: number;
};

// ── The two entry points ────────────────────────────────────────────────────

/**
 * Everything owed for one trading period, and where that period leaves the milestone.
 */
export function computePeriodSettlement(
  terms: SettlementTerms,
  sales: PeriodSales,
  opening: CumulativeAtPeriodStart,
): PeriodSettlement {
  const paidCups = wholeCount(sales.paidCups);
  const grossExTaxInr = nonNegative(sales.grossExTaxInr);
  const directVariableCostsInr = nonNegative(sales.directVariableCostsInr);
  const openingPaidCups = wholeCount(opening.openingPaidCups);
  const openingGrossExTaxInr = nonNegative(opening.openingGrossExTaxInr);
  // Not `nonNegative`: lifetime net profit can legitimately be negative early on, and
  // clamping it to zero would flatter the milestone by discarding accumulated losses.
  const openingNetProfitInr = finiteOrZero(opening.openingNetProfitInr);

  const rateBefore = percentage(terms.gymSharePctBeforeMilestone);
  const rateAfter = percentage(terms.gymSharePctAfterMilestone);

  const reachedAtPeriodStart =
    opening.milestoneAlreadyReached === true ||
    milestoneReached(terms, openingPaidCups, openingNetProfitInr);
  const cupsBefore = reachedAtPeriodStart
    ? 0
    : cupsBeforeStepUp(
        terms,
        paidCups,
        grossExTaxInr,
        directVariableCostsInr,
        openingPaidCups,
        openingNetProfitInr,
      );
  const cupsAfter = paidCups - cupsBefore;

  const tranches: Tranche[] = [];
  if (cupsBefore > 0 && cupsAfter > 0) {
    // The milestone landed mid-period. Split the money in proportion to cups, which
    // prices both slices at the period's average — exact only if price was flat
    // across the period. It is the best available answer from a monthly aggregate,
    // and the fix if it ever matters is to call this with daily buckets rather than
    // to complicate it here. Rounding the first slice and subtracting for the second
    // keeps the two summing to the period total to the rupee.
    const grossBefore = Math.round(grossExTaxInr * (cupsBefore / paidCups));
    const costsBefore = Math.round(directVariableCostsInr * (cupsBefore / paidCups));
    tranches.push(tranche(cupsBefore, grossBefore, costsBefore, rateBefore));
    tranches.push(
      tranche(
        cupsAfter,
        grossExTaxInr - grossBefore,
        directVariableCostsInr - costsBefore,
        rateAfter,
      ),
    );
  } else {
    // Wholly one side of the milestone, so the rate in force at the period's start
    // governs all of it. A period with no cups at all lands here too, and still
    // reports a ratio — the dashboard's "your share is X%" needs one before the first
    // cup is ever sold.
    const rate = reachedAtPeriodStart ? rateAfter : rateBefore;
    tranches.push(tranche(paidCups, grossExTaxInr, directVariableCostsInr, rate));
  }

  const netProfitInr = grossExTaxInr - directVariableCostsInr;
  const gymShakeShareInr = tranches.reduce((total, slice) => total + slice.gymShareInr, 0);
  const currentGymSharePct = tranches[tranches.length - 1].gymSharePct;

  const shake: ShakeSettlement = {
    paidCups,
    grossExTaxInr,
    directVariableCostsInr,
    netProfitInr,
    tranches,
    split: tranches.length > 1,
    averageSellingPriceInr: paidCups > 0 ? oneDecimal(grossExTaxInr / paidCups) : 0,
    gymShareInr: gymShakeShareInr,
    // The residual, not an independent calculation: the two shares must add to net
    // profit exactly, or a statement will not foot.
    mbpShareInr: netProfitInr - gymShakeShareInr,
    currentGymSharePct,
    effectiveGymSharePct:
      netProfitInr > 0 ? oneDecimal((gymShakeShareInr / netProfitInr) * 100) : 0,
  };

  const adRevenueExTaxInr = nonNegative(sales.adRevenueExTaxInr);
  const adGymSharePct = percentage(terms.advertisingGymSharePct);
  const advertising: AdvertisingSettlement = {
    revenueExTaxInr: adRevenueExTaxInr,
    // §9.4: this ratio is permanent. It does not follow the shake ratio to 50:50, and
    // nothing in this function may pass it `rateAfter`.
    gymSharePct: adGymSharePct,
    gymShareInr: Math.round((adRevenueExTaxInr * adGymSharePct) / 100),
  };

  return {
    period: sales.period,
    shake,
    advertising,
    milestone: milestoneProgress(terms, {
      openingPaidCups,
      openingGrossExTaxInr,
      openingNetProfitInr,
      paidCups,
      grossExTaxInr,
      periodNetProfitInr: netProfitInr,
      reachedAtPeriodStart,
    }),
    gymPayoutInr: shake.gymShareInr + advertising.gymShareInr,
  };
}

/**
 * The electricity reimbursement for one three-month review window (§10).
 *
 * Window-scoped rather than monthly, because §10.4 assesses completed blocks over the
 * review period and §10.6 forbids carry-forward: a gym doing 700 cups a month earns
 * ₹2,000 across a window, and would earn ₹3,000 if the same rule were applied monthly
 * with a floor. Getting this wrong is systematic, not occasional.
 */
export function computeElectricityWindow(
  terms: SettlementTerms,
  cupsInWindow: number,
): ElectricityWindow {
  const cups = wholeCount(cupsInWindow);
  const cupsPerBlock = wholeCount(terms.electricityCupsPerBlock);
  const inrPerBlock = nonNegative(terms.electricityInrPerBlock);

  if (cupsPerBlock <= 0 || inrPerBlock <= 0) {
    // Terms that do not describe a reimbursement pay none, rather than paying a
    // guessed floor. A missing `gym_terms` value must not invent money.
    return {
      cupsInWindow: cups,
      completedBlocks: 0,
      earnedInr: 0,
      floorApplied: false,
      cupsToNextIncrease: 0,
      nextIncreaseAtCups: 0,
      cupsInIncompleteBlock: 0,
    };
  }

  const completedBlocks = Math.floor(cups / cupsPerBlock);
  const blockPayInr = completedBlocks * inrPerBlock;
  // §10.2 and §10.5: a minimum of ₹1,000 once per review period. That figure is
  // numerically one block's rate, so it is derived rather than stored — if the
  // minimum and the block rate are ever negotiated apart, `gym_terms` needs its own
  // column and this line has to read it.
  const earnedInr = Math.max(inrPerBlock, blockPayInr);

  // Linear beyond the last row §10.3 prints. Confirmed as the intent: the table is
  // illustrative of §10.1's rule and not a ₹4,000 ceiling, so v2.2's table carries an
  // explicit "5,000 and above" row saying so. §10.1 was always the operative sentence
  // and this line follows it.
  const nextIncreaseAtCups = Math.max(2, completedBlocks + 1) * cupsPerBlock;

  return {
    cupsInWindow: cups,
    completedBlocks,
    earnedInr,
    floorApplied: earnedInr > blockPayInr,
    cupsToNextIncrease: nextIncreaseAtCups - cups,
    nextIncreaseAtCups,
    cupsInIncompleteBlock: cups % cupsPerBlock,
  };
}

// ── Milestone ───────────────────────────────────────────────────────────────

/**
 * §6.1, "the earlier of". Either test alone is sufficient.
 *
 * A non-positive threshold means that test is not configured, and is skipped. It
 * deliberately does not mean "already satisfied": a `gym_terms` row with a zero cup
 * count would otherwise hand every gym 50% from its first cup, which is a wrong
 * answer that costs money and looks like a feature.
 */
function milestoneReached(terms: SettlementTerms, cups: number, netProfitInr: number): boolean {
  const byCups = terms.milestoneCups > 0 && cups >= terms.milestoneCups;
  const byProfit =
    terms.milestoneNetProfitInr > 0 && netProfitInr >= terms.milestoneNetProfitInr;
  return byCups || byProfit;
}

/**
 * How many of this period's cups were sold before the share stepped up.
 *
 * Returns `paidCups` when the milestone is not reached during the period, and a
 * number strictly inside `(0, paidCups)` when it is — which is the case that makes a
 * settlement carry two ratios. The profit test is converted into a cup index at the
 * period's margin per cup, because cups are the only common unit the two tests share.
 */
function cupsBeforeStepUp(
  terms: SettlementTerms,
  paidCups: number,
  grossExTaxInr: number,
  directVariableCostsInr: number,
  openingPaidCups: number,
  openingNetProfitInr: number,
): number {
  if (paidCups <= 0) return 0;

  const netProfitPerCupInr = (grossExTaxInr - directVariableCostsInr) / paidCups;

  const cupsToCupTest =
    terms.milestoneCups > 0
      ? Math.max(0, terms.milestoneCups - openingPaidCups)
      : Number.POSITIVE_INFINITY;

  // Cups needed for cumulative net profit to *reach* the threshold, hence `ceil`: the
  // cup that crosses it is the last one at the old ratio and the step-up applies from
  // the next.
  //
  // A period at or below break-even cannot reach a profit threshold at all — it moves
  // cumulative profit sideways or backwards — so the profit test contributes nothing
  // and the cup test is left to decide. Dividing by a zero or negative margin here
  // would otherwise produce Infinity or a negative cup index, and a negative one would
  // silently step the ratio up on a *loss* month.
  const cupsToProfitTest =
    terms.milestoneNetProfitInr > 0 && netProfitPerCupInr > 0
      ? Math.ceil(
          Math.max(0, terms.milestoneNetProfitInr - openingNetProfitInr) / netProfitPerCupInr,
        )
      : Number.POSITIVE_INFINITY;

  return Math.min(paidCups, cupsToCupTest, cupsToProfitTest);
}

function milestoneProgress(
  terms: SettlementTerms,
  period: {
    openingPaidCups: number;
    openingGrossExTaxInr: number;
    openingNetProfitInr: number;
    paidCups: number;
    grossExTaxInr: number;
    periodNetProfitInr: number;
    reachedAtPeriodStart: boolean;
  },
): MilestoneProgress {
  const closingPaidCups = period.openingPaidCups + period.paidCups;
  const closingGrossExTaxInr = period.openingGrossExTaxInr + period.grossExTaxInr;
  const closingNetProfitInr = period.openingNetProfitInr + period.periodNetProfitInr;
  // The ratchet: a period that starts past the milestone ends past it, whatever the
  // closing counters say. Without this a loss month would un-reach the profit test.
  const reachedByPeriodEnd =
    period.reachedAtPeriodStart ||
    milestoneReached(terms, closingPaidCups, closingNetProfitInr);

  const cupsRemaining =
    terms.milestoneCups > 0 ? Math.max(0, terms.milestoneCups - closingPaidCups) : 0;
  const netProfitRemainingInr =
    terms.milestoneNetProfitInr > 0
      ? Math.max(0, terms.milestoneNetProfitInr - closingNetProfitInr)
      : 0;

  if (reachedByPeriodEnd) {
    return {
      reachedAtPeriodStart: period.reachedAtPeriodStart,
      reachedByPeriodEnd: true,
      binding: null,
      closingPaidCups,
      closingGrossExTaxInr,
      closingNetProfitInr,
      cupsRemaining: 0,
      netProfitRemainingInr: 0,
      progressPct: 100,
      cupsToStepUp: 0,
    };
  }

  // From here on, at this period's margin. `bindingMilestone()` in
  // shared/partnership/summary.ts answers the same question for a gym with no
  // trading history yet; this answers it for one that has some.
  const netProfitPerCupInr =
    period.paidCups > 0 ? period.periodNetProfitInr / period.paidCups : 0;
  const cupsToCupTest =
    terms.milestoneCups > 0 ? cupsRemaining : Number.POSITIVE_INFINITY;
  const cupsToProfitTest =
    terms.milestoneNetProfitInr > 0 && netProfitPerCupInr > 0
      ? Math.ceil(netProfitRemainingInr / netProfitPerCupInr)
      : Number.POSITIVE_INFINITY;

  // Ties go to the profit test, which is the one §6.1 leads with. On a tie both are
  // true, so the label is a presentation choice rather than a computed fact.
  const binding =
    cupsToProfitTest <= cupsToCupTest
      ? Number.isFinite(cupsToProfitTest)
        ? ("netProfit" as const)
        : null
      : Number.isFinite(cupsToCupTest)
        ? ("cups" as const)
        : null;

  const progressPct =
    binding === "netProfit"
      ? oneDecimal((closingNetProfitInr / terms.milestoneNetProfitInr) * 100)
      : binding === "cups"
        ? oneDecimal((closingPaidCups / terms.milestoneCups) * 100)
        : 0;

  const cupsToStepUp = binding === null ? null : Math.min(cupsToCupTest, cupsToProfitTest);

  return {
    reachedAtPeriodStart: period.reachedAtPeriodStart,
    reachedByPeriodEnd: false,
    binding,
    closingPaidCups,
    closingGrossExTaxInr,
    closingNetProfitInr,
    cupsRemaining,
    netProfitRemainingInr,
    // A run of losses can push cumulative profit negative, which would render as a
    // negative-width progress bar. Clamped at both ends.
    progressPct: Math.min(100, Math.max(0, progressPct)),
    cupsToStepUp,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function tranche(
  paidCups: number,
  grossExTaxInr: number,
  directVariableCostsInr: number,
  gymSharePct: number,
): Tranche {
  const netProfitInr = grossExTaxInr - directVariableCostsInr;
  return {
    paidCups,
    grossExTaxInr,
    directVariableCostsInr,
    netProfitInr,
    gymSharePct,
    // Floored at zero. The gym carries no cost exposure under this agreement — no
    // machine cost, no ingredients, no processing fees — so a period where costs
    // exceeded sales is MBP's loss, not a debt owed by the gym. Nothing in §§6–8
    // creates a claim against the gym, and invoicing one would be indefensible.
    gymShareInr: Math.max(0, Math.round((netProfitInr * gymSharePct) / 100)),
  };
}

/** Cup counts are integers. A fractional one is an upstream aggregation bug. */
function wholeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Rupee inputs, guarded at the boundary.
 *
 * These arrive from a network response in item 11, and a `NaN` that reaches the
 * arithmetic renders as "₹NaN" on a partner's dashboard rather than failing loudly.
 * Clamping here means a bad input shows zero, which reads as "no data" — wrong, but
 * not alarming and not a support call about a negative payout.
 */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Like `nonNegative`, but keeps a legitimate negative.
 *
 * Only for lifetime net profit, which is genuinely signed: a gym three months in with
 * two bad months has negative cumulative profit, and clamping that to zero would move
 * it closer to the ₹5,00,000 milestone than it actually is.
 */
function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function percentage(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function oneDecimal(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}
