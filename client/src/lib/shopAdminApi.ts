import type * as z from "zod";
import { apiBaseUrl, shopAdminRequest, type ApiMethod } from "./apiClient";
import { queryString, type MachineCall } from "./adminMachineApi";
import { parseWith } from "@shared/admin/machinesSchema";
import {
  shopAdminOrderEnvelopeSchema,
  shopAdminOrdersSchema,
  shopCustomerDetailSchema,
  shopCustomersSchema,
  type ShopOrderFilters,
} from "@shared/admin/shopAdminSchema";

export const shopAdminConfigured = () => apiBaseUrl("shopAdmin") !== null;

async function call<S extends z.ZodTypeAny>(schema: S, method: ApiMethod, path: string, body?: unknown): Promise<MachineCall<z.infer<S>>> {
  const result = await shopAdminRequest<unknown>(method, path, body);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseWith(schema, result.data);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "network", message: "The server answered in a shape this page does not understand. The details are below." },
      issues: parsed.issues,
    };
  }
  return { ok: true, data: parsed.data };
}

const seg = encodeURIComponent;

export const fetchShopOrders = (filters: ShopOrderFilters, cursor: string | null) =>
  call(shopAdminOrdersSchema, "GET", `/orders${queryString({ ...filters, cursor })}`);

export const fetchShopOrder = (id: string) => call(shopAdminOrderEnvelopeSchema, "GET", `/orders/${seg(id)}`);

export const refundShopOrder = (id: string, reason: string) =>
  call(shopAdminOrderEnvelopeSchema, "POST", `/orders/${seg(id)}/refund`, { reason });

export const retryShopRefund = (id: string) => call(shopAdminOrderEnvelopeSchema, "POST", `/orders/${seg(id)}/retry-refund`, {});

export type ReissueRequest = { sn: string; goodsId: string; reason: string };

export const reissueShopOrder = (id: string, target: ReissueRequest) =>
  call(shopAdminOrderEnvelopeSchema, "POST", `/orders/${seg(id)}/reissue`, target);

export const fetchShopCustomers = (cursor: string | null) => call(shopCustomersSchema, "GET", `/customers${queryString({ cursor })}`);

export const fetchShopCustomer = (id: string, ledgerCursor: string | null = null) =>
  call(shopCustomerDetailSchema, "GET", `/customers/${seg(id)}${queryString({ ledgerCursor })}`);
