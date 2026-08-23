// Server-side validation of the amount a machine asks us to charge.
//
// Closes the last open half of TODO A4. `gsAuth` now proves *who* is calling, but the GS digest
// covers only the headers and never the body (spec §3.2.1), so a valid signature says nothing
// about the amount inside it. Until this existed, `/order/qr` passed `totalAmount` straight to
// PhonePe: a replayed header triple, or the machine firmware sending a wrong field, could mint a
// payment URL for any sum on the live merchant account.
//
// Two layers, deliberately separated by how confident we are:
//
//   1. **Shape and bounds — always enforced.** There is no legitimate machine request that these
//      reject. A protein shake is around ₹120 (the agreement's indicative ASP), so a ₹50,000 order
//      is not a pricing question, it is an attack or a bug. This layer needs no knowledge of the
//      catalogue, which is why it can be switched on without risk.
//
//   2. **Exact price list — observe by default.** Checking `totalAmount` against a known price per
//      product is strictly better, but it needs the real catalogue, and we do not have it: nothing
//      confirms whether `objectId` or `subject` identifies the product, or what the operator has
//      priced each slot at. Enforcing a guessed list would 400 the machine server and stop live
//      payments — the same trap that keeps `GS_AUTH_MODE` on observe. So it logs what it would have
//      rejected and lets it through, and the log is how the list gets confirmed.
//
// Amounts are handled as integer paise throughout. `parseFloat("0.1") * 100` is 10.000000000000002,
// and money comparisons that go through a float are how a validator ends up rejecting a correct
// price. The wire format stays a decimal rupee string because that is what the vendor spec and
// PhonePe both use.

const log = require("./logger");

// Both read at call time rather than captured at require time. `gsAuth` captures its mode in a
// const, which is fine for a long-lived process but makes the behaviour untestable without module
// cache surgery — and this module guards money, so it needs tests more than it needs symmetry.

/** Generous against a ~₹120 product; the point is the order of magnitude, not the price. */
const DEFAULT_MAX_INR = 1000;

/** Ceiling in whole rupees, from `MACHINE_AMOUNT_MAX_INR`. */
function maxInr() {
  // Strict, for the same reason the amounts themselves are: `parseInt("1e4")` is 1, and a
  // ₹1 ceiling silently 400s every real order. A typo'd env var must change nothing.
  const raw = (process.env.MACHINE_AMOUNT_MAX_INR || "").trim();
  if (!/^\d+$/.test(raw)) return DEFAULT_MAX_INR;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_INR;
}

/** observe | enforce | off — governs the exact price list only, never the bounds check above. */
function priceMode() {
  return (process.env.MACHINE_PRICE_MODE || "observe").toLowerCase();
}

/**
 * Optional exact prices, as JSON in `MACHINE_PRICE_LIST`. Keys are matched against `objectId`
 * first and then `subject`; values are rupee amounts.
 *
 *   MACHINE_PRICE_LIST='{"1":"120","Whey Chocolate":"120.00"}'
 */
function loadPriceList() {
  const raw = process.env.MACHINE_PRICE_LIST;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      log.warn("[Amount] MACHINE_PRICE_LIST is not a JSON object — ignoring it");
      return null;
    }
    return parsed;
  } catch (err) {
    // Deliberately not fatal: a malformed price list must not take the payment path down. It
    // degrades to the bounds check, loudly.
    log.warn(`[Amount] MACHINE_PRICE_LIST is not valid JSON (${err.message}) — ignoring it`);
    return null;
  }
}

/**
 * Strict decimal-rupee parse to integer paise.
 *
 * Rejects everything `parseFloat` would quietly accept: `parseFloat("120abc")` is 120,
 * `parseFloat("1e3")` is 1000, and `Number("")` is 0. Each of those turns a malformed field into a
 * real charge, so the format is matched before any arithmetic happens.
 *
 * @returns {{ ok: true, paise: number, normalised: string } | { ok: false, reason: string }}
 */
function parseRupeesToPaise(value) {
  if (value === null || value === undefined || value === "") {
    return { ok: false, reason: "totalAmount is missing" };
  }
  // A number is accepted, but via its string form so the same strict format rule applies. Numbers
  // arriving as 120.456 or 1e3 are rejected rather than silently rounded.
  const text = typeof value === "number" ? String(value) : String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return {
      ok: false,
      reason: `totalAmount ${JSON.stringify(String(value))} is not a positive decimal with at most 2 places`,
    };
  }

  const [whole, frac = ""] = text.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));

  if (!Number.isSafeInteger(paise)) return { ok: false, reason: "totalAmount is too large to represent" };
  if (paise <= 0) return { ok: false, reason: "totalAmount must be greater than zero" };

  return { ok: true, paise, normalised: (paise / 100).toFixed(2) };
}

/**
 * Validates the amount on an order-create request.
 *
 * @param {{ totalAmount?: unknown, objectId?: unknown, subject?: unknown }} body
 * @returns {{ ok: boolean, reason?: string, paise?: number, normalised?: string,
 *             priceListVerdict?: "match"|"mismatch"|"unknown-product"|"no-list" }}
 */
function validateOrderAmount(body) {
  const parsed = parseRupeesToPaise(body?.totalAmount);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const ceilingInr = maxInr();
  if (parsed.paise > ceilingInr * 100) {
    return {
      ok: false,
      reason: `totalAmount ₹${parsed.normalised} exceeds the ₹${ceilingInr} ceiling ` +
        `(raise MACHINE_AMOUNT_MAX_INR if this is a real price)`,
      paise: parsed.paise,
      normalised: parsed.normalised,
    };
  }

  const result = { ok: true, paise: parsed.paise, normalised: parsed.normalised };

  // ── Layer 2: the exact price list ──────────────────────────────────────────
  const mode = priceMode();
  const priceList = loadPriceList();
  if (mode === "off" || !priceList) {
    result.priceListVerdict = "no-list";
    return result;
  }

  const keys = [body?.objectId, body?.subject].filter((k) => k !== null && k !== undefined && k !== "");
  // `hasOwn`, not `in`: `"constructor" in {}` is true, so a product literally named
  // "constructor" or "toString" would otherwise resolve to a function as its "price".
  const key = keys.map(String).find((k) => Object.hasOwn(priceList, k));

  if (key === undefined) {
    // An unpriced product is a gap in our list, not evidence of a bad request, so this never
    // rejects even in enforce mode — the alternative is a new flavour taking payments offline.
    result.priceListVerdict = "unknown-product";
    log.warn(
      `[Amount] no price listed for ${JSON.stringify(keys.map(String))} — charged ₹${parsed.normalised} unchecked. ` +
        `Add it to MACHINE_PRICE_LIST.`,
    );
    return result;
  }

  const expected = parseRupeesToPaise(priceList[key]);
  if (!expected.ok) {
    result.priceListVerdict = "no-list";
    log.warn(`[Amount] price for "${key}" in MACHINE_PRICE_LIST is unusable (${expected.reason}) — skipping the check`);
    return result;
  }

  if (expected.paise === parsed.paise) {
    result.priceListVerdict = "match";
    return result;
  }

  result.priceListVerdict = "mismatch";
  const detail =
    `totalAmount ₹${parsed.normalised} does not match the listed price ₹${expected.normalised} for "${key}"`;

  if (mode === "enforce") return { ...result, ok: false, reason: detail };

  log.warn(`[Amount] observe-mode: would have REJECTED — ${detail}. Set MACHINE_PRICE_MODE=enforce once the list is confirmed.`);
  return result;
}

module.exports = { validateOrderAmount, parseRupeesToPaise, maxInr, priceMode };
