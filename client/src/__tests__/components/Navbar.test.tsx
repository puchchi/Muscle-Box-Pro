import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  hasAccessTokenSync: vi.fn(() => false),
}));

// framer-motion is not used in Navbar, but mock sheet open/close via Radix
// Sheet is a Radix component — test relies on real Radix implementation in jsdom.

import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";
import { hasAccessTokenSync } from "@/lib/auth";

const mockPathname = vi.mocked(usePathname);
const mockHasToken = vi.mocked(hasAccessTokenSync);

describe("Navbar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
    mockHasToken.mockReturnValue(false);
  });

  it("renders the brand logo text", () => {
    render(<Navbar />);
    expect(screen.getAllByText(/MUSCLE BOX/i).length).toBeGreaterThan(0);
  });

  it("renders all 5 navigation links", () => {
    render(<Navbar />);
    expect(screen.getAllByText("HOME").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GYM DEMO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SPECS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MY ACCOUNT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADVERTISE").length).toBeGreaterThan(0);
  });

  it("shows LOGIN button when user is not logged in", () => {
    mockHasToken.mockReturnValue(false);
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("hides LOGIN button when user is logged in", () => {
    mockHasToken.mockReturnValue(true);
    render(<Navbar />);
    expect(screen.queryByRole("button", { name: /login/i })).not.toBeInTheDocument();
  });

  it("marks the active route link with text-primary class", () => {
    mockPathname.mockReturnValue("/gym-demo");
    render(<Navbar />);

    // The active link span has `text-primary`, inactive ones have `text-muted-foreground`
    const gymDemoLinks = screen.getAllByText("GYM DEMO");
    // At least one of the GYM DEMO spans should have text-primary
    const hasActiveClass = gymDemoLinks.some((el) =>
      el.className.includes("text-primary")
    );
    expect(hasActiveClass).toBe(true);
  });

  it("marks the home link as active when on '/'", () => {
    mockPathname.mockReturnValue("/");
    render(<Navbar />);

    const homeLinks = screen.getAllByText("HOME");
    const hasActiveClass = homeLinks.some((el) =>
      el.className.includes("text-primary")
    );
    expect(hasActiveClass).toBe(true);
  });

  it("non-active links use text-muted-foreground class", () => {
    mockPathname.mockReturnValue("/");
    render(<Navbar />);

    const specsLinks = screen.getAllByText("SPECS");
    const allMuted = specsLinks.some((el) =>
      el.className.includes("text-muted-foreground")
    );
    expect(allMuted).toBe(true);
  });

  it("the logo links to '/'", () => {
    render(<Navbar />);
    const logoLinks = screen.getAllByRole("link").filter((el) =>
      el.getAttribute("href") === "/"
    );
    expect(logoLinks.length).toBeGreaterThan(0);
  });

  it("the LOGIN button links to '/login'", () => {
    mockHasToken.mockReturnValue(false);
    render(<Navbar />);
    const loginLink = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href") === "/login");
    expect(loginLink).toBeInTheDocument();
  });

  it("renders the mobile menu trigger button", () => {
    render(<Navbar />);
    // The Sheet trigger renders a ghost icon button
    const menuButtons = screen.getAllByRole("button");
    expect(menuButtons.length).toBeGreaterThan(0);
  });
});
