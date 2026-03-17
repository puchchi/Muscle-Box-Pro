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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: React.ComponentProps<"div">) => <div {...p}>{children}</div>,
    section: ({ children, ...p }: React.ComponentProps<"section">) => <section {...p}>{children}</section>,
    h1: ({ children, ...p }: React.ComponentProps<"h1">) => <h1 {...p}>{children}</h1>,
    h2: ({ children, ...p }: React.ComponentProps<"h2">) => <h2 {...p}>{children}</h2>,
    p: ({ children, ...p }: React.ComponentProps<"p">) => <p {...p}>{children}</p>,
    span: ({ children, ...p }: React.ComponentProps<"span">) => <span {...p}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: vi.fn(() => true),
}));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

// ─── Components ───────────────────────────────────────────────────────────────
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ShakeVariants from "@/components/home/ShakeVariants";

// ─── Hero ─────────────────────────────────────────────────────────────────────
describe("Hero component", () => {
  it("renders without crashing", () => {
    render(<Hero />);
  });

  it("shows FUEL YOUR GAINS INSTANTLY heading", () => {
    render(<Hero />);
    expect(screen.getByText(/fuel your/i)).toBeInTheDocument();
    expect(screen.getByText(/gains instantly/i)).toBeInTheDocument();
  });

  it("shows REQUEST DEMO link pointing to /gym-demo", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /request demo/i });
    expect(link).toHaveAttribute("href", "/gym-demo");
  });

  it("shows USER LOGIN link pointing to /login", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /user login/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows 'The Future of Fuel' tagline", () => {
    render(<Hero />);
    expect(screen.getByText(/the future of fuel/i)).toBeInTheDocument();
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

  it("shows Instant Recovery feature", () => {
    render(<Features />);
    expect(screen.getByText(/instant recovery/i)).toBeInTheDocument();
  });

  it("shows Real Ingredients feature", () => {
    render(<Features />);
    expect(screen.getByText(/real ingredients/i)).toBeInTheDocument();
  });

  it("shows Smart Profile feature", () => {
    render(<Features />);
    expect(screen.getByText(/smart profile/i)).toBeInTheDocument();
  });
});

// ─── ShakeVariants ────────────────────────────────────────────────────────────
describe("ShakeVariants component — no limit (all 12)", () => {
  it("renders without crashing", () => {
    render(<ShakeVariants />);
  });

  it("shows THE MENU badge", () => {
    render(<ShakeVariants />);
    expect(screen.getByText(/the menu/i)).toBeInTheDocument();
  });

  it("renders all 12 shakes when no limit is given", () => {
    render(<ShakeVariants />);
    expect(screen.getByText("Pure Whey")).toBeInTheDocument();
    expect(screen.getByText("Chocolate Creamy Date")).toBeInTheDocument();
  });

  it("shows category filter buttons when no limit is given", () => {
    render(<ShakeVariants />);
    expect(screen.getByText("CLASSIC")).toBeInTheDocument();
    expect(screen.getByText("POPULAR")).toBeInTheDocument();
    expect(screen.getByText("MILK-BASED")).toBeInTheDocument();
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

  it("does not show category filter buttons when limit is given", () => {
    render(<ShakeVariants limit={3} />);
    expect(screen.queryByText("CLASSIC")).not.toBeInTheDocument();
  });

  it("shows BESTSELLER badge on Banana Blend", () => {
    render(<ShakeVariants limit={3} />);
    expect(screen.getByText("BESTSELLER")).toBeInTheDocument();
  });
});
