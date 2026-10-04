const IST_OFFSET_MS = 330 * 60_000;
const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const END_QUICK_MONTHS = [
  { months: 1, short: "1 mo", label: "1 month" },
  { months: 3, short: "3 mo", label: "3 months" },
  { months: 6, short: "6 mo", label: "6 months" },
  { months: 12, short: "1 yr", label: "1 year" },
] as const;

export const istNowInput = (now: number): string => new Date(now + IST_OFFSET_MS).toISOString().slice(0, 16);

export function addMonths(value: string, months: number): string {
  const m = INPUT_PATTERN.exec(value);
  if (!m) return "";
  const [, y, mo, d, h, min] = m.map(Number) as [number, number, number, number, number, number];
  const target = new Date(Date.UTC(y, mo - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  target.setUTCHours(h, min);
  return target.toISOString().slice(0, 16);
}

export const quickEnd = (start: string, months: number, now: number): string =>
  addMonths(INPUT_PATTERN.test(start) ? start : istNowInput(now), months);
