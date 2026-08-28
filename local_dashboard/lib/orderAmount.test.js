// Tests for the /order/qr amount guard (TODO A4).
//
// Run by the root vitest suite, which reaches into this CommonJS project — see the
// `include` note in vitest.config.ts. The module reads its env vars at call time
// precisely so these tests can vary them without touching the module cache.
//
// What is worth testing here is not the happy path. It is every malformed value that
// `parseFloat` would quietly turn into a real charge, and the exact boundary of the
// ceiling — an off-by-one there either rejects a legitimate price or admits an attack.

const { validateOrderAmount, parseRupeesToPaise, maxInr, priceMode } = require("./orderAmount");

const ENV_KEYS = ["MACHINE_AMOUNT_MAX_INR", "MACHINE_PRICE_MODE", "MACHINE_PRICE_LIST"];

describe("parseRupeesToPaise", () => {
  it("converts decimal rupee strings to integer paise", () => {
    expect(parseRupeesToPaise("120")).toEqual({ ok: true, paise: 12_000, normalised: "120.00" });
    expect(parseRupeesToPaise("120.50")).toEqual({ ok: true, paise: 12_050, normalised: "120.50" });
    expect(parseRupeesToPaise("120.5")).toEqual({ ok: true, paise: 12_050, normalised: "120.50" });
    expect(parseRupeesToPaise("0.01")).toEqual({ ok: true, paise: 1, normalised: "0.01" });
  });

  it("does not lose a paisa to floating point", () => {
    // `parseFloat("0.1") * 100` is 10.000000000000002 and `0.29 * 100` is 28.999999999999996.
    // Either one, compared against a price list, rejects a correct amount.
    expect(parseRupeesToPaise("0.10").paise).toBe(10);
    expect(parseRupeesToPaise("0.29").paise).toBe(29);
    expect(parseRupeesToPaise("119.99").paise).toBe(11_999);
  });

  it("accepts a JSON number, but held to the same format rule", () => {
    expect(parseRupeesToPaise(120).paise).toBe(12_000);
    expect(parseRupeesToPaise(120.5).paise).toBe(12_050);
    // Not silently rounded to 120.46 — a third decimal place means the caller and we
    // disagree about the amount, and guessing which of us is right is the bug.
    expect(parseRupeesToPaise(120.456).ok).toBe(false);
    expect(parseRupeesToPaise(1e3).paise).toBe(100_000); // String(1e3) === "1000"
    expect(parseRupeesToPaise(1e21).ok).toBe(false); // String(1e21) === "1e+21"
  });

  it.each([
    ["120abc", "trailing rubbish parseFloat would truncate to 120"],
    ["1e3", "exponent notation parseFloat would read as 1000"],
    ["12.345", "more than two decimal places"],
    ["-5", "negative"],
    ["-0.01", "negative below a paisa"],
    ["0", "zero"],
    ["0.00", "zero with places"],
    ["", "empty string, which Number() reads as 0"],
    ["  ", "whitespace only"],
    ["abc", "not a number at all"],
    ["NaN", "the literal NaN"],
    ["Infinity", "the literal Infinity"],
    ["120,50", "a comma decimal separator"],
    ["₹120", "a currency symbol"],
    ["+120", "a leading plus"],
    [".5", "no whole part"],
    ["120.", "a trailing dot"],
    ["0x10", "hex, which Number() reads as 16"],
  ])("rejects %j — %s", (value) => {
    const result = parseRupeesToPaise(value);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("rejects a missing value rather than treating it as zero", () => {
    for (const value of [undefined, null, ""]) {
      expect(parseRupeesToPaise(value)).toEqual({ ok: false, reason: "totalAmount is missing" });
    }
  });

  it("trims surrounding whitespace on a string", () => {
    expect(parseRupeesToPaise(" 120 ").paise).toBe(12_000);
  });

  it("rejects an amount too large to hold exactly in a JS integer", () => {
    const result = parseRupeesToPaise("1000000000000000000");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/too large/);
  });
});

describe("validateOrderAmount", () => {
  let warnings;

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    // The logger writes straight to console.log; captured so the assertions can read the
    // observe-mode warnings, which are the whole output of layer 2 until it is enforced.
    warnings = [];
    vi.spyOn(console, "log").mockImplementation((line) => warnings.push(String(line)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  const logged = () => warnings.join("\n");

  // ── Layer 1: shape and bounds, always enforced ─────────────────────────────

  it("passes a plausible shake price and hands back the normalised amount", () => {
    const result = validateOrderAmount({ totalAmount: "120", subject: "Whey Chocolate" });
    expect(result.ok).toBe(true);
    expect(result.paise).toBe(12_000);
    // `machineRoutes` forwards this string to PhonePe, not the raw field.
    expect(result.normalised).toBe("120.00");
  });

  it("rejects a malformed amount before any pricing question is asked", () => {
    const result = validateOrderAmount({ totalAmount: "120abc" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not a positive decimal/);
  });

  it("rejects an absent body without throwing", () => {
    expect(validateOrderAmount(undefined).ok).toBe(false);
    expect(validateOrderAmount({}).reason).toBe("totalAmount is missing");
  });

  it("enforces the ceiling exactly at the boundary", () => {
    expect(validateOrderAmount({ totalAmount: "1000.00" }).ok).toBe(true);
    expect(validateOrderAmount({ totalAmount: "1000.01" }).ok).toBe(false);
  });

  it("names the ceiling in the reason so the log says how to raise it", () => {
    const result = validateOrderAmount({ totalAmount: "50000" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/exceeds the ₹1000 ceiling/);
    expect(result.reason).toMatch(/MACHINE_AMOUNT_MAX_INR/);
    // The parsed values still come back — the caller logs them even on a rejection.
    expect(result.paise).toBe(50_00_000);
  });

  it("honours a raised ceiling", () => {
    process.env.MACHINE_AMOUNT_MAX_INR = "5000";
    expect(maxInr()).toBe(5000);
    expect(validateOrderAmount({ totalAmount: "4999" }).ok).toBe(true);
    expect(validateOrderAmount({ totalAmount: "5000.01" }).ok).toBe(false);
  });

  it.each(["", "  ", "abc", "0", "-100", "1e4", "NaN"])(
    "falls back to the default ceiling when MACHINE_AMOUNT_MAX_INR is %j",
    (value) => {
      // A typo'd or emptied env var must not silently remove the ceiling. `parseInt("1e4")`
      // is 1 — which would be a *tighter* limit that 400s every real order, so it is
      // rejected in favour of the default rather than trusted.
      process.env.MACHINE_AMOUNT_MAX_INR = value;
      expect(maxInr()).toBe(1000);
      expect(validateOrderAmount({ totalAmount: "1000.01" }).ok).toBe(false);
      expect(validateOrderAmount({ totalAmount: "120" }).ok).toBe(true);
    },
  );

  // ── Layer 2: the exact price list ──────────────────────────────────────────

  it("reports no-list when nothing is configured", () => {
    expect(priceMode()).toBe("observe");
    expect(validateOrderAmount({ totalAmount: "120", subject: "Whey" }).priceListVerdict).toBe(
      "no-list",
    );
  });

  it("matches on objectId", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    const result = validateOrderAmount({ totalAmount: "120.00", objectId: 1, subject: "Whey" });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("match");
  });

  it("falls back to subject when objectId is not listed", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ "Whey Chocolate": "120.00" });
    const result = validateOrderAmount({
      totalAmount: "120",
      objectId: 99,
      subject: "Whey Chocolate",
    });
    expect(result.priceListVerdict).toBe("match");
  });

  it("prefers objectId over subject when both are listed", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120", "Whey Chocolate": "999" });
    const result = validateOrderAmount({
      totalAmount: "120",
      objectId: 1,
      subject: "Whey Chocolate",
    });
    expect(result.priceListVerdict).toBe("match");
  });

  it("compares by paise, so 120 and 120.00 are the same price", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    expect(validateOrderAmount({ totalAmount: "120.00", objectId: 1 }).priceListVerdict).toBe(
      "match",
    );
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "0.10" });
    expect(validateOrderAmount({ totalAmount: "0.1", objectId: 1 }).priceListVerdict).toBe("match");
  });

  it("in observe mode, logs a mismatch and lets the payment through", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    const result = validateOrderAmount({ totalAmount: "999", objectId: 1 });
    // Deliberate: enforcing a guessed catalogue would 400 the machine server and stop
    // live payments. The log is how the list gets confirmed.
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("mismatch");
    expect(logged()).toMatch(/would have REJECTED/);
    expect(logged()).toMatch(/₹999\.00 does not match the listed price ₹120\.00/);
  });

  it("in enforce mode, rejects a mismatch", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    process.env.MACHINE_PRICE_MODE = "enforce";
    const result = validateOrderAmount({ totalAmount: "999", objectId: 1 });
    expect(result.ok).toBe(false);
    expect(result.priceListVerdict).toBe("mismatch");
    expect(result.reason).toMatch(/does not match the listed price/);
  });

  it("reads the mode case-insensitively", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    process.env.MACHINE_PRICE_MODE = "ENFORCE";
    expect(validateOrderAmount({ totalAmount: "999", objectId: 1 }).ok).toBe(false);
  });

  it("in off mode, skips the list entirely but keeps the bounds check", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    process.env.MACHINE_PRICE_MODE = "off";
    const result = validateOrderAmount({ totalAmount: "999", objectId: 1 });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("no-list");
    expect(logged()).not.toMatch(/would have REJECTED/);
    // The ceiling is a separate knob and is not disabled by turning the list off.
    expect(validateOrderAmount({ totalAmount: "50000", objectId: 1 }).ok).toBe(false);
  });

  it("never rejects an unlisted product, even in enforce mode", () => {
    // A new flavour that nobody added to the list is a gap in our data, not evidence of
    // a bad request. Rejecting it would take that product offline.
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    process.env.MACHINE_PRICE_MODE = "enforce";
    const result = validateOrderAmount({ totalAmount: "150", objectId: 7, subject: "New Flavour" });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("unknown-product");
    expect(logged()).toMatch(/no price listed/);
    expect(logged()).toMatch(/MACHINE_PRICE_LIST/);
  });

  it("does not treat an inherited Object.prototype key as a listed price", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "120" });
    process.env.MACHINE_PRICE_MODE = "enforce";
    // `"constructor" in {}` is true, so an `in` check against a plain object would find
    // a "price" of `Object` here and then have to decide what to do with it.
    const result = validateOrderAmount({ totalAmount: "150", subject: "constructor" });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("unknown-product");
  });

  it.each([
    ["not valid JSON", "{oops"],
    ["a JSON array", "[1,2,3]"],
    ["a JSON string", '"120"'],
    ["JSON null", "null"],
  ])("degrades to the bounds check when MACHINE_PRICE_LIST is %s", (_label, raw) => {
    process.env.MACHINE_PRICE_LIST = raw;
    process.env.MACHINE_PRICE_MODE = "enforce";
    // A malformed price list must never take the payment path down.
    const result = validateOrderAmount({ totalAmount: "120", objectId: 1 });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("no-list");
    expect(logged()).toMatch(/MACHINE_PRICE_LIST/);
    expect(validateOrderAmount({ totalAmount: "50000", objectId: 1 }).ok).toBe(false);
  });

  it("skips the check when the listed price is itself unusable", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ 1: "one hundred and twenty" });
    process.env.MACHINE_PRICE_MODE = "enforce";
    const result = validateOrderAmount({ totalAmount: "120", objectId: 1 });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("no-list");
    expect(logged()).toMatch(/unusable/);
  });

  it("ignores empty product identifiers rather than looking them up", () => {
    process.env.MACHINE_PRICE_LIST = JSON.stringify({ "": "999" });
    const result = validateOrderAmount({ totalAmount: "120", objectId: "", subject: "" });
    expect(result.ok).toBe(true);
    expect(result.priceListVerdict).toBe("unknown-product");
  });
});
