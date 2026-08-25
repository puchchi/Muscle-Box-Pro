import type { DepositChoice, DepositStatus, EntityType, OnboardingStatus } from "@shared/onboarding/types";
import type { MachineStatus } from "@shared/gym/portal";

/**
 * Display helpers for the admin panel. Presentation only — nothing here derives anything.
 *
 * **Everything is formatted in IST**, because the people reading it are, and a UTC timestamp
 * makes them do arithmetic to answer "did this happen today?". Same reasoning as `formatIstDate`
 * in `GymDashboard.tsx`, and the same reason neither uses `formatAgreementDate`, which formats
 * in UTC because its output is hashed. This distinction has a real failure mode behind it: a
 * unit serviced at 01:00 IST truncated to a UTC date shows as the previous day.
 */

/** "23 Aug 2026, 19:30" in IST. For instants — when something happened. */
export function formatIstDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/**
 * "23 Aug 2026" from a `YYYY-MM-DD`.
 *
 * Read as a plain calendar date and **not** through `Date`'s timezone handling. An
 * `installationDate` is a contractual calendar date (§4.1) with no instant behind it, and
 * `new Date("2026-08-23")` parses as UTC midnight — which in IST is still the 23rd, but in any
 * timezone west of UTC is the 22nd. Formatting it as a date rather than converting it is what
 * keeps the term boundary the one that was agreed.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCalendarDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name ? `${day} ${name} ${year}` : value;
}

/** Rupees, grouped Indian-style. */
export function formatInr(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/**
 * Paise → rupees, for display only.
 *
 * `AdminDeposit.amountPaise` is the one amount on this surface the server sends in paise, so
 * this is the one place that divides. Rounded rather than truncated: this is a label beside a
 * receipt number, and a ₹50,000.50 deposit displayed as ₹50,000 is a figure that disagrees with
 * what was charged. The *write* side refuses fractional rupees outright, which is why that case
 * should not arise — but this is a read of history and history is not revalidated.
 */
export function formatPaiseAsInr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The onboarding ladder, in words.
 *
 * Phrased as *states a gym is in* rather than as events, because the question this answers is
 * "where is this gym?". `signed` is a commercial milestone and reads like one — a gym that
 * signed and never paid is a partner with a receivable, not a lapsed lead.
 */
export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  invited: "Invited",
  opened: "Opened the link",
  details_submitted: "Details submitted",
  partnership_ack: "Partnership acknowledged",
  agreement_viewed: "Agreement viewed",
  signed: "Signed",
  deposit_paid: "Deposit paid",
  active: "Active",
};

/**
 * Tailwind classes per status.
 *
 * Three groups, and the grouping is the point: `active` is green because it is the finish line,
 * `signed` and `deposit_paid` are blue because the gym is committed and the remaining work is
 * ours, and everything before that is grey because it is a lead in progress. Colour that tracked
 * step number instead would make "invited" and "signed" look like adjacent shades of the same
 * thing, which they are not.
 */
export const STATUS_CLASS: Record<OnboardingStatus, string> = {
  invited: "bg-gray-100 text-gray-700",
  opened: "bg-gray-100 text-gray-700",
  details_submitted: "bg-gray-100 text-gray-700",
  partnership_ack: "bg-gray-100 text-gray-700",
  agreement_viewed: "bg-gray-100 text-gray-700",
  signed: "bg-blue-50 text-blue-700",
  deposit_paid: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
};

export const DEPOSIT_STATUS_LABEL: Record<DepositStatus, string> = {
  not_started: "Not started",
  pending: "Awaiting payment",
  paid: "Paid",
  // A real answer, not the absence of one — which is why activation needs an explicit waiver
  // rather than treating this as a blank. Since 2026-08-25 we are the ones who set it: step 4
  // has no defer button (docs/gym-onboarding.md §24).
  deferred: "Deferred",
};

export const DEPOSIT_CHOICE_LABEL: Record<DepositChoice, string> = {
  pay_now: "Paying now",
  pay_later: "Deferred to later",
};

/**
 * The entity types as they read on a document, not as they are stored.
 *
 * `unregistered` is spelled out rather than shortened: on a detail page beside a GSTIN and a legal
 * entity name, "Unregistered" alone could be read as "we have not checked".
 */
export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  proprietorship: "Proprietorship",
  partnership: "Partnership",
  llp: "LLP",
  pvt_ltd: "Private Limited",
  unregistered: "No registered entity",
};

/**
 * A unit's operational state.
 *
 * `replaced` and `removed` are both "not in service", and they are kept apart because the row
 * survives either way — §4.1 dates the term from installation, so which unit was in that gym
 * when is a fact that has to stay readable after the unit is gone.
 */
export const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  allocated: "Allocated",
  installed: "Installed",
  servicing: "In service",
  replaced: "Replaced",
  removed: "Removed",
};

/** The steps, by name, so a step number is legible without counting. */
export const STEP_LABEL: Record<number, string> = {
  1: "Confirm details",
  2: "Your partnership",
  3: "Review & sign",
  4: "Deposit",
  5: "You're set up",
  6: "Installation",
};
