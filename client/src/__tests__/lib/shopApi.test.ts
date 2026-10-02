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

describe("shop sessions", () => {
  const SESSION = "s".repeat(43);
  const customer = { customerId: "cu_1", email: "a@x.in", stamps: -1, stampsToNext: 10 };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("signs in with cookies, keeps the sandbox token for the tab only, and sends it back as a bearer", async () => {
    const fetch = reply(200, { customer, sessionToken: SESSION });
    vi.stubGlobal("fetch", fetch);
    const { verifySignin, fetchMe } = await api();
    const result = await verifySignin("a@x.in", "123456", { sn: "S1", claimToken: TOKEN });

    expect(result).toMatchObject({ ok: true, data: { customer: { stamps: 0, stampsToNext: 10 } } });
    const [, init] = fetch.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ email: "a@x.in", code: "123456", sn: "S1", claimToken: TOKEN });
    expect(init.credentials).toBe("include");
    expect(localStorage.getItem("mbp:shop-signed-in")).toBe("1");
    expect(JSON.stringify({ ...localStorage })).not.toContain("a@x.in");
    expect(JSON.stringify({ ...localStorage })).not.toContain(SESSION);

    fetch.mockResolvedValue(new Response(JSON.stringify({ customer }), { status: 200 }));
    await fetchMe();
    expect(fetch.mock.calls[1]![1].headers).toEqual({ Authorization: `Bearer ${SESSION}` });
  });

  it("never keeps a bearer against the production host", async () => {
    vi.stubGlobal("fetch", reply(200, { customer, sessionToken: SESSION }));
    const { verifySignin } = await api("https://api.muscleboxpro.com/shop");
    await verifySignin("a@x.in", "123456", { sn: null });
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem("mbp:shop-signed-in")).toBe("1");
  });

  it("forgets the sign-in when the server says it's over", async () => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    sessionStorage.setItem("mbp:shop-sandbox-session", SESSION);
    vi.stubGlobal("fetch", reply(401, { code: "signed_out", message: "Sign in again." }));
    const { fetchMe } = await api();
    expect(await fetchMe()).toMatchObject({ ok: false, error: { code: "signed_out" } });
    expect(localStorage.getItem("mbp:shop-signed-in")).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("orders as the customer only when asked, and as a guest with no cookies otherwise", async () => {
    const fetch = reply(200, { token: TOKEN, razorpayOrderId: "o", amount: 100, currency: "INR", keyId: "k" });
    vi.stubGlobal("fetch", fetch);
    const { createShopOrder } = await api();
    await createShopOrder("S1", "g");
    await createShopOrder("S1", "g", { asCustomer: true });
    expect(fetch.mock.calls[0]![1].credentials).toBe("omit");
    expect(fetch.mock.calls[1]![1].credentials).toBe("include");
  });

  it("deletes the account with a JSON DELETE and signs out locally", async () => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    const fetch = reply(200, { deleted: true });
    vi.stubGlobal("fetch", fetch);
    const { deleteAccount } = await api();
    expect((await deleteAccount()).ok).toBe(true);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: "DELETE", headers: { "Content-Type": "application/json" } });
    expect(localStorage.getItem("mbp:shop-signed-in")).toBeNull();
  });
});
