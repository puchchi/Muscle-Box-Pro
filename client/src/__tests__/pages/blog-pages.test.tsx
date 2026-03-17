/**
 * Smoke tests for blog pages.
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
  usePathname: vi.fn(() => "/blog"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

// ─── Pages ────────────────────────────────────────────────────────────────────
import BlogBestProteinShake from "@/pages/BlogBestProteinShake";
import BlogProteinDiabetes from "@/pages/BlogProteinDiabetes";
import BlogWhyGymVending from "@/pages/BlogWhyGymVending";

// ─── BlogBestProteinShake ─────────────────────────────────────────────────────
describe("BlogBestProteinShake page", () => {
  it("renders without crashing", () => {
    render(<BlogBestProteinShake />);
  });

  it("shows main article heading", () => {
    render(<BlogBestProteinShake />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows NUTRITION SCIENCE badge text", () => {
    render(<BlogBestProteinShake />);
    expect(screen.getByText(/nutrition science/i)).toBeInTheDocument();
  });

  it("shows whey vs plant content", () => {
    render(<BlogBestProteinShake />);
    expect(screen.getAllByText(/whey/i).length).toBeGreaterThan(0);
  });
});

// ─── BlogProteinDiabetes ──────────────────────────────────────────────────────
describe("BlogProteinDiabetes page", () => {
  it("renders without crashing", () => {
    render(<BlogProteinDiabetes />);
  });

  it("shows main article heading", () => {
    render(<BlogProteinDiabetes />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows HEALTH & NUTRITION badge text", () => {
    render(<BlogProteinDiabetes />);
    expect(screen.getByText(/health & nutrition/i)).toBeInTheDocument();
  });

  it("shows diabetes-related content", () => {
    render(<BlogProteinDiabetes />);
    expect(screen.getAllByText(/diabet/i).length).toBeGreaterThan(0);
  });
});

// ─── BlogWhyGymVending ────────────────────────────────────────────────────────
describe("BlogWhyGymVending page", () => {
  it("renders without crashing", () => {
    render(<BlogWhyGymVending />);
  });

  it("shows main article heading", () => {
    render(<BlogWhyGymVending />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows GYM OWNER GUIDE badge text", () => {
    render(<BlogWhyGymVending />);
    expect(screen.getByText(/gym owner guide/i)).toBeInTheDocument();
  });

  it("shows vending machine content", () => {
    render(<BlogWhyGymVending />);
    expect(screen.getAllByText(/protein shake vending machine/i).length).toBeGreaterThan(0);
  });
});
