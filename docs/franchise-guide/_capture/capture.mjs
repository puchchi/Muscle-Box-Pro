// Takes the franchise guide screenshots against a local dev server, with every backend call answered by mock.mjs.
//
//   1. Start the app pointed at the mock hosts (see run.sh)
//   2. npm run capture            (BASE_URL defaults to http://localhost:3100)

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOSTS, handle, goodsPicture, sampleFacts } from "./mock.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "images");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
mkdirSync(OUT, { recursive: true });

const [first, second, third] = sampleFacts.MACHINES;
let signedIn = true;
const misses = new Set();

const cors = {
  "access-control-allow-origin": BASE_URL,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

async function install(context) {
  await context.route(/^https:\/\/mock[^/]*\.(test|cloudfront\.net)\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.host === new URL(HOSTS.cdn).host) {
      const id = url.pathname.split("/").pop()?.replace(".svg", "") ?? "";
      if (url.pathname.endsWith(".svg")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: goodsPicture(id) });
      return route.fulfill({ status: 200, contentType: "audio/mpeg", body: "" });
    }
    const path = url.pathname.replace(/^\/sandbox/, "");
    let body;
    try {
      body = request.postDataJSON() ?? undefined;
    } catch {
      body = undefined;
    }
    if (!signedIn && (path === "/franchise/session" || path === "/me")) {
      return route.fulfill({ status: 401, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "invalid_handle", message: "Sign in" }) });
    }
    const result = handle(url.origin, request.method(), path, url.searchParams, body);
    if (result.status === 404) misses.add(`${request.method()} ${url.host}${path}`);
    return route.fulfill({ status: result.status, headers: cors, contentType: "application/json", body: JSON.stringify(result.body) });
  });
}

const settle = (page, ms = 1200) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(ms));

async function openTab(page, name) {
  const main = page.locator("main");
  const tab = main.getByRole("tab", { name, exact: true });
  const target = (await tab.count()) > 0 ? tab : main.getByRole("button", { name, exact: true });
  await target.first().click();
  await settle(page, 1200);
}

const SHOTS = [
  { file: "01-sign-in", url: "/franchise/login", signedOut: true },
  { file: "02-overview", url: "/franchise/dashboard", full: true },
  { file: "03-your-record", url: "/franchise/dashboard/record", full: true },
  { file: "04-machines", url: "/machines", full: true },
  { file: "05-machine-settings", url: `/machines/${first.sn}?tab=settings`, full: true },
  { file: "06-machine-goods", url: `/machines/${first.sn}?tab=goods`, full: true },
  { file: "07-machine-stock", url: `/machines/${second.sn}?tab=stock`, full: true },
  { file: "08-machine-voices", url: `/machines/${first.sn}?tab=voices`, full: true },
  { file: "09-machine-pins", url: `/machines/${first.sn}?tab=pin`, full: true },
  { file: "10-machine-remote", url: `/machines/${third.sn}?tab=remote`, full: true },
  { file: "11-machine-owner", url: `/machines/${first.sn}?tab=owner` },
  { file: "12-statistics-orders", url: "/machines/statistics" },
  { file: "13-statistics-sales", url: "/machines/statistics", after: (page) => openTab(page, "Sales") },
  { file: "14-orders", url: "/machines/orders" },
  { file: "15-shop-orders", url: "/machines/shop-orders", full: true },
  { file: "16-feedback", url: "/machines/feedback", full: true },
  { file: "17-redeem-codes", url: "/machines/redeem-codes", full: true },
  { file: "18-logs-equipment", url: "/machines/logs", full: true },
  { file: "19-operators", url: "/machines/operators", full: true },
  { file: "20-goods-library", url: "/machines/goods", full: true },
  { file: "21-discounts", url: "/machines/discounts", full: true },
  { file: "22-overview-mobile", url: "/franchise/dashboard", mobile: true },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const shot of SHOTS) {
  if (ONLY && !ONLY.test(shot.file)) continue;
  signedIn = !shot.signedOut;
  const context = await browser.newContext({
    viewport: shot.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: shot.mobile ? 2 : 1.5,
    colorScheme: "dark",
  });
  await install(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`  pageerror ${shot.file}: ${error.message}`));
  await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settle(page, 2000);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  if (shot.after) await shot.after(page);
  if (process.env.DUMP) {
    const target = (await page.locator("main").count()) > 0 ? page.locator("main").first() : page.locator("body");
    const text = await target.innerText().catch(() => "(unreadable)");
    console.log(`--- ${shot.file}\n${text.replace(/\n+/g, " | ").slice(0, Number(process.env.DUMP) || 700)}`);
  }
  await page.screenshot({ path: join(OUT, `${shot.file}.png`), fullPage: shot.full === true });
  console.log(`saved ${shot.file}`);
  await context.close();
}

await browser.close();
if (misses.size > 0) console.log("\nUnmocked requests:\n" + [...misses].join("\n"));
