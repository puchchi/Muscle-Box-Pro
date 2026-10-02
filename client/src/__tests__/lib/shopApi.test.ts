import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "https://shop.example/sandbox";
const TOKEN = "A".repeat(43);

async function api(base: string | undefined = BASE) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MBP_SHOP_API_URL", base ?? "");
  return import("@/lib/shopApi");
}

function reply(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(body === undefined ? "" : JSON.stringify(body), { status }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("shopApi", () => {
  it("is off when the variable is unset, and calls nothing", async () => {
    const fetch = reply(200, {});
    vi.stubGlobal("fetch", fetch);
    const { SHOP_API_BASE_URL, fetchShopMenu } = await api("");
    expect(SHOP_API_BASE_URL).toBeNull();
    expect((await fetchShopMenu("X")).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the receipt with the token in a header, never in the path, and sends no cookies", async () => {
    const fetch = reply(200, { status: "paid", drink: { goodsId: "g", name: "D", image: "" }, pricePaise: 100, sn: "S", machineName: "M", code: null, used: null });
    vi.stubGlobal("fetch", fetch);
    const { fetchShopReceipt } = await api(`${BASE}/`);
    const result = await fetchShopReceipt(TOKEN);

    expect(result).toMatchObject({ ok: true, data: { status: "paid" } });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${BASE}/order`);
    expect(url).not.toContain(TOKEN);
    expect(init.headers).toEqual({ "x-shop-order-token": TOKEN });
    expect(init.credentials).toBe("omit");
    expect(init.method).toBe("GET");
  });

  it("posts an order as JSON with only the machine and the drink", async () => {
    const fetch = reply(201, { token: TOKEN, razorpayOrderId: "order_1", amount: 9900, currency: "INR", keyId: "rzp_test_1" });
    vi.stubGlobal("fetch", fetch);
    const { createShopOrder } = await api();
    expect((await createShopOrder("GS805TEST01", "1001")).ok).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${BASE}/orders`);
    expect(JSON.parse(init.body)).toEqual({ sn: "GS805TEST01", goodsId: "1001" });
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("passes a known refusal through with its message and field errors", async () => {
    vi.stubGlobal("fetch", reply(400, { code: "invalid_request", message: "Some of the details aren't right.", fieldErrors: { email: "Enter an email address like name@example.com.", n: 1 } }));
    const { emailShopCode } = await api();
    expect(await emailShopCode(TOKEN, "x")).toEqual({
      ok: false,
      error: { code: "invalid_request", message: "Some of the details aren't right.", fieldErrors: { email: "Enter an email address like name@example.com." } },
    });
  });

  it("turns an unknown code, a 429 and a broken body into plain messages", async () => {
    const { fetchShopMenu } = await api();
    vi.stubGlobal("fetch", reply(500, { code: "kaboom", message: "stack trace" }));
    expect(await fetchShopMenu("X")).toMatchObject({ ok: false, error: { code: "network" } });
    vi.stubGlobal("fetch", reply(429, undefined));
    expect(await fetchShopMenu("X")).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    vi.stubGlobal("fetch", reply(200, { nonsense: true }));
    expect(await fetchShopMenu("X")).toMatchObject({ ok: false, error: { code: "network" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await fetchShopMenu("X")).toMatchObject({ ok: false, error: { code: "network" } });
  });

  it("escapes the serial in the menu path", async () => {
    const fetch = reply(404, { code: "machine_unknown", message: "We couldn't find that machine." });
    vi.stubGlobal("fetch", fetch);
    const { fetchShopMenu } = await api();
    expect(await fetchShopMenu("a/b")).toMatchObject({ ok: false, error: { code: "machine_unknown" } });
    expect(fetch.mock.calls[0]![0]).toBe(`${BASE}/machines/a%2Fb`);
  });
});
