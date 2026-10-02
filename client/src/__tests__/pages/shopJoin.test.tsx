import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  requestSigninCode: vi.fn(),
  verifySignin: vi.fn(),
}));

vi.mock("@/lib/shopApi", () => ({ SHOP_API_BASE_URL: "https://shop.example/sandbox", ...m }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { shopCustomerSchema } from "@shared/shop/shopSchema";
import { JoinPage } from "@/pages/shop/JoinPage";
import { MEMBER_COPY } from "@/pages/shop/shopCopy";
import { saveOrder } from "@/pages/shop/savedOrders";

const ok = <T,>(data: T) => ({ ok: true, data });
const customer = shopCustomerSchema.parse({ customerId: "cu_1", email: "asha@example.com", stamps: 0, stampsToNext: 9 });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("/join", () => {
  it("leads with the free 10th shake and the join form, with a way to pay as a guest", () => {
    render(<JoinPage sn="GS805TEST01" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every 10th protein shake is free.");
    expect(within(screen.getByTestId("join-card")).getByTestId("signin-email-form")).toBeInTheDocument();
    expect(screen.getByTestId("join-guest")).toHaveAttribute("href", "/drinks?sn=GS805TEST01");
    expect(within(screen.getByTestId("join-benefits")).getAllByRole("listitem")).toHaveLength(MEMBER_COPY.benefits.length);
    expect(m.fetchMe).not.toHaveBeenCalled();
  });

  it("joins with the emailed code, claims this phone's last order, then sends the member to the menu", async () => {
    saveOrder({ token: "B".repeat(43), sn: "GS805TEST01", drinkName: "Earlier", savedAt: 1 });
    m.requestSigninCode.mockResolvedValue(ok({ accepted: true }));
    m.verifySignin.mockResolvedValue(ok({ customer, joinedOrders: 0, claimed: true }));
    render(<JoinPage sn="GS805TEST01" />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("signin-email"), "asha@example.com");
    await user.click(screen.getByTestId("signin-send"));
    await user.type(await screen.findByTestId("signin-code"), "123456");
    await user.click(screen.getByTestId("signin-verify"));

    expect(m.verifySignin).toHaveBeenCalledWith("asha@example.com", "123456", { sn: "GS805TEST01", claimToken: "B".repeat(43) });
    expect(await screen.findByTestId("join-member")).toHaveTextContent("You're a member");
    expect(screen.getByTestId("shop-stamp-card")).toHaveTextContent("0 of 9");
    expect(screen.getByTestId("join-menu")).toHaveAttribute("href", "/drinks?sn=GS805TEST01");
  });

  it("shows a signed-in member their account instead of the form, and no guest link without a machine", async () => {
    localStorage.setItem("mbp:shop-signed-in", "1");
    m.fetchMe.mockResolvedValue(ok(customer));
    render(<JoinPage sn={null} />);
    expect(await screen.findByTestId("join-member")).toHaveTextContent("asha@example.com");
    expect(screen.queryByTestId("join-menu")).not.toBeInTheDocument();
    expect(screen.getByTestId("join-account")).toHaveAttribute("href", "/drinks/account");
  });

  it("uses no em dashes in what the customer reads", () => {
    expect(JSON.stringify(MEMBER_COPY)).not.toContain("—");
  });
});
