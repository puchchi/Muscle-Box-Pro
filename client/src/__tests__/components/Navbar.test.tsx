import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Passes the rest of the props through, so the `rel` on the two portal links is visible here.
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

// framer-motion is not used in Navbar, but mock sheet open/close via Radix
// Sheet is a Radix component — test relies on real Radix implementation in jsdom.

import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";

const mockPathname = vi.mocked(usePathname);

describe("Navbar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  // The wordmark next to the logo is commented out in Navbar.tsx; the image is
  // the only brand element rendered.
  it("renders the brand logo", () => {
    render(<Navbar />);
    expect(screen.getByAltText("MuscleBoxPro")).toBeInTheDocument();
  });

  it("renders all 4 navigation links", () => {
    render(<Navbar />);
    expect(screen.getAllByText("HOME").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GYM DEMO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SPECS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADVERTISE").length).toBeGreaterThan(0);
  });

  it("no longer links to the removed consumer account page", () => {
    render(<Navbar />);
    expect(screen.queryByText("MY ACCOUNT")).not.toBeInTheDocument();
    const accountLink = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href") === "/account");
    expect(accountLink).toBeUndefined();
  });

  it("shows the LOGIN menu trigger", () => {
    render(<Navbar />);
    expect(screen.getByTestId("button-login-menu")).toHaveTextContent(/login/i);
  });

  /**
   * The bar is where people look for a way in, and for a long while the only thing it
   * offered was the gym portal. A franchisee's other routes to `/franchise/login` are all
   * inside a flow they have already finished, so this menu and the footer are the whole of
   * the public answer to "how do I sign in?".
   */
  it("offers both portals, and keeps crawlers off both", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByTestId("button-login-menu"));

    for (const [name, href] of [
      [/gym portal/i, "/gym/login"],
      [/franchise portal/i, "/franchise/login"],
    ] as const) {
      const link = await screen.findByRole("menuitem", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("rel", "nofollow");
    }
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

  it("keeps both portals reachable from the mobile sheet", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    const triggers = screen.getAllByRole("button");
    await user.click(triggers[triggers.length - 1]);

    const hrefs = (await screen.findAllByRole("link")).map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/gym/login");
    expect(hrefs).toContain("/franchise/login");
  });

  /**
   * These two replace a pair that asserted the button became "DASHBOARD" for a signed-in
   * gym. It cannot: the portal session is an `HttpOnly` cookie, so nothing here can read
   * whether one exists, and `/gym/login` forwards an existing session to the dashboard
   * instead. What is worth pinning is that the nav does not try — a reinstated probe would
   * be one request per visitor on every marketing page, and a reinstated
   * `/gym/dashboard` href would send a signed-out visitor to a page that bounces them
   * back. Both are the kind of change that looks like an improvement in review.
   */
  it("never links straight to the dashboard", () => {
    render(<Navbar />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).not.toContain("/gym/dashboard");
  });

  it("makes no request when it renders", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<Navbar />);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("renders the mobile menu trigger button", () => {
    render(<Navbar />);
    // The Sheet trigger renders a ghost icon button
    const menuButtons = screen.getAllByRole("button");
    expect(menuButtons.length).toBeGreaterThan(0);
  });
});
