import type { DepositChoice, DepositStatus, EntityType, OnboardingStatus } from "@shared/onboarding/types";
import type { MachineStatus } from "@shared/gym/portal";
import type { DeductionKind, OffboardingState, TerminationCause } from "@shared/admin/gyms";

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
 * Paise → rupees **to the paise**, for the settlement figures alone.
 *
 * Everything else on this surface rounds, because everything else is a label. A settlement payable
 * is the one figure a human copies into a bank transfer and then reconciles against a Razorpay
 * statement, and `AdminOffboardingSettlement` sends the exact integer for that purpose. Rounding it
 * would make the two disagree by up to fifty paise, which is the kind of difference that costs an
 * afternoon to find.
 */
export function formatPaiseExact(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rest = abs % 100;
  return `${sign}₹${Math.trunc(abs / 100).toLocaleString("en-IN")}.${String(rest).padStart(2, "0")}`;
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
  invited: "bg-secondary text-muted-foreground",
  opened: "bg-secondary text-muted-foreground",
  details_submitted: "bg-secondary text-muted-foreground",
  partnership_ack: "bg-secondary text-muted-foreground",
  agreement_viewed: "bg-secondary text-muted-foreground",
  signed: "bg-sky-400/10 text-sky-200",
  deposit_paid: "bg-sky-400/10 text-sky-200",
  active: "bg-emerald-400/10 text-emerald-200",
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

/**
 * The offboarding ladder, in words.
 *
 * All four read as states rather than events, matching `STATUS_LABEL` above, and `settled` is
 * phrased as the end of the relationship because that is what it is: unlike the onboarding ladder,
 * this one is genuinely terminal and nothing progresses out of its last rung.
 */
export const OFFBOARDING_STATE_LABEL: Record<OffboardingState, string> = {
  notice_served: "Notice served",
  terminated: "Terminated",
  machine_recovered: "Machine recovered",
  settled: "Settled",
};

/**
 * Red throughout, and deliberately not graded the way `STATUS_CLASS` is.
 *
 * Grading these by rung would say a settled offboarding is "better" than a served notice, and it is
 * not — a completed offboarding is a gym we no longer have. Amber for the two stages where
 * something is still owed or outstanding, red once it is done, so the colour tracks *whether there
 * is work left* rather than progress toward a goal nobody wants.
 */
export const OFFBOARDING_STATE_CLASS: Record<OffboardingState, string> = {
  notice_served: "bg-amber-400/10 text-amber-200",
  terminated: "bg-rose-400/10 text-rose-200",
  machine_recovered: "bg-rose-400/10 text-rose-200",
  settled: "bg-secondary text-muted-foreground",
};

/**
 * The four causes, each named with its clause.
 *
 * The clause number is in the label rather than in a tooltip because these are not
 * interchangeable: `gym_notice` is a nil-cost exit the gym is entitled to (§36.1/§36.2), while
 * `gym_breach` is a factual claim about the gym that also unlocks retrieval costs (§35/§37.6).
 * Picking the wrong one changes what may be deducted from money we are holding.
 */
export const TERMINATION_CAUSE_LABEL: Record<TerminationCause, string> = {
  gym_notice: "Gym's 30-day notice (§36.1)",
  gym_breach: "Gym's breach (§35)",
  mutual: "By mutual agreement",
  term_expiry: "Term expired (§4.1)",
};

export const TERMINATION_CAUSE_NOTE: Record<TerminationCause, string> = {
  gym_notice:
    "The gym's right to exit for convenience. Nil charge, and a recorded notice is required first.",
  gym_breach: "Our right to end the agreement on an enumerated ground. Name the ground in the reason.",
  mutual:
    "Not a clause. Recorded as its own cause because folding it into the notice route would claim a notice we never received.",
  term_expiry: "The initial term ran out and nobody renewed. Not a termination in the document's language.",
};

export const DEDUCTION_KIND_LABEL: Record<DeductionKind, string> = {
  outstanding_dues: "Outstanding dues (§38)",
  retrieval_costs: "Retrieval costs (§37.6)",
  damage: "Damage (§35)",
  other: "Other",
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
