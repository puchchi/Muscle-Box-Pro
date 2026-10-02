import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  fetchShopOrders: vi.fn(),
  fetchShopOrder: vi.fn(),
  refundShopOrder: vi.fn(),
  retryShopRefund: vi.fn(),
  reissueShopOrder: vi.fn(),
  fetchShopCustomers: vi.fn(),
  fetchShopCustomer: vi.fn(),
  fetchShopMenu: vi.fn(),
  fetchAllMachines: vi.fn(),
  search: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/lib/shopAdminApi", () => ({
  shopAdminConfigured: () => true,
  fetchShopOrders: m.fetchShopOrders,
  fetchShopOrder: m.fetchShopOrder,
  refundShopOrder: m.refundShopOrder,
  retryShopRefund: m.retryShopRefund,
  reissueShopOrder: m.reissueShopOrder,
  fetchShopCustomers: m.fetchShopCustomers,
  fetchShopCustomer: m.fetchShopCustomer,
}));
vi.mock("@/lib/shopApi", () => ({ fetchShopMenu: m.fetchShopMenu }));
vi.mock("@/lib/adminMachineApi", async (orig) => ({ ...(await orig<typeof import("@/lib/adminMachineApi")>()), fetchAllMachines: m.fetchAllMachines }));
vi.mock("@/pages/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ state: "ready", session: { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => m.search() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { shopAdminOrderEnvelopeSchema, shopCustomerDetailSchema, shopCustomerRowSchema } from "@shared/admin/shopAdminSchema";
import { shopMenuSchema } from "@shared/shop/shopSchema";
import AdminShopOrders from "@/pages/admin/AdminShopOrders";
import AdminShopOrderDetail from "@/pages/admin/AdminShopOrderDetail";
import AdminShopCustomers from "@/pages/admin/AdminShopCustomers";
import AdminShopCustomerDetail from "@/pages/admin/AdminShopCustomerDetail";
import { shopOrderOfCode } from "@/pages/admin/machines/shopBits";

const wireOrder = (over: Record<string, unknown> = {}) => ({
  shopOrderId: "so_1",
  status: "coded",
  sn: "S1",
  machineName: "Lab GS805",
  drink: { goodsId: "1001", name: "Chocolate protein shake", image: "" },
  pricePaise: 9900,
  code: "12345678",
  customerId: "cu_1",
  createdAt: "2026-10-02T05:00:00.000Z",
  ...over,
});

const order = (over: Record<string, unknown> = {}, usedCount = 0) =>
  shopAdminOrderEnvelopeSchema.parse({ order: wireOrder(over), codeStatus: { state: "active", usedCount, lastUsedAt: null } }).order;

const ok = <T,>(data: T) => ({ ok: true, data });

beforeEach(() => {
  vi.clearAllMocks();
  m.search.mockImplementation(() => new URLSearchParams());
  m.fetchAllMachines.mockResolvedValue(ok([]));
});

describe("Shop orders list", () => {
  it("lists this month's orders and takes the customer from the link", async () => {
    m.search.mockImplementation(() => new URLSearchParams("customerId=cu_1"));
    m.fetchShopOrders.mockResolvedValue(ok({ items: [order()], nextCursor: null }));
    render(<AdminShopOrders />);
    const row = await screen.findByTestId("row-shop-order-so_1");
    expect(within(row).getByText("₹99")).toBeInTheDocument();
    expect(within(row).getByTestId("shop-status-so_1")).toHaveTextContent("Code issued");
    expect(m.fetchShopOrders).toHaveBeenCalledWith(expect.objectContaining({ customerId: "cu_1", month: expect.stringMatching(/^\d{4}-\d{2}$/) }), null);
  });
});

describe("Shop order detail", () => {
  it("refunds only with a reason, and shows the queued state", async () => {
    m.fetchShopOrder.mockResolvedValue(ok({ order: order() }));
    const refunded = order({ status: "refund_owed", refund: { reason: "Not poured", requestedBy: "a@x.in", requestedAt: 1, retries: 0 } });
    m.refundShopOrder.mockResolvedValue(ok({ order: refunded }));
    render(<AdminShopOrderDetail orderId="so_1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("button-shop-refund"));
    const confirm = screen.getByTestId("dialog-shop-refund-confirm");
    expect(confirm).toBeDisabled();
    m.fetchShopOrder.mockResolvedValue(ok({ order: refunded }));
    await user.type(screen.getByTestId("dialog-shop-refund-reason"), "  Not poured ");
    await user.click(confirm);
    expect(m.refundShopOrder).toHaveBeenCalledWith("so_1", "Not poured");
    expect(await screen.findByTestId("shop-order-done")).toBeInTheDocument();
    expect(screen.getByTestId("shop-order-status")).toHaveTextContent("Refund queued");
    expect(screen.queryByTestId("button-shop-refund")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-shop-refund")).toHaveTextContent("Not poured");
  });

  it("reads whether the code was used from the code status, and not knowing is not used", () => {
    expect(order({}, 1).codeUsed).toBe(true);
    expect(order().codeUsed).toBe(false);
    expect(shopAdminOrderEnvelopeSchema.parse({ order: wireOrder(), codeStatus: null }).order).toMatchObject({ codeUsed: null, drinkName: "Chocolate protein shake", goodsId: "1001" });
  });

  it("offers nothing on a used code, and says why", async () => {
    m.fetchShopOrder.mockResolvedValue(ok({ order: order({}, 1) }));
    render(<AdminShopOrderDetail orderId="so_1" />);
    expect(await screen.findByTestId("shop-no-actions")).toHaveTextContent("has been used");
    expect(screen.getByTestId("shop-order-code").querySelector("a")).toHaveAttribute("href", "/machines/redeem-codes/12345678");
  });

  it("reissues only for a drink at the price paid or lower", async () => {
    m.fetchShopOrder.mockResolvedValue(ok({ order: order() }));
    m.fetchShopMenu.mockResolvedValue(
      ok(
        shopMenuSchema.parse({
          sn: "S1",
          drinks: [
            { goodsId: "1001", name: "Chocolate", pricePaise: 9900 },
            { goodsId: "1002", name: "Big shake", pricePaise: 14900 },
            { goodsId: "1003", name: "Vanilla", pricePaise: 7900, soldOut: true },
            { goodsId: "1004", name: "Mango", pricePaise: 0, comingSoon: true },
            { goodsId: "1005", name: "Small shake", pricePaise: 4900 },
          ],
        }),
      ),
    );
    const reissued = order({ code: "87654321", drink: { goodsId: "1005", name: "Small shake", image: "" }, reissues: 1, previousCodes: [{ code: "12345678", replacedAt: 2, by: "a@x.in", reissue: 1 }] });
    m.reissueShopOrder.mockResolvedValue(ok({ order: reissued }));
    render(<AdminShopOrderDetail orderId="so_1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("button-shop-reissue"));
    await screen.findByTestId("reissue-drinks");
    expect(screen.getByTestId("reissue-drink-1001")).toBeInTheDocument();
    expect(screen.getByTestId("reissue-drink-1005")).toBeInTheDocument();
    for (const id of ["1002", "1003", "1004"]) expect(screen.queryByTestId(`reissue-drink-${id}`)).not.toBeInTheDocument();
    await user.click(screen.getByTestId("reissue-drink-1005"));
    expect(screen.getByTestId("dialog-shop-reissue-confirm")).toBeDisabled();
    await user.type(screen.getByTestId("input-shop-reissue-reason"), "Jammed");
    m.fetchShopOrder.mockResolvedValue(ok({ order: reissued }));
    await user.click(screen.getByTestId("dialog-shop-reissue-confirm"));
    expect(m.reissueShopOrder).toHaveBeenCalledWith("so_1", { sn: "S1", goodsId: "1005", reason: "Jammed" });
    expect(await screen.findByTestId("card-shop-earlier-codes")).toHaveTextContent("12345678");
  });

  it("finishes a half-done reissue before anything else", async () => {
    m.fetchShopOrder.mockResolvedValue(ok({ order: order({ pendingReissue: { n: 1, sn: "S2", machineName: "Gym 2", goodsId: "1005", drinkName: "Small shake" } }) }));
    m.reissueShopOrder.mockResolvedValue(ok({ order: order({ code: "87654321" }) }));
    render(<AdminShopOrderDetail orderId="so_1" />);
    const user = userEvent.setup();
    expect(await screen.findByTestId("shop-pending-reissue")).toBeInTheDocument();
    expect(screen.queryByTestId("button-shop-refund")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("button-shop-finish-reissue"));
    await user.type(screen.getByTestId("dialog-finish-reissue-reason"), "Jammed");
    await user.click(screen.getByTestId("dialog-finish-reissue-confirm"));
    expect(m.reissueShopOrder).toHaveBeenCalledWith("so_1", { sn: "S2", goodsId: "1005", reason: "Jammed" });
  });

  it("retries a failed refund, and shows a refusal as the server words it", async () => {
    m.fetchShopOrder.mockResolvedValue(ok({ order: order({ status: "refund_failed", refund: { requestedAt: 1, retries: 0 } }) }));
    m.retryShopRefund.mockResolvedValue({ ok: false, error: { code: "conflict", message: "The refund is already in the queue." }, issues: [] });
    render(<AdminShopOrderDetail orderId="so_1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("button-shop-retry-refund"));
    await user.click(screen.getByTestId("dialog-retry-refund-confirm"));
    expect(await screen.findByText("The refund is already in the queue.")).toBeInTheDocument();
  });
});

describe("Customers", () => {
  it("never shows an email in the list, and shows it on the customer's own page", async () => {
    const row = shopCustomerRowSchema.parse({ customerId: "cu_1", name: "Asha", stamps: 4, lifetimeDrinks: 13, rewardsIssued: 1, createdAt: 1, email: "asha@example.com" });
    m.fetchShopCustomers.mockResolvedValue(ok({ items: [row], nextCursor: null }));
    const { unmount, container } = render(<AdminShopCustomers />);
    await screen.findByTestId("row-customer-cu_1");
    expect(container.textContent).not.toContain("asha@example.com");
    unmount();

    m.fetchShopCustomer.mockResolvedValue(
      ok(shopCustomerDetailSchema.parse({ customer: { ...row, email: "asha@example.com" }, orders: [wireOrder({ createdAt: 1 })], nextCursor: null, rewards: [{ n: 1, status: "coded", code: "55554444", createdAt: 1, codedAt: 2 }, { n: 2, status: "pending", createdAt: 3 }] })),
    );
    render(<AdminShopCustomerDetail customerId="cu_1" />);
    expect(await screen.findByTestId("customer-email")).toHaveTextContent("asha@example.com");
    expect(screen.getByTestId("customer-stamps")).toHaveTextContent("4 of 9");
    expect(screen.getByTestId("customer-orders")).toHaveTextContent("so_1");
    expect(screen.getByRole("link", { name: "55554444" })).toHaveAttribute("href", "/machines/redeem-codes/55554444");
    expect(screen.getByText("Free drink 2, code being made")).toBeInTheDocument();
  });
});

describe("shopOrderOfCode", () => {
  it("finds the order behind a purchase or reissue code, and none behind a reward", () => {
    expect(shopOrderOfCode("so_1")).toBe("so_1");
    expect(shopOrderOfCode("reissue:so_1:2")).toBe("so_1");
    expect(shopOrderOfCode("reward:cu_1:1")).toBeNull();
  });
});
