export interface SavedOrder {
  token: string;
  sn: string;
  drinkName: string;
  savedAt: number;
  account?: boolean;
}

const KEY = "mbp:shop-orders";
export const SAVED_ORDERS_MAX = 10;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isSaved(value: unknown): value is SavedOrder {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.token === "string" && typeof v.sn === "string" && typeof v.drinkName === "string" && typeof v.savedAt === "number" && (v.account === undefined || typeof v.account === "boolean");
}

export function savedOrders(): SavedOrder[] {
  try {
    const parsed: unknown = JSON.parse(store()?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: SavedOrder): void {
  const next = [order, ...savedOrders().filter((o) => o.token !== order.token)].slice(0, SAVED_ORDERS_MAX);
  try {
    store()?.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

export const isAccountOrder = (token: string) => savedOrders().some((o) => o.token === token && o.account === true);

export function receiptHref(token: string): string {
  return `/drinks/receipt#t=${encodeURIComponent(token)}`;
}

export function tokenFromHash(hash: string): string | null {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get("t");
  return value && /^[A-Za-z0-9_-]{20,128}$/.test(value) ? value : null;
}
