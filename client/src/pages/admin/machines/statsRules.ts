import type { AdStats, Order, OrderStats, SalesStats, StatPeriod } from "@shared/admin/machinesSchema";
import { toCsv } from "./csv";
import { formatIstStamp } from "./MachinesUi";
import { PAY_METHOD_LABEL, STATUS_LABEL } from "./orderLabels";

export const PERIOD_LABEL: Record<StatPeriod, string> = { day: "Daily", month: "Monthly", year: "Yearly" };

export const MAX_RANGE_DAYS: Record<StatPeriod, number> = { day: 92, month: 731, year: 1827 };

const DAY_MS = 86_400_000;
const IST_MS = 5.5 * 3_600_000;

export const istToday = (now: number): string => new Date(now + IST_MS).toISOString().slice(0, 10);

const shiftDays = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export function defaultRange(period: StatPeriod, today: string): { from: string; to: string } {
  if (period === "day") return { from: shiftDays(today, -29), to: today };
  if (period === "month") return { from: `${Number(today.slice(0, 4)) - 1}-${today.slice(5, 7)}-01`, to: today };
  return { from: `${Number(today.slice(0, 4)) - 4}-01-01`, to: today };
}

export function rangeErrors(period: StatPeriod, from: string, to: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!from) errors.from = "Pick a start date.";
  if (!to) errors.to = "Pick an end date.";
  if (from && to) {
    const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
    if (days < 1) errors.to = "Must be on or after the start date.";
    else if (days > MAX_RANGE_DAYS[period]) errors.to = `A ${PERIOD_LABEL[period].toLowerCase()} report covers up to ${MAX_RANGE_DAYS[period]} days.`;
  }
  return errors;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function periodLabel(period: string): string {
  const [y, m, d] = period.split("-");
  if (!m) return y ?? period;
  const month = MONTHS[Number(m) - 1] ?? m;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

const money = (inr: number): string => inr.toFixed(2);

export const orderStatsCsv = (s: OrderStats): string =>
  toCsv(
    ["Period", "Machine number", "Machine name", "SN", "Completed orders", "Amount (INR)"],
    s.rows.map((r) => [r.period, r.deviceExtNo, r.machineName, r.sn, r.orders, money(r.amountInr)]),
  );

export const salesStatsCsv = (s: SalesStats): string =>
  toCsv(
    ["Period", "Goods", "Goods ID", "Machine number", "Machine name", "SN", "Drinks made", "Amount (INR)"],
    s.rows.map((r) => [r.period, r.goodsName, r.goodsId, r.deviceExtNo, r.machineName, r.sn, r.drinks, money(r.amountInr)]),
  );

export const adStatsCsv = (s: AdStats): string =>
  toCsv(
    ["Period", "Machine number", "Machine name", "SN", "Ad", "Ad ID", "Plays", "Clicks", "Shown from", "Shown to"],
    s.rows.map((r) => [
      r.period,
      r.deviceExtNo,
      r.machineName,
      r.sn,
      r.adName ?? "Deleted ad",
      r.adId,
      r.plays,
      r.clicks,
      r.window ? formatIstStamp(r.window.startAt) : "",
      r.window ? formatIstStamp(r.window.endAt) : "",
    ]),
  );

export const ordersCsv = (orders: readonly Order[]): string =>
  toCsv(
    ["Order number", "Machine number", "Machine name", "SN", "Goods", "Amount (INR)", "Payment method", "Redeem code", "Status", "Dispensed", "Failure reason", "Order time (IST)"],
    orders.map((o) => [
      o.orderId,
      o.deviceExtNo,
      o.machineName,
      o.sn,
      o.goodsName,
      money(o.amountInr),
      PAY_METHOD_LABEL[o.payMethod],
      o.redeemCode,
      STATUS_LABEL[o.status],
      o.dispensed ? "Yes" : "No",
      o.failReason,
      formatIstStamp(o.createdAt),
    ]),
  );

export const csvName = (report: string, from: string, to: string): string => `mbp-${report}-${from}-to-${to}.csv`;

export const notReporting = (machines: AdStats["machines"]) => machines.filter((m) => m.adStats === "off");

export const ORDERS_EXPORT_MAX = 10_000;
