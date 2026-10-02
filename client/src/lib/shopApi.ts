import { z, type ZodType } from "zod";
import {
  SHOP_ERROR_CODES,
  shopMenuSchema,
  shopMeSchema,
  shopMyCodesSchema,
  shopMyOrdersSchema,
  shopOrderCreatedSchema,
  shopReceiptSchema,
  shopSignedInSchema,
  type ShopCustomer,
  type ShopError,
  type ShopErrorCode,
  type ShopMenu,
  type ShopMyCode,
  type ShopMyOrders,
  type ShopOrderCreated,
  type ShopReceipt,
  type ShopResult,
  type ShopSignedIn,
} from "@shared/shop/shopSchema";
import { rememberSandboxBearer, sandboxBearer, setSignedInHint } from "./shopSession";

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
  method: "GET" | "POST" | "DELETE",
  path: string,
  schema: ZodType<T, any, any>,
  { token, body, session = false }: { token?: string; body?: unknown; session?: boolean } = {},
): Promise<ShopResult<T>> {
  if (SHOP_API_BASE_URL === null) return { ok: false, error: NETWORK };
  const headers: Record<string, string> = {};
  if (token) headers[TOKEN_HEADER] = token;
  const writes = method !== "GET";
  if (writes) headers["Content-Type"] = "application/json";
  const bearer = session ? sandboxBearer(SHOP_API_BASE_URL) : null;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  let response: Response;
  try {
    response = await fetch(`${SHOP_API_BASE_URL}${path}`, {
      method,
      headers,
      body: writes ? JSON.stringify(body ?? {}) : undefined,
      credentials: session ? "include" : "omit",
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
  if (!response.ok) {
    const error = errorOf(response.status, parsed);
    if (session && error.code === "signed_out") setSignedInHint(false);
    return { ok: false, error };
  }
  const result = schema.safeParse(parsed);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: NETWORK };
}

export function fetchShopMenu(sn: string): Promise<ShopResult<ShopMenu>> {
  return shopRequest("GET", `/machines/${encodeURIComponent(sn)}`, shopMenuSchema);
}

export function createShopOrder(sn: string, goodsId: string, { asCustomer = false } = {}): Promise<ShopResult<ShopOrderCreated>> {
  return shopRequest("POST", "/orders", shopOrderCreatedSchema, { body: { sn, goodsId }, session: asCustomer });
}

export function fetchShopReceipt(token: string): Promise<ShopResult<ShopReceipt>> {
  return shopRequest("GET", "/order", shopReceiptSchema, { token });
}

const acceptedSchema = z.object({ accepted: z.literal(true) });

export function emailShopCode(token: string, email: string): Promise<ShopResult<{ accepted: true }>> {
  return shopRequest("POST", "/order/email", acceptedSchema, { token, body: { email } });
}

export function requestSigninCode(email: string, sn: string | null): Promise<ShopResult<{ accepted: true }>> {
  return shopRequest("POST", "/auth/code", acceptedSchema, { body: sn ? { email, sn } : { email } });
}

export async function verifySignin(
  email: string,
  code: string,
  { sn, claimToken }: { sn: string | null; claimToken?: string | null },
): Promise<ShopResult<ShopSignedIn>> {
  const body = { email, code, ...(sn ? { sn } : {}), ...(claimToken ? { claimToken } : {}) };
  const result = await shopRequest("POST", "/auth/verify", shopSignedInSchema, { body, session: true });
  if (result.ok) {
    rememberSandboxBearer(SHOP_API_BASE_URL, result.data.sessionToken);
    setSignedInHint(true);
  }
  return result;
}

export async function fetchMe(): Promise<ShopResult<ShopCustomer>> {
  const result = await shopRequest("GET", "/me", shopMeSchema, { session: true });
  return result.ok ? { ok: true, data: result.data.customer } : result;
}

export async function fetchMyCodes(): Promise<ShopResult<ShopMyCode[]>> {
  const result = await shopRequest("GET", "/me/codes", shopMyCodesSchema, { session: true });
  return result.ok ? { ok: true, data: result.data.codes } : result;
}

export function fetchMyOrders(cursor: string | null): Promise<ShopResult<ShopMyOrders>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return shopRequest("GET", `/me/orders${query}`, shopMyOrdersSchema, { session: true });
}

export async function signOut(): Promise<void> {
  await shopRequest("POST", "/logout", z.unknown(), { session: true });
  setSignedInHint(false);
}

export async function deleteAccount(): Promise<ShopResult<{ deleted: true }>> {
  const result = await shopRequest("DELETE", "/me", z.object({ deleted: z.literal(true) }), { session: true });
  if (result.ok) setSignedInHint(false);
  return result;
}
