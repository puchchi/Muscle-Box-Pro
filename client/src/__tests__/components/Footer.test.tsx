import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Passes the rest of the props through, so the `rel` on the two portal links is visible here.
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

import Footer from "@/components/footer/index";

describe("Footer component", () => {
  it("renders without crashing", () => {
    render(<Footer />);
  });

  it("shows MUSCLE BOX PRO brand name", () => {
    render(<Footer />);
    // "MUSCLE BOX" and "PRO" are in separate text nodes
    expect(screen.getAllByText(/muscle box/i).length).toBeGreaterThan(0);
  });

  it("shows copyright notice", () => {
    render(<Footer />);
    expect(screen.getByText(/2026 muscle box pro/i)).toBeInTheDocument();
  });

  it("shows Locations section heading", () => {
    render(<Footer />);
    expect(screen.getByText(/locations/i)).toBeInTheDocument();
  });

  it("shows city links in locations section", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /^india$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^delhi$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^mumbai$/i })).toBeInTheDocument();
  });

  it("shows Company section heading", () => {
    render(<Footer />);
    expect(screen.getByText(/company/i)).toBeInTheDocument();
  });

  it("shows About Us company link", () => {
    render(<Footer />);
    const aboutLink = screen.getByRole("link", { name: /about us/i });
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  it("shows Support section heading", () => {
    render(<Footer />);
    expect(screen.getByText(/support/i)).toBeInTheDocument();
  });

  it("shows Help Center support link", () => {
    render(<Footer />);
    const helpLink = screen.getByRole("link", { name: /help center/i });
    expect(helpLink).toHaveAttribute("href", "/help");
  });

  it("shows Contact Us support link", () => {
    render(<Footer />);
    const contactLink = screen.getByRole("link", { name: /contact us/i });
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("shows Privacy Policy link", () => {
    render(<Footer />);
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("shows Terms & Conditions link", () => {
    render(<Footer />);
    const termsLink = screen.getByRole("link", { name: /terms & conditions/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  /**
   * This footer is the only public entry to either portal. The franchise one especially:
   * every other link to it sits inside a flow the partner has already finished.
   */
  it("shows a sign-in link for both portals, and keeps crawlers off them", () => {
    render(<Footer />);
    for (const [name, href] of [
      [/gym portal/i, "/gym/login"],
      [/franchise portal/i, "/franchise/login"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("rel", "nofollow");
    }
  });
});
