import { afterEach, describe, expect, it, vi } from "vitest";

const BASE = "https://shop-admin.example/sandbox";

async function api(base = BASE) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MBP_SHOP_ADMIN_API_URL", base);
  return import("@/lib/shopAdminApi");
}

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

const wireOrder = { shopOrderId: "so_1", status: "coded", sn: "S1", machineName: "M", drink: { goodsId: "1001", name: "D", image: "" }, pricePaise: 9900, code: "12345678", createdAt: 1_759_400_000_000 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("shopAdminApi", () => {
  it("is off and calls nothing when the variable is unset", async () => {
    const fetch = reply(200, {});
    vi.stubGlobal("fetch", fetch);
    const { shopAdminConfigured, fetchShopOrders } = await api("");
    expect(shopAdminConfigured()).toBe(false);
    expect((await fetchShopOrders({}, null)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts a refund with its reason to the order's path", async () => {
    const fetch = reply(200, { order: { ...wireOrder, status: "refund_owed" } });
    vi.stubGlobal("fetch", fetch);
    const { refundShopOrder } = await api(`${BASE}/`);
    const result = await refundShopOrder("so/1", "Machine didn't pour");
    expect(result).toMatchObject({ ok: true, data: { order: { status: "refund_owed" } } });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${BASE}/orders/so%2F1/refund`);
    expect(JSON.parse(init.body)).toEqual({ reason: "Machine didn't pour" });
  });

  it("keeps the server's words for a used code, and maps a signed-out session", async () => {
    const { refundShopOrder, fetchShopOrder } = await api();
    vi.stubGlobal("fetch", reply(409, { code: "code_used", message: "This code has been used, so it can't be refunded." }));
    expect(await refundShopOrder("so_1", "x")).toMatchObject({ ok: false, error: { code: "conflict", message: "This code has been used, so it can't be refunded." } });
    vi.stubGlobal("fetch", reply(401, { code: "signed_out", message: "Please sign in again." }));
    expect(await fetchShopOrder("so_1")).toMatchObject({ ok: false, error: { code: "invalid_token" } });
  });

  it("reads a page of orders with the drink and refund flattened, and an unknown status", async () => {
    const refund = { requestedBy: "a@x.in", requestedAt: "2026-10-02T11:00:00.000Z", reason: "Jammed", retries: 1 };
    const fetch = reply(200, { orders: [wireOrder, { ...wireOrder, shopOrderId: "so_2", status: "new_thing", refund }], nextCursor: "c1" });
    vi.stubGlobal("fetch", fetch);
    const { fetchShopOrders } = await api();
    const result = await fetchShopOrders({ month: "2026-10" }, null);
    if (!result.ok) throw new Error("expected ok");
    expect(fetch.mock.calls[0]![0]).toBe(`${BASE}/orders?month=2026-10`);
    expect(result.data.nextCursor).toBe("c1");
    expect(result.data.items[0]).toMatchObject({ goodsId: "1001", drinkName: "D", codeUsed: null, refundRequestedAt: null, reissues: 0, previousCodes: [], pendingReissue: null });
    expect(result.data.items[1]).toMatchObject({ status: "unknown", refundRequestedBy: "a@x.in", refundReason: "Jammed", refundRetries: 1 });
  });

  it("reads a customer row's email and balance, and a deleted account's missing email", async () => {
    vi.stubGlobal("fetch", reply(200, { customers: [{ customerId: "cu_1", email: "a@b.in", stamps: 3, balancePaise: 5000, createdAt: 1 }, { customerId: "cu_2", email: null, stamps: 0, createdAt: 1 }], nextCursor: null }));
    const { fetchShopCustomers } = await api();
    const result = await fetchShopCustomers(null);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.items[0]).toMatchObject({ email: "a@b.in", balancePaise: 5000 });
    expect(result.data.items[1]).toMatchObject({ email: null, balancePaise: 0 });
  });

  it("sends the reason with a reissue", async () => {
    const fetch = reply(200, { order: wireOrder, resumed: false });
    vi.stubGlobal("fetch", fetch);
    const { reissueShopOrder } = await api();
    expect((await reissueShopOrder("so_1", { sn: "S2", goodsId: "1005", reason: "Jammed" })).ok).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ sn: "S2", goodsId: "1005", reason: "Jammed" });
  });
});
