import {
  ASSET_STATUSES,
  ITEM_KINDS,
  ITEM_UNITS,
  type AssetInput,
  type AssetStatus,
  type InventoryItem,
  type ItemInput,
  type ItemKind,
  type ItemUnit,
  type MovementType,
  type Place,
  type ReceiptLine,
} from "@shared/admin/inventorySchema";
import { hasTwoDecimalsAtMost, parseNumber } from "./formBits";
import { formatRupees } from "./MachinesUi";

export const KIND_LABEL: Record<ItemKind, string> = {
  protein: "Protein",
  powder: "Other powder",
  cup: "Cups",
  other: "Other",
};

export const UNIT_LABEL: Record<ItemUnit, string> = { g: "grams", ml: "millilitres", pcs: "pieces" };

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receive: "Received",
  transfer: "Moved",
  refill: "Refilled",
  unload: "Taken out",
  consume: "Used in drinks",
  write_off: "Written off",
  adjust: "Count correction",
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  in_warehouse: "In warehouse",
  in_transit: "On the way",
  deployed: "At a gym",
  repair: "Being repaired",
  retired: "Retired",
};

const BIG: Partial<Record<ItemUnit, { factor: number; unit: string }>> = { g: { factor: 1000, unit: "kg" }, ml: { factor: 1000, unit: "L" } };

const number = (n: number, digits: number) => n.toLocaleString("en-IN", { maximumFractionDigits: digits });

export function formatQty(qty: number, unit: ItemUnit): string {
  const big = BIG[unit];
  if (big && Math.abs(qty) >= big.factor) return `${number(qty / big.factor, 2)} ${big.unit}`;
  return `${number(qty, unit === "pcs" ? 0 : 1)} ${unit}`;
}

export function formatUnitCost(avgCostInr: number | null, unit: ItemUnit): string {
  if (avgCostInr === null) return "No price yet";
  const big = BIG[unit];
  return big ? `${formatRupees(avgCostInr * big.factor)} per ${big.unit}` : `${formatRupees(avgCostInr)} each`;
}

const NO_PLACE: Partial<Record<MovementType, string>> = { receive: "Supplier", consume: "Drinks", write_off: "Gone", adjust: "Count" };

export function placeLabel(place: Place | null, type?: MovementType): string {
  if (!place) return (type && NO_PLACE[type]) ?? "—";
  return place.kind === "machine" ? `Machine ${place.name || place.id}` : place.name || place.id;
}

export type StockState = "count" | "low" | "ok";

export function stockState(item: Pick<InventoryItem, "onHand" | "low">): StockState {
  if (item.onHand < 0) return "count";
  return item.low ? "low" : "ok";
}

export type ItemValues = {
  name: string;
  kind: ItemKind;
  unit: ItemUnit;
  packSize: string;
  packLabel: string;
  materialIds: string[];
  reorderLevel: string;
  active: boolean;
};

export const DEFAULT_UNIT: Record<ItemKind, ItemUnit> = { protein: "g", powder: "g", cup: "pcs", other: "pcs" };

export function itemValues(item: InventoryItem | null): ItemValues {
  return {
    name: item?.name ?? "",
    kind: item?.kind ?? "protein",
    unit: item?.unit ?? "g",
    packSize: item ? String(inEntryUnit(item.packSize, item.unit)) : "",
    packLabel: item?.packLabel ?? "",
    materialIds: item?.materialIds ?? [],
    reorderLevel: item ? String(inEntryUnit(item.reorderLevel, item.unit)) : "",
    active: item?.active ?? true,
  };
}

export function validateItem(v: ItemValues): { errors: Record<string, string>; input: ItemInput | null } {
  const errors: Record<string, string> = {};
  const name = v.name.trim();
  if (name.length < 2) errors.name = "At least 2 characters.";
  else if (name.length > 80) errors.name = "Up to 80 characters.";
  if (!(ITEM_KINDS as readonly string[]).includes(v.kind)) errors.kind = "Choose a kind.";
  if (!(ITEM_UNITS as readonly string[]).includes(v.unit)) errors.unit = "Choose a unit.";
  const packSize = parseQtyIn(v.packSize, v.unit);
  if (packSize === null || packSize <= 0) errors.packSize = v.unit === "pcs" ? "A whole number, such as 50." : "Such as 1 for a 1 kg bag.";
  const packLabel = v.packLabel.trim();
  if (!packLabel) errors.packLabel = "How a pack is called, such as 1 kg bag.";
  else if (packLabel.length > 40) errors.packLabel = "Up to 40 characters.";
  const reorderLevel = v.reorderLevel.trim() === "" ? 0 : parseQtyIn(v.reorderLevel, v.unit);
  if (reorderLevel === null) errors.reorderLevel = v.unit === "pcs" ? "A whole number, 0 or more." : "0 or more.";
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: {
      name,
      kind: v.kind,
      unit: v.unit,
      packSize: packSize!,
      packLabel,
      materialIds: v.materialIds,
      reorderLevel: reorderLevel!,
      active: v.active,
    },
  };
}

export type ReceiptLineValues = { itemId: string; packs: string; packPrice: string; gst: string; batchCode: string; expiresOn: string };

export const emptyReceiptLine = (itemId = ""): ReceiptLineValues => ({ itemId, packs: "", packPrice: "", gst: "", batchCode: "", expiresOn: "" });

const rupees = (text: string): number | null => {
  const n = parseNumber(text);
  return n === null || Number.isNaN(n) || n < 0 || !hasTwoDecimalsAtMost(n) ? null : n;
};

export function validateReceiptLine(
  v: ReceiptLineValues,
  item: InventoryItem | undefined,
  today: string,
): { errors: Record<string, string>; line: ReceiptLine | null } {
  const errors: Record<string, string> = {};
  if (!item) errors.itemId = "Choose an item.";
  const packs = parseNumber(v.packs);
  if (packs === null || Number.isNaN(packs) || packs <= 0 || !Number.isInteger(packs)) errors.packs = "A whole number of packs.";
  const packPrice = rupees(v.packPrice);
  if (packPrice === null) errors.packPrice = "Price in rupees, such as 1850.";
  const gst = v.gst.trim() === "" ? 0 : rupees(v.gst);
  if (gst === null) errors.gst = "Rupees, or leave empty.";
  const needsExpiry = item?.kind === "protein" || item?.kind === "powder";
  if (!v.expiresOn) {
    if (needsExpiry) errors.expiresOn = "Powder needs its expiry date.";
  } else if (v.expiresOn <= today) errors.expiresOn = "This batch has already expired.";
  if (v.batchCode.trim().length > 40) errors.batchCode = "Up to 40 characters.";
  if (Object.keys(errors).length > 0 || !item) return { errors, line: null };
  return {
    errors,
    line: {
      itemId: item.itemId,
      qty: packs! * item.packSize,
      lineCostInr: Math.round(packs! * packPrice! * 100) / 100,
      gstInr: gst!,
      batchCode: v.batchCode.trim(),
      expiresOn: v.expiresOn || null,
    },
  };
}

export function parseQtyIn(text: string, unit: ItemUnit): number | null {
  const n = parseNumber(text);
  if (n === null || Number.isNaN(n) || n < 0) return null;
  const big = BIG[unit];
  return big ? Math.round(n * big.factor * 1000) / 1000 : Number.isInteger(n) ? n : null;
}

export const entryUnit = (unit: ItemUnit): string => BIG[unit]?.unit ?? unit;

export const inEntryUnit = (qty: number, unit: ItemUnit): number => qty / (BIG[unit]?.factor ?? 1);

export function istMonth(now: number): string {
  return new Date(now + 19_800_000).toISOString().slice(0, 7);
}

export function recentMonths(now: number, count: number): string[] {
  const [y, m] = istMonth(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function costPerDrink(cogsInr: number, drinks: number): number | null {
  return drinks > 0 ? cogsInr / drinks : null;
}

export function marginShare(salesInr: number, cogsInr: number): number | null {
  return salesInr > 0 ? (salesInr - cogsInr) / salesInr : null;
}

export const formatShare = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

export type AssetValues = {
  serialNo: string;
  sn: string;
  model: string;
  supplier: string;
  invoiceNo: string;
  purchasedOn: string;
  cost: string;
  gst: string;
  landed: string;
  status: AssetStatus;
  warehouseId: string;
  note: string;
};

export function validateAsset(v: AssetValues, today: string): { errors: Record<string, string>; input: AssetInput | null } {
  const errors: Record<string, string> = {};
  const serialNo = v.serialNo.trim();
  if (!serialNo) errors.serialNo = "The serial on the machine's plate.";
  else if (serialNo.length > 60) errors.serialNo = "Up to 60 characters.";
  const model = v.model.trim();
  if (!model) errors.model = "Required, such as GS805.";
  if (v.purchasedOn && v.purchasedOn > today) errors.purchasedOn = "Can't be in the future.";
  const cost = rupees(v.cost);
  if (cost === null) errors.cost = "Price in rupees, before GST.";
  const gst = v.gst.trim() === "" ? 0 : rupees(v.gst);
  if (gst === null) errors.gst = "Rupees, or leave empty.";
  const landed = v.landed.trim() === "" ? 0 : rupees(v.landed);
  if (landed === null) errors.landed = "Rupees, or leave empty.";
  if (!(ASSET_STATUSES as readonly string[]).includes(v.status)) errors.status = "Choose where it is.";
  const sn = v.sn.trim();
  if (v.status === "deployed" && !sn) errors.sn = "A machine at a gym is enrolled. Add its machine SN.";
  if (v.status === "in_warehouse" && !v.warehouseId) errors.warehouseId = "Choose the warehouse.";
  const note = v.note.trim();
  if (v.status === "retired" && !note) errors.note = "Say why it was retired.";
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: {
      serialNo,
      sn: sn || null,
      model,
      supplier: v.supplier.trim(),
      invoiceNo: v.invoiceNo.trim(),
      purchasedOn: v.purchasedOn || null,
      costInr: cost!,
      gstInr: gst!,
      landedCostInr: landed!,
      status: v.status,
      warehouseId: v.status === "in_warehouse" ? v.warehouseId : null,
      note,
    },
  };
}
