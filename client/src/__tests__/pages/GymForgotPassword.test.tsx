import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/gym/forgot-password"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// The component uses motion.div *and* motion.p. Stubbing only `div` makes the
// missing tag render as `undefined` and every test in the file fails with
// "Element type is invalid" — which is how this suite was silently broken.
vi.mock("framer-motion", () => import("@/test/framerMotion"));

const requestPortalPasswordReset = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gymSession", () => ({ requestPortalPasswordReset }));

import GymForgotPassword from "@/pages/gym/GymForgotPassword";
import { MBP_NOTICES } from "@shared/onboarding/agreementFields";

beforeEach(() => {
  requestPortalPasswordReset.mockReset();
});

/**
 * This suite used to assert the page's old behaviour, which was the bug.
 *
 * It checked that entering an email invoked a `forgot-password` edge function and that the
 * page then said "a password reset link has been sent". No link was sent — the reset mechanism
 * was built and its delivery was not. So the old tests pinned a page that confidently told a
 * locked-out gym owner to go and wait for nothing, and passing was what kept it there.
 *
 * `POST /gym/password-reset` now mints and mails the link, so the form is the page's only
 * state. What is asserted is the difference between then and now: the confirmation reports
 * that the request was accepted, and never that an account was found.
 */
describe("GymForgotPassword", () => {
  it("shows the RESET PASSWORD heading", () => {
    render(<GymForgotPassword />);
    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows a Back to Sign In link pointing at the gym login route", () => {
    render(<GymForgotPassword />);
    const link = screen.getByRole("link", { name: /back to sign in/i });
    expect(link).toHaveAttribute("href", "/gym/login");
  });

  it("asks for the email address and nothing else", () => {
    render(<GymForgotPassword />);
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("button-send-reset")).toBeInTheDocument();
    // No password fields. The link's landing page sets the password; this page only asks
    // for one to be sent, and the old version's two password inputs changed the password of
    // whatever session the browser already had.
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(0);
  });

  it("offers the human route before the form is submitted too", () => {
    render(<GymForgotPassword />);
    expect(screen.getByTestId("link-reset-email")).toHaveAttribute(
      "href",
      expect.stringContaining(`mailto:${MBP_NOTICES.email}`),
    );
  });

  /*
    The instruction that outlived its field. "Enter your email" above a screen with no email
    field is the page asking for something it has already taken, and it read as if the submit
    had not happened.
  */
  it("stops telling you to enter an email once there is no email field", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    expect(screen.getByText(/enter your account email/i)).toBeInTheDocument();

    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));

    await screen.findByTestId("reset-requested");
    expect(screen.queryByText(/enter your account email/i)).toBeNull();
    expect(screen.queryByTestId("input-email")).toBeNull();
  });

  it("breaks what happens next into separate lines", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));

    const items = (await screen.findByTestId("reset-requested")).querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/works once/i);
    expect(items[1]).toHaveTextContent(/won't sign you in/i);
  });

  it("does not send a malformed address to the reset route", async () => {
    // The outcome, not the layer that produced it: `type="email"` means native constraint
    // validation refuses the submit before react-hook-form runs, so the zod message never
    // renders. Same reasoning as the equivalent test in `AdminLogin.test.tsx`. What matters
    // is that a typo does not spend one of the route's per-email attempts.
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "not-an-email");
    await user.click(screen.getByTestId("button-send-reset"));
    await waitFor(() => expect(requestPortalPasswordReset).not.toHaveBeenCalled());
    expect(screen.queryByTestId("reset-requested")).toBeNull();
  });

  it("sends the address to the reset route", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));
    await waitFor(() =>
      expect(requestPortalPasswordReset).toHaveBeenCalledWith("owner@ironhouse.in"),
    );
  });

  /*
    The invariant, asserted rather than trusted to review. A confirmation that differs
    between an address we know and one we do not turns this page into a list of which gyms
    are customers, and the tempting copy edit ("we've emailed you") is exactly that leak.
  */
  it("confirms without saying whether the account exists", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "stranger@example.com");
    await user.click(screen.getByTestId("button-send-reset"));

    const panel = await screen.findByTestId("reset-requested");
    expect(panel).toHaveTextContent(/if we have an account for that address/i);
    expect(panel).not.toHaveTextContent(/we have (emailed|sent)/i);
    expect(panel).not.toHaveTextContent(/no account/i);
    expect(panel).not.toHaveTextContent(/stranger@example\.com/);
  });

  it("lets a mistyped address be corrected without leaving the page", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhuose.in");
    await user.click(screen.getByTestId("button-send-reset"));

    await screen.findByTestId("reset-requested");
    await user.click(screen.getByTestId("button-try-again"));
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.queryByTestId("reset-requested")).toBeNull();
  });

  it("puts no expiry figure on the link", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));

    const panel = await screen.findByTestId("reset-requested");
    expect(panel.textContent).not.toMatch(/\d+\s*(hour|minute|day)/i);
  });

  it("keeps the human route available when the confirmation is showing", async () => {
    requestPortalPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));

    await screen.findByTestId("reset-requested");
    expect(screen.getByTestId("link-reset-email")).toHaveAttribute(
      "href",
      expect.stringContaining(`mailto:${MBP_NOTICES.email}`),
    );
  });

  it("shows the failure and leaves the form there to retry", async () => {
    requestPortalPasswordReset.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "Check your connection and try again." },
    });
    const user = userEvent.setup();
    render(<GymForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "owner@ironhouse.in");
    await user.click(screen.getByTestId("button-send-reset"));

    const notice = await screen.findByTestId("reset-notice");
    expect(notice).toHaveTextContent(/check your connection/i);
    // Announced, not just coloured red. The failure arrives without a page change, so a
    // screen reader is told nothing at all unless the container says so.
    expect(notice).toHaveAttribute("role", "alert");
    expect(screen.queryByTestId("reset-requested")).toBeNull();
    expect(screen.getByTestId("input-email")).toHaveValue("owner@ironhouse.in");
  });
});
