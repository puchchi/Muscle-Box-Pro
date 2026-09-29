import type { AdInput, AdScheduleInput } from "@shared/admin/machines";
import type { Ad, AdSchedule } from "@shared/admin/machinesSchema";

export const AD_NAME_MAX = 40;
export const AD_DESCRIPTION_MAX = 200;
export const MAX_SCHEDULE_ROWS = 50;

export type ScheduleRow = {
  key: string;
  id?: string;
  allMachines: boolean;
  sns: string[];
  start: string;
  end: string;
  sort: string;
};

export const istInputValue = (iso: string | null): string => (iso ? iso.slice(0, 16) : "");

let rowSeq = 0;
export const newRowKey = (): string => `row-${++rowSeq}`;

export function rowsOf(schedules: AdSchedule[]): ScheduleRow[] {
  return schedules.map((s) => ({
    key: newRowKey(),
    id: s.id,
    allMachines: s.allMachines,
    sns: s.sns,
    start: istInputValue(s.startAt),
    end: istInputValue(s.endAt),
    sort: String(s.sort),
  }));
}

export function blankRow(sort: number): ScheduleRow {
  return { key: newRowKey(), allMachines: true, sns: [], start: "", end: "", sort: String(sort) };
}

export function validateSchedules(rows: ScheduleRow[]): { errors: Record<string, string>; input: AdScheduleInput[] | null } {
  const errors: Record<string, string> = {};
  if (rows.length > MAX_SCHEDULE_ROWS) errors.schedules = `Up to ${MAX_SCHEDULE_ROWS} rows.`;
  const input = rows.map((row, i): AdScheduleInput => {
    const at = `schedules.${i}`;
    if (!row.allMachines && row.sns.length === 0) errors[`${at}.sns`] = "Choose at least one machine, or all machines.";
    if (!row.start) errors[`${at}.start`] = "Required.";
    if (!row.end) errors[`${at}.end`] = "Required.";
    else if (row.start && row.start >= row.end) errors[`${at}.end`] = "Must be after the start.";
    const sort = Number(row.sort.trim());
    if (row.sort.trim() === "" || !Number.isInteger(sort) || sort < 0 || sort > 9999) {
      errors[`${at}.sort`] = "A whole number from 0 to 9999.";
    }
    return {
      ...(row.id ? { id: row.id } : {}),
      allMachines: row.allMachines,
      sns: row.allMachines ? [] : row.sns,
      start: row.start,
      end: row.end,
      sort,
    };
  });
  return Object.keys(errors).length > 0 ? { errors, input: null } : { errors, input };
}

export function validateAdFields(
  values: { name: string; description: string },
  fileUrl: string | null,
): { errors: Record<string, string>; input: AdInput | null } {
  const errors: Record<string, string> = {};
  const name = values.name.trim();
  const description = values.description.trim();
  if (!name) errors.name = "Required.";
  else if (name.length > AD_NAME_MAX) errors.name = `Up to ${AD_NAME_MAX} characters.`;
  if (description.length > AD_DESCRIPTION_MAX) errors.description = `Up to ${AD_DESCRIPTION_MAX} characters.`;
  if (!fileUrl) errors.file = "Upload a picture or a video.";
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return { errors, input: { name, description, file: { url: fileUrl! } } };
}

export type ScheduleState = "live" | "upcoming" | "ended";

export function scheduleState(s: { startAt: string | null; endAt: string | null }, now: number): ScheduleState {
  const start = s.startAt ? Date.parse(s.startAt) : Number.NaN;
  const end = s.endAt ? Date.parse(s.endAt) : Number.NaN;
  if (end <= now) return "ended";
  if (start > now) return "upcoming";
  return "live";
}

export function whereShown(ad: Pick<Ad, "schedules">, now: number): string {
  const current = ad.schedules.filter((s) => scheduleState(s, now) !== "ended");
  if (current.length === 0) return ad.schedules.length === 0 ? "Not shown" : "Ended";
  if (current.some((s) => s.allMachines)) return "All machines";
  const machines = new Set(current.flatMap((s) => s.sns)).size;
  return `${machines} machine${machines === 1 ? "" : "s"}`;
}
