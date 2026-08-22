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
 */

import type { DepositReceipt, DepositStatus, OnboardingTerms } from "../onboarding/types";
import type { CumulativeAtPeriodStart, PeriodSales } from "../settlement/compute";

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

export type GymPortalSnapshot = {
  gymDisplayName: string;
  machine: MachineRecord;
  /** That gym's own `gym_terms` row — never `shared/partnership/summary.ts`. */
  terms: OnboardingTerms;
  /**
   * Cumulative totals at the start of `currentPeriod`, over the whole gym-machine
   * relationship. §21.5: relocation does not reset these.
   */
  opening: CumulativeAtPeriodStart;
  /** Month to date. Provisional until settled — §8.3, and the UI must say so. */
  currentPeriod: PeriodSales;
  electricityWindow: ElectricityWindowPeriod;
  /** Newest first. */
  statements: Statement[];
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
