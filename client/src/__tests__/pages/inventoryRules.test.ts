import { describe, expect, it } from "vitest";
import {
  costPerDrink,
  emptyReceiptLine,
  formatQty,
  formatUnitCost,
  itemValues,
  marginShare,
  parseQtyIn,
  recentMonths,
  stockState,
  validateAsset,
  validateItem,
  validateReceiptLine,
  type AssetValues,
} from "@/pages/admin/machines/inventoryRules";
import type { InventoryItem } from "@shared/admin/inventorySchema";

const whey: InventoryItem = {
  itemId: "itm_1",
  name: "Whey chocolate",
  kind: "protein",
  unit: "g",
  packSize: 1000,
  packLabel: "1 kg bag",
  materialIds: ["m1"],
  reorderLevel: 5000,
  active: true,
  avgCostInr: 1.85,
  onHand: 12000,
  inMachines: 3400,
  low: false,
  version: 1,
  updatedAt: null,
  updatedBy: null,
};
const cups: InventoryItem = { ...whey, itemId: "itm_2", name: "Cups", kind: "cup", unit: "pcs", packSize: 50, avgCostInr: 1.2 };

describe("amounts", () => {
  it("shows powder in kg and cups as pieces", () => {
    expect(formatQty(12500, "g")).toBe("12.5 kg");
    expect(formatQty(450, "g")).toBe("450 g");
    expect(formatQty(-1500, "g")).toBe("-1.5 kg");
    expect(formatQty(64, "pcs")).toBe("64 pcs");
  });

  it("prices powder per kg and cups each", () => {
    expect(formatUnitCost(1.85, "g")).toBe("₹1,850.00 per kg");
    expect(formatUnitCost(1.2, "pcs")).toBe("₹1.20 each");
    expect(formatUnitCost(null, "g")).toBe("No price yet");
  });

  it("reads kg typed for powder and refuses part of a cup", () => {
    expect(parseQtyIn("2.5", "g")).toBe(2500);
    expect(parseQtyIn("3", "pcs")).toBe(3);
    expect(parseQtyIn("1.5", "pcs")).toBeNull();
    expect(parseQtyIn("-1", "g")).toBeNull();
  });

  it("asks for a count before calling a negative balance low", () => {
    expect(stockState({ onHand: -10, low: true })).toBe("count");
    expect(stockState({ onHand: 10, low: true })).toBe("low");
    expect(stockState({ onHand: 10, low: false })).toBe("ok");
  });

  it("works out cost per drink and margin only when there were sales", () => {
    expect(costPerDrink(480, 16)).toBe(30);
    expect(costPerDrink(0, 0)).toBeNull();
    expect(marginShare(2400, 480)).toBeCloseTo(0.8);
    expect(marginShare(0, 10)).toBeNull();
  });

  it("lists months back from this IST month, across a year", () => {
    expect(recentMonths(Date.UTC(2026, 0, 31, 20), 3)).toEqual(["2026-02", "2026-01", "2025-12"]);
  });
});

describe("items", () => {
  it("needs a name, a pack size and a pack label", () => {
    const { errors, input } = validateItem({ ...itemValues(null), name: "W" });
    expect(input).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["name", "packLabel", "packSize"]);
  });

  it("keeps an empty reorder level as zero", () => {
    const { input } = validateItem({ ...itemValues(null), name: "Creatine", kind: "powder", packSize: "500", packLabel: "500 g tub" });
    expect(input).toMatchObject({ name: "Creatine", packSize: 500, reorderLevel: 0, unit: "g" });
  });
});

describe("receiving", () => {
  const today = "2026-10-13";

  it("turns packs and pack price into units and a line cost", () => {
    const v = { ...emptyReceiptLine("itm_1"), packs: "20", packPrice: "1850.50", gst: "6663.60", expiresOn: "2027-04-01", batchCode: " B12 " };
    expect(validateReceiptLine(v, whey, today).line).toEqual({
      itemId: "itm_1",
      qty: 20000,
      lineCostInr: 37010,
      gstInr: 6663.6,
      batchCode: "B12",
      expiresOn: "2027-04-01",
    });
  });

  it("needs an expiry on powder but not on cups, and refuses an expired batch", () => {
    const v = { ...emptyReceiptLine("itm_1"), packs: "2", packPrice: "60" };
    expect(validateReceiptLine(v, whey, today).errors.expiresOn).toBe("Powder needs its expiry date.");
    expect(validateReceiptLine({ ...v, itemId: "itm_2" }, cups, today).line).toMatchObject({ qty: 100, lineCostInr: 120, expiresOn: null });
    expect(validateReceiptLine({ ...v, expiresOn: today }, whey, today).errors.expiresOn).toBe("This batch has already expired.");
  });

  it("refuses part packs and paise past two places", () => {
    const { errors } = validateReceiptLine({ ...emptyReceiptLine("itm_2"), packs: "1.5", packPrice: "1.234" }, cups, today);
    expect(errors).toMatchObject({ packs: expect.any(String), packPrice: expect.any(String) });
  });
});

describe("machine assets", () => {
  const base: AssetValues = {
    serialNo: "GS-2026-0042",
    sn: "",
    model: "GS805",
    supplier: "",
    invoiceNo: "",
    purchasedOn: "2026-09-01",
    cost: "285000",
    gst: "",
    landed: "",
    status: "in_warehouse",
    warehouseId: "wh_1",
    note: "",
  };

  it("keeps the warehouse only while the machine is in one", () => {
    expect(validateAsset(base, "2026-10-13").input).toMatchObject({ warehouseId: "wh_1", sn: null, gstInr: 0 });
    expect(validateAsset({ ...base, status: "in_transit" }, "2026-10-13").input?.warehouseId).toBeNull();
  });

  it("needs an SN at a gym and a reason when retired", () => {
    expect(validateAsset({ ...base, status: "deployed" }, "2026-10-13").errors.sn).toBeDefined();
    expect(validateAsset({ ...base, status: "retired" }, "2026-10-13").errors.note).toBeDefined();
    expect(validateAsset({ ...base, purchasedOn: "2026-10-14" }, "2026-10-13").errors.purchasedOn).toBeDefined();
  });
});
