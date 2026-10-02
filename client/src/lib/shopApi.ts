import { z, type ZodType } from "zod";
import {
  SHOP_ERROR_CODES,
  shopMenuSchema,
  shopOrderCreatedSchema,
  shopReceiptSchema,
  type ShopError,
  type ShopErrorCode,
  type ShopMenu,
  type ShopOrderCreated,
  type ShopReceipt,
  type ShopResult,
} from "@shared/shop/shopSchema";

// Explicit only, never derived from the onboarding host: an unset variable keeps /drinks on its holding page.
export const SHOP_API_BASE_URL: string | null = process.env.NEXT_PUBLIC_MBP_SHOP_API_URL?.replace(/\/+$/, "") || null;

const TOKEN_HEADER = "x-shop-order-token";
const TIMEOUT_MS = 20_000;

const NETWORK: ShopError = { code: "network", message: "We couldn't reach MuscleBoxPro. Check your connection and try again." };
const RATE_LIMITED: ShopError = { code: "rate_limited", message: "Too many tries. Wait a minute and try again." };
const KNOWN = new Set<string>(SHOP_ERROR_CODES);

function errorOf(status: number, body: unknown): ShopError {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof envelope.code === "string" && KNOWN.has(envelope.code) ? (envelope.code as ShopErrorCode) : null;
  if (code === null) return status === 429 ? RATE_LIMITED : NETWORK;
  const message = typeof envelope.message === "string" && envelope.message.trim() ? envelope.message : NETWORK.message;
  const error: ShopError = { code, message };
  if (envelope.fieldErrors && typeof envelope.fieldErrors === "object") {
    const fields = Object.entries(envelope.fieldErrors as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    if (fields.length > 0) error.fieldErrors = Object.fromEntries(fields);
  }
  return error;
}

async function shopRequest<T>(
  method: "GET" | "POST",
  path: string,
  schema: ZodType<T, any, any>,
  { token, body }: { token?: string; body?: unknown } = {},
): Promise<ShopResult<T>> {
  if (SHOP_API_BASE_URL === null) return { ok: false, error: NETWORK };
  const headers: Record<string, string> = {};
  if (token) headers[TOKEN_HEADER] = token;
  if (method === "POST") headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${SHOP_API_BASE_URL}${path}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: NETWORK };
  }

  let parsed: unknown;
  try {
    const text = await response.text();
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    return { ok: false, error: NETWORK };
  }
  if (!response.ok) return { ok: false, error: errorOf(response.status, parsed) };
  const result = schema.safeParse(parsed);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: NETWORK };
}

export function fetchShopMenu(sn: string): Promise<ShopResult<ShopMenu>> {
  return shopRequest("GET", `/machines/${encodeURIComponent(sn)}`, shopMenuSchema);
}

export function createShopOrder(sn: string, goodsId: string): Promise<ShopResult<ShopOrderCreated>> {
  return shopRequest("POST", "/orders", shopOrderCreatedSchema, { body: { sn, goodsId } });
}

export function fetchShopReceipt(token: string): Promise<ShopResult<ShopReceipt>> {
  return shopRequest("GET", "/order", shopReceiptSchema, { token });
}

const acceptedSchema = z.object({ accepted: z.literal(true) });

export function emailShopCode(token: string, email: string): Promise<ShopResult<{ accepted: true }>> {
  return shopRequest("POST", "/order/email", acceptedSchema, { token, body: { email } });
}
