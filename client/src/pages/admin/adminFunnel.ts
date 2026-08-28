import type { AdminGymListRow } from "@shared/admin/gyms";
import type { OnboardingStatus } from "@shared/onboarding/types";

/**
 * What the admin overview derives from a page of gyms. Pure — no clock except the one passed in.
 *
 * All of it comes from `AdminGymListRow`, which is nine thin fields, and that is the constraint the
 * whole overview is shaped around. `GET /admin/gyms` runs one query over `gsi4-gymlist` and returns
 * status, both names, the contact and two timestamps. There is no server-side aggregation, no count
 * endpoint and no per-status index, so every number on that page is counted here over rows already
 * fetched.
 *
 * **That makes the honesty of the labelling load-bearing.** A funnel headed "all gyms" that had
 * actually counted the first two hundred is worse than no funnel: it would be read as a total, and
 * the number it reports would be wrong in the one direction nobody checks. So `FunnelSummary`
 * carries `complete`, and the page says which it is. §5 records the scale bound behind this — at
 * thousands of gyms `gsi4-gymlist` becomes a partition per status or per month, and then these
 * counts belong on the server.
 */

/** The ladder, in order. Drives both the funnel's row order and `stalledFor`'s "is this the end?". */
export const STATUS_LADDER: readonly OnboardingStatus[] = [
  "invited",
  "opened",
  "details_submitted",
  "partnership_ack",
  "agreement_viewed",
  "signed",
  "deposit_paid",
  "active",
];

export type FunnelRow = {
  status: OnboardingStatus;
  count: number;
  /** Share of the counted rows, 0–100. Rounded for display only; never summed. */
  pct: number;
};

export type FunnelSummary = {
  rows: FunnelRow[];
  counted: number;
  /**
   * Gyms at `active`. The only rung that is a finish line.
   *
   * A terminated gym is still in this figure: ending the agreement writes an offboarding record and
   * deliberately leaves `status` alone, and `AdminGymListRow` does not carry that record. See the
   * open item in `docs/admin-panel-todo.md`.
   */
  active: number;
  /**
   * Signed but not yet active — a partner with a receivable, not a lead.
   *
   * Its own figure rather than a funnel row because it spans two statuses (`signed` and
   * `deposit_paid`) and because it is the number that means work is *ours*: every gym in it is
   * waiting on a deposit, an installation date or an activation we have to perform.
   */
  committed: number;
  /**
   * Whether `counted` is every gym there is.
   *
   * False means the list paged out before the end, and every count above is a floor. See the module
   * docstring on why this travels with the numbers instead of being assumed.
   */
  complete: boolean;
};

export function summariseFunnel(rows: AdminGymListRow[], complete: boolean): FunnelSummary {
  const counts = new Map<OnboardingStatus, number>(STATUS_LADDER.map((status) => [status, 0]));
  for (const row of rows) {
    // `?? 0` rather than trusting the seed: a status the ladder does not list would otherwise
    // silently drop out of the funnel while still being in `counted`, and the percentages would
    // stop adding up with no indication why. Additive status values are expected (§ the
    // "terminate contract" note in docs/admin-panel-todo.md), so this is a real case.
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const counted = rows.length;
  return {
    rows: STATUS_LADDER.map((status) => {
      const count = counts.get(status) ?? 0;
      return { status, count, pct: counted === 0 ? 0 : Math.round((count / counted) * 100) };
    }),
    counted,
    active: counts.get("active") ?? 0,
    committed: (counts.get("signed") ?? 0) + (counts.get("deposit_paid") ?? 0),
    complete,
  };
}

/**
 * How long a gym has sat where it is, in whole days — or null if it is finished.
 *
 * `updatedAt` is the row's last write of any kind, which is the closest thing the list endpoint has
 * to "when did this gym last move". It is not exactly that: an admin editing terms bumps it without
 * the gym doing anything, so a freshly re-priced stuck gym reads as active. That overstates
 * progress rather than inventing it, and the alternative — a per-gym detail fetch for the
 * timestamps — is a read per row for a page nobody has scrolled.
 *
 * Null at `active` because a gym that finished onboarding is not stalled, it is done.
 */
export function stalledFor(row: AdminGymListRow, now: number): number | null {
  if (row.status === "active") return null;
  const at = Date.parse(row.updatedAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / 86_400_000));
}

export type StalledGym = { row: AdminGymListRow; days: number };

/**
 * The gyms worth chasing: unfinished, and quiet for at least `thresholdDays`.
 *
 * Longest-quiet first, because that is the order someone works through them in. Capped at `limit`
 * rather than paginated: this is a prompt to act, and a list of forty is not one.
 *
 * The threshold exists so the panel does not present a gym invited this morning as a problem. Three
 * days is a judgement, not a rule from anywhere — it is roughly the point at which a link that was
 * going to be opened has been opened.
 */
export function stalledGyms(
  rows: AdminGymListRow[],
  now: number,
  { thresholdDays = 3, limit = 8 }: { thresholdDays?: number; limit?: number } = {},
): StalledGym[] {
  return rows
    .map((row) => ({ row, days: stalledFor(row, now) }))
    .filter((entry): entry is StalledGym => entry.days !== null && entry.days >= thresholdDays)
    .sort((a, b) => b.days - a.days)
    .slice(0, limit);
}

/**
 * The most recently touched gyms, newest first.
 *
 * Sorted on `updatedAt`, which the list endpoint does **not** order by — `gsi4-gymlist` sorts on
 * `createdAt`, so newest-invited and most-recently-active are different orders and only the first
 * is free. Sorting here is correct over the rows held and meaningless beyond them, which is the
 * same caveat as every other number on the overview.
 */
export function recentlyActive(rows: AdminGymListRow[], limit = 6): AdminGymListRow[] {
  return [...rows]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

/**
 * Gyms invited in the last `days` days — the top of the funnel, as a rate rather than a total.
 *
 * On `createdAt`, which for a gym is when it was invited: `POST /admin/gyms` writes the profile and
 * mints the link in one transaction, so there is no window in which a gym exists un-invited.
 */
export function invitedSince(rows: AdminGymListRow[], now: number, days: number): number {
  const cutoff = now - days * 86_400_000;
  return rows.filter((row) => {
    const at = Date.parse(row.createdAt);
    return !Number.isNaN(at) && at >= cutoff;
  }).length;
}
