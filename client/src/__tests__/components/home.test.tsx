/**
 * Tests for home page components: Hero, Features, ShakeVariants.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

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

// ─── Components ───────────────────────────────────────────────────────────────
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ShakeVariants from "@/components/home/ShakeVariants";

// ─── Hero ─────────────────────────────────────────────────────────────────────
describe("Hero component", () => {
  it("renders without crashing", () => {
    render(<Hero />);
  });

  // Matched on the h1 rather than on the text, because the headline is split across
  // an element boundary for the gradient on its second line.
  it("leads with the machine being in the gym, not with the product", () => {
    render(<Hero />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(/protein shakes\./i);
    expect(headline).toHaveTextContent(/right in your gym\./i);
  });

  it("shows the Request a Demo link pointing to /gym-demo", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /request a demo/i });
    expect(link).toHaveAttribute("href", "/gym-demo");
  });

  // The consumer USER LOGIN CTA was removed with consumer auth — there are no
  // member accounts. See docs/gym-onboarding.md §10.

  it("states the blend count and the blend time under the headline", () => {
    render(<Hero />);
    expect(screen.getByText(/12 fresh protein blends blended in 60 seconds/i)).toBeInTheDocument();
  });
});

// ─── Features ─────────────────────────────────────────────────────────────────
describe("Features component", () => {
  it("renders without crashing", () => {
    render(<Features />);
  });

  it("shows PREMIUM NUTRITION heading", () => {
    render(<Features />);
    expect(screen.getByText(/premium nutrition/i)).toBeInTheDocument();
  });

  it("shows all three feature cards", () => {
    render(<Features />);
    expect(screen.getByText(/ready in 60 seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/real ingredients only/i)).toBeInTheDocument();
    expect(screen.getByText(/smart & cashless/i)).toBeInTheDocument();
  });
});

// ─── ShakeVariants ────────────────────────────────────────────────────────────
describe("ShakeVariants component — no limit (all 12)", () => {
  it("renders without crashing", () => {
    render(<ShakeVariants />);
  });

  it("shows the section eyebrow and the full-menu heading", () => {
    render(<ShakeVariants />);
    expect(screen.getByText(/our menu/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all 12 blends/i })).toBeInTheDocument();
  });

  it("renders all 12 shakes when no limit is given", () => {
    render(<ShakeVariants />);
    expect(screen.getByText("Pure Whey")).toBeInTheDocument();
    expect(screen.getByText("Chocolate Creamy Date")).toBeInTheDocument();
  });

  /**
   * By role, not by text. The filters are title-case in the DOM and uppercased by CSS,
   * so the old `getByText("CLASSIC")` could never match — and "Premium" is both a
   * filter and a card badge, which makes a bare text query ambiguous anyway.
   */
  it("shows category filter buttons when no limit is given", () => {
    render(<ShakeVariants />);
    expect(screen.getByRole("button", { name: "Classic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Popular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Milk-Based" })).toBeInTheDocument();
  });
});

describe("ShakeVariants component — with limit prop", () => {
  it("renders only the first N shakes when limit is provided", () => {
    render(<ShakeVariants limit={3} />);
    expect(screen.getByText("Pure Whey")).toBeInTheDocument();
    expect(screen.getByText("Banana Blend")).toBeInTheDocument();
    expect(screen.getByText("Date Delight")).toBeInTheDocument();
    // 4th shake should not be visible
    expect(screen.queryByText("Chocolate Pure")).not.toBeInTheDocument();
  });

  // Was asserting the absence of "CLASSIC", a string the component never renders in
  // any state, so it passed whether the filters were hidden or not.
  it("does not show category filter buttons when limit is given", () => {
    render(<ShakeVariants limit={3} />);
    expect(screen.queryByRole("button", { name: "Classic" })).not.toBeInTheDocument();
  });

  it("shows BESTSELLER badge on Banana Blend", () => {
    render(<ShakeVariants limit={3} />);
    expect(screen.getByText("BESTSELLER")).toBeInTheDocument();
  });
});
