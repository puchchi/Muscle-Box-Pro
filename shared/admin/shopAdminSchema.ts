import * as z from "zod";
import { SHOP_ORDER_STATUSES, type ShopOrderStatus } from "../shop/shopSchema";

const stamp = z
  .union([z.number().finite(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const date = new Date(v);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  });

const text = z.string().nullable().optional().transform((v) => v ?? "");
const maybe = z.string().nullable().optional().transform((v) => (v ? v : null));
const tally = z.number().int().optional().catch(undefined).transform((v) => v ?? 0);

export type ShopAdminStatus = ShopOrderStatus | "unknown";

const status = z
  .string()
  .catch("unknown")
  .transform((v): ShopAdminStatus => ((SHOP_ORDER_STATUSES as readonly string[]).includes(v) ? (v as ShopOrderStatus) : "unknown"));

const pendingReissueSchema = z.object({
  n: z.number().int(),
  sn: z.string().min(1),
  machineName: text,
  goodsId: z.string().min(1),
  drinkName: text,
});

const previousCodeSchema = z.object({
  code: z.string().min(1),
  replacedAt: stamp,
  by: text,
  reissue: tally,
});

const listOf = <S extends z.ZodTypeAny>(item: S) =>
  z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((rows) => (rows ?? []).flatMap((row) => {
      const parsed = item.safeParse(row);
      return parsed.success ? [parsed.data as z.infer<S>] : [];
    }));

const refundSchema = z.object({
  requestedBy: maybe,
  requestedAt: stamp,
  reason: maybe,
  retries: tally,
});

export const shopAdminOrderSchema = z
  .object({
    shopOrderId: z.string().min(1),
    status,
    sn: z.string(),
    machineName: text,
    drink: z.object({ goodsId: text, name: text }).nullable().optional().catch(null),
    pricePaise: z.number().int().min(0),
    code: maybe,
    customerId: maybe,
    guestEmail: maybe,
    razorpayPaymentId: maybe,
    refundId: maybe,
    createdAt: stamp,
    paidAt: stamp,
    codedAt: stamp,
    failedAt: stamp,
    refund: refundSchema.nullable().optional().catch(null),
    reissues: tally,
    pendingReissue: pendingReissueSchema.nullable().optional().catch(null).transform((v) => v ?? null),
    previousCodes: listOf(previousCodeSchema),
  })
  .transform(({ drink, refund, ...order }) => ({
    ...order,
    goodsId: drink?.goodsId ?? "",
    drinkName: drink?.name ?? "",
    refundRequestedBy: refund?.requestedBy ?? null,
    refundRequestedAt: refund?.requestedAt ?? null,
    refundReason: refund?.reason ?? null,
    refundRetries: refund?.retries ?? 0,
    codeUsed: null as boolean | null,
  }));

const cursor = z.string().nullable().optional().transform((v) => v ?? null);

export const shopAdminOrdersSchema = z
  .object({ orders: z.array(shopAdminOrderSchema), nextCursor: cursor })
  .transform(({ orders, nextCursor }) => ({ items: orders, nextCursor }));

const codeStatusSchema = z.object({ usedCount: z.number().int() }).nullable().optional().catch(null);

export const shopAdminOrderEnvelopeSchema = z
  .object({ order: shopAdminOrderSchema, codeStatus: codeStatusSchema })
  .transform(({ order, codeStatus }) => ({ order: { ...order, codeUsed: codeStatus ? codeStatus.usedCount > 0 : null } }));

export const shopCustomerRowSchema = z.object({
  customerId: z.string().min(1),
  email: maybe,
  name: maybe,
  joinedSn: maybe,
  joinedGymId: maybe,
  joinedFranchiseId: maybe,
  createdAt: stamp,
  stamps: z.number().int(),
  lifetimeDrinks: tally,
  rewardsIssued: tally,
  balancePaise: tally,
  deletedAt: stamp,
});

export const shopCustomersSchema = z
  .object({ customers: z.array(shopCustomerRowSchema), nextCursor: cursor })
  .transform(({ customers, nextCursor }) => ({ items: customers, nextCursor }));

const rewardSchema = z.object({
  n: tally,
  status: z.enum(["pending", "coded"]).catch("pending"),
  code: maybe,
  createdAt: stamp,
  codedAt: stamp,
});

export const LEDGER_KINDS = ["top_up", "purchase", "drink_refund", "support_refund", "payout_reversed"] as const;
export const TOP_UP_STATUSES = ["created", "credited", "failed"] as const;
export const PAYOUT_STATUSES = ["owed", "refunding", "refunded", "failed", "unknown"] as const;

const oneOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).or(z.string().transform(() => "other" as const));

const ledgerEntrySchema = z.object({
  kind: oneOf(LEDGER_KINDS),
  amountPaise: z.number().int(),
  balanceAfterPaise: z.number().int(),
  shopOrderId: maybe,
  topUpId: maybe,
  payoutId: maybe,
  createdAt: stamp,
});

const topUpSchema = z.object({
  topUpId: z.string().min(1),
  status: oneOf(TOP_UP_STATUSES),
  amountPaise: z.number().int(),
  refundedPaise: tally,
  razorpayOrderId: maybe,
  razorpayPaymentId: maybe,
  createdAt: stamp,
  creditedAt: stamp,
  refundableUntil: stamp,
});

const payoutSchema = z.object({
  payoutId: z.string().min(1),
  status: oneOf(PAYOUT_STATUSES),
  amountPaise: z.number().int(),
  topUpId: maybe,
  refundId: maybe,
  error: maybe,
  requestedBy: maybe,
  reason: maybe,
  resolvedBy: maybe,
  resolveReason: maybe,
  createdAt: stamp,
  refundedAt: stamp,
  failedAt: stamp,
  resolvedAt: stamp,
});

export const shopCustomerDetailSchema = z.object({
  customer: shopCustomerRowSchema,
  orders: listOf(shopAdminOrderSchema),
  nextCursor: cursor,
  rewards: listOf(rewardSchema),
  ledger: listOf(ledgerEntrySchema),
  ledgerCursor: cursor,
  topUps: listOf(topUpSchema),
  payouts: listOf(payoutSchema),
});

export type ShopAdminOrder = z.infer<typeof shopAdminOrderSchema>;
export type ShopCustomerRow = z.infer<typeof shopCustomerRowSchema>;
export type ShopCustomerDetail = z.infer<typeof shopCustomerDetailSchema>;
export type ShopLedgerEntry = ShopCustomerDetail["ledger"][number];
export type ShopTopUp = ShopCustomerDetail["topUps"][number];
export type ShopPayout = ShopCustomerDetail["payouts"][number];

export type ShopOrderFilters = {
  month?: string;
  status?: ShopOrderStatus;
  sn?: string;
  customerId?: string;
};
