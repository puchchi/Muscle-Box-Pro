import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/gym-partnership"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

vi.mock("@/components/footer/index", () => ({
  default: () => <footer data-testid="footer" />,
}));

import GymPartnership from "@/pages/GymPartnership";
import { PARTNERSHIP, workedMonth, formatInr } from "@shared/partnership/summary";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";

describe("GymPartnership page", () => {
  it("renders without crashing", () => {
    render(<GymPartnership />);
  });

  it("leads with the machine costing the gym nothing", () => {
    render(<GymPartnership />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/at no cost to your gym/i);
  });

  it("shows the four headline commercials", () => {
    render(<GymPartnership />);
    // Scoped by testid: "24 months" and "₹50,000" legitimately appear again
    // further down the page, in the term cards and the deposit explainer.
    expect(screen.getByTestId("headline-Machine cost to you")).toHaveTextContent("₹0");
    expect(screen.getByTestId("headline-Refundable deposit")).toHaveTextContent(
      formatInr(PARTNERSHIP.securityDepositInr),
    );
    expect(screen.getByTestId("headline-Your profit share")).toHaveTextContent("20% → 50%");
    expect(screen.getByTestId("headline-Initial term")).toHaveTextContent(
      `${PARTNERSHIP.initialTermMonths} months`,
    );
  });

  /*
   * This is the assertion that matters most on this page. We publish commercials
   * openly, which is only defensible while the disclaimer is visible and says
   * that the gym's own signed agreement — not this summary — governs.
   */
  it("keeps the indicative-terms disclaimer visible", () => {
    render(<GymPartnership />);
    expect(
      screen.getByText(/indicative terms\. your signed agreement governs\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a guarantee of income/i)).toBeInTheDocument();
    expect(screen.getByText(/BlendBox Innovations LLP/)).toBeInTheDocument();
  });

  it("shows the worked month straight from summary.ts, not hardcoded", () => {
    render(<GymPartnership />);
    const m = workedMonth();
    expect(screen.getByText(formatInr(m.grossInr))).toBeInTheDocument();
    expect(screen.getByText(`− ${formatInr(m.directCostsInr)}`)).toBeInTheDocument();
    expect(screen.getByText(formatInr(m.netProfitInr))).toBeInTheDocument();
    expect(screen.getByTestId("example-gym-share")).toHaveTextContent(formatInr(m.gymShareInr));
  });

  it("describes the milestone as whichever-comes-first, with the real cup count", () => {
    // At ₹65 of margin the ₹5,00,000 profit test binds at ~7,693 cups, still short of
    // 15,000. Advertising only "15,000 cups" would understate the deal; advertising
    // only 7,693 would overstate it for a gym with thinner margins, so the page says
    // both and prints the arithmetic.
    render(<GymPartnership />);
    expect(screen.getByText(/whichever comes first/i)).toBeInTheDocument();
    expect(screen.getByText(/about 7,693 cups/i)).toBeInTheDocument();
    expect(screen.getByText(/cumulative net profit/i)).toBeInTheDocument();
  });

  it("states electricity as a three-month reimbursement, never a monthly one", () => {
    render(<GymPartnership />);
    expect(screen.getByText(/reviewed every 3 months/i)).toBeInTheDocument();
  });

  it("says the advertising share does not step up", () => {
    render(<GymPartnership />);
    expect(screen.getByText(/stays flat for the whole term/i)).toBeInTheDocument();
  });

  it("marks in-month dashboard figures as provisional", () => {
    render(<GymPartnership />);
    expect(screen.getByText(/marked provisional/i)).toBeInTheDocument();
  });

  it("lists the five onboarding steps in order", () => {
    render(<GymPartnership />);
    const steps = screen.getAllByRole("listitem").map((el) => el.textContent ?? "");
    const wizard = steps.filter((t) => /^\d/.test(t.trim()));
    expect(wizard).toHaveLength(5);
    expect(wizard[0]).toMatch(/confirm your details/i);
    expect(wizard[1]).toMatch(/your partnership/i);
    expect(wizard[2]).toMatch(/review and sign/i);
    expect(wizard[3]).toMatch(/security deposit/i);
    expect(wizard[4]).toMatch(/you're set up/i);
  });

  it("says placement is invite-only rather than implying self-signup", () => {
    render(<GymPartnership />);
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
  });

  it("renders every FAQ question so the FAQPage JSON-LD matches the page", () => {
    render(<GymPartnership />);
    for (const faq of PARTNERSHIP_FAQ) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
  });

  it("points at lead capture, not at a public gym signup route", () => {
    render(<GymPartnership />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/gym-demo");
    expect(hrefs).toContain("/gym/login");
    expect(hrefs).not.toContain("/signup");
    expect(hrefs).not.toContain("/gym/signup");
  });

  it("does not paste the full agreement onto a public page", () => {
    // The 47-section agreement belongs in onboarding step 3 behind an invite,
    // where it is signed against that gym's own terms. See §2 of the doc.
    const { container } = render(<GymPartnership />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/indemnif/i);
    expect(text).not.toMatch(/arbitration/i);
    expect(text).not.toMatch(/Schedule A/);
  });
});
