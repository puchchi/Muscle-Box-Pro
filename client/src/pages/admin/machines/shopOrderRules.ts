import type { ShopDrink } from "@shared/shop/shopSchema";
import type { ShopAdminOrder, ShopAdminStatus } from "@shared/admin/shopAdminSchema";

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
