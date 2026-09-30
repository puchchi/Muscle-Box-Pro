import { describe, expect, it } from "vitest";
import { validateMachine } from "@/pages/admin/machines/MachineForm";
import { skipPaymentOn } from "@/pages/admin/machines/backupRules";
import { checkDetails, detailsDraftOf, draftErrorsOf, splitIngredients, type DetailsDraft } from "@/pages/admin/machines/PayScreenDetails";
import { hasPayScreenDetails } from "@/pages/admin/AdminMachineGoods";

const machineValues = {
  sn: "SN0001",
  modelId: "m1",
  deviceExtNo: "MBP-01",
  name: "Gold's Gym Andheri",
  servicePhone: "",
  address: "",
  latitude: "",
  longitude: "",
  hotMax: "85",
  hotMin: "80",
  coldMax: "8",
  coldMin: "5",
  enabled: true,
  qrPay: true,
  freeVend: true,
};

const draft = (over: Partial<DetailsDraft>): DetailsDraft => ({
  tagline: "",
  nutrition: [],
  ingredients: [],
  ...over,
});
const row = (key: number, name: string, value: string) => ({
  key,
  name,
  value,
});
const item = (key: number, text: string) => ({ key, text });

describe("free vend", () => {
  it("sends the payment switches with the machine", () => {
    expect(validateMachine(machineValues, false).input).toMatchObject({
      qrPay: true,
      freeVend: true,
    });
  });

  it("reads skip payment from the factory settings in a backup", () => {
    expect(skipPaymentOn({ factoryConfigBean: { isSkipPayEnabled: true } })).toBe(true);
    expect(skipPaymentOn({ factoryConfigBean: { isSkipPayEnabled: false } })).toBe(false);
    expect(skipPaymentOn({})).toBe(false);
  });
});

describe("pay screen details", () => {
  it("starts a new good with the four usual nutrition rows", () => {
    expect(detailsDraftOf(null).nutrition.map((r) => [r.name, r.value])).toEqual([
      ["Energy", ""],
      ["Protein", ""],
      ["Carbohydrates", ""],
      ["Fat", ""],
    ]);
  });

  it("drops rows without a value and trims the rest", () => {
    const { errors, details } = checkDetails(
      draft({
        tagline: "  Chilled chocolate shake ",
        nutrition: [row(1, "Energy", ""), row(2, " Protein ", " 21 g ")],
        ingredients: [item(1, " Milk "), item(2, "  ")],
      }),
    );
    expect(errors).toEqual({});
    expect(details).toEqual({
      tagline: "Chilled chocolate shake",
      nutrition: [{ name: "Protein", value: "21 g" }],
      ingredients: ["Milk"],
    });
  });

  it("mirrors the backend limits and error keys", () => {
    const nine = Array.from({ length: 9 }, (_, i) => row(i, `N${i}`, "1 g"));
    const { errors } = checkDetails(
      draft({
        tagline: "x".repeat(81),
        nutrition: [row(1, "", "1 g"), row(2, "Fat", "x".repeat(17)), ...nine],
        ingredients: [item(1, "x".repeat(41)), ...Array.from({ length: 20 }, (_, i) => item(i + 2, "Oats"))],
      }),
    );
    expect(errors).toMatchObject({
      tagline: "Up to 80 characters.",
      "nutrition.0.name": "Required.",
      "nutrition.1.value": "Up to 16 characters.",
      nutrition: "Up to 8 rows.",
      "ingredients.0": "Up to 40 characters.",
      ingredients: "Up to 20 ingredients.",
    });
  });

  it("maps server error indexes back to the rows on screen", () => {
    const { sent } = checkDetails(draft({ nutrition: [row(1, "Energy", ""), row(2, "Protein", "21 g")] }));
    expect(draftErrorsOf({ "nutrition.0.value": "Too long.", name: "Required." }, sent)).toEqual({
      "nutrition.1.value": "Too long.",
      name: "Required.",
    });
  });

  it("splits a pasted list on commas and new lines", () => {
    expect(splitIngredients("Milk solids, Whey protein,\nCocoa ,, Monk fruit")).toEqual([
      "Milk solids",
      "Whey protein",
      "Cocoa",
      "Monk fruit",
    ]);
  });

  it("says whether a good has any details", () => {
    expect(hasPayScreenDetails({ tagline: "", nutrition: [], ingredients: [] })).toBe(false);
    expect(
      hasPayScreenDetails({
        tagline: "",
        nutrition: [],
        ingredients: ["Milk"],
      }),
    ).toBe(true);
  });
});
