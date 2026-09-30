import * as z from "zod";
import { toParse, type AdminParse } from "./parse";

export type { AdminParse };

const instant = z.string().nullable();
const actor = z.string().nullable().optional().transform((v) => v ?? null);
const inr = z.number().finite();
const count = z.number().int().min(0);
const flag = z.boolean().optional().transform((v) => v ?? false);
const optionalInstant = instant.optional().transform((v) => v ?? null);

export const summarySchema = z.object({
  machines: count,
  online: count,
  offline: count,
  faulty: count,
  lowStock: count,
  restartPending: count,
  ordersToday: count,
  salesTodayInr: inr,
});

export const machineRowSchema = z.object({
  sn: z.string().min(1),
  deviceExtNo: z.string(),
  name: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  enabled: z.boolean(),
  online: z.boolean(),
  lastSeenAt: instant,
  runStatus: z.number().nullable(),
  faultStatus: z.enum(["normal", "exception", "unknown"]),
  faultRemark: z.string(),
  statusAt: instant,
  stockStatus: z.enum(["lack", "normal"]),
  stockRemark: z.string(),
  restartPending: z.boolean(),
  freeVend: flag,
  hasFactoryPin: flag,
});

export const machineListSchema = z.object({ items: z.array(machineRowSchema), total: count });

export const machineSchema = z.object({
  sn: z.string().min(1),
  deviceExtNo: z.string(),
  name: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  protocol: z.string(),
  hardwareVersion: z.string(),
  servicePhone: z.string(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  hotMax: z.number(),
  hotMin: z.number(),
  coldMax: z.number(),
  coldMin: z.number(),
  enabled: z.boolean(),
  qrPay: flag,
  freeVend: flag,
  freeVendChangedAt: optionalInstant,
  freeVendChangedBy: actor,
  firstSeenAt: instant,
  lastSeenAt: instant,
  lastBootAt: instant,
  restartPending: z.boolean(),
  hasPin: z.boolean(),
  pinChangedAt: instant,
  pinChangedBy: actor,
  hasFactoryPin: flag,
  factoryPinChangedAt: optionalInstant,
  factoryPinChangedBy: actor,
  version: z.number().int().min(0),
  createdAt: instant,
  createdBy: actor,
  updatedAt: instant,
  updatedBy: actor,
});

export const machineEnvelopeSchema = z.object({ machine: machineSchema });

export const pinResultSchema = z.object({ pinChangedAt: instant, pinChangedBy: actor });

export const factoryPinResultSchema = z.object({ factoryPinChangedAt: instant, factoryPinChangedBy: actor });

export const factoryPinBulkResultSchema = factoryPinResultSchema.extend({ updated: count });

const imageSchema = z
  .object({ url: z.string(), path: z.string(), fileName: z.string(), md5: z.string() })
  .nullable();

export const machineGoodSchema = z.object({
  goodsId: z.string().min(1),
  no: z.string(),
  name: z.string(),
  nameEn: z.string(),
  spec: z.string(),
  image: imageSchema,
  libraryPriceInr: inr,
  devicePriceInr: inr.nullable(),
  shownPriceInr: inr,
  listed: z.boolean(),
  soldOut: z.boolean(),
  sort: z.number(),
  updatedAt: instant,
  updatedBy: actor,
});

export const machineGoodsSchema = z.object({ items: z.array(machineGoodSchema), total: count });

export const availableGoodsSchema = z.object({
  items: z.array(
    z.object({
      goodsId: z.string().min(1),
      no: z.string(),
      name: z.string(),
      nameEn: z.string(),
      spec: z.string(),
      priceInr: inr,
      image: imageSchema,
    }),
  ),
});

export const stockSlotSchema = z.object({
  slotId: z.string().min(1),
  materialId: z.string(),
  name: z.string(),
  position: z.string(),
  rawType: z.string(),
  unit: z.string(),
  capacity: z.number(),
  warnCapacity: z.number(),
  residueQty: z.number(),
  low: z.boolean(),
});

export const stockSchema = z.object({ items: z.array(stockSlotSchema) });

const restockChangeSchema = z.object({
  slotId: z.string(),
  materialId: z.string(),
  name: z.string(),
  before: z.number(),
  add: z.number(),
  after: z.number(),
});

export const restockResultSchema = z.object({
  changes: z.array(restockChangeSchema),
  items: z.array(stockSlotSchema),
});

const nextCursor = z.string().nullable();

export const restockHistorySchema = z.object({
  items: z.array(
    z.object({ at: instant, by: z.string(), byMachine: z.boolean(), changes: z.array(restockChangeSchema) }),
  ),
  nextCursor,
});

export const modelsSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), name: z.string(), protocol: z.string(), versions: z.string() })),
});

export const materialSchema = z.object({
  materialId: z.string().min(1),
  no: z.string(),
  name: z.string(),
  position: z.string(),
  rawType: z.string(),
  unit: z.string(),
  capacity: z.number(),
  warnCapacity: z.number(),
  expendRate: z.number(),
  enabled: z.boolean(),
  version: z.number().int().min(0),
  updatedAt: instant,
  updatedBy: actor,
});

export const materialsSchema = z.object({ items: z.array(materialSchema) });

export const materialSaveSchema = z.object({ material: materialSchema, machinesUpdated: count });

const recipeLineSchema = z.object({
  materialId: z.string(),
  qty: z.number(),
  waterQty: z.number(),
  waterType: z.number(),
  kqty: z.number(),
});

export const goodSchema = z.object({
  goodsId: z.string().min(1),
  no: z.string(),
  name: z.string(),
  nameEn: z.string(),
  spec: z.string(),
  priceInr: inr,
  sort: z.number(),
  modelId: z.string(),
  image: imageSchema,
  recipe: z.array(recipeLineSchema),
  tagline: z.string().optional().transform((v) => v ?? ""),
  nutrition: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional()
    .transform((v) => v ?? []),
  ingredients: z.array(z.string()).optional().transform((v) => v ?? []),
  machinesListed: count,
  version: z.number().int().min(0),
  createdAt: instant,
  createdBy: actor,
  updatedAt: instant,
  updatedBy: actor,
});

export const goodsListSchema = z.object({ items: z.array(goodSchema), total: count });

export const goodEnvelopeSchema = z.object({
  good: goodSchema,
  machinesUpdated: count.optional(),
});

export const listingResultSchema = z.object({ machinesChanged: count, dryRun: z.boolean() });

const orderSchema = z.object({
  orderId: z.string().min(1),
  sn: z.string(),
  deviceExtNo: z.string(),
  machineName: z.string(),
  goodsId: z.string(),
  goodsName: z.string(),
  amountInr: inr,
  payMethod: z.enum(["free", "redeem", "qr"]),
  redeemCode: z.string().nullable(),
  status: z.enum(["created", "unknown", "made", "failed"]),
  dispensed: z.boolean(),
  failReason: z.string().nullable(),
  createdAt: instant,
});

export const ordersSchema = z.object({ items: z.array(orderSchema), nextCursor });

export const REFUND_STATES = ["requested", "pending", "refunded"] as const;

const orderPaymentSchema = z.object({
  paidAt: instant,
  refund: z.enum(REFUND_STATES).nullable(),
  refundReason: z.string().nullable(),
});

export const orderDetailSchema = z.object({
  order: orderSchema.extend({
    payNo: z.string().nullable().optional().transform((v) => v ?? null),
    thirdOrderNo: z.string().nullable().optional().transform((v) => v ?? null),
    payment: orderPaymentSchema.nullable().optional().transform((v) => v ?? null),
    materials: z.array(
      z.object({
        materialId: z.string(),
        amount: z.number().nullable(),
        time: z.number().nullable(),
        strengthOffset: z.number().nullable(),
      }),
    ),
    timeline: z.array(z.object({ state: z.string(), at: instant })),
  }),
});

export const equipmentLogSchema = z.object({
  items: z.array(
    z.object({
      sn: z.string(),
      deviceExtNo: z.string(),
      machineName: z.string(),
      runStatus: z.number().nullable(),
      status: z.enum(["normal", "exception"]),
      faults: z.array(z.object({ code: z.string(), text: z.string() })),
      remark: z.string(),
      at: instant,
    }),
  ),
  nextCursor,
});

export const operationsLogSchema = z.object({
  items: z.array(
    z.object({
      sn: z.string(),
      deviceExtNo: z.string(),
      machineName: z.string(),
      operateType: z.number(),
      type: z.string(),
      content: z.string(),
      broadcastAddress: z.string().nullable().optional().transform((v) => v ?? ""),
      operateTimes: z.string().nullable().optional().transform((v) => v ?? ""),
      receivedAt: instant,
    }),
  ),
  nextCursor,
});

export const uploadStartSchema = z.object({
  uploadId: z.string().min(1),
  url: z.string().url(),
  headers: z.record(z.string()),
  expiresInSeconds: z.number(),
});

const mediaFileSchema = z.object({
  url: z.string(),
  path: z.string(),
  fileName: z.string(),
  md5: z.string(),
  size: z.number().optional(),
  contentType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const uploadCompleteSchema = z.object({ file: mediaFileSchema });

const scheduleSchema = z.object({
  id: z.string().min(1),
  allMachines: z.boolean(),
  sns: z.array(z.string()),
  startAt: instant,
  endAt: instant,
  sort: z.number().int(),
});

export const adSchema = z.object({
  adId: z.string().min(1),
  no: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["image", "video"]),
  file: mediaFileSchema,
  schedules: z.array(scheduleSchema),
  version: z.number().int().min(0),
  createdAt: instant,
  createdBy: actor,
  updatedAt: instant,
  updatedBy: actor,
});

export const adsSchema = z.object({ items: z.array(adSchema), total: count });

export const adEnvelopeSchema = z.object({ ad: adSchema, restartPending: count.optional() });

export const adDeleteSchema = z.object({ deleted: z.literal(true), restartPending: count });

export const VOICE_POSITIONS = ["1", "2", "3", "4", "5"] as const;

const voiceSetSchema = z.object({
  positions: z.object(Object.fromEntries(VOICE_POSITIONS.map((p) => [p, mediaFileSchema.nullable()])) as Record<
    (typeof VOICE_POSITIONS)[number],
    z.ZodNullable<typeof mediaFileSchema>
  >),
  version: z.number().int().min(0),
  updatedAt: instant,
  updatedBy: actor,
});

export const voicesSchema = z.object({
  defaults: voiceSetSchema,
  overrides: z.array(
    z.object({ sn: z.string(), deviceExtNo: z.string(), name: z.string(), positions: z.array(z.enum(VOICE_POSITIONS)) }),
  ),
});

export const voiceDefaultsSaveSchema = z.object({ defaults: voiceSetSchema, restartPending: count });

const effectiveVoiceSchema = z.object({ file: mediaFileSchema, source: z.enum(["machine", "default"]) }).nullable();

export const machineVoicesSchema = z.object({
  defaults: voiceSetSchema,
  override: voiceSetSchema,
  effective: z.object(Object.fromEntries(VOICE_POSITIONS.map((p) => [p, effectiveVoiceSchema])) as Record<
    (typeof VOICE_POSITIONS)[number],
    typeof effectiveVoiceSchema
  >),
  restartPending: count.optional(),
});

export const qrSettingsSchema = z.object({
  logo: mediaFileSchema.nullable(),
  memberQr: mediaFileSchema.nullable(),
  memberTip: z.string(),
  exchangeQr: mediaFileSchema.nullable(),
  exchangeTip: z.string(),
  version: z.number().int().min(0),
  updatedAt: instant,
  updatedBy: actor,
});

export const qrEnvelopeSchema = z.object({ settings: qrSettingsSchema, restartPending: count.optional() });

export const PROMOTION_KINDS = ["discount", "new"] as const;
export const PROMOTION_STATUSES = ["not_started", "active", "paused", "ended"] as const;

export const promotionSchema = z.object({
  promoId: z.string().min(1),
  no: z.string(),
  kind: z.enum(PROMOTION_KINDS),
  name: z.string(),
  startAt: instant,
  endAt: instant,
  status: z.enum(PROMOTION_STATUSES),
  paused: z.boolean(),
  allMachines: z.boolean(),
  sns: z.array(z.string()),
  items: z.array(z.object({ goodsId: z.string().min(1), name: z.string(), priceInr: inr.nullable() })),
  version: z.number().int().min(0),
  createdAt: instant,
  createdBy: actor,
  updatedAt: instant,
  updatedBy: actor,
});

export const promotionsSchema = z.object({ items: z.array(promotionSchema), total: count });

export const promotionGetSchema = z.object({ promotion: promotionSchema });

export const promotionSaveSchema = z.object({
  promotion: promotionSchema,
  overlaps: z.array(z.object({ promoId: z.string(), name: z.string() })),
});

export const deletedSchema = z.object({ deleted: z.literal(true) });

export const CODE_STATUSES = ["active", "not_started", "used_up", "expired", "disabled"] as const;

export const redeemCodeSchema = z.object({
  code: z.string().min(1),
  serialNo: z.string(),
  theme: z.string(),
  goods: z.array(z.object({ goodsId: z.string().min(1), name: z.string() })),
  usesAllowed: count,
  usedCount: count,
  remaining: count,
  validFrom: instant,
  validTo: instant,
  status: z.enum(CODE_STATUSES),
  disabled: z.boolean(),
  allMachines: z.boolean(),
  sns: z.array(z.string()),
  canDelete: z.boolean(),
  lastUsedAt: instant,
  version: z.number().int().min(0),
  createdAt: instant,
  createdBy: actor,
  updatedAt: instant,
  updatedBy: actor,
});

export const redeemCodesSchema = z.object({ items: z.array(redeemCodeSchema), total: count });

export const redeemCodeEnvelopeSchema = z.object({ code: redeemCodeSchema });

export const redeemUsesSchema = z.object({
  items: z.array(
    z.object({
      orderId: z.string(),
      sn: z.string(),
      deviceExtNo: z.string().nullable(),
      goodsId: z.string(),
      goodsName: z.string(),
      at: instant,
      returned: z.boolean(),
      returnedAt: instant,
      orderState: z.string().nullable(),
    }),
  ),
});

export const STAT_PERIODS = ["day", "month", "year"] as const;

const statRange = {
  period: z.enum(STAT_PERIODS),
  from: z.string(),
  to: z.string(),
};

const statMachine = { period: z.string(), sn: z.string(), deviceExtNo: z.string(), machineName: z.string() };

export const orderStatsSchema = z.object({
  ...statRange,
  rows: z.array(z.object({ ...statMachine, orders: count, amountInr: inr })),
  totals: z.object({ orders: count, amountInr: inr }),
});

export const salesStatsSchema = z.object({
  ...statRange,
  rows: z.array(z.object({ ...statMachine, goodsId: z.string(), goodsName: z.string(), drinks: count, amountInr: inr })),
  totals: z.object({ drinks: count, amountInr: inr }),
});

export const AD_STATS_SWITCH = ["on", "off", "unknown"] as const;

export const adStatsSchema = z.object({
  ...statRange,
  rows: z.array(
    z.object({
      ...statMachine,
      adId: z.string(),
      adName: z.string().nullable(),
      plays: count,
      clicks: count,
      window: z.object({ startAt: instant, endAt: instant }).nullable(),
    }),
  ),
  totals: z.object({ plays: count, clicks: count }),
  machines: z.array(
    z.object({ sn: z.string(), deviceExtNo: z.string(), machineName: z.string(), adStats: z.enum(AD_STATS_SWITCH), backedUpAt: instant }),
  ),
});

const storedFile = { name: z.string().min(1), size: count, uploadedAt: instant };

export const logFilesSchema = z.object({ items: z.array(z.object(storedFile)), total: count });

export const crashFilesSchema = z.object({
  items: z.array(z.object({ ...storedFile, appVersion: z.string().nullable(), crashedAt: instant })),
  total: count,
});

export const machineFileSchema = z.object({
  file: z.object({
    name: z.string(),
    size: count,
    url: z.string().url(),
    expiresInSeconds: count,
    text: z.string().optional(),
    truncated: z.boolean().optional(),
  }),
});

const backupRow = { id: z.string().min(1), at: instant, size: count };

export const backupsSchema = z.object({ items: z.array(z.object(backupRow)), total: count });

const backupWithConfig = z.object({ ...backupRow, config: z.record(z.string(), z.unknown()) });

export const backupSchema = z.object({ backup: backupWithConfig, previous: backupWithConfig.nullable() });

export type MachineSummary = z.infer<typeof summarySchema>;
export type MachineRow = z.infer<typeof machineRowSchema>;
export type MachineList = z.infer<typeof machineListSchema>;
export type Machine = z.infer<typeof machineSchema>;
export type PinResult = z.infer<typeof pinResultSchema>;
export type FactoryPinResult = z.infer<typeof factoryPinResultSchema>;
export type MachineGood = z.infer<typeof machineGoodSchema>;
export type MachineGoods = z.infer<typeof machineGoodsSchema>;
export type AvailableGood = z.infer<typeof availableGoodsSchema>["items"][number];
export type StockSlot = z.infer<typeof stockSlotSchema>;
export type RestockResult = z.infer<typeof restockResultSchema>;
export type RestockHistory = z.infer<typeof restockHistorySchema>;
export type RestockEvent = RestockHistory["items"][number];
export type MachineModel = z.infer<typeof modelsSchema>["items"][number];
export type Material = z.infer<typeof materialSchema>;
export type MaterialSave = z.infer<typeof materialSaveSchema>;
export type Good = z.infer<typeof goodSchema>;
export type GoodsList = z.infer<typeof goodsListSchema>;
export type GoodSave = z.infer<typeof goodEnvelopeSchema>;
export type ListingResult = z.infer<typeof listingResultSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Orders = z.infer<typeof ordersSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>["order"];
export type EquipmentLog = z.infer<typeof equipmentLogSchema>;
export type EquipmentLogRow = EquipmentLog["items"][number];
export type OperationsLog = z.infer<typeof operationsLogSchema>;
export type OperationsLogRow = OperationsLog["items"][number];
export type UploadStart = z.infer<typeof uploadStartSchema>;
export type UploadedFile = z.infer<typeof uploadCompleteSchema>["file"];
export type Ad = z.infer<typeof adSchema>;
export type AdSchedule = Ad["schedules"][number];
export type Ads = z.infer<typeof adsSchema>;
export type VoicePosition = (typeof VOICE_POSITIONS)[number];
export type VoiceSet = z.infer<typeof voiceSetSchema>;
export type Voices = z.infer<typeof voicesSchema>;
export type MachineVoices = z.infer<typeof machineVoicesSchema>;
export type QrSettings = z.infer<typeof qrSettingsSchema>;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];
export type Promotion = z.infer<typeof promotionSchema>;
export type Promotions = z.infer<typeof promotionsSchema>;
export type PromotionSave = z.infer<typeof promotionSaveSchema>;
export type CodeStatus = (typeof CODE_STATUSES)[number];
export type RedeemCode = z.infer<typeof redeemCodeSchema>;
export type RedeemCodes = z.infer<typeof redeemCodesSchema>;
export type RedeemUse = z.infer<typeof redeemUsesSchema>["items"][number];

export type StatPeriod = (typeof STAT_PERIODS)[number];
export type OrderStats = z.infer<typeof orderStatsSchema>;
export type SalesStats = z.infer<typeof salesStatsSchema>;
export type AdStats = z.infer<typeof adStatsSchema>;
export type AdStatsSwitch = (typeof AD_STATS_SWITCH)[number];
export type LogFile = z.infer<typeof logFilesSchema>["items"][number];
export type CrashFile = z.infer<typeof crashFilesSchema>["items"][number];
export type MachineFile = z.infer<typeof machineFileSchema>["file"];
export type BackupRow = z.infer<typeof backupsSchema>["items"][number];
export type Backup = z.infer<typeof backupWithConfig>;
export type BackupPair = z.infer<typeof backupSchema>;

export function parseWith<S extends z.ZodTypeAny>(schema: S, raw: unknown): AdminParse<z.infer<S>> {
  return toParse(schema.safeParse(raw));
}
