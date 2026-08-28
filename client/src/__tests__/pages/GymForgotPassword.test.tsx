import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import GymForgotPassword from "@/pages/gym/GymForgotPassword";
import { MBP_NOTICES } from "@shared/onboarding/agreementFields";

/**
 * This suite used to assert the page's old behaviour, which was the bug.
 *
 * It checked that entering an email invoked a `forgot-password` edge function and that the
 * page then said "a password reset link has been sent". No link was sent — there is no
 * transactional email sender wired up, and §9.2 of the backend design records the reset
 * mechanism as built with its *delivery* still manual. So the old tests pinned a page that
 * confidently told a locked-out gym owner to go and wait for nothing, and passing was what
 * kept it there.
 *
 * What is asserted now is the absence of the form, because that is the thing a future
 * well-meaning change is most likely to put back.
 */
describe("GymForgotPassword", () => {
  it("shows the RESET PASSWORD heading", () => {
    render(<GymForgotPassword />);
    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
  });

  it("offers no email form, because there is no self-service reset", () => {
    render(<GymForgotPassword />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector("input")).toBeNull();
    expect(screen.queryByRole("button", { name: /send recovery link/i })).toBeNull();
  });

  /*
    The specific claim worth keeping out. A gym owner who reads "a link has been sent" stops
    doing the one thing that will actually get them back in, which is contacting us.
  */
  it("does not claim a link has been sent", () => {
    render(<GymForgotPassword />);
    expect(screen.queryByText(/link has been sent/i)).toBeNull();
    expect(screen.queryByText(/check your (inbox|email)/i)).toBeNull();
    // The old brand panel promised these expired after an hour. Nothing on this page should
    // put a number on a link that a person issues by hand.
    expect(screen.queryByText(/expire after 1 hour/i)).toBeNull();
  });

  it("says a person handles the reset and gives the address to ask", () => {
    render(<GymForgotPassword />);
    expect(screen.getByTestId("reset-by-request")).toHaveTextContent(/handled by a person/i);
    const mailto = screen.getByTestId("link-reset-email");
    expect(mailto).toHaveAttribute("href", expect.stringContaining(`mailto:${MBP_NOTICES.email}`));
  });

  it("offers a second route to reach us", () => {
    render(<GymForgotPassword />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/contact");
  });

  it("shows a Back to Sign In link pointing at the gym login route", () => {
    render(<GymForgotPassword />);
    const link = screen.getByRole("link", { name: /back to sign in/i });
    expect(link).toHaveAttribute("href", "/gym/login");
  });
});
