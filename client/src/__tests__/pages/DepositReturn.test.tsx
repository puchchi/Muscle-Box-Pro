import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: vi.fn() })),
  usePathname: vi.fn(() => "/gym/deposit-return"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import DepositReturn from "@/pages/gym/DepositReturn";
import { rememberPaymentAttempt, takeReturnedFromGateway } from "@/lib/depositReturn";

/**
 * Where Razorpay drops a gym after it has paid the deposit.
 *
 * Two endings, and both are correct outcomes rather than a happy path and an error: the tab
 * that left for the gateway gets handed back to its wizard, and a browser that never held the
 * path — the accountant who paid from the forwarded link — gets told what happened and why
 * this page cannot take them any further. See docs/gym-onboarding.md §25.
 */

const ONBOARDING_PATH = "/gym/onboarding/iron-temple-fitness/3f7c9a";

beforeEach(() => {
  window.sessionStorage.clear();
  mockReplace.mockClear();
});

describe("the deposit return route", () => {
  it("hands the tab back to the wizard it came from", async () => {
    rememberPaymentAttempt({ returnTo: ONBOARDING_PATH, paymentUrl: "https://rzp.io/i/abc" });

    render(<DepositReturn />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(ONBOARDING_PATH));
    // `replace`, so Back out of the wizard does not land here and bounce forward again.
    expect(screen.getByTestId("deposit-return-bouncing")).toBeInTheDocument();
    // And it leaves behind the one thing the URL cannot carry: that a gateway sent this
    // tab back, which is what lets step 4 say it is checking a payment rather than
    // announcing it cannot find one.
    expect(takeReturnedFromGateway()).toBe(true);
  });

  it("does not navigate on a callback it cannot vouch for", async () => {
    // No stashed path: either a forwarded link paid from someone else's browser, or a URL
    // someone constructed. Both get the standalone ending, because identifying the gym from
    // here would mean the handle had travelled to Razorpay in the callback URL.
    //
    // Note what this page never does, in either case: read the query string. Razorpay
    // appends a payment id and a `razorpay_payment_link_status` to it, and a page that
    // believed either would be a way to mark a deposit paid by typing a URL.
    render(<DepositReturn />);

    await waitFor(() =>
      expect(screen.getByTestId("deposit-return-standalone")).toBeInTheDocument(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("deposit-return-standalone")).toHaveTextContent(
      /confirming/i,
    );
    expect(takeReturnedFromGateway()).toBe(false);
  });

  it("refuses a stashed path that points off the flow", async () => {
    window.sessionStorage.setItem("mbp.deposit.return-to", "https://evil.example/");

    render(<DepositReturn />);

    await waitFor(() =>
      expect(screen.getByTestId("deposit-return-standalone")).toBeInTheDocument(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
