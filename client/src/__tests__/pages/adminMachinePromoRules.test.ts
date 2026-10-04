import { describe, expect, it } from "vitest";
import { overlapWarning, savedNotice, validatePromotion, valuesOf, type PromotionValues } from "@/pages/admin/machines/promotionRules";
import { codeSavedNotice, codeValuesOf, generateCode, validateCode, validWindow, type CodeValues } from "@/pages/admin/machines/codeRules";
import { REFRESH_NOTE } from "@/pages/admin/machines/MachinesUi";
import type { Promotion, RedeemCode } from "@shared/admin/machinesSchema";

const promo = (patch: Partial<PromotionValues> = {}): PromotionValues => ({
  name: "Monsoon offer",
  start: "2026-10-01T09:00",
  end: "2026-10-08T21:00",
  allMachines: true,
  sns: [],
  items: [{ key: "a", goodsId: "1001", price: "99.5" }],
  ...patch,
});

describe("validatePromotion", () => {
  it("builds a discount input", () => {
    const { errors, input } = validatePromotion("discount", promo());
    expect(errors).toEqual({});
    expect(input).toEqual({
      name: "Monsoon offer",
      start: "2026-10-01T09:00",
      end: "2026-10-08T21:00",
      allMachines: true,
      sns: [],
      items: [{ goodsId: "1001", priceInr: 99.5 }],
    });
  });

  it("drops prices for a new-product promotion", () => {
    const { input } = validatePromotion("new", promo({ items: [{ key: "a", goodsId: "1001", price: "" }] }));
    expect(input?.items).toEqual([{ goodsId: "1001" }]);
  });

  it("names each bad field", () => {
    const { errors, input } = validatePromotion(
      "discount",
      promo({
        name: " ",
        end: "2026-10-01T09:00",
        allMachines: false,
        items: [
          { key: "a", goodsId: "1001", price: "0" },
          { key: "b", goodsId: "1001", price: "10.555" },
          { key: "c", goodsId: "", price: "10" },
        ],
      }),
    );
    expect(input).toBeNull();
    expect(errors).toEqual({
      name: "Required.",
      end: "Must be after the start.",
      sns: "Choose at least one machine, or all machines.",
      "items.0.priceInr": "Enter a price above ₹0.",
      "items.1.goodsId": "This good is already in the list.",
      "items.1.priceInr": "Up to 2 decimals.",
      "items.2.goodsId": "Choose a good.",
    });
  });

  it("needs at least one good", () => {
    expect(validatePromotion("new", promo({ items: [] })).errors.items).toBe("Add at least one good.");
  });

  it("round-trips a saved promotion into form values", () => {
    const saved = {
      name: "Monsoon offer",
      startAt: "2026-10-01T09:00:00+05:30",
      endAt: "2026-10-08T21:00:00+05:30",
      allMachines: false,
      sns: ["SN1"],
      items: [{ goodsId: "1001", name: "Whey", priceInr: 99 }],
    } as Promotion;
    const v = valuesOf(saved);
    expect(v).toMatchObject({ start: "2026-10-01T09:00", end: "2026-10-08T21:00", sns: ["SN1"] });
    expect(v.items[0]).toMatchObject({ goodsId: "1001", price: "99" });
  });
});

describe("promotion notices", () => {
  it("warns about overlaps by name", () => {
    expect(overlapWarning([])).toBeNull();
    expect(overlapWarning([{ name: "Diwali" }, { name: "Weekend" }])).toBe(
      "This overlaps with Diwali, Weekend on some goods and machines. Where both apply, the lower price wins.",
    );
  });

  it("mentions the machine refresh only when the menu changes now", () => {
    expect(savedNotice({ status: "active" }, "Saved.")).toBe(`Saved. ${REFRESH_NOTE}`);
    expect(savedNotice({ status: "paused" }, "Paused.", true)).toBe(`Paused. ${REFRESH_NOTE}`);
    expect(savedNotice({ status: "not_started" }, "Saved.")).toBe("Saved. Machines pick it up at the start time.");
    expect(savedNotice({ status: "ended" }, "Saved.")).toBe("Saved.");
  });
});

const codeValues = (patch: Partial<CodeValues> = {}): CodeValues => ({ ...codeValuesOf(null), code: "abcd1234", theme: "Launch week", goodsIds: ["1001"], ...patch });

describe("validateCode", () => {
  it("uppercases a new code and sends empty times as null", () => {
    const { errors, code, input } = validateCode(codeValues(), { isNew: true, usedCount: 0 });
    expect(errors).toEqual({});
    expect(code).toBe("ABCD1234");
    expect(input).toEqual({ theme: "Launch week", goodsIds: ["1001"], usesAllowed: 1, validFrom: null, validTo: null, allMachines: true, sns: [] });
  });

  it("checks the code only when it is new", () => {
    expect(validateCode(codeValues({ code: "ab-1" }), { isNew: true, usedCount: 0 }).errors.code).toBe("Use 4 to 20 letters or digits.");
    expect(validateCode(codeValues({ code: "" }), { isNew: false, usedCount: 0 }).errors.code).toBeUndefined();
  });

  it("refuses uses below those already made", () => {
    expect(validateCode(codeValues({ usesAllowed: "2" }), { isNew: false, usedCount: 3 }).errors.usesAllowed).toBe(
      "Can't be below 3, the uses already made.",
    );
    expect(validateCode(codeValues({ usesAllowed: "1.5" }), { isNew: false, usedCount: 0 }).errors.usesAllowed).toMatch(/whole number/);
  });

  it("names the other bad fields", () => {
    const { errors } = validateCode(
      codeValues({ theme: "", goodsIds: [], validFrom: "2026-10-02T00:00", validTo: "2026-10-01T00:00", allMachines: false }),
      { isNew: true, usedCount: 0 },
    );
    expect(errors).toEqual({
      theme: "Required.",
      goodsIds: "Choose at least one good.",
      validTo: "Must be after the start.",
      sns: "Choose at least one machine, or all machines.",
    });
  });
});

describe("code helpers", () => {
  it("generates 8 digits", () => {
    let n = 0;
    expect(generateCode(() => n++ % 10)).toBe("01234567");
    expect(generateCode()).toMatch(/^\d{8}$/);
  });

  it("describes the valid window", () => {
    const f = (iso: string | null) => iso ?? "";
    expect(validWindow({ validFrom: null, validTo: null } as RedeemCode, f)).toBe("Always");
    expect(validWindow({ validFrom: "A", validTo: null } as RedeemCode, f)).toBe("From A");
    expect(validWindow({ validFrom: null, validTo: "B" } as RedeemCode, f)).toBe("Until B");
    expect(validWindow({ validFrom: "A", validTo: "B" } as RedeemCode, f)).toBe("A to B");
  });

  it("says when machines accept a saved code", () => {
    expect(codeSavedNotice({ status: "active" }, "Saved.")).toBe("Saved. Machines accept it straight away.");
    expect(codeSavedNotice({ status: "not_started" }, "Saved.")).toBe("Saved. Machines accept it from the valid-from time.");
    expect(codeSavedNotice({ status: "disabled" }, "Saved.")).toBe("Saved.");
  });
});
