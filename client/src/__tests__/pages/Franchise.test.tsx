import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/franchise"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/components/footer/index", () => ({
  default: () => <footer data-testid="footer" />,
}));

const submitFranchiseApplication = vi.fn();
vi.mock("@/lib/franchiseApi", () => ({
  submitFranchiseApplication: (...args: unknown[]) => submitFranchiseApplication(...args),
}));

import Franchise from "@/pages/Franchise";
import {
  FRANCHISE,
  formatInr,
  formatLakh,
  franchiseTier,
  recoveryExample,
} from "@shared/franchise/program";
import { FRANCHISE_FAQ } from "@shared/franchise/faq";

const territory = franchiseTier("territory");
const city = franchiseTier("city");

describe("Franchise page", () => {
  beforeEach(() => {
    submitFranchiseApplication.mockReset();
  });

  it("renders without crashing", () => {
    render(<Franchise />);
  });

  it("shows the four headline commercials from the program data", () => {
    render(<Franchise />);
    expect(screen.getByTestId("headline-Investment from")).toHaveTextContent(
      formatLakh(territory.investmentInr),
    );
    expect(screen.getByTestId("headline-Machines from")).toHaveTextContent(
      String(territory.initialMachines),
    );
    expect(screen.getByTestId("headline-Protein profit during recovery")).toHaveTextContent(
      `${FRANCHISE.proteinProfitSharePct.duringRecovery}%`,
    );
    expect(screen.getByTestId("headline-Advertising profit share")).toHaveTextContent(
      `${FRANCHISE.advertising.franchiseeSharePct}%`,
    );
  });

  it("prices both tiers from the program data, not hardcoded copy", () => {
    render(<Franchise />);
    for (const tier of [territory, city]) {
      const card = screen.getByTestId(`tier-${tier.id}`);
      expect(card).toHaveTextContent(formatLakh(tier.investmentInr));
      expect(card).toHaveTextContent(`${tier.initialMachines} machines`);
    }
  });

  /*
   * The assertion that matters most on this page. We publish ₹25–50 lakh commercials
   * for a program that is not yet an offer, which is only defensible while the §55
   * notice is visible and says the definitive agreement governs and returns are not
   * guaranteed.
   */
  it("keeps the commercial notice visible", () => {
    render(<Franchise />);
    expect(
      screen.getByText(/not an offer, and not a guarantee of returns/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/definitive franchise agreement, which\s+is what governs/i)).toBeInTheDocument();
  });

  it("says the franchisee does not own the machines", () => {
    render(<Franchise />);
    expect(screen.getByRole("heading", { name: /you operate them\. we own them\./i })).toBeInTheDocument();
    expect(screen.getByText(/is not a purchase of the machines/i)).toBeInTheDocument();
  });

  /*
   * The term people most often read the other way round, and the one that decides whether
   * the worked example adds up. It used to be stated three times over — a headline tile, a
   * paragraph and a footnote under the illustration — and is now stated once, in the
   * caption of the figure that draws the two streams. This asserts the fact, not the
   * wording around it, so the caption can be reworded but not lost.
   */
  it("says advertising income never counts toward capital recovery", () => {
    render(<Franchise />);
    expect(screen.getByText(/never counts toward capital recovery/i)).toBeInTheDocument();
  });

  /*
   * The advertising share is a permanent term rather than a recovery-period one, so the
   * figure has to show it on both sides of the threshold. One bar spanning both is how it
   * does that, and its label is the only thing distinguishing it from the protein rows.
   */
  it("shows each profit stream's share to the franchisee as a labelled bar", () => {
    render(<Franchise />);
    for (const [label, pct] of [
      ["Until capital recovery", FRANCHISE.proteinProfitSharePct.duringRecovery],
      ["After capital recovery", FRANCHISE.proteinProfitSharePct.afterRecovery],
      ["Before and after, throughout", FRANCHISE.advertising.franchiseeSharePct],
    ] as const) {
      const row = screen.getByText(label).closest("div");
      expect(row).toHaveTextContent(`${pct}%`);
    }
  });

  it("computes the recovery example rather than transcribing it", () => {
    const ex = recoveryExample("territory");
    render(<Franchise />);
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent(formatInr(ex.completesRecoveryInr));
    expect(table).toHaveTextContent(formatInr(ex.postRecoveryPoolInr));
    expect(table).toHaveTextContent(formatInr(ex.postRecoveryToFranchiseeInr));
    expect(table).toHaveTextContent(formatInr(ex.totalToFranchiseeInr));
  });

  /*
   * The table is the accessible twin of the segmented bar beside it, and the bar draws
   * each part as a share of the total. A part that does not belong to the sum would render
   * a bar whose segments do not fill it, which is the one way this illustration can be
   * silently wrong.
   */
  it("splits the illustrated distribution into parts that sum to it", () => {
    const ex = recoveryExample("territory");
    expect(
      ex.completesRecoveryInr + ex.postRecoveryToFranchiseeInr + ex.postRecoveryToMbpInr,
    ).toBe(ex.nextDistributionInr);
    expect(ex.totalToFranchiseeInr).toBe(
      ex.completesRecoveryInr + ex.postRecoveryToFranchiseeInr,
    );
  });

  it("publishes no projected earnings", () => {
    // §55 disclaims performance representations, so nothing on the page may read as a
    // forecast of what a machine or a territory will earn.
    const { container } = render(<Franchise />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/expected (?:returns?|revenue|earnings)/i);
    expect(text).not.toMatch(/projected/i);
    expect(text).not.toMatch(/\bROI\b/);
    expect(text).not.toMatch(/payback period/i);
  });

  it("renders every FAQ question so the FAQPage JSON-LD matches the page", () => {
    render(<Franchise />);
    for (const faq of FRANCHISE_FAQ) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
  });

  it("carries a tier chosen on a card into the application form", async () => {
    const user = userEvent.setup();
    render(<Franchise />);

    await user.click(screen.getByTestId(`button-apply-${city.id}`));

    expect(screen.getByRole("radio", { name: new RegExp(city.shortName, "i") })).toBeChecked();
  });

  it("submits the application through the franchise API", async () => {
    submitFranchiseApplication.mockResolvedValue({ ok: true, data: { reference: "FR-1024" } });
    const user = userEvent.setup();
    render(<Franchise />);

    await user.type(screen.getByLabelText(/your name/i), "Rahul Sharma");
    await user.type(screen.getByLabelText(/city or region you want/i), "Indore");
    await user.type(screen.getByLabelText(/^email$/i), "rahul@example.com");
    await user.type(screen.getByLabelText(/^mobile$/i), "9876543210");
    await user.click(screen.getByTestId("button-submit-application"));

    await waitFor(() => {
      expect(submitFranchiseApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rahul Sharma",
          email: "rahul@example.com",
          mobile: "9876543210",
          targetMarket: "Indore",
          tier: "territory",
        }),
      );
    });
    expect(await screen.findByTestId("application-received")).toHaveTextContent("FR-1024");
  });

  /*
   * `POST /franchise/applications` is not deployed yet, so this is the path every real
   * submission takes today. Without the mailto the enquiry is simply lost.
   */
  it("offers a prefilled mailto when the submission fails", async () => {
    submitFranchiseApplication.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "Could not reach the server." },
    });
    const user = userEvent.setup();
    render(<Franchise />);

    await user.type(screen.getByLabelText(/your name/i), "Rahul Sharma");
    await user.type(screen.getByLabelText(/city or region you want/i), "Indore");
    await user.type(screen.getByLabelText(/^email$/i), "rahul@example.com");
    await user.type(screen.getByLabelText(/^mobile$/i), "9876543210");
    await user.click(screen.getByTestId("button-submit-application"));

    const fallback = await screen.findByRole("link", { name: /email this application to us/i });
    const href = fallback.getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:/);
    expect(decodeURIComponent(href)).toContain("rahul@example.com");
    expect(decodeURIComponent(href)).toContain("Indore");
  });

  it("links to the gym side of the network and not to a payment route", () => {
    render(<Franchise />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/gym-partnership");
    expect(hrefs).not.toContain("/checkout");
    expect(hrefs).not.toContain("/pay");
  });
});
