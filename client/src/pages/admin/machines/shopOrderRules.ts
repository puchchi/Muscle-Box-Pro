import type { ShopDrink } from "@shared/shop/shopSchema";
import type { ShopAdminOrder, ShopAdminStatus, ShopCustomerDetail, ShopOrderFilters } from "@shared/admin/shopAdminSchema";

export const SHOP_STATUS_LABEL: Record<ShopAdminStatus, { text: string; className: string }> = {
  created: { text: "Awaiting payment", className: "bg-secondary text-muted-foreground" },
  paid: { text: "Paid, no code yet", className: "bg-sky-400/10 text-sky-200" },
  coded: { text: "Code issued", className: "bg-emerald-400/10 text-emerald-200" },
  refund_owed: { text: "Refund queued", className: "bg-amber-400/10 text-amber-200" },
  refunding: { text: "Refunding", className: "bg-amber-400/10 text-amber-200" },
  refunded: { text: "Refunded", className: "bg-violet-400/15 text-violet-200" },
  refund_failed: { text: "Refund failed", className: "bg-rose-400/10 text-rose-300" },
  failed: { text: "Failed", className: "bg-rose-400/10 text-rose-300" },
  unknown: { text: "Unknown", className: "bg-secondary text-muted-foreground" },
};

type Actionable = Pick<ShopAdminOrder, "status" | "code" | "codeUsed" | "pendingReissue">;

const liveCode = (o: Actionable) => o.status === "coded" && o.code !== null && o.codeUsed !== true;

export const canRefund = (o: Actionable) => liveCode(o) && o.pendingReissue === null;
export const canReissue = liveCode;
export const canRetryRefund = (o: Actionable) => o.status === "refund_failed";

export function reissueDrinks(drinks: ShopDrink[], paidPaise: number): ShopDrink[] {
  return drinks.filter((d) => !d.comingSoon && !d.soldOut && d.pricePaise > 0 && d.pricePaise <= paidPaise);
}

export type FreeCode = { customerId: string; n: number; code: string | null; at: string };
export type ShopListRow = { kind: "order"; order: ShopAdminOrder } | ({ kind: "free" } & FreeCode);

const utcMonth = (iso: string) => iso.slice(0, 7);

export function withFreeCodes(
  orders: ShopAdminOrder[],
  customers: ReadonlyMap<string, ShopCustomerDetail>,
  filters: ShopOrderFilters,
  hasMore: boolean,
  now: number,
): ShopListRow[] {
  const rows: ShopListRow[] = orders.map((order) => ({ kind: "order", order }));
  if (filters.sn || (filters.status && filters.status !== "coded")) return rows;

  const ids = filters.customerId ? [filters.customerId] : [...new Set(orders.flatMap((o) => (o.customerId ? [o.customerId] : [])))];
  const month = filters.month ?? utcMonth(new Date(now).toISOString());
  const oldest = orders.at(-1)?.createdAt ?? null;
  const free: FreeCode[] = ids.flatMap((customerId) =>
    (customers.get(customerId)?.rewards ?? []).flatMap((r) => {
      if (!r.createdAt) return [];
      if (!filters.customerId && utcMonth(r.createdAt) !== month) return [];
      if (filters.status === "coded" && r.status !== "coded") return [];
      if (hasMore && (oldest === null || r.createdAt < oldest)) return [];
      return [{ customerId, n: r.n, code: r.status === "coded" ? r.code : null, at: r.createdAt }];
    }),
  );
  free.sort((a, b) => (a.at < b.at ? 1 : -1));

  const merged: ShopListRow[] = [];
  let i = 0;
  for (const row of rows) {
    const at = row.kind === "order" ? row.order.createdAt : null;
    while (i < free.length && at !== null && free[i]!.at > at) merged.push({ kind: "free", ...free[i++]! });
    merged.push(row);
  }
  while (i < free.length) merged.push({ kind: "free", ...free[i++]! });
  return merged;
}
