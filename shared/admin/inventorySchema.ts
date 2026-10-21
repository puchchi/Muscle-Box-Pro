import * as z from "zod";

// docs/inventory-backend-requirements.md is the contract for every shape here.

const instant = z.string().nullable();
const actor = z.string().nullable().optional().transform((v) => v ?? null);
const inr = z.number().finite();
const qty = z.number().finite();
const text = z.string().nullable().optional().transform((v) => v ?? "");

export const ITEM_KINDS = ["protein", "powder", "cup", "other"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_UNITS = ["g", "ml", "pcs"] as const;
export type ItemUnit = (typeof ITEM_UNITS)[number];

export const MOVEMENT_TYPES = ["receive", "transfer", "refill", "unload", "consume", "write_off", "adjust"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const WRITE_OFF_REASONS = ["expired", "damaged", "lost"] as const;
export type WriteOffReason = (typeof WRITE_OFF_REASONS)[number];

export const ASSET_STATUSES = ["in_warehouse", "in_transit", "deployed", "repair", "retired"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const itemSchema = z.object({
  itemId: z.string().min(1),
  name: z.string(),
  kind: z.enum(ITEM_KINDS),
  unit: z.enum(ITEM_UNITS),
  packSize: z.number().positive(),
  packLabel: text,
  materialIds: z.array(z.string()),
  reorderLevel: qty,
  active: z.boolean(),
  avgCostInr: inr.nullable(),
  onHand: qty,
  inMachines: qty,
  low: z.boolean(),
  version: z.number().int().min(0),
  updatedAt: instant,
  updatedBy: actor,
});

export const itemsSchema = z.object({ items: z.array(itemSchema) });
export const itemEnvelopeSchema = z.object({ item: itemSchema });

export const warehouseSchema = z.object({
  warehouseId: z.string().min(1),
  name: z.string(),
  address: text,
  active: z.boolean(),
  machines: z.number().int().min(0),
  version: z.number().int().min(0),
});

export const warehousesSchema = z.object({ items: z.array(warehouseSchema) });
export const warehouseEnvelopeSchema = z.object({ warehouse: warehouseSchema });

export const homesSchema = z.object({ items: z.array(z.object({ sn: z.string().min(1), warehouseId: z.string().nullable() })) });

const placeSchema = z.object({ kind: z.enum(["warehouse", "machine"]), id: z.string(), name: z.string() });

export const stockSchema = z.object({
  items: z.array(
    z.object({
      place: placeSchema,
      itemId: z.string(),
      qty,
      avgCostInr: inr.nullable(),
      valueInr: inr,
    }),
  ),
});

export const batchesSchema = z.object({
  items: z.array(
    z.object({
      batchId: z.string(),
      itemId: z.string(),
      warehouseId: z.string(),
      supplier: text,
      batchCode: text,
      expiresOn: z.string().nullable(),
      qtyReceived: qty,
      qtyLeft: qty,
    }),
  ),
});

export const movementSchema = z.object({
  movementId: z.string(),
  at: z.string(),
  by: actor,
  type: z.enum(MOVEMENT_TYPES),
  itemId: z.string(),
  itemName: z.string(),
  unit: z.enum(ITEM_UNITS),
  qty,
  unitCostInr: inr,
  from: placeSchema.nullable(),
  to: placeSchema.nullable(),
  reason: z.string().nullable().optional().transform((v) => v ?? null),
  note: z.string().nullable().optional().transform((v) => v ?? null),
  ref: z
    .object({
      invoiceNo: z.string().optional(),
      supplier: z.string().optional(),
      orderId: z.string().optional(),
      sn: z.string().optional(),
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const movementsSchema = z.object({ items: z.array(movementSchema), nextCursor: z.string().nullable() });

export const movementsResultSchema = z.object({ movements: z.array(movementSchema) });

export const costReportSchema = z.object({
  month: z.string(),
  totals: z.object({ salesInr: inr, drinks: qty, cogsInr: inr, wastageInr: inr, unpricedDrinks: qty }),
  byItem: z.array(
    z.object({ itemId: z.string(), name: z.string(), unit: z.enum(ITEM_UNITS), consumedQty: qty, cogsInr: inr, wastedQty: qty, wastageInr: inr }),
  ),
  byMachine: z.array(
    z.object({ sn: z.string(), machineName: z.string(), drinks: qty, salesInr: inr, cogsInr: inr, wastageInr: inr }),
  ),
});

export const assetSchema = z.object({
  assetId: z.string().min(1),
  serialNo: z.string(),
  sn: z.string().nullable(),
  model: z.string(),
  supplier: text,
  invoiceNo: text,
  purchasedOn: z.string().nullable(),
  costInr: inr,
  gstInr: inr,
  landedCostInr: inr,
  status: z.enum(ASSET_STATUSES),
  warehouseId: z.string().nullable(),
  note: text,
  placement: z
    .object({ machineName: z.string().nullable(), gymName: z.string().nullable(), franchiseName: z.string().nullable() })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  version: z.number().int().min(0),
  updatedAt: instant,
  updatedBy: actor,
});

export const assetsSchema = z.object({ items: z.array(assetSchema) });
export const assetEnvelopeSchema = z.object({ asset: assetSchema });

export type InventoryItem = z.infer<typeof itemSchema>;
export type Warehouse = z.infer<typeof warehouseSchema>;
export type StockBalance = z.infer<typeof stockSchema>["items"][number];
export type Batch = z.infer<typeof batchesSchema>["items"][number];
export type Movement = z.infer<typeof movementSchema>;
export type Place = z.infer<typeof placeSchema>;
export type CostReport = z.infer<typeof costReportSchema>;
export type Asset = z.infer<typeof assetSchema>;

export type ItemInput = {
  name: string;
  kind: ItemKind;
  unit: ItemUnit;
  packSize: number;
  packLabel: string;
  materialIds: string[];
  reorderLevel: number;
  active: boolean;
};

export type WarehouseInput = { name: string; address: string; active: boolean };

export type ReceiptLine = { itemId: string; qty: number; lineCostInr: number; gstInr: number; batchCode: string; expiresOn: string | null };
export type ReceiptInput = { warehouseId: string; supplier: string; invoiceNo: string; receivedOn: string; lines: ReceiptLine[] };

export type WriteOffInput = { warehouseId: string; reason: WriteOffReason; note: string; lines: { itemId: string; qty: number }[] };

export type CountInput = { warehouseId: string; lines: { itemId: string; counted: number }[] };

export type MovementFilters = { itemId?: string; type?: MovementType; place?: string; from?: string; to?: string };

export type AssetInput = {
  serialNo: string;
  sn: string | null;
  model: string;
  supplier: string;
  invoiceNo: string;
  purchasedOn: string | null;
  costInr: number;
  gstInr: number;
  landedCostInr: number;
  status: AssetStatus;
  warehouseId: string | null;
  note: string;
};
