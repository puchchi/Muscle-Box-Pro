import { describe, expect, it } from "vitest";
import { validateMachine } from "@/pages/admin/machines/MachineForm";
import { checkPin } from "@/pages/admin/machines/MachinePinTab";
import { checkRowDraft } from "@/pages/admin/machines/MachineGoodsTab";
import { fillAdd, newLevel, restockLines } from "@/pages/admin/machines/MachineStockTab";
import { amountFieldOf, checkPicture, validateGood } from "@/pages/admin/machines/GoodEditor";
import { validateMaterial } from "@/pages/admin/AdminMachineMaterials";
import { formatIstStamp, formatRupees } from "@/pages/admin/machines/MachinesUi";
import { machineFilters } from "@/pages/admin/AdminMachines";
import type { Material, StockSlot } from "@shared/admin/machinesSchema";

const machineValues = {
  sn: "SN0001",
  modelId: "m1",
  deviceExtNo: "MBP-01",
  name: "Gold's Gym Andheri",
  servicePhone: "+91 98200 00000",
  address: "",
  latitude: "",
  longitude: "",
  hotMax: "85",
  hotMin: "80",
  coldMax: "8",
  coldMin: "5",
  enabled: true,
};

describe("validateMachine", () => {
  it("accepts a complete machine", () => {
    const { errors, input } = validateMachine(machineValues, true);
    expect(errors).toEqual({});
    expect(input).toMatchObject({ sn: "SN0001", latitude: null, longitude: null, hotMax: 85, coldMin: 5 });
  });

  it("refuses a short or odd SN only when adding", () => {
    expect(validateMachine({ ...machineValues, sn: "ab" }, true).errors.sn).toBeDefined();
    expect(validateMachine({ ...machineValues, sn: "a b c d" }, true).errors.sn).toBeDefined();
    expect(validateMachine({ ...machineValues, sn: "" }, false).errors.sn).toBeUndefined();
  });

  it("wants both coordinates or neither", () => {
    expect(validateMachine({ ...machineValues, latitude: "19.1" }, true).errors.longitude).toBe("Give both or neither.");
    expect(validateMachine({ ...machineValues, latitude: "91", longitude: "72" }, true).errors.latitude).toBeDefined();
  });

  it("checks temperature ranges and order", () => {
    expect(validateMachine({ ...machineValues, hotMax: "99" }, true).errors.hotMax).toBe("Must be 40 to 98.");
    expect(validateMachine({ ...machineValues, hotMin: "85" }, true).errors.hotMin).toBe("Must be below the maximum.");
    expect(validateMachine({ ...machineValues, coldMin: "9" }, true).errors.coldMin).toBe("Must be below the maximum.");
  });

  it("checks the machine number and phone characters", () => {
    expect(validateMachine({ ...machineValues, deviceExtNo: "MBP_01" }, true).errors.deviceExtNo).toBeDefined();
    expect(validateMachine({ ...machineValues, deviceExtNo: "A".repeat(17) }, true).errors.deviceExtNo).toBeDefined();
    expect(validateMachine({ ...machineValues, servicePhone: "call me" }, true).errors.servicePhone).toBeDefined();
  });
});

describe("checkPin", () => {
  it("accepts 4 to 8 matching digits", () => {
    expect(checkPin("1234", "1234")).toEqual({});
    expect(checkPin("12345678", "12345678")).toEqual({});
  });

  it("refuses the open PIN, bad lengths and a mismatch", () => {
    expect(checkPin("000000", "000000").pin).toBeDefined();
    expect(checkPin("123", "123").pin).toBe("4 to 8 digits.");
    expect(checkPin("123456789", "123456789").pin).toBe("4 to 8 digits.");
    expect(checkPin("1234", "1235").confirmPin).toBe("The PINs don't match.");
    expect(checkPin("1234", "").confirmPin).toBe("Required.");
  });
});

describe("checkRowDraft", () => {
  it("sends null for an empty price so the library price is used", () => {
    expect(checkRowDraft({ price: "", sort: "3" })).toEqual({ patch: { devicePriceInr: null, sort: 3 }, errors: {} });
  });

  it("refuses prices out of range or with three decimals", () => {
    expect(checkRowDraft({ price: "10001", sort: "0" }).errors.price).toBeDefined();
    expect(checkRowDraft({ price: "1.005", sort: "0" }).errors.price).toBe("Up to 2 decimals.");
    expect(checkRowDraft({ price: "99.5", sort: "0" }).patch.devicePriceInr).toBe(99.5);
  });

  it("wants a whole sort from 0 to 9999", () => {
    expect(checkRowDraft({ price: "", sort: "-1" }).errors.sort).toBeDefined();
    expect(checkRowDraft({ price: "", sort: "1.5" }).errors.sort).toBeDefined();
    expect(checkRowDraft({ price: "", sort: "" }).errors.sort).toBeDefined();
  });
});

const slot: StockSlot = {
  slotId: "s1",
  materialId: "m1",
  name: "Whey",
  position: "1",
  rawType: "powder",
  unit: "g",
  capacity: 1000,
  warnCapacity: 100,
  residueQty: 400,
  low: false,
};

describe("stock math", () => {
  it("clamps the new level to 0..capacity", () => {
    expect(newLevel(slot, 200)).toBe(600);
    expect(newLevel(slot, 5000)).toBe(1000);
    expect(newLevel(slot, -900)).toBe(0);
  });

  it("fills to a share of capacity and never subtracts", () => {
    expect(fillAdd(slot, 1)).toBe(600);
    expect(fillAdd(slot, 0.5)).toBe(100);
    expect(fillAdd(slot, 0.25)).toBe(0);
  });

  it("builds lines from filled rows and carries the level the admin saw", () => {
    const other = { ...slot, slotId: "s2", residueQty: 10 };
    const third = { ...slot, slotId: "s3" };
    expect(restockLines([slot, other, third], { s1: "600", s2: "0", s3: " " })).toEqual({
      lines: [{ slotId: "s1", add: 600, seenResidueQty: 400 }],
      errors: {},
    });
  });

  it("refuses fractions and text", () => {
    expect(restockLines([slot], { s1: "1.5" }).errors.s1).toBe("A whole number.");
    expect(restockLines([slot], { s1: "abc" }).errors.s1).toBe("A whole number.");
  });
});

const material = (id: string, rawType: string, enabled = true): Material =>
  ({ materialId: id, rawType, name: id, enabled, position: "1" }) as Material;

const goodValues = { no: "G01", name: "Whey shake", nameEn: "", spec: "300 ml", price: "149", sort: "0", modelId: "m1" };

describe("amountFieldOf", () => {
  it("picks the board field by material type", () => {
    expect(amountFieldOf("water")).toBe("waterQty");
    expect(amountFieldOf("hotWater")).toBe("waterQty");
    expect(amountFieldOf("ice")).toBe("kqty");
    expect(amountFieldOf("powder")).toBe("qty");
    expect(amountFieldOf(undefined)).toBe("qty");
  });
});

describe("validateGood", () => {
  const materials = [material("powder1", "powder"), material("water1", "water"), material("off", "sugar", false)];

  it("puts each amount in the field for its material", () => {
    const { errors, input } = validateGood(
      goodValues,
      [
        { key: 1, materialId: "powder1", amount: "30", waterType: "1" },
        { key: 2, materialId: "water1", amount: "250", waterType: "2" },
      ],
      "https://cdn.example/g.png",
      materials,
    );
    expect(errors).toEqual({});
    expect(input?.recipe).toEqual([
      { materialId: "powder1", qty: 30, waterQty: 0, kqty: 0, waterType: 1 },
      { materialId: "water1", qty: 0, waterQty: 250, kqty: 0, waterType: 2 },
    ]);
    expect(input?.image).toEqual({ url: "https://cdn.example/g.png" });
  });

  it("wants a picture, a material and an amount above 0", () => {
    const { errors } = validateGood(goodValues, [{ key: 1, materialId: "", amount: "0", waterType: "1" }], null, materials);
    expect(errors.image).toBeDefined();
    expect(errors["recipe.0.materialId"]).toBe("Choose a material.");
    expect(errors["recipe.0.qty"]).toBe("Must be above 0.");
  });

  it("refuses a disabled material", () => {
    const { errors } = validateGood(goodValues, [{ key: 1, materialId: "off", amount: "5", waterType: "1" }], "u", materials);
    expect(errors["recipe.0.materialId"]).toBe("off is disabled.");
  });

  it("checks price and sort", () => {
    const line = [{ key: 1, materialId: "powder1", amount: "5", waterType: "1" as const }];
    expect(validateGood({ ...goodValues, price: "" }, line, "u", materials).errors.priceInr).toBe("Required.");
    expect(validateGood({ ...goodValues, price: "1.234" }, line, "u", materials).errors.priceInr).toBe("Up to 2 decimals.");
    expect(validateGood({ ...goodValues, sort: "10000" }, line, "u", materials).errors.sort).toBeDefined();
    expect(validateGood({ ...goodValues, sort: "-9999" }, line, "u", materials).errors.sort).toBeUndefined();
  });
});

describe("checkPicture", () => {
  const png = { type: "image/png", size: 1000 };
  it("accepts a square PNG of 420 px or more", () => {
    expect(checkPicture(png, { width: 420, height: 420 })).toBeNull();
  });

  it("refuses other types, big files, non-squares and small pictures", () => {
    expect(checkPicture({ type: "image/webp", size: 1 }, { width: 500, height: 500 })).toBe("PNG or JPG only.");
    expect(checkPicture({ ...png, size: 2 * 1024 * 1024 + 1 }, { width: 500, height: 500 })).toBe("Up to 2 MB.");
    expect(checkPicture(png, { width: 500, height: 400 })).toContain("square");
    expect(checkPicture(png, { width: 400, height: 400 })).toContain("at least 420");
    expect(checkPicture(png, null)).toBeDefined();
  });
});

describe("validateMaterial", () => {
  const values = {
    name: "Whey",
    position: "3",
    rawType: "powder",
    unit: "g",
    capacity: "1000",
    warnCapacity: "100",
    expendRate: "1.5",
    enabled: true,
  };

  it("accepts a complete material", () => {
    expect(validateMaterial(values).input).toEqual({
      name: "Whey",
      position: "3",
      unit: "g",
      capacity: 1000,
      warnCapacity: 100,
      expendRate: 1.5,
      enabled: true,
    });
  });

  it("wants a slot from 1 to 99", () => {
    expect(validateMaterial({ ...values, position: "0" }).errors.position).toBeDefined();
    expect(validateMaterial({ ...values, position: "100" }).errors.position).toBeDefined();
    expect(validateMaterial({ ...values, position: "99" }).errors.position).toBeUndefined();
  });

  it("wants the warning below capacity", () => {
    expect(validateMaterial({ ...values, warnCapacity: "1000" }).errors.warnCapacity).toBe("Must be below Capacity.");
  });
});

describe("formatting", () => {
  it("shows rupees with Indian grouping", () => {
    expect(formatRupees(125000)).toBe("₹1,25,000.00");
    expect(formatRupees(0)).toBe("₹0.00");
  });

  it("shows times in IST", () => {
    expect(formatIstStamp("2026-09-28T18:40:05Z")).toBe("2026-09-29 00:10:05");
    expect(formatIstStamp(null)).toBe("—");
    expect(formatIstStamp("not a date")).toBe("not a date");
  });
});

describe("machineFilters", () => {
  it("combines the health tile, the one search field and the model", () => {
    expect(machineFilters("offline", "sn", " GS01 ", "m1")).toEqual({ network: "offline", sn: "GS01", modelId: "m1" });
    expect(machineFilters("all", "name", "  ", "")).toEqual({ name: undefined, modelId: undefined });
    expect(machineFilters("faulty", "deviceExtNo", "MBP", "")).toMatchObject({ fault: "faulty", deviceExtNo: "MBP" });
  });
});
