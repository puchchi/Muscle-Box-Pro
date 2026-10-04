import { describe, expect, it } from "vitest";
import { toCsv } from "@/pages/admin/machines/csv";
import { adStatsCsv, csvName, defaultRange, istToday, notReporting, periodLabel, rangeErrors } from "@/pages/admin/machines/statsRules";
import { diffBackups, groupBackup, labelOf, valueText } from "@/pages/admin/machines/backupRules";
import type { AdStats } from "@shared/admin/machinesSchema";

describe("toCsv", () => {
  it("quotes cells that need it and neutralises formulas", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], ["=SUM(A1)", -5], [null, "@cmd"]])).toBe(
      'a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),-5\r\n,\'@cmd\r\n',
    );
  });
});

describe("date ranges", () => {
  it("reads today in IST", () => {
    expect(istToday(Date.parse("2026-09-28T19:00:00Z"))).toBe("2026-09-29");
  });

  it("defaults to a range that fits each period", () => {
    expect(defaultRange("day", "2026-09-29")).toEqual({ from: "2026-08-31", to: "2026-09-29" });
    expect(defaultRange("month", "2026-09-29")).toEqual({ from: "2025-09-01", to: "2026-09-29" });
    expect(defaultRange("year", "2026-09-29")).toEqual({ from: "2022-01-01", to: "2026-09-29" });
    for (const p of ["day", "month", "year"] as const) {
      const r = defaultRange(p, "2026-09-29");
      expect(rangeErrors(p, r.from, r.to)).toEqual({});
    }
  });

  it("refuses reversed and over-long ranges", () => {
    expect(rangeErrors("day", "2026-09-10", "2026-09-01").to).toBe("Must be on or after the start date.");
    expect(rangeErrors("day", "2026-01-01", "2026-09-30").to).toBe("A daily report covers up to 92 days.");
    expect(rangeErrors("day", "", "")).toEqual({ from: "Pick a start date.", to: "Pick an end date." });
  });

  it("labels periods", () => {
    expect(periodLabel("2026-09-08")).toBe("8 Sep 2026");
    expect(periodLabel("2026-09")).toBe("Sep 2026");
    expect(periodLabel("2026")).toBe("2026");
    expect(csvName("orders-day", "2026-09-01", "2026-09-29")).toBe("mbp-orders-day-2026-09-01-to-2026-09-29.csv");
  });
});

describe("ad statistics", () => {
  const stats: AdStats = {
    period: "day",
    from: "2026-09-29",
    to: "2026-09-29",
    rows: [{ period: "2026-09-29", sn: "SN1", deviceExtNo: "M01", machineName: "Lobby", adId: "AD9", adName: null, plays: 3, clicks: 1, window: null }],
    totals: { plays: 3, clicks: 1 },
    machines: [
      { sn: "SN1", deviceExtNo: "M01", machineName: "Lobby", adStats: "on", backedUpAt: null },
      { sn: "SN2", deviceExtNo: "M02", machineName: "Gym", adStats: "off", backedUpAt: null },
      { sn: "SN3", deviceExtNo: "M03", machineName: "New", adStats: "unknown", backedUpAt: null },
    ],
  };

  it("lists only machines with the switch off as not reporting", () => {
    expect(notReporting(stats.machines).map((m) => m.sn)).toEqual(["SN2"]);
  });

  it("names a deleted ad in the export", () => {
    expect(adStatsCsv(stats)).toContain("2026-09-29,M01,Lobby,SN1,Deleted ad,AD9,3,1,,");
  });
});

describe("config backups", () => {
  const config = {
    systemConfigBean: { isEnableAdQuantityStatistics: false, dailyProductionLimit: 0 },
    interfaceConfigBean: { numberOfRowsInTheProductList: 4 },
    materialConfigBeanList: [{ materialId: "MW", name: "Water", materialAlias: "", powderTune: 0 }],
    factoryConfigBean: { serverUrl: "http://10.0.2.2:8080", currencyCode: "" },
    extraBean: { a: 1 },
  };

  it("groups settings in the spec's order with readable labels", () => {
    const groups = groupBackup(config);
    expect(groups.map((g) => g.title)).toEqual(["Feature switches", "Menu layout", "Calibration per material", "Factory settings", "Extra"]);
    expect(groups[0]!.sections[0]!.entries).toContainEqual({ key: "isEnableAdQuantityStatistics", label: "Ad statistics", value: "Off" });
    expect(groups[2]!.sections[0]!.title).toBe("Water (MW)");
    expect(groups[3]!.sections[0]!.entries).toContainEqual({ key: "currencyCode", label: "Currency", value: "—" });
  });

  it("falls back to a label from the key", () => {
    expect(labelOf("isCupOutEnabled")).toBe("Cup out enabled");
    expect(valueText(true)).toBe("On");
    expect(valueText([1, 2])).toBe("[1,2]");
  });

  it("lists only what changed, matching materials by id", () => {
    const next = {
      ...config,
      systemConfigBean: { isEnableAdQuantityStatistics: true, dailyProductionLimit: 0 },
      materialConfigBeanList: [
        { materialId: "MP1", name: "Protein", materialAlias: "", powderTune: 1 },
        { materialId: "MW", name: "Water", materialAlias: "", powderTune: 2 },
      ],
    };
    expect(diffBackups(next, config)).toEqual([
      { group: "Feature switches", section: null, label: "Ad statistics", before: "Off", after: "On" },
      { group: "Calibration per material", section: "Water (MW)", label: "Powder fine tuning", before: "0", after: "2" },
      { group: "Calibration per material", section: "Protein (MP1)", label: "Alias", before: "Not set", after: "—" },
      { group: "Calibration per material", section: "Protein (MP1)", label: "Material ID", before: "Not set", after: "MP1" },
      { group: "Calibration per material", section: "Protein (MP1)", label: "Name", before: "Not set", after: "Protein" },
      { group: "Calibration per material", section: "Protein (MP1)", label: "Powder fine tuning", before: "Not set", after: "1" },
    ]);
    expect(diffBackups(config, config)).toEqual([]);
  });
});
