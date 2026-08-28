/**
 * Timestamps as a gym owner in India reads them.
 *
 * Extracted from `GymDashboard` when a second component needed them. Both are here rather
 * than in `shared/`, because the rule they encode is a *display* rule and the shared
 * formatter deliberately does the opposite — see below.
 */

/**
 * An ISO timestamp as a date.
 *
 * **Not `formatAgreementDate`, and the difference matters.** That one formats in UTC because
 * its output goes inside the hashed agreement text, where the same record must render
 * identically on every machine. Feed it a timestamp and a service at 01:00 IST prints as the
 * previous day — correct for a hash, wrong for a person who watched the engineer leave.
 *
 * `installationDate` still goes through `formatAgreementDate`: it is a date string with no
 * time in it, so there is no timezone to get wrong.
 */
export function formatIstDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/**
 * The same instant with its time of day, for the one place that needs the minute.
 *
 * A date alone cannot answer the only question a freshness stamp is asked — "is this from
 * before or after I looked this morning?" — so the header carries the clock and says which
 * one: IST, spelled out, because a partner reading "12:00" has no way to know whose noon
 * it is.
 */
export function formatIstDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // `hourCycle`, not `hour12`. The two are not synonyms: `hour12: true` selects the h11
    // cycle in this locale, which numbers noon as 00 and printed midday as "00:00 pm".
    hourCycle: "h12",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
