// Sample data behind the franchise guide screenshots. Every name, number and figure here is invented.

const HOSTS = {
  wizard: "https://mock-wizard.test",
  franchiseAdmin: "https://mock-franchise-admin.test",
  machine: "https://mock-machine.test",
  iot: "https://mock-iot.test",
  shopAdmin: "https://mock-shop-admin.test",
  cdn: "https://mock0cdn.cloudfront.net",
};
export { HOSTS };

export const PROXY_ENV = {
  NEXT_PUBLIC_MBP_API_URL: `${HOSTS.franchiseAdmin}/sandbox`,
  NEXT_PUBLIC_MBP_FRANCHISE_API_URL: `${HOSTS.franchiseAdmin}/sandbox`,
  NEXT_PUBLIC_MBP_FRANCHISE_WIZARD_API_URL: `${HOSTS.wizard}/sandbox`,
  NEXT_PUBLIC_MBP_MACHINE_ADMIN_API_URL: `${HOSTS.machine}/sandbox`,
  NEXT_PUBLIC_MBP_MACHINE_IOT_API_URL: `${HOSTS.iot}/sandbox`,
  NEXT_PUBLIC_MBP_SHOP_ADMIN_API_URL: `${HOSTS.shopAdmin}/sandbox`,
  NEXT_PUBLIC_MBP_SHOP_API_URL: "",
  NEXT_PUBLIC_MBP_FRANCHISE_DOCS_ORIGIN: "",
  NEXT_PUBLIC_MBP_MACHINE_FILES_BUCKET_ORIGIN: "",
  NEXT_PUBLIC_MBP_MACHINE_FILES_CDN_ORIGIN: HOSTS.cdn,
};

const FRANCHISE_ID = "fr_peak_nutrition";
const FRANCHISE_NAME = "Peak Nutrition Ventures";
const EMAIL = "owner@peaknutrition.example";

const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const ago = (minutes) => iso(Date.now() - minutes * 60_000);
const DAY = 86_400_000;
const IST = 5.5 * 3_600_000;
const istDate = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
const TODAY = istDate(NOW);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const GYMS = [
  { id: "gym_iron", name: "Iron Temple Fitness, Baner" },
  { id: "gym_pulse", name: "Pulse Fitness Club, Wakad" },
  { id: "gym_anytime", name: "Anytime Strength, Hinjewadi" },
  { id: "gym_flex", name: "Flex Arena, Aundh" },
  { id: "gym_titan", name: "Titan Gym, Kothrud" },
];

const MACHINE_STATE = [
  { online: true, fault: false, low: false, seen: 1 },
  { online: true, fault: false, low: true, seen: 2 },
  { online: true, fault: true, low: false, seen: 1 },
  { online: false, fault: false, low: false, seen: 2900 },
  { online: true, fault: false, low: false, seen: 1 },
];

const MACHINES = GYMS.map((gym, i) => ({
  sn: `PN2026A0010${i + 1}`,
  ext: `E0210${i + 1}`,
  name: `${gym.name.split(",")[0]} machine`,
  gym,
  ...MACHINE_STATE[i],
  address: `${gym.name.split(", ")[1]}, Pune, Maharashtra`,
  lat: 18.5 + i * 0.02,
  lng: 73.8 + i * 0.015,
}));

const MODEL = { id: "model_p1", name: "MuscleBoxPro P1 Protein Dispenser" };

const FAULT_TEXT = "Cold water temperature above limit";

function ownerOf(m) {
  return {
    franchiseId: FRANCHISE_ID,
    franchiseName: FRANCHISE_NAME,
    gymId: m.gym.id,
    gymName: m.gym.name,
    since: iso(NOW - 120 * DAY),
  };
}

function machineRow(m) {
  return {
    sn: m.sn,
    deviceExtNo: m.ext,
    name: m.name,
    modelId: MODEL.id,
    modelName: MODEL.name,
    enabled: true,
    online: m.online,
    lastSeenAt: ago(m.seen),
    runStatus: m.online ? 1 : null,
    faultStatus: m.fault ? "exception" : "normal",
    faultRemark: m.fault ? FAULT_TEXT : "",
    statusAt: ago(m.seen),
    stockStatus: m.low ? "lack" : "normal",
    stockRemark: m.low ? "Chocolate whey is running low" : "",
    restartPending: false,
    freeVend: false,
    hasFactoryPin: true,
    ownerState: "placed",
    owner: ownerOf(m),
    ownerVersion: 1,
  };
}

function machineFull(m) {
  return {
    sn: m.sn,
    deviceExtNo: m.ext,
    name: m.name,
    modelId: MODEL.id,
    modelName: MODEL.name,
    protocol: "mqtt-v2",
    hardwareVersion: "P1-HW 2.4",
    servicePhone: "+91 98765 43210",
    address: m.address,
    latitude: m.lat,
    longitude: m.lng,
    hotMax: 90,
    hotMin: 70,
    coldMax: 10,
    coldMin: 4,
    enabled: true,
    qrPay: true,
    freeVend: false,
    freeVendChangedAt: null,
    freeVendChangedBy: null,
    firstSeenAt: iso(NOW - 120 * DAY),
    lastSeenAt: ago(m.seen),
    lastBootAt: iso(NOW - 3 * DAY),
    restartPending: false,
    hasPin: true,
    pinChangedAt: iso(NOW - 40 * DAY),
    pinChangedBy: EMAIL,
    hasFactoryPin: true,
    factoryPinChangedAt: iso(NOW - 120 * DAY),
    factoryPinChangedBy: "MBP team",
    ownerState: "placed",
    owner: ownerOf(m),
    ownerVersion: 1,
    version: 4,
    createdAt: iso(NOW - 125 * DAY),
    createdBy: "MBP team",
    updatedAt: iso(NOW - 6 * DAY),
    updatedBy: EMAIL,
    mqtt: {
      state: m.online ? "connected" : "not_connected",
      online: m.online,
      certificate: { fingerprint: "9F:2A:41:C7:0B:6D", issuedAt: iso(NOW - 110 * DAY), sourceIp: null, codeCreatedBy: null },
      pendingCode: null,
    },
  };
}

const GOODS = [
  { id: "g_choc", no: "G01", name: "Chocolate Whey Shake", spec: "30 g whey, 350 ml", price: 149, color: "#7a4a2b", temp: "chilled", rating: [4.7, 212] },
  { id: "g_van", no: "G02", name: "Vanilla Whey Shake", spec: "30 g whey, 350 ml", price: 149, color: "#d9b66a", temp: "chilled", rating: [4.5, 164] },
  { id: "g_ban", no: "G03", name: "Banana Protein Shake", spec: "25 g whey, 350 ml", price: 139, color: "#e6c84a", temp: "chilled", rating: [4.4, 98] },
  { id: "g_cof", no: "G04", name: "Cold Coffee Protein", spec: "25 g whey, 350 ml", price: 159, color: "#5b3a29", temp: "chilled", rating: [4.6, 131] },
  { id: "g_mass", no: "G05", name: "Mass Gainer Shake", spec: "60 g gainer, 400 ml", price: 189, color: "#a05a2c", temp: "chilled", rating: [4.3, 57] },
  { id: "g_choc_hot", no: "G06", name: "Hot Chocolate Protein", spec: "20 g whey, 250 ml", price: 129, color: "#4b2e1e", temp: "hot", rating: [4.2, 33] },
];

const pictureUrl = (g) => `${HOSTS.cdn}/goods/${g.id}.svg`;
const image = (g) => ({ url: pictureUrl(g), path: `goods/${g.id}.svg`, fileName: `${g.id}.svg`, md5: "0".repeat(32) });

function goodLibrary(g, i) {
  return {
    goodsId: g.id,
    no: g.no,
    name: g.name,
    nameEn: g.name,
    spec: g.spec,
    priceInr: g.price,
    sort: i + 1,
    modelId: MODEL.id,
    image: image(g),
    recipe: [
      { materialId: "mat_whey", qty: 30, waterQty: 350, waterType: 1, kqty: 0 },
      { materialId: "mat_flavour", qty: 12, waterQty: 0, waterType: 0, kqty: 0 },
    ],
    tagline: "Mixed fresh in about 20 seconds",
    nutrition: [
      { name: "Protein", value: "28 g" },
      { name: "Energy", value: "190 kcal" },
    ],
    ingredients: ["Whey protein isolate", "Natural flavour", "Water"],
    serveTemp: g.temp,
    comingSoon: false,
    media: [],
    rating: { avg: g.rating[0], count: g.rating[1] },
    machinesListed: MACHINES.length,
    version: 2,
    createdAt: iso(NOW - 200 * DAY),
    createdBy: "MBP team",
    updatedAt: iso(NOW - 30 * DAY),
    updatedBy: "MBP team",
  };
}

function machineGood(g, i, m) {
  const soldOut = m.low && g.id === "g_choc";
  const devicePrice = g.id === "g_mass" && m.sn.endsWith("1") ? 199 : null;
  return {
    goodsId: g.id,
    no: g.no,
    name: g.name,
    nameEn: g.name,
    spec: g.spec,
    image: image(g),
    libraryPriceInr: g.price,
    devicePriceInr: devicePrice,
    shownPriceInr: devicePrice ?? g.price,
    listed: true,
    soldOut,
    comingSoon: false,
    rating: { avg: g.rating[0], count: g.rating[1] },
    sort: i + 1,
    updatedAt: iso(NOW - 10 * DAY),
    updatedBy: EMAIL,
  };
}

function stockSlots(m) {
  const low = m.low;
  return [
    { slotId: "s1", materialId: "mat_choc", name: "Chocolate whey", position: "A1", rawType: "powder", unit: "g", capacity: 5000, warnCapacity: 1000, residueQty: low ? 640 : 3850, low },
    { slotId: "s2", materialId: "mat_van", name: "Vanilla whey", position: "A2", rawType: "powder", unit: "g", capacity: 5000, warnCapacity: 1000, residueQty: 3120, low: false },
    { slotId: "s3", materialId: "mat_ban", name: "Banana flavour", position: "B1", rawType: "powder", unit: "g", capacity: 3000, warnCapacity: 600, residueQty: 1840, low: false },
    { slotId: "s4", materialId: "mat_cof", name: "Coffee blend", position: "B2", rawType: "powder", unit: "g", capacity: 3000, warnCapacity: 600, residueQty: 2210, low: false },
    { slotId: "s5", materialId: "mat_mass", name: "Mass gainer", position: "C1", rawType: "powder", unit: "g", capacity: 6000, warnCapacity: 1200, residueQty: 4300, low: false },
    { slotId: "s6", materialId: "mat_cup", name: "Cups", position: "D1", rawType: "cup", unit: "pcs", capacity: 300, warnCapacity: 60, residueQty: 214, low: false },
  ];
}

const R = rng(7);
function buildOrders() {
  const out = [];
  let n = 0;
  for (let h = 0; out.length < 240; h += 1) {
    const at = NOW - h * 38 * 60_000 - Math.floor(R() * 20 * 60_000);
    const m = MACHINES[Math.floor(R() * MACHINES.length)];
    if (!m.online && at > NOW - 2 * DAY) continue;
    const g = GOODS[Math.floor(R() * GOODS.length)];
    const roll = R();
    const status = roll < 0.03 ? "failed" : "made";
    const method = roll > 0.93 ? "redeem" : "qr";
    n += 1;
    out.push({
      orderId: `PN${String(900000 - n * 7)}`,
      sn: m.sn,
      deviceExtNo: m.ext,
      machineName: m.name,
      goodsId: g.id,
      goodsName: g.name,
      amountInr: method === "redeem" ? 0 : g.price,
      payMethod: method,
      redeemCode: method === "redeem" ? "FIRSTSHAKE" : null,
      status,
      dispensed: status === "made",
      failReason: status === "failed" ? "Cup not detected" : null,
      gymId: m.gym.id,
      gymName: m.gym.name,
      franchiseId: FRANCHISE_ID,
      franchiseName: FRANCHISE_NAME,
      createdAt: iso(at),
    });
  }
  return out;
}
const ORDERS = buildOrders();

function periodKeys(period, from, to) {
  const keys = [];
  if (period === "day") {
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY) keys.push(new Date(t).toISOString().slice(0, 10));
  } else if (period === "month") {
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? ((m = 1), y++) : m++) keys.push(`${y}-${String(m).padStart(2, "0")}`);
  } else {
    for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) keys.push(String(y));
  }
  return keys;
}

function salesStats(q) {
  const period = q.get("period") ?? "day";
  const from = q.get("from") ?? TODAY;
  const to = q.get("to") ?? TODAY;
  const sn = q.get("sn");
  const rows = [];
  const weight = { g_choc: 1, g_van: 0.8, g_ban: 0.5, g_cof: 0.6, g_mass: 0.35, g_choc_hot: 0.15 };
  const scale = period === "day" ? 1 : period === "month" ? 26 : 300;
  for (const key of periodKeys(period, from, to)) {
    const rand = rng(Number(key.replace(/-/g, "")) || 1);
    for (const m of MACHINES) {
      if (sn && sn !== m.sn) continue;
      for (const g of GOODS) {
        const base = key === TODAY && period === "day" ? 3 : 7;
        const drinks = Math.round((base + rand() * 6) * weight[g.id] * scale * (m.online || key < TODAY ? 1 : 0.2));
        if (drinks <= 0) continue;
        rows.push({ period: key, sn: m.sn, deviceExtNo: m.ext, machineName: m.name, goodsId: g.id, goodsName: g.name, drinks, amountInr: drinks * g.price });
      }
    }
  }
  const drinks = rows.reduce((s, r) => s + r.drinks, 0);
  const amountInr = rows.reduce((s, r) => s + r.amountInr, 0);
  return { period, from, to, rows, totals: { drinks, amountInr } };
}

function orderStats(q) {
  const sales = salesStats(q);
  const by = new Map();
  for (const r of sales.rows) {
    const key = `${r.period}|${r.sn}`;
    const row = by.get(key) ?? { period: r.period, sn: r.sn, deviceExtNo: r.deviceExtNo, machineName: r.machineName, orders: 0, amountInr: 0 };
    row.orders += r.drinks;
    row.amountInr += r.amountInr;
    by.set(key, row);
  }
  const rows = [...by.values()];
  return { period: sales.period, from: sales.from, to: sales.to, rows, totals: { orders: sales.totals.drinks, amountInr: sales.totals.amountInr } };
}

function page(items, q, pageSize = 20) {
  const p = Number(q.get("page") ?? 1);
  const size = Number(q.get("pageSize") ?? pageSize);
  return { items: items.slice((p - 1) * size, p * size), total: items.length };
}

function cursorPage(items, q, defaultLimit = 20) {
  const start = Number(q.get("cursor") ?? 0);
  const limit = Number(q.get("limit") ?? defaultLimit);
  const slice = items.slice(start, start + limit);
  return { items: slice, nextCursor: start + limit < items.length ? String(start + limit) : null };
}

const FEEDBACK = [
  { id: "fb1", sn: MACHINES[1].sn, shopName: MACHINES[1].gym.name, type: "complaint", goodsId: "g_choc", goodsName: "Chocolate Whey Shake", reason: "not_dispensed", message: "Paid by UPI but the cup came out empty.", email: "arjun.k@example.com", phone: "+91 90000 11122", orderId: "PN899900", orderLinked: true, state: "new", note: null, receivedAt: ago(95), updatedAt: null, updatedBy: null },
  { id: "fb2", sn: MACHINES[0].sn, shopName: MACHINES[0].gym.name, type: "review", goodsId: "g_van", goodsName: "Vanilla Whey Shake", rating: 5, message: "Best post-workout shake in the area. Perfectly mixed.", email: null, phone: null, state: "new", receivedAt: ago(310) },
  { id: "fb3", sn: MACHINES[4].sn, shopName: MACHINES[4].gym.name, type: "query", message: "Do you have a sugar-free option?", email: "meera.s@example.com", phone: null, state: "replied", note: "Told her the Vanilla shake has no added sugar.", receivedAt: ago(60 * 26), updatedAt: ago(60 * 20), updatedBy: EMAIL },
  { id: "fb4", sn: MACHINES[2].sn, shopName: MACHINES[2].gym.name, type: "complaint", reason: "taste", goodsName: "Cold Coffee Protein", message: "Tasted watery today.", email: "rahul.d@example.com", phone: null, state: "closed", note: "Cold water temperature fault, fixed by operator.", receivedAt: ago(60 * 52), updatedAt: ago(60 * 30), updatedBy: EMAIL },
  { id: "fb5", sn: MACHINES[0].sn, shopName: MACHINES[0].gym.name, type: "review", goodsName: "Banana Protein Shake", rating: 4, message: "Good, would like it a little thicker.", state: "new", receivedAt: ago(60 * 70) },
].map((f) => ({ rating: null, reason: null, goodsId: null, goodsName: null, message: null, email: null, phone: null, orderId: null, orderLinked: false, note: null, updatedAt: null, updatedBy: null, ...f }));

const OPERATORS = [
  { operatorId: "pn_suresh", name: "Suresh Patil", email: "suresh@peaknutrition.example", phone: "+91 98220 11001", status: "active", machines: [MACHINES[0].sn, MACHINES[1].sn, MACHINES[2].sn], lastLoginAt: ago(60 * 5) },
  { operatorId: "pn_anita", name: "Anita Rao", email: null, phone: "+91 98220 11002", status: "active", machines: [MACHINES[3].sn, MACHINES[4].sn], lastLoginAt: ago(60 * 40) },
  { operatorId: "pn_vikas", name: "Vikas More", email: null, phone: null, status: "disabled", machines: [], lastLoginAt: ago(60 * 24 * 30), disabledAt: ago(60 * 24 * 12), disabledReason: "Left the company" },
].map((o) => ({ franchiseId: FRANCHISE_ID, franchiseName: FRANCHISE_NAME, createdBy: { kind: "franchise", email: EMAIL }, createdAt: ago(60 * 24 * 90), updatedAt: ago(60 * 24 * 5), passwordSetAt: ago(60 * 24 * 90), disabledAt: null, disabledReason: null, ...o }));

const CODES = [
  { code: "FIRSTSHAKE", theme: "Welcome shake", usesAllowed: 200, usedCount: 64, status: "active" },
  { code: "GYMWEEK", theme: "Gym week promo", usesAllowed: 100, usedCount: 100, status: "used_up" },
  { code: "NEWYEAR26", theme: "New Year", usesAllowed: 300, usedCount: 0, status: "not_started" },
].map((c, i) => ({
  serialNo: `RC${100 + i}`,
  goods: [{ goodsId: "g_van", name: "Vanilla Whey Shake" }],
  remaining: c.usesAllowed - c.usedCount,
  validFrom: iso(NOW - 40 * DAY),
  validTo: iso(NOW + 50 * DAY),
  disabled: false,
  allMachines: true,
  sns: [],
  canDelete: false,
  source: "admin",
  shopOrderId: null,
  lastUsedAt: c.usedCount ? ago(180) : null,
  version: 1,
  createdAt: iso(NOW - 40 * DAY),
  createdBy: "MBP team",
  updatedAt: iso(NOW - 2 * DAY),
  updatedBy: "MBP team",
  ...c,
}));

const DISCOUNTS = [
  { promoId: "pr1", no: "D01", name: "Monsoon shake offer", status: "active", items: [{ goodsId: "g_ban", name: "Banana Protein Shake", priceInr: 109 }] },
  { promoId: "pr2", no: "D02", name: "Weekend combo price", status: "not_started", items: [{ goodsId: "g_cof", name: "Cold Coffee Protein", priceInr: 129 }, { goodsId: "g_mass", name: "Mass Gainer Shake", priceInr: 159 }] },
].map((p) => ({
  kind: "discount",
  startAt: iso(NOW - 5 * DAY),
  endAt: iso(NOW + 20 * DAY),
  paused: false,
  allMachines: false,
  sns: MACHINES.map((m) => m.sn),
  version: 1,
  createdAt: iso(NOW - 6 * DAY),
  createdBy: "MBP team",
  updatedAt: iso(NOW - 6 * DAY),
  updatedBy: "MBP team",
  ...p,
}));

const EQUIPMENT_LOG = [
  { m: 2, status: "exception", faults: [{ code: "E14", text: FAULT_TEXT }], remark: FAULT_TEXT, at: ago(42) },
  { m: 2, status: "exception", faults: [{ code: "E14", text: FAULT_TEXT }], remark: FAULT_TEXT, at: ago(180) },
  { m: 1, status: "normal", faults: [], remark: "", at: ago(60 * 9) },
  { m: 3, status: "exception", faults: [{ code: "E02", text: "Machine offline" }], remark: "No heartbeat for 48 hours", at: ago(60 * 47) },
  { m: 0, status: "normal", faults: [], remark: "", at: ago(60 * 70) },
].map((e) => ({ sn: MACHINES[e.m].sn, deviceExtNo: MACHINES[e.m].ext, machineName: MACHINES[e.m].name, runStatus: 1, status: e.status, faults: e.faults, remark: e.remark, at: e.at }));

const OPERATIONS_LOG = [
  { m: 0, type: "Restock", content: "Chocolate whey +2000 g", at: ago(60 * 3) },
  { m: 1, type: "Operator login", content: "Operator opened the service menu", at: ago(60 * 6) },
  { m: 4, type: "Restock", content: "Cups +100 pcs", at: ago(60 * 22) },
  { m: 2, type: "Cleaning", content: "Pipe cleaning, 2 cycles", at: ago(60 * 30) },
].map((e, i) => ({ sn: MACHINES[e.m].sn, deviceExtNo: MACHINES[e.m].ext, machineName: MACHINES[e.m].name, operateType: 10 + i, type: e.type, content: e.content, broadcastAddress: "", operateTimes: "", receivedAt: e.at }));

function voiceSet(version) {
  const file = (n) => ({ url: `${HOSTS.cdn}/voices/${n}.mp3`, path: `voices/${n}.mp3`, fileName: `prompt-${n}.mp3`, md5: "0".repeat(32) });
  return { positions: { 1: file(1), 2: file(2), 3: file(3), 4: file(4), 5: file(5) }, version, updatedAt: iso(NOW - 60 * DAY), updatedBy: "MBP team" };
}

const PERMISSIONS = [
  "machines.list.view", "machines.health.view", "machines.salesToday.view",
  "settings.facts.view", "settings.name.view", "settings.name.edit", "settings.machineNumber.view",
  "settings.servicePhone.view", "settings.servicePhone.edit", "settings.location.view", "settings.location.edit",
  "settings.hotWater.view", "settings.hotWater.edit", "settings.coldWater.view", "settings.coldWater.edit",
  "settings.enabled.view", "settings.enabled.edit", "settings.qrPay.view", "settings.freeVend.view",
  "owner.view",
  "machineGoods.view", "machineGoods.add.edit", "machineGoods.listing.view", "machineGoods.listing.edit",
  "machineGoods.price.view", "machineGoods.price.edit", "machineGoods.sort.view", "machineGoods.sort.edit",
  "stock.view", "stock.restock.edit", "stock.history.view",
  "machineVoices.view", "machineVoices.edit",
  "pins.operator.view", "pins.operator.edit",
  "remote.clean.edit", "remote.door.edit", "remote.lock.edit", "remote.unlock.edit", "remote.water.edit",
  "remote.reload.edit", "remote.restart.edit", "remote.live.view",
  "logs.equipment.view", "logs.operations.view",
  "orders.view", "stats.view", "feedback.view", "feedback.edit", "redeemCodes.view", "shopOrders.view",
  "goodsLibrary.view", "discounts.view",
  "operators.view", "operators.edit",
];

const SESSION = { email: EMAIL, franchiseId: FRANCHISE_ID, role: "franchise", franchiseDisplayName: FRANCHISE_NAME, status: "active", expiresAt: iso(NOW + 12 * 3600_000) };

const PORTAL = {
  franchiseId: FRANCHISE_ID,
  franchiseDisplayName: FRANCHISE_NAME,
  onboardingStatus: "active",
  user: { email: EMAIL, role: "franchise" },
  terms: {
    tier: "territory",
    investmentPaise: 25_00_000_00,
    machineAllocation: 5,
    paymentSchedule: [
      { pct: 50, trigger: "At franchise registration" },
      { pct: 50, trigger: "When machines are ready at the OEM" },
    ],
    capitalRecoveryPaise: 29_50_000_00,
    proteinSharePctDuringRecovery: 100,
    proteinSharePctAfterRecovery: 50,
    advertisingFranchiseeSharePct: 25,
    advertisingMbpSharePct: 75,
  },
  territory: {
    territory: "Pune West",
    territoryBoundary: "Baner, Wakad, Hinjewadi, Aundh and Kothrud, within the Pune Municipal and Pimpri-Chinchwad limits.",
    decidedAt: iso(NOW - 150 * DAY),
  },
  operations: {
    warehouseNotIdentified: false,
    warehouseAddress: "Plot 14, MIDC Chakan, Pune 410501",
    warehouseAreaSqft: 1800,
    temperatureControl: "yes",
    operationsContactName: "Suresh Patil",
    operationsContactPhone: "+91 98220 11001",
    deploymentPlan: "Five machines in premium gyms across west Pune in the first quarter.",
    logisticsArrangement: "own_vehicle",
  },
  documents: [
    { docId: "d1", docType: "pan_card", fileName: "pan.pdf", sizeBytes: 220_000, contentType: "application/pdf", uploadedAt: iso(NOW - 160 * DAY) },
    { docId: "d2", docType: "entity_proof", fileName: "llp-certificate.pdf", sizeBytes: 540_000, contentType: "application/pdf", uploadedAt: iso(NOW - 160 * DAY) },
    { docId: "d3", docType: "address_proof", fileName: "office-lease.pdf", sizeBytes: 380_000, contentType: "application/pdf", uploadedAt: iso(NOW - 160 * DAY) },
    { docId: "d4", docType: "signatory_id", fileName: "signatory-id.jpg", sizeBytes: 310_000, contentType: "image/jpeg", uploadedAt: iso(NOW - 159 * DAY) },
  ],
  payments: [
    { instalment: 1, expectedPaise: 12_50_000_00, claim: { utr: "HDFCR52026080112345", amountPaise: 12_50_000_00, paidOn: istDate(NOW - 140 * DAY), proofDocId: null, claimedAt: iso(NOW - 140 * DAY) }, receivedPaise: 12_50_000_00, verifiedAt: iso(NOW - 138 * DAY), refusal: null },
    { instalment: 2, expectedPaise: 12_50_000_00, claim: { utr: "ICICN52026091098765", amountPaise: 12_50_000_00, paidOn: istDate(NOW - 100 * DAY), proofDocId: null, claimedAt: iso(NOW - 100 * DAY) }, receivedPaise: 12_50_000_00, verifiedAt: iso(NOW - 98 * DAY), refusal: null },
  ],
  agreement: {
    version: "v2",
    effectiveDate: istDate(NOW - 145 * DAY),
    validUntil: istDate(NOW + 220 * DAY),
    contentHash: "3f9c1b7a5d2e84f06a1c9b3d7e5f20481a6c9d3e7b5f1a2c4d6e8f0a1b3c5d7e",
    signedAt: iso(NOW - 145 * DAY),
    signerName: "Rohan Deshmukh",
    signType: "aadhaar",
  },
  sales: { available: false, reason: "not_implemented" },
  consumption: { available: false, reason: "not_implemented" },
  costs: { available: false, reason: "not_implemented" },
  advertising: { available: false, reason: "not_implemented" },
  profit: { available: false, reason: "not_implemented" },
  payouts: { available: false, reason: "not_implemented" },
  capitalRecoveryProgress: { available: false, reason: "not_implemented" },
  machines: { available: false, reason: "not_implemented" },
  statements: { available: false, reason: "not_implemented" },
  alerts: { available: false, reason: "not_implemented" },
  asOf: iso(NOW),
};

const SHOP_ORDERS = [
  { st: "coded", g: 0, m: 0, mins: 25, code: "7K2M9Q" },
  { st: "coded", g: 3, m: 1, mins: 140, code: "4H8X1B" },
  { st: "paid", g: 1, m: 4, mins: 190, code: null },
  { st: "refunded", g: 2, m: 2, mins: 60 * 20, code: null },
  { st: "coded", g: 4, m: 0, mins: 60 * 28, code: "2D6P5T" },
  { st: "coded", g: 1, m: 3, mins: 60 * 40, code: "9C3R7V" },
].map((o, i) => ({
  shopOrderId: `SO${48210 - i}`,
  status: o.st,
  sn: MACHINES[o.m].sn,
  machineName: MACHINES[o.m].name,
  drink: { goodsId: GOODS[o.g].id, name: GOODS[o.g].name },
  pricePaise: GOODS[o.g].price * 100,
  code: o.code,
  customerId: null,
  guestEmail: null,
  razorpayPaymentId: `pay_${i}Xa91`,
  refundId: o.st === "refunded" ? "rfnd_01" : null,
  createdAt: ago(o.mins),
  paidAt: ago(o.mins - 1),
  codedAt: o.code ? ago(o.mins - 1) : null,
  failedAt: null,
  refund: o.st === "refunded" ? { requestedBy: "MBP team", requestedAt: ago(o.mins - 60), reason: "Machine was out of order", retries: 0 } : null,
  reissues: 0,
  pendingReissue: null,
  previousCodes: [],
}));

export const goodsPicture = (id) => {
  const g = GOODS.find((x) => x.id === id);
  const color = g?.color ?? "#555";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="1" stop-color="${color}" stop-opacity="0.6"/></linearGradient></defs><rect width="160" height="160" rx="22" fill="#1f2933"/><path d="M52 40h56l-8 84a8 8 0 0 1-8 7H68a8 8 0 0 1-8-7z" fill="url(#g)"/><path d="M52 40h56l-1.6 17H53.6z" fill="#f4efe6" opacity="0.9"/><rect x="48" y="34" width="64" height="8" rx="4" fill="#cbd2d9"/></svg>`;
};

const ok = (body) => ({ status: 200, body });
const notFound = { status: 404, body: { code: "not_found", message: "Not found" } };

export function handle(host, method, path, q, body) {
  if (host === HOSTS.wizard) {
    if (path === "/franchise/session") return ok(SESSION);
    if (path === "/franchise/portal") return ok({ ...PORTAL, asOf: iso(Date.now()) });
    return notFound;
  }

  if (host === HOSTS.franchiseAdmin) {
    if (path === "/franchise/operators" && method === "GET") return ok({ operators: OPERATORS });
    if (path === "/franchise/operators/suggested-id") return ok({ operatorId: "pn_operator4" });
    const sn = path.match(/^\/admin\/machines\/([^/]+)\/owner$/);
    if (sn) {
      const m = MACHINES.find((x) => x.sn === decodeURIComponent(sn[1]));
      if (!m) return notFound;
      return ok({ sn: m.sn, migrated: true, owner: { ...ownerOf(m), ownerState: "placed", version: 1 }, history: [] });
    }
    return notFound;
  }

  if (host === HOSTS.iot) {
    const live = path.match(/^\/machines\/([^/]+)\/live$/);
    if (live) {
      const m = MACHINES.find((x) => x.sn === decodeURIComponent(live[1]));
      if (!m) return notFound;
      return ok({
        sn: m.sn,
        mqttOnline: m.online,
        session: null,
        status: m.online
          ? { step: "Idle", making: false, boardOnline: true, faults: m.fault ? [{ code: "E14", text: FAULT_TEXT }] : [], hotTemp: 86, coldTemp: m.fault ? 14 : 6, door: "closed", cupPresent: false, lastDrinkAt: NOW - 11 * 60_000, appVersion: "3.8.2", mqtt: true, network: "Wi-Fi, strong" }
          : null,
        statusAt: m.online ? ago(0.1) : null,
        statusAgeSeconds: m.online ? 4 : null,
      });
    }
    if (/\/session$/.test(path)) return ok({ session: method === "DELETE" ? null : { id: "sess1", by: EMAIL, until: iso(NOW + 300_000), secondsLeft: 300 } });
    if (/\/commands$/.test(path) && method === "POST") {
      return ok({ command: { id: "cmd1", sn: path.split("/")[2], name: body?.name ?? "clean", args: body?.args ?? {}, by: EMAIL, state: "done", reason: null, detail: null, createdAt: ago(0), expiresAt: iso(NOW + 60_000), claimedAt: ago(0), finishedAt: ago(0) } });
    }
    if (/\/commands\/[^/]+$/.test(path)) {
      return ok({ command: { id: "cmd1", sn: path.split("/")[2], name: "clean", args: {}, by: EMAIL, state: "done", reason: null, detail: null, createdAt: ago(0), expiresAt: iso(NOW + 60_000), claimedAt: ago(0), finishedAt: ago(0) } });
    }
    return notFound;
  }

  if (host === HOSTS.shopAdmin) {
    if (path === "/orders") return ok({ orders: SHOP_ORDERS, nextCursor: null });
    return notFound;
  }

  if (host !== HOSTS.machine) return notFound;

  if (path === "/me") return ok({ role: "franchise", name: FRANCHISE_NAME, email: EMAIL, operatorId: null, franchiseId: FRANCHISE_ID, gymId: null, can: PERMISSIONS });

  if (path === "/summary") {
    const today = salesStats(new URLSearchParams({ period: "day", from: TODAY, to: TODAY })).totals;
    return ok({
      machines: MACHINES.length,
      online: MACHINES.filter((m) => m.online).length,
      offline: MACHINES.filter((m) => !m.online).length,
      faulty: MACHINES.filter((m) => m.fault).length,
      lowStock: MACHINES.filter((m) => m.low).length,
      restartPending: 0,
      ordersToday: today.drinks,
      salesTodayInr: today.amountInr,
    });
  }

  if (path === "/machines" && method === "GET") {
    let rows = MACHINES.map(machineRow);
    const name = q.get("name")?.toLowerCase();
    if (name) rows = rows.filter((r) => r.name.toLowerCase().includes(name) || r.sn.toLowerCase().includes(name));
    return ok(page(rows, q, 50));
  }

  const machinePath = path.match(/^\/machines\/([^/]+)(\/.*)?$/);
  if (machinePath) {
    const m = MACHINES.find((x) => x.sn === decodeURIComponent(machinePath[1]));
    if (!m) return notFound;
    const rest = machinePath[2] ?? "";
    if (rest === "") return ok({ machine: machineFull(m) });
    if (rest === "/goods") return ok({ items: GOODS.map((g, i) => machineGood(g, i, m)), total: GOODS.length });
    if (rest === "/goods/available") return ok({ items: [] });
    if (rest === "/stock") return ok({ items: stockSlots(m) });
    if (rest === "/stock/history") {
      const slots = stockSlots(m);
      return ok({
        items: [
          { at: ago(60 * 3), by: "Suresh Patil", byMachine: false, changes: [{ slotId: "s1", materialId: "mat_choc", name: "Chocolate whey", before: 1200, add: 2000, after: 3200 }] },
          { at: ago(60 * 52), by: "Anita Rao", byMachine: false, changes: [{ slotId: "s6", materialId: "mat_cup", name: "Cups", before: 80, add: 150, after: 230 }, { slotId: "s2", materialId: "mat_van", name: slots[1].name, before: 1500, add: 2000, after: 3500 }] },
          { at: ago(60 * 24 * 6), by: "Machine", byMachine: true, changes: [{ slotId: "s3", materialId: "mat_ban", name: "Banana flavour", before: 2100, add: 0, after: 2050 }] },
        ],
        nextCursor: null,
      });
    }
    if (rest === "/voices") {
      const d = voiceSet(3);
      const eff = Object.fromEntries(["1", "2", "3", "4", "5"].map((p) => [p, { file: d.positions[p], source: "default" }]));
      return ok({ defaults: d, override: { positions: { 1: null, 2: null, 3: null, 4: null, 5: null }, version: 0, updatedAt: null, updatedBy: null }, effective: eff });
    }
    return notFound;
  }

  if (path === "/models") return ok({ items: [{ ...MODEL, protocol: "mqtt-v2", versions: "P1-HW 2.x" }] });
  if (path === "/goods" && method === "GET") return ok(page(GOODS.map(goodLibrary), q, 50));
  const goodOne = path.match(/^\/goods\/([^/]+)$/);
  if (goodOne) {
    const i = GOODS.findIndex((g) => g.id === decodeURIComponent(goodOne[1]));
    return i < 0 ? notFound : ok({ good: goodLibrary(GOODS[i], i) });
  }

  if (path === "/orders" && method === "GET") {
    let items = ORDERS;
    if (q.get("sn")) items = items.filter((o) => o.sn === q.get("sn"));
    if (q.get("status")) items = items.filter((o) => o.status === q.get("status"));
    return ok(cursorPage(items, q));
  }
  const orderOne = path.match(/^\/orders\/([^/]+)$/);
  if (orderOne) {
    const o = ORDERS.find((x) => x.orderId === decodeURIComponent(orderOne[1]));
    if (!o) return notFound;
    const t = Date.parse(o.createdAt);
    return ok({
      order: {
        ...o,
        payNo: "UPI" + o.orderId,
        thirdOrderNo: null,
        payment: o.payMethod === "qr" ? { paidAt: iso(t + 8_000), refund: null, refundReason: null } : null,
        materials: [{ materialId: "mat_whey", amount: 30, time: null, strengthOffset: null }],
        timeline: [
          { state: "created", at: iso(t) },
          { state: "paid", at: iso(t + 8_000) },
          { state: o.status, at: iso(t + 31_000) },
        ],
      },
    });
  }

  if (path === "/stats/sales") return ok(salesStats(q));
  if (path === "/stats/orders") return ok(orderStats(q));

  if (path === "/feedback" && method === "GET") {
    let items = FEEDBACK;
    if (q.get("type")) items = items.filter((f) => f.type === q.get("type"));
    if (q.get("state")) items = items.filter((f) => f.state === q.get("state"));
    const counts = { query: 1, review: 2, complaint: 2 };
    return ok({ ...cursorPage(items, q), newCount: FEEDBACK.filter((f) => f.state === "new").length, counts });
  }
  const fbOne = path.match(/^\/feedback\/([^/]+)$/);
  if (fbOne) {
    const f = FEEDBACK.find((x) => x.id === fbOne[1]);
    return f ? ok(f) : notFound;
  }

  if (path === "/logs/equipment") return ok(cursorPage(EQUIPMENT_LOG, q));
  if (path === "/logs/operations") return ok(cursorPage(OPERATIONS_LOG, q));

  if (path === "/redeem-codes" && method === "GET") return ok(page(CODES, q));
  const codeOne = path.match(/^\/redeem-codes\/([^/]+)$/);
  if (codeOne) {
    const c = CODES.find((x) => x.code === decodeURIComponent(codeOne[1]));
    return c ? ok({ code: c }) : notFound;
  }
  if (/^\/redeem-codes\/[^/]+\/uses$/.test(path)) {
    return ok({ items: [{ orderId: ORDERS[3].orderId, sn: MACHINES[0].sn, deviceExtNo: MACHINES[0].ext, goodsId: "g_van", goodsName: "Vanilla Whey Shake", at: ago(300), returned: false, returnedAt: null, orderState: "made" }] });
  }

  if (path === "/promotions" && method === "GET") {
    const kind = q.get("kind");
    return ok(page(kind === "discount" ? DISCOUNTS : [], q));
  }
  const promoOne = path.match(/^\/promotions\/([^/]+)$/);
  if (promoOne) {
    const p = DISCOUNTS.find((x) => x.promoId === promoOne[1]);
    return p ? ok({ promotion: p }) : notFound;
  }

  return notFound;
}

export const sampleFacts = { MACHINES };
