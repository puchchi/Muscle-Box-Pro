/**
 * What the gym portal is given, and what it is not.
 *
 * This is the response shape of the reporting endpoint described in §15 of
 * docs/gym-onboarding.md — written now, before that endpoint exists, for the same
 * reason `OnboardingApi` was: the dashboard renders one type, phase 1 fills it from
 * a fixture, and phase 4 fills it from the BFF. If a card ever reaches past this
 * type, that swap stops being a one-file change.
 *
 * The split of responsibility it encodes:
 *
 *   - **The server supplies raw, already-filtered facts.** Cup counts net of §6.4's
 *     exclusions, gross ex-GST, the cost total, cumulative opening counters, and the
 *     boundaries of the current electricity review window. Anything requiring a
 *     calendar, a device lookup or a database join is the server's.
 *   - **The client derives every rupee** by passing those facts through
 *     `shared/settlement/compute.ts`. No card does arithmetic of its own.
 *
 * The one deliberate exception is `Statement.gymPayoutInr`, which is a *record* of
 * what was paid rather than a recomputation — see the note on that field.
 *
 * The other thing this type now encodes is **which parts of it the endpoint can
 * honestly answer yet**. See `PortalSection`.
 */

import type { DepositReceipt, DepositStatus, OnboardingTerms } from "../onboarding/types";
import type { CumulativeAtPeriodStart, PeriodSales } from "../settlement/compute";

/**
 * Why a section of the dashboard has nothing in it.
 *
 * Two genuinely different facts, and the copy on screen differs because a gym owner
 * reading them draws opposite conclusions:
 *
 *   - `not_implemented` — *we* have not built the pipeline. Nothing about this gym is
 *     unusual and nothing it is owed is affected; the figures exist in our records and
 *     are simply not surfaced here yet.
 *   - `no_data_yet` — the pipeline works and this gym has no data for it. A machine
 *     that is allocated but not installed has sold no cups, and that is a true and
 *     unremarkable state rather than an outage.
 *
 * Only the first is returned today. The second exists now so that the day the reporting
 * pipeline lands, a pre-installation gym does not need a frontend change to be told
 * something true — and so the two states cannot be conflated once both are live.
 */
export type PortalAbsence = "not_implemented" | "no_data_yet";

/**
 * A part of the dashboard that may not have an answer.
 *
 * **Absent, not zero.** This is the whole point of the wrapper. A dashboard showing ₹0
 * settled is a claim about the world; a dashboard showing "not available yet" is a claim
 * about the software, and only one of those is true while the trading pipeline is
 * unbuilt. Left as bare fields with zeros in them, the screen would invite a gym to
 * conclude it earned nothing last month — the single most expensive wrong impression
 * this page can create.
 *
 * A discriminated union rather than `T | null` or an optional field, for two reasons.
 * The reason has to travel with the absence, because the copy depends on it. And `null`
 * would be silently rendered as an empty card by any component that forgot to check,
 * whereas `available` cannot be ignored — `sales.data` does not type-check until the
 * discriminant has been narrowed.
 *
 * Which sections are wrapped follows what the server can *separately* fail to have,
 * not what looks tidy: cup telemetry, advertising revenue, electricity readings and
 * settled statements are four different pipelines and arrive on four different days.
 * See `mbp-backend` `docs/gym-onboarding-api-design.md` §2.6.
 */
export type PortalSection<T> =
  | { available: true; data: T }
  | { available: false; reason: PortalAbsence };

/**
 * Where the unit is in its life. `service_due` is a flag on an otherwise trading
 * machine, not a stop — §12 makes servicing MBP's obligation, so the gym's view of it
 * is informational.
 */
export type MachineStatus = "allocated" | "installed" | "trading" | "service_due" | "removed";

/**
 * That gym's unit. The model-level facts live in `shared/machine/spec.ts`; this is the
 * per-unit record, which is why `model` is a stored string rather than a re-export —
 * a gym on an older model must keep seeing the machine it actually has.
 */
export type MachineRecord = {
  model: string;
  /** The join key to `mbp-backend`. Null until a unit is allocated. */
  deviceNo: string | null;
  serialNumber: string | null;
  status: MachineStatus;
  /** §4.1: the term runs from the later of signing and installation. */
  installationDate: string | null;
  lastServiceAt: string | null;
};

/**
 * A month that has been settled under §8.3, as it was settled.
 *
 * `gymPayoutInr` is read from the settlement record, not recomputed from the month's
 * sales. A settled month is history: if a `gym_terms` row is later amended, or the
 * §10.3 rate table is corrected, recomputation would silently rewrite what a gym was
 * already paid and shown. The provisional month recomputes; settled months do not.
 */
export type Statement = {
  /** "2026-07". */
  period: string;
  /** ISO date. §8.3 puts this within 15 days of month-end. */
  settledOn: string;
  /** Shake share plus advertising share, as paid. */
  gymPayoutInr: number;
  /** Electricity, when that month closed a review window. Zero otherwise (§10.4). */
  electricityInr: number;
  /** Null until build item 9 renders statement PDFs. */
  documentUrl: string | null;
};

/**
 * The current three-month electricity review window (§10.4).
 *
 * The server decides the boundaries and hands over the cup count inside them. The
 * browser must not reconstruct a review window from a calendar: which window a gym is
 * in depends on when its first window opened, which is a fact about that gym's record
 * and not about today's date.
 */
export type ElectricityWindowPeriod = {
  /** Human label for the window, e.g. "Jul–Sep 2026". */
  label: string;
  /** Completed paid cups inside the window so far. */
  paidCups: number;
  /** ISO date the window closes, after which unblocked cups lapse (§10.6). */
  endsOn: string;
};

/**
 * A trading period's shake figures, without the advertising line.
 *
 * `PeriodSales` carries advertising revenue alongside cups because that is the shape
 * the settlement maths consumes. The *response* has to separate them, because §9
 * advertising revenue and §6 cup telemetry are two independent feeds: there is no ad
 * network wired up at all, while cup counts are the next thing being built. Bundled,
 * the entire money side of the dashboard would stay dark long after cups worked.
 *
 * Derived from `PeriodSales` rather than declared afresh so a field added to the
 * settlement input cannot be forgotten here.
 */
export type ShakePeriodSales = Omit<PeriodSales, "adRevenueExTaxInr">;

/** Cups, gross and direct costs — the §6/§7 feed. */
export type TradingFigures = {
  /**
   * Cumulative totals at the start of `currentPeriod`, over the whole gym-machine
   * relationship. §21.5: relocation does not reset these.
   */
  opening: CumulativeAtPeriodStart;
  /** Month to date. Provisional until settled — §8.3, and the UI must say so. */
  currentPeriod: ShakePeriodSales;
};

/** §9 screen revenue for one period. Its own feed — see `ShakePeriodSales`. */
export type AdRevenuePeriod = {
  /** A label, e.g. "2026-08". Matches `TradingFigures.currentPeriod.period`. */
  period: string;
  /** Advertising and promotional revenue attributable to this machine, ex-tax. */
  revenueExTaxInr: number;
};

export type GymPortalSnapshot = {
  gymDisplayName: string;
  machine: MachineRecord;
  /** That gym's own `gym_terms` row — never `shared/partnership/summary.ts`. */
  terms: OnboardingTerms;
  sales: PortalSection<TradingFigures>;
  adRevenue: PortalSection<AdRevenuePeriod>;
  electricity: PortalSection<ElectricityWindowPeriod>;
  /** Newest first. An empty array is "no settled months yet", which is not absence. */
  statements: PortalSection<Statement[]>;
  deposit: {
    status: DepositStatus;
    /** Present only when the status is `paid` (§5). */
    receipt: DepositReceipt | null;
    /** A live Razorpay Payment Link while the deposit is outstanding. */
    paymentUrl: string | null;
  };
  /** Null only in the window between account creation and the PDF being issued. */
  agreement: { version: string; signedOn: string; contentHash: string } | null;
  /** ISO timestamp the figures were read. Shown, because a stale dashboard lies. */
  asOf: string;
};
