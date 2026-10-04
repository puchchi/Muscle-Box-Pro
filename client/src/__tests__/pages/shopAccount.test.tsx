import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  fetchShopMenu: vi.fn(),
  createShopOrder: vi.fn(),
  fetchMe: vi.fn(),
  requestSigninCode: vi.fn(),
  verifySignin: vi.fn(),
  fetchMyCodes: vi.fn(),
  fetchMyOrders: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
  pay: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/shopApi", () => ({ SHOP_API_BASE_URL: "https://shop.example/sandbox", ...m }));
vi.mock("@/lib/razorpayCheckout", () => ({ payWithRazorpay: m.pay }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { shopCustomerSchema, shopMenuSchema, shopMyCodesSchema, shopMyOrdersSchema } from "@shared/shop/shopSchema";
import { DrinksShop } from "@/pages/shop/DrinksShop";
import { DrinkAccount } from "@/pages/shop/DrinkAccount";
import { saveOrder, savedOrders } from "@/pages/shop/savedOrders";

const TOKEN = "A".repeat(43);
const ok = <T,>(data: T) => ({ ok: true, data });
const customer = shopCustomerSchema.parse({ customerId: "cu_1", email: "asha@example.com", stamps: 4, stampsToNext: 5 });
const created = ok({ token: TOKEN, razorpayOrderId: "order_1", amount: 9900, currency: "INR", keyId: "rzp_test_1" });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  m.fetchShopMenu.mockResolvedValue(
    ok(shopMenuSchema.parse({ sn: "S1", online: true, enabled: true, drinks: [{ goodsId: "1001", name: "Chocolate protein shake", pricePaise: 9900 }] })),
  );
  m.createShopOrder.mockResolvedValue(created);
  m.pay.mockResolvedValue("paid");
  m.fetchMyCodes.mockResolvedValue(ok([]));
});

const rewardCode = (used: boolean) =>
  shopMyCodesSchema.parse({ codes: [{ kind: "reward", code: "90213948", drink: null, sn: null, machineName: null, used, createdAt: "2026-10-03T16:00:00Z" }] }).codes;

describe("paying on /drinks", () => {
  it("signs in inside the pay sheet, claims this phone's last order, then pays as the customer", async () => {
    saveOrder({ token: "B".repeat(43), sn: "S1", drinkName: "Earlier", savedAt: 1 });
    m.requestSigninCode.mockResolvedValue(ok({ accepted: true }));
    m.verifySignin.mockResolvedValue(ok({ customer, joinedOrders: 0, claimed: true }));
    render(<DrinksShop sn="S1" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("shop-buy-1001"));
    expect(screen.getByTestId("pay-choice")).toHaveTextContent("₹99");
    await user.click(screen.getByTestId("pay-member"));
    await user.type(screen.getByTestId("signin-email"), "asha@example.com");
    await user.click(screen.getByTestId("signin-send"));
    expect(m.requestSigninCode).toHaveBeenCalledWith("asha@example.com", "S1");

    const verify = await screen.findByTestId("signin-verify");
    expect(verify).toHaveTextContent("Sign in and pay ₹99");
    await user.click(verify);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the 6-digit code");
    expect(m.verifySignin).not.toHaveBeenCalled();
    await user.type(screen.getByTestId("signin-code"), "12a3456");
    expect(screen.getByTestId("signin-code")).toHaveValue("123456");
    await user.click(verify);

    expect(m.verifySignin).toHaveBeenCalledWith("asha@example.com", "123456", { sn: "S1", claimToken: "B".repeat(43) });
    expect(m.createShopOrder).toHaveBeenCalledWith("S1", "1001", { asCustomer: true });
    expect(m.push).toHaveBeenCalledWith(`/drinks/receipt#t=${TOKEN}`);
    expect(savedOrders()[0]).toMatchObject({ token: TOKEN, account: true });
  });

  it("shows a wrong code as the server words it and stays on the code step", async () => {
    m.requestSigninCode.mockResolvedValue(ok({ accepted: true }));
    m.verifySignin.mockResolvedValue({ ok: false, error: { code: "signin_code_wrong", message: "That code isn't right." } });
    render(<DrinksShop sn="S1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("shop-buy-1001"));
    await user.click(screen.getByTestId("pay-member"));
    await user.type(screen.getByTestId("signin-email"), "asha@example.com");
    await user.click(screen.getByTestId("signin-send"));
    await user.type(await screen.findByTestId("signin-code"), "000000");
    await user.click(screen.getByTestId("signin-verify"));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right.");
    expect(m.createShopOrder).not.toHaveBeenCalled();
  });

  it("pays straight away once signed in, and links to the account", async () => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    m.fetchMe.mockResolvedValue(ok(customer));
    render(<DrinksShop sn="S1" />);
    const user = userEvent.setup();
    expect(await screen.findByTestId("shop-signed-in")).toHaveTextContent("Signed in as asha@example.com");
    expect(screen.getByTestId("shop-account-link")).toHaveAttribute("href", "/drinks/account?sn=S1");
    await user.click(screen.getByTestId("shop-buy-1001"));
    expect(screen.queryByTestId("pay-choice")).not.toBeInTheDocument();
    expect(m.createShopOrder).toHaveBeenCalledWith("S1", "1001", { asCustomer: true });
  });

  it("shows a free shake that is waiting, with its code, instead of counting stamps from zero", async () => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    m.fetchMe.mockResolvedValue(ok(shopCustomerSchema.parse({ ...customer, stamps: 0, stampsToNext: 9 })));
    m.fetchMyCodes.mockResolvedValue(ok(rewardCode(false)));
    render(<DrinksShop sn="S1" />);
    expect(await screen.findByTestId("free-shake-ready")).toHaveTextContent("9021 3948");
    const card = screen.getByTestId("shop-signed-in");
    expect(card).toHaveTextContent("Free shake ready");
    expect(card).toHaveTextContent("Your stamp card is full.");
    expect(card).toHaveTextContent("Your free protein shake is ready.");
    expect(card).not.toHaveTextContent("9 more");
  });

  it("doesn't ask the server who is signed in on a phone that never signed in", async () => {
    render(<DrinksShop sn="S1" />);
    expect(await screen.findByTestId("shop-account-link")).toHaveTextContent("Sign in");
    expect(m.fetchMe).not.toHaveBeenCalled();
  });
});

describe("/drinks/account", () => {
  beforeEach(() => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    m.fetchMe.mockResolvedValue(ok(customer));
    m.fetchMyCodes.mockResolvedValue(
      ok(
        shopMyCodesSchema.parse({
          codes: [
            { kind: "purchase", shopOrderId: "so_1", code: "12345678", drink: { goodsId: "1001", name: "Chocolate protein shake" }, sn: "S1", machineName: "Lab", used: true, createdAt: "2026-10-01T05:00:00Z" },
            { kind: "reward", code: "55554444", drink: null, sn: null, machineName: null, used: false, createdAt: "2026-10-02T05:00:00Z" },
          ],
        }).codes,
      ),
    );
    m.fetchMyOrders.mockResolvedValueOnce(
      ok(shopMyOrdersSchema.parse({ orders: [{ shopOrderId: "so_1", status: "coded", drink: { goodsId: "1001", name: "Chocolate protein shake" }, pricePaise: 9900, sn: "S1", machineName: "Lab", createdAt: "2026-10-01T05:00:00Z" }], nextCursor: "c2" })),
    );
  });

  it("shows the stamp card, the codes, and the orders a page at a time", async () => {
    m.fetchMyOrders.mockResolvedValueOnce(
      ok(shopMyOrdersSchema.parse({ orders: [{ shopOrderId: "so_0", status: "refunded", drink: { goodsId: "1001", name: "Old shake" }, pricePaise: 4900, sn: "S1", createdAt: "2026-09-01T05:00:00Z" }], nextCursor: null })),
    );
    render(<DrinkAccount sn="S1" />);
    const user = userEvent.setup();
    expect(await screen.findByTestId("free-shake-ready")).toHaveTextContent("Your free protein shake is ready.5555 4444");
    expect(screen.getByTestId("account-stamps")).toHaveTextContent("4 of 9");
    expect(screen.getByTestId("account-stamps")).toHaveTextContent("5 more protein shakes");
    expect(screen.getByTestId("account-stamps")).not.toHaveTextContent("Free shake ready");
    expect(await screen.findByTestId("account-code-12345678")).toHaveTextContent("Used");
    expect(screen.getByTestId("account-code-55554444")).toHaveTextContent("Free protein shake");
    expect(screen.getByTestId("account-code-55554444")).toHaveTextContent("Ready to use");
    expect(await screen.findByTestId("account-order-so_1")).toHaveTextContent("Code ready");

    await user.click(screen.getByTestId("account-orders-more"));
    expect(m.fetchMyOrders).toHaveBeenLastCalledWith("c2");
    expect(await screen.findByTestId("account-order-so_0")).toHaveTextContent("Refunded");
    expect(screen.getByTestId("account-order-so_1")).toBeInTheDocument();
    expect(screen.queryByTestId("account-orders-more")).not.toBeInTheDocument();
    expect(screen.getByTestId("account-menu")).toHaveAttribute("href", "/drinks?sn=S1");
  });

  it("counts stamps once the free shake is used", async () => {
    m.fetchMyCodes.mockResolvedValue(ok(rewardCode(true)));
    render(<DrinkAccount sn="S1" />);
    expect(await screen.findByTestId("account-code-90213948")).toHaveTextContent("Used");
    expect(screen.getByTestId("account-stamps")).toHaveTextContent("4 of 9");
    expect(screen.getByTestId("account-stamps")).toHaveTextContent("5 more protein shakes");
    expect(screen.queryByTestId("free-shake-ready")).not.toBeInTheDocument();
  });

  it("offers sign-in when the session has ended", async () => {
    m.fetchMe.mockResolvedValue({ ok: false, error: { code: "signed_out", message: "Sign in again." } });
    render(<DrinkAccount sn={null} />);
    expect(await screen.findByTestId("signin-email-form")).toBeInTheDocument();
    expect(screen.getByTestId("account-perks")).toHaveTextContent("Every 10th shake is free.");
  });

  it("signs out, and deletes the account only after asking", async () => {
    m.deleteAccount.mockResolvedValue(ok({ deleted: true }));
    render(<DrinkAccount sn="S1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("account-delete"));
    expect(m.deleteAccount).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByTestId("account-delete-confirm"));
    expect(await screen.findByTestId("account-deleted")).toBeInTheDocument();

    m.fetchMyOrders.mockResolvedValue(ok({ orders: [], nextCursor: null }));
    m.signOut.mockResolvedValue(undefined);
    const again = render(<DrinkAccount sn="S1" />);
    await user.click(await again.findByTestId("account-sign-out"));
    expect(m.signOut).toHaveBeenCalled();
    expect(await again.findByTestId("signin-email-form")).toBeInTheDocument();
  });
});
