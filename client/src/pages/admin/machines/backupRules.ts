type Json = unknown;

export type Entry = { key: string; label: string; value: string };
export type Section = { title: string | null; entries: Entry[] };
export type Group = { id: string; title: string; sections: Section[] };
export type Change = { group: string; section: string | null; label: string; before: string; after: string };

const GROUPS = [
  { id: "systemConfigBean", title: "Feature switches" },
  { id: "interfaceConfigBean", title: "Menu layout" },
  { id: "materialConfigBeanList", title: "Calibration per material" },
  { id: "factoryConfigBean", title: "Factory settings" },
] as const;

const LABELS: Record<string, string> = {
  isStartAdvertisingPlayback: "Play ads",
  isEnableAdQuantityStatistics: "Ad statistics",
  isEnableMembershipFunction: "Membership",
  isOpenToReceiveDrinks: "Get Drinks",
  isEnableSkipPayment: "No pay",
  isSkipPayEnabled: "Skip payment",
  isEnableConcentrationAdjustment: "Strength adjust",
  isOpenDailyProductionLimit: "Daily limit",
  dailyProductionLimit: "Daily limit (drinks)",
  isShowTheStatusBar: "Status bar",
  noPayExpire: "Unpaid order timeout",
  numberOfRowsInTheProductList: "Rows",
  numberOfColumnsInTheProductList: "Columns",
  productSlidingDirection: "Scroll direction",
  isOpenSearchButton: "Custom button",
  searchButtonAlias: "Custom button text",
  searchButtonUrl: "Custom button link",
  searchButtonPosition: "Custom button position",
  materialAlias: "Alias",
  materialId: "Material ID",
  powderTune: "Powder fine tuning",
  hotWaterTune: "Hot water fine tuning",
  coldWaterTune: "Cold water fine tuning",
  rawTenNeedTime: "Powder time for 10 g (s)",
  waterTenNeedTime: "Water time for 10 ml (s)",
  serverUrl: "Server URL",
  mqttUrl: "MQTT URL",
  paySerialPort: "Payment serial port",
  instantSerialPort: "Machine serial port",
  paymentMode: "Payment mode",
  langCode: "Language code",
  langName: "Language",
  currencyCode: "Currency",
};

export function labelOf(key: string): string {
  const known = LABELS[key];
  if (known) return known;
  const words = key
    .replace(/^is(?=[A-Z])/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function valueText(value: Json): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const isRecord = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

const entriesOf = (obj: Record<string, Json>): Entry[] =>
  Object.keys(obj)
    .sort()
    .map((key) => ({ key, label: labelOf(key), value: valueText(obj[key]) }));

function materialTitle(m: Record<string, Json>, index: number): string {
  const name = typeof m["materialAlias"] === "string" && m["materialAlias"] ? m["materialAlias"] : m["name"];
  const id = m["materialId"];
  const base = typeof name === "string" && name ? name : `Material ${index + 1}`;
  return typeof id === "string" && id ? `${base} (${id})` : base;
}

const materialKey = (m: Record<string, Json>, index: number): string =>
  typeof m["materialId"] === "string" && m["materialId"] ? m["materialId"] : `#${index + 1}`;

function sectionsOf(id: string, raw: Json): Map<string, Section> {
  const out = new Map<string, Section>();
  if (id === "materialConfigBeanList" && Array.isArray(raw)) {
    raw.forEach((m, i) => {
      if (isRecord(m)) out.set(materialKey(m, i), { title: materialTitle(m, i), entries: entriesOf(m) });
    });
  } else if (isRecord(raw)) {
    out.set("", { title: null, entries: entriesOf(raw) });
  } else if (raw !== undefined) {
    out.set("", { title: null, entries: [{ key: id, label: labelOf(id), value: valueText(raw) }] });
  }
  return out;
}

const groupList = (config: Record<string, Json>) => {
  const known = new Set<string>(GROUPS.map((g) => g.id));
  const others = Object.keys(config)
    .filter((k) => !known.has(k))
    .sort()
    .map((id) => ({ id, title: labelOf(id.replace(/Bean(List)?$/, "")) }));
  return [...GROUPS, ...others];
};

export function groupBackup(config: Record<string, Json>): Group[] {
  return groupList(config)
    .map((g) => ({ id: g.id, title: g.title, sections: [...sectionsOf(g.id, config[g.id]).values()] }))
    .filter((g) => g.sections.length > 0);
}

export function diffBackups(current: Record<string, Json>, previous: Record<string, Json>): Change[] {
  const changes: Change[] = [];
  const ids = groupList({ ...previous, ...current });
  for (const g of ids) {
    const now = sectionsOf(g.id, current[g.id]);
    const before = sectionsOf(g.id, previous[g.id]);
    for (const key of new Set([...before.keys(), ...now.keys()])) {
      const a = before.get(key);
      const b = now.get(key);
      const aValues = new Map(a?.entries.map((e) => [e.key, e.value]));
      const bValues = new Map(b?.entries.map((e) => [e.key, e.value]));
      for (const field of [...new Set([...aValues.keys(), ...bValues.keys()])].sort()) {
        const was = aValues.get(field) ?? "Not set";
        const is = bValues.get(field) ?? "Not set";
        if (was !== is) changes.push({ group: g.title, section: (b ?? a)?.title ?? null, label: labelOf(field), before: was, after: is });
      }
    }
  }
  return changes;
}

export function skipPaymentOn(config: Record<string, Json>): boolean {
  const factory = config["factoryConfigBean"];
  return typeof factory === "object" && factory !== null && (factory as Record<string, Json>)["isSkipPayEnabled"] === true;
}
