import type { PromotionInput } from "@shared/admin/machines";
import type { Promotion, PromotionKind, PromotionStatus } from "@shared/admin/machinesSchema";
import { hasTwoDecimalsAtMost, parseNumber } from "./formBits";
import { istInputValue } from "./adRules";
import { REFRESH_NOTE } from "./MachinesUi";

export const PROMOTION_NAME_MAX = 40;
export const MAX_PROMOTION_ITEMS = 100;

export const KIND_COPY: Record<PromotionKind, { title: string; one: string; href: string; section: "discounts" | "newProducts" }> = {
  discount: { title: "Discounts", one: "discount", href: "/machines/discounts", section: "discounts" },
  new: { title: "New products", one: "new-product promotion", href: "/machines/new-products", section: "newProducts" },
};

export const PROMOTION_STATUS_LABEL: Record<PromotionStatus, { text: string; className: string }> = {
  not_started: { text: "Not started", className: "bg-sky-400/15 text-sky-200" },
  active: { text: "Active", className: "bg-emerald-400/15 text-emerald-200" },
  paused: { text: "Paused", className: "bg-amber-400/15 text-amber-200" },
  ended: { text: "Ended", className: "bg-secondary text-muted-foreground" },
};

export type PromotionItemRow = { key: string; goodsId: string; price: string };

export type PromotionValues = {
  name: string;
  start: string;
  end: string;
  allMachines: boolean;
  sns: string[];
  items: PromotionItemRow[];
};

let itemSeq = 0;
export const blankItem = (): PromotionItemRow => ({ key: `item-${++itemSeq}`, goodsId: "", price: "" });

export function valuesOf(p: Promotion | null): PromotionValues {
  if (!p) return { name: "", start: "", end: "", allMachines: true, sns: [], items: [blankItem()] };
  return {
    name: p.name,
    start: istInputValue(p.startAt),
    end: istInputValue(p.endAt),
    allMachines: p.allMachines,
    sns: p.sns,
    items: p.items.map((i) => ({ ...blankItem(), goodsId: i.goodsId, price: i.priceInr === null ? "" : String(i.priceInr) })),
  };
}

export function validatePromotion(kind: PromotionKind, v: PromotionValues): { errors: Record<string, string>; input: PromotionInput | null } {
  const errors: Record<string, string> = {};
  const name = v.name.trim();
  if (!name) errors.name = "Required.";
  else if (name.length > PROMOTION_NAME_MAX) errors.name = `Up to ${PROMOTION_NAME_MAX} characters.`;
  if (!v.start) errors.start = "Required.";
  if (!v.end) errors.end = "Required.";
  else if (v.start && v.start >= v.end) errors.end = "Must be after the start.";
  if (!v.allMachines && v.sns.length === 0) errors.sns = "Choose at least one machine, or all machines.";
  if (v.items.length === 0) errors.items = "Add at least one good.";
  else if (v.items.length > MAX_PROMOTION_ITEMS) errors.items = `Up to ${MAX_PROMOTION_ITEMS} goods.`;

  const seen = new Set<string>();
  const items = v.items.map((row, i): PromotionInput["items"][number] => {
    if (!row.goodsId) errors[`items.${i}.goodsId`] = "Choose a good.";
    else if (seen.has(row.goodsId)) errors[`items.${i}.goodsId`] = "This good is already in the list.";
    seen.add(row.goodsId);
    if (kind === "new") return { goodsId: row.goodsId };
    const price = parseNumber(row.price);
    if (price === null || Number.isNaN(price) || price <= 0) errors[`items.${i}.priceInr`] = "Enter a price above ₹0.";
    else if (!hasTwoDecimalsAtMost(price)) errors[`items.${i}.priceInr`] = "Up to 2 decimals.";
    return { goodsId: row.goodsId, priceInr: price ?? 0 };
  });

  if (Object.keys(errors).length > 0) return { errors, input: null };
  return { errors, input: { name, start: v.start, end: v.end, allMachines: v.allMachines, sns: v.allMachines ? [] : v.sns, items } };
}

export function whereLabel(p: Pick<Promotion, "allMachines" | "sns">): string {
  if (p.allMachines) return "All machines";
  return `${p.sns.length} machine${p.sns.length === 1 ? "" : "s"}`;
}

export function overlapWarning(overlaps: { name: string }[]): string | null {
  if (overlaps.length === 0) return null;
  const names = overlaps.map((o) => o.name).join(", ");
  return `This overlaps with ${names} on some goods and machines. Where both apply, the lower price wins.`;
}

export function savedNotice(p: Pick<Promotion, "status">, lead: string, wasActive = false): string {
  if (p.status === "active" || wasActive) return `${lead} ${REFRESH_NOTE}`;
  if (p.status === "not_started") return `${lead} Machines pick it up at the start time.`;
  return lead;
}
