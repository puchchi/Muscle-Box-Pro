import { z } from "zod";

const paise = z.number().int().nonnegative();

export const shopDrinkSchema = z.object({
  goodsId: z.string().min(1),
  name: z.string(),
  nameEn: z.string().optional().transform((v) => v ?? ""),
  spec: z.string().optional().transform((v) => v ?? ""),
  image: z.string().optional().transform((v) => v ?? ""),
  serveTemp: z.string().optional().transform((v) => (v === "chilled" || v === "hot" ? v : null)),
  soldOut: z.boolean().optional().transform((v) => v === true),
  comingSoon: z.boolean().optional().transform((v) => v === true),
  pricePaise: paise,
  listPricePaise: paise.optional().transform((v) => v ?? null),
});

export const shopMenuSchema = z.object({
  sn: z.string(),
  name: z.string().optional().transform((v) => v ?? ""),
  place: z.string().optional().transform((v) => v ?? ""),
  online: z.boolean().optional().transform((v) => v === true),
  enabled: z.boolean().optional().transform((v) => v === true),
  drinks: z.array(z.unknown()).transform((items) =>
    items.flatMap((item) => {
      const parsed = shopDrinkSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
});

export const shopOrderCreatedSchema = z.object({
  token: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  amount: paise,
  currency: z.string(),
  keyId: z.string().min(1),
});

export const SHOP_ORDER_STATUSES = ["created", "paid", "coded", "refund_owed", "refunding", "refunded", "refund_failed", "failed"] as const;

export const shopReceiptSchema = z.object({
  status: z.enum(SHOP_ORDER_STATUSES),
  drink: z.object({
    goodsId: z.string(),
    name: z.string(),
    image: z.string().optional().transform((v) => v ?? ""),
  }),
  pricePaise: paise,
  sn: z.string(),
  machineName: z.string().optional().transform((v) => v ?? ""),
  code: z.string().nullable().optional().transform((v) => v ?? null),
  used: z.boolean().nullable().optional().transform((v) => v ?? null),
});

export type ShopDrink = z.infer<typeof shopDrinkSchema>;
export type ShopMenu = z.infer<typeof shopMenuSchema>;
export type ShopOrderCreated = z.infer<typeof shopOrderCreatedSchema>;
export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];
export type ShopReceipt = z.infer<typeof shopReceiptSchema>;

export const SHOP_ERROR_CODES = [
  "machine_unknown",
  "machine_disabled",
  "machine_offline",
  "drink_not_listed",
  "sold_out",
  "coming_soon",
  "amount_out_of_band",
  "order_not_found",
  "rate_limited",
  "invalid_request",
  "network",
] as const;

export type ShopErrorCode = (typeof SHOP_ERROR_CODES)[number];

export interface ShopError {
  code: ShopErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ShopResult<T> = { ok: true; data: T } | { ok: false; error: ShopError };

export function formatInr(pricePaise: number): string {
  const rupees = Math.floor(pricePaise / 100).toLocaleString("en-IN");
  const rest = pricePaise % 100;
  return rest === 0 ? `₹${rupees}` : `₹${rupees}.${String(rest).padStart(2, "0")}`;
}
