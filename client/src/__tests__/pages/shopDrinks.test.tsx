import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockMenu, mockCreate, mockReceipt, mockEmail, mockPay, mockPush } = vi.hoisted(() => ({
  mockMenu: vi.fn(),
  mockCreate: vi.fn(),
  mockReceipt: vi.fn(),
  mockEmail: vi.fn(),
  mockPay: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/shopApi", () => ({
  SHOP_API_BASE_URL: "https://shop.example/sandbox",
  fetchShopMenu: mockMenu,
  createShopOrder: mockCreate,
  fetchShopReceipt: mockReceipt,
  emailShopCode: mockEmail,
  fetchMe: vi.fn(),
  requestSigninCode: vi.fn(),
  verifySignin: vi.fn(),
}));
vi.mock("@/lib/razorpayCheckout", () => ({ payWithRazorpay: mockPay }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { shopMenuSchema, shopReceiptSchema, formatInr } from "@shared/shop/shopSchema";
import { DrinksShop } from "@/pages/shop/DrinksShop";
import { DrinkReceipt, POLL_FAST_MS } from "@/pages/shop/DrinkReceipt";
import { ACCOUNT_COPY, PAY_COPY, RECEIPT_COPY, SHOP_COPY, SIGNIN_COPY } from "@/pages/shop/shopCopy";
import { receiptHref, saveOrder, savedOrders, SAVED_ORDERS_MAX, tokenFromHash } from "@/pages/shop/savedOrders";

const TOKEN = "A".repeat(43);

const menuWire = {
  sn: "GS805TEST01",
  name: "Test GS805",
  place: "Lab",
  online: true,
  enabled: true,
  drinks: [
    { goodsId: "1001", name: "Chocolate protein shake", nameEn: "", spec: "300 ml", image: "https://cdn.example/c.png", serveTemp: "chilled", soldOut: false, pricePaise: 9900, listPricePaise: 14900 },
    { goodsId: "1002", name: "Vanilla protein shake", nameEn: "", spec: "", image: "", serveTemp: "normal", soldOut: true, pricePaise: 14900 },
    { goodsId: "1003", name: "Mango whey", nameEn: "", spec: "", image: "", serveTemp: "hot", soldOut: false, comingSoon: true, pricePaise: 0 },
  ],
};

const menu = (over: Record<string, unknown> = {}) => ({ ok: true, data: shopMenuSchema.parse({ ...menuWire, ...over }) });

const receiptWire = {
  status: "coded",
  drink: { goodsId: "1001", name: "Chocolate protein shake", image: "https://cdn.example/c.png" },
  pricePaise: 9900,
  sn: "GS805TEST01",
  machineName: "Test GS805",
  code: "12345678",
  used: false,
};

const receipt = (over: Record<string, unknown> = {}) => ({ ok: true, data: shopReceiptSchema.parse({ ...receiptWire, ...over }) });

const created = { ok: true, data: { token: TOKEN, razorpayOrderId: "order_1", amount: 9900, currency: "INR", keyId: "rzp_test_1" } };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockMenu.mockResolvedValue(menu());
});

afterEach(() => {
  vi.useRealTimers();
  window.location.hash = "";
});

describe("shop schemas", () => {
  it("reads a menu defensively: missing flags are off, a broken drink is dropped", () => {
    const parsed = shopMenuSchema.parse({ sn: "X", drinks: [{ goodsId: "a", name: "A", pricePaise: 100 }, { name: "no id" }] });
    expect(parsed).toMatchObject({ online: false, enabled: false });
    expect(parsed.drinks).toEqual([
      { goodsId: "a", name: "A", nameEn: "", spec: "", image: "", serveTemp: null, soldOut: false, comingSoon: false, pricePaise: 100, listPricePaise: null },
    ]);
  });

  it("formats integer paise as rupees", () => {
    expect(formatInr(9900)).toBe("₹99");
    expect(formatInr(9950)).toBe("₹99.50");
    expect(formatInr(125000)).toBe("₹1,250");
  });
});

describe("saved orders", () => {
  it("keeps the newest ten, once each, and reads the token back from the receipt link", () => {
    for (let i = 0; i < 12; i++) saveOrder({ token: `${"t".repeat(30)}${i}`, sn: "S", drinkName: `D${i}`, savedAt: i });
    saveOrder({ token: `${"t".repeat(30)}5`, sn: "S", drinkName: "D5", savedAt: 99 });
    const list = savedOrders();
    expect(list).toHaveLength(SAVED_ORDERS_MAX);
    expect(list[0]!.drinkName).toBe("D5");
    expect(list.filter((o) => o.drinkName === "D5")).toHaveLength(1);

    expect(receiptHref(TOKEN)).toBe(`/drinks/receipt#t=${TOKEN}`);
    expect(tokenFromHash(`#t=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash("#t=<script>")).toBeNull();
    expect(tokenFromHash("")).toBeNull();
  });
});

describe("DrinksShop", () => {
  it("shows the menu with prices, the struck list price, and sold out and coming soon drinks it can't sell", async () => {
    render(<DrinksShop sn="GS805TEST01" />);
    await screen.findByTestId("shop-drinks");
    expect(mockMenu).toHaveBeenCalledWith("GS805TEST01");
    expect(screen.getByTestId("shop-online")).toHaveTextContent("Machine online");
    expect(screen.getByTestId("shop-machine")).toHaveTextContent("Test GS805, Lab");

    const choc = screen.getByTestId("shop-drink-1001");
    expect(within(choc).getByTestId("shop-price-1001")).toHaveTextContent("₹99₹149");
    expect(within(choc).getByText("Chilled")).toBeInTheDocument();
    expect(screen.getByTestId("shop-buy-1001")).toBeEnabled();

    expect(screen.getByTestId("shop-buy-1002")).toBeDisabled();
    expect(screen.getByTestId("shop-buy-1002")).toHaveTextContent("Sold out");
    expect(screen.getByTestId("shop-buy-1003")).toBeDisabled();
    expect(screen.queryByTestId("shop-price-1003")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("shop-drink-1003")).getByText("Hot")).toBeInTheDocument();
    expect(within(screen.getByTestId("shop-drink-1002")).queryByText("Chilled")).not.toBeInTheDocument();
  });

  it("offers sign-in for stamps above the menu, and not when the menu can't load", async () => {
    const { unmount } = render(<DrinksShop sn="GS805TEST01" />);
    const strip = await screen.findByTestId("shop-member-strip");
    expect(strip).toHaveTextContent(SHOP_COPY.memberTitle);
    expect(within(strip).getByRole("link")).toHaveAttribute("href", "/drinks/account?sn=GS805TEST01");
    unmount();

    mockMenu.mockResolvedValue({ ok: false, error: { code: "machine_unknown", message: "No such machine." } });
    render(<DrinksShop sn="GS805TEST01" />);
    await screen.findByTestId("shop-load-error");
    expect(screen.queryByTestId("shop-member-strip")).not.toBeInTheDocument();
  });

  it("shows where the code goes on the machine's screen", async () => {
    render(<DrinksShop sn="GS805TEST01" />);
    expect(await screen.findByTestId("shop-machine-mock")).toHaveTextContent(SHOP_COPY.machineCaption);
  });

  it("can't sell from an offline machine and says why", async () => {
    mockMenu.mockResolvedValue(menu({ online: false }));
    render(<DrinksShop sn="GS805TEST01" />);
    expect(await screen.findByTestId("shop-offline")).toHaveTextContent(SHOP_COPY.offlineNotice);
    expect(screen.getByTestId("shop-buy-1001")).toBeDisabled();
  });

  it("buys: creates the order, keeps it on the phone, pays, then opens the receipt", async () => {
    mockCreate.mockResolvedValue(created);
    mockPay.mockResolvedValue("paid");
    render(<DrinksShop sn="GS805TEST01" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Buy Chocolate protein shake for ₹99" }));
    await user.click(await screen.findByTestId("pay-guest"));

    expect(mockCreate).toHaveBeenCalledWith("GS805TEST01", "1001", { asCustomer: false });
    expect(mockPay).toHaveBeenCalledWith({ ...created.data, description: "Chocolate protein shake" });
    expect(mockPush).toHaveBeenCalledWith(`/drinks/receipt#t=${TOKEN}`);
    expect(savedOrders()[0]).toMatchObject({ token: TOKEN, sn: "GS805TEST01", drinkName: "Chocolate protein shake" });
  });

  it("links to the order when the payment window is closed, in case it was paid", async () => {
    mockCreate.mockResolvedValue(created);
    mockPay.mockResolvedValue("closed");
    render(<DrinksShop sn="GS805TEST01" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("shop-buy-1001"));
    await user.click(await screen.findByTestId("pay-guest"));

    const notice = await screen.findByTestId("shop-notice");
    expect(notice).toHaveTextContent(SHOP_COPY.closedTitle);
    expect(within(notice).getByRole("link", { name: SHOP_COPY.openOrder })).toHaveAttribute("href", `/drinks/receipt#t=${TOKEN}`);
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId("shop-buy-1001")).toBeEnabled();
    expect(screen.getByTestId("shop-saved")).toHaveTextContent("Chocolate protein shake");
  });

  it("shows a refusal as the server words it and reloads the menu", async () => {
    mockCreate.mockResolvedValue({ ok: false, error: { code: "sold_out", message: "That drink is sold out on this machine." } });
    render(<DrinksShop sn="GS805TEST01" />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("shop-buy-1001"));
    await user.click(await screen.findByTestId("pay-guest"));

    expect(await screen.findByTestId("shop-notice")).toHaveTextContent("That drink is sold out on this machine.");
    expect(mockMenu).toHaveBeenCalledTimes(2);
    expect(mockPay).not.toHaveBeenCalled();
    expect(savedOrders()).toEqual([]);
  });

  it("names an unknown machine, and offers a retry when the menu can't load", async () => {
    mockMenu.mockResolvedValueOnce({ ok: false, error: { code: "network", message: "x" } }).mockResolvedValueOnce(menu());
    render(<DrinksShop sn="GS805TEST01" />);
    expect(await screen.findByTestId("shop-load-error")).toHaveTextContent(SHOP_COPY.loadError);
    await userEvent.setup().click(screen.getByRole("button", { name: SHOP_COPY.retry }));
    expect(await screen.findByTestId("shop-drinks")).toBeInTheDocument();
  });
});

describe("DrinkReceipt", () => {
  function open(token = TOKEN) {
    window.location.hash = `#t=${token}`;
    return render(<DrinkReceipt />);
  }

  it("shows the code in two groups of four, how to use it, and sends the token in the header call", async () => {
    mockReceipt.mockResolvedValue(receipt());
    open();
    const code = await screen.findByTestId("receipt-code");
    expect(mockReceipt).toHaveBeenCalledWith(TOKEN);
    expect(code).toHaveTextContent("1 2 3 4 5 6 7 8");
    expect(code.querySelector("[aria-hidden]")).toHaveTextContent("12345678");
    expect(screen.getByTestId("receipt-used")).toHaveTextContent(RECEIPT_COPY.ready);
    expect(screen.getByText(RECEIPT_COPY.rules)).toBeInTheDocument();
    expect(screen.getByTestId("receipt-order")).toHaveTextContent("Chocolate protein shake");
    expect(screen.getByTestId("receipt-menu")).toHaveAttribute("href", "/drinks?sn=GS805TEST01");
  });

  it("waits while unpaid, then shows the code once the payment comes through", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockReceipt.mockResolvedValueOnce(receipt({ status: "created", code: null, used: null })).mockResolvedValueOnce(receipt({ status: "paid", code: null, used: null })).mockResolvedValue(receipt());
    open();
    expect(await screen.findByTestId("receipt-created")).toHaveTextContent(RECEIPT_COPY.waitingTitle);
    await act(() => vi.advanceTimersByTimeAsync(POLL_FAST_MS));
    expect(await screen.findByTestId("receipt-paid")).toHaveTextContent(RECEIPT_COPY.paidTitle);
    await act(() => vi.advanceTimersByTimeAsync(POLL_FAST_MS));
    expect(await screen.findByTestId("receipt-code")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(POLL_FAST_MS * 3));
    expect(mockReceipt).toHaveBeenCalledTimes(3);
  });

  it("marks a used code and offers no email", async () => {
    mockReceipt.mockResolvedValue(receipt({ used: true }));
    open();
    expect(await screen.findByTestId("receipt-used")).toHaveTextContent(RECEIPT_COPY.used);
    expect(screen.getByText(RECEIPT_COPY.usedBody)).toBeInTheDocument();
    expect(screen.queryByTestId("receipt-email")).not.toBeInTheDocument();
  });

  it("emails the code, and shows the server's address error", async () => {
    mockReceipt.mockResolvedValue(receipt());
    mockEmail
      .mockResolvedValueOnce({ ok: false, error: { code: "invalid_request", message: "Some of the details aren't right.", fieldErrors: { email: "Enter an email address like name@example.com." } } })
      .mockResolvedValueOnce({ ok: true, data: { accepted: true } });
    open();
    const user = userEvent.setup();
    const input = await screen.findByTestId("receipt-email-input");

    await user.type(input, "nope");
    await user.click(screen.getByTestId("receipt-email-send"));
    expect(await screen.findByText("Enter an email address like name@example.com.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.clear(input);
    await user.type(input, " a@b.in ");
    await user.click(screen.getByTestId("receipt-email-send"));
    expect(mockEmail).toHaveBeenLastCalledWith(TOKEN, "a@b.in");
    expect(await screen.findByText(RECEIPT_COPY.emailSent("a@b.in"))).toBeInTheDocument();
  });

  it.each([
    ["refunding", RECEIPT_COPY.refundingTitle],
    ["refunded", RECEIPT_COPY.refundedTitle],
    ["refund_failed", RECEIPT_COPY.refundFailedTitle],
    ["failed", RECEIPT_COPY.failedTitle],
  ])("shows %s without a code", async (status, title) => {
    mockReceipt.mockResolvedValue(receipt({ status, code: null, used: null }));
    open();
    expect(await screen.findByTestId(`receipt-${status}`)).toHaveTextContent(title);
    expect(screen.queryByTestId("receipt-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("receipt-email")).not.toBeInTheDocument();
  });

  it("says the order wasn't found for an unknown token, and for no token at all", async () => {
    mockReceipt.mockResolvedValue({ ok: false, error: { code: "order_not_found", message: "We couldn't find that order." } });
    const { unmount } = open();
    expect(await screen.findByTestId("receipt-missing")).toHaveTextContent(RECEIPT_COPY.notFoundTitle);
    unmount();

    mockReceipt.mockClear();
    window.location.hash = "";
    render(<DrinkReceipt />);
    expect(await screen.findByTestId("receipt-missing")).toBeInTheDocument();
    expect(mockReceipt).not.toHaveBeenCalled();
  });

  it("uses no em dashes in what the customer reads", () => {
    const copy = JSON.stringify([SHOP_COPY, RECEIPT_COPY, PAY_COPY, SIGNIN_COPY, ACCOUNT_COPY, RECEIPT_COPY.emailSent("a"), RECEIPT_COPY.refundingBody("₹1")]);
    expect(copy).not.toContain("—");
  });
});
