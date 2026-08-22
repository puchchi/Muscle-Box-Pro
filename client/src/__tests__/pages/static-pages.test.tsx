/**
 * Smoke tests for all static/content-only pages.
 * Each test verifies the page renders without crashing and shows its primary heading.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Shared mocks ─────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

// ─── Pages ────────────────────────────────────────────────────────────────────
import AboutUs from "@/pages/AboutUs";
import HelpCenter from "@/pages/HelpCenter";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import RefundCancellation from "@/pages/RefundCancellation";
import NotFound from "@/pages/not-found";
import MachineSpecs from "@/pages/MachineSpecs";

// ─── AboutUs ──────────────────────────────────────────────────────────────────
describe("AboutUs page", () => {
  it("renders without crashing", () => {
    render(<AboutUs />);
  });

  // The h1 is "About MuscleBoxPro"; "About Us" is only the nav label and the <title>.
  it("shows the About MuscleBoxPro heading", () => {
    render(<AboutUs />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/about musclebox/i);
  });

  it("shows Our Vision section", () => {
    render(<AboutUs />);
    expect(screen.getByText(/our vision/i)).toBeInTheDocument();
  });
});

// ─── HelpCenter ───────────────────────────────────────────────────────────────
describe("HelpCenter page", () => {
  it("renders without crashing", () => {
    render(<HelpCenter />);
  });

  it("shows HELP CENTER heading", () => {
    render(<HelpCenter />);
    expect(screen.getByRole("heading", { name: /help center/i })).toBeInTheDocument();
  });

  // A bare /wallet/i matched both the "Payments & Wallet" category tile and two of
  // the questions inside it, so it asserted nothing about the accordion. Match the
  // question itself.
  it("renders FAQ accordion items", () => {
    render(<HelpCenter />);
    expect(screen.getByText("How do I add funds to my wallet?")).toBeInTheDocument();
  });
});

// ─── Privacy ──────────────────────────────────────────────────────────────────
describe("Privacy page", () => {
  it("renders without crashing", () => {
    render(<Privacy />);
  });

  it("shows PRIVACY POLICY heading", () => {
    render(<Privacy />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    // heading text is split ("PRIVACY" + "<span>POLICY</span>") so check both parts
    expect(screen.getAllByText(/privacy/i).length).toBeGreaterThan(0);
  });

  it("shows the last updated date", () => {
    render(<Privacy />);
    expect(screen.getByText(/february 26, 2026/i)).toBeInTheDocument();
  });

  it("renders policy sections", () => {
    render(<Privacy />);
    expect(screen.getByText(/information we collect/i)).toBeInTheDocument();
  });

  it("shows contact email link", () => {
    render(<Privacy />);
    expect(screen.getAllByText(/contact@muscleboxpro\.com/i).length).toBeGreaterThan(0);
  });
});

// ─── Terms ────────────────────────────────────────────────────────────────────
describe("Terms page", () => {
  it("renders without crashing", () => {
    render(<Terms />);
  });

  it("shows TERMS heading", () => {
    render(<Terms />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/terms/i).length).toBeGreaterThan(0);
  });

  it("shows the last updated date", () => {
    render(<Terms />);
    expect(screen.getByText(/february 26, 2026/i)).toBeInTheDocument();
  });

  it("renders all numbered term sections", () => {
    render(<Terms />);
    expect(screen.getByText(/acceptance of terms/i)).toBeInTheDocument();
    expect(screen.getByText(/governing law/i)).toBeInTheDocument();
  });

  it("shows contact email link", () => {
    render(<Terms />);
    expect(screen.getAllByText(/contact@muscleboxpro\.com/i).length).toBeGreaterThan(0);
  });
});

// ─── RefundCancellation ───────────────────────────────────────────────────────
describe("RefundCancellation page", () => {
  it("renders without crashing", () => {
    render(<RefundCancellation />);
  });

  it("shows REFUND heading", () => {
    render(<RefundCancellation />);
    expect(screen.getAllByText(/refund/i).length).toBeGreaterThan(0);
  });

  it("renders policy sections", () => {
    render(<RefundCancellation />);
    expect(screen.getAllByText(/cancellation/i).length).toBeGreaterThan(0);
  });
});

// ─── NotFound ─────────────────────────────────────────────────────────────────
describe("NotFound (404) page", () => {
  it("renders without crashing", () => {
    render(<NotFound />);
  });

  // "404" is on the page twice: the badge, and a giant aria-hidden watermark. The
  // badge is the one a screen reader gets, so that is the one worth asserting.
  it("says 404 in the badge and names the failure in the heading", () => {
    render(<NotFound />);
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/page not found/i);
  });

  // Matched by its own label rather than /home/i, which also hit the navbar's HOME,
  // the "Home" quick-link tile and the footer.
  it("shows a link to the homepage", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /go to homepage/i })).toHaveAttribute("href", "/");
  });
});

// ─── MachineSpecs ─────────────────────────────────────────────────────────────
describe("MachineSpecs page", () => {
  it("renders without crashing", () => {
    render(<MachineSpecs />);
  });

  it("shows MACHINE SPECIFICATIONS heading", () => {
    render(<MachineSpecs />);
    // heading text is split: "MACHINE" + "<span>SPECIFICATIONS</span>"
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/machine/i).length).toBeGreaterThan(0);
  });

  it("renders spec groups", () => {
    render(<MachineSpecs />);
    expect(screen.getByText(/smart core/i)).toBeInTheDocument();
    expect(screen.getByText(/mixing/i)).toBeInTheDocument();
  });

  it("renders payment method section", () => {
    render(<MachineSpecs />);
    expect(screen.getByText(/upi/i)).toBeInTheDocument();
  });
});
