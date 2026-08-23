/**
 * Smoke tests for product/landing pages.
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

// ─── Pages ────────────────────────────────────────────────────────────────────
import GymProteinShakeMachine from "@/pages/GymProtienShakeMachine";
import ProteinShakeVendingMachine from "@/pages/ProtienShakeVendingMachine";
import ProteinVendingMachineIndia from "@/pages/ProtienVendingMachineIndia";

// ─── GymProteinShakeMachine ───────────────────────────────────────────────────
describe("GymProteinShakeMachine page", () => {
  it("renders without crashing", () => {
    render(<GymProteinShakeMachine />);
  });

  it("shows gym protein shake machine heading", () => {
    render(<GymProteinShakeMachine />);
    // heading text is split across elements
    expect(screen.getAllByText(/gym protein shake machine/i).length).toBeGreaterThan(0);
  });

  it("shows AUTOMATED SHAKE DISPENSER badge", () => {
    render(<GymProteinShakeMachine />);
    expect(screen.getAllByText(/automated shake dispenser/i).length).toBeGreaterThan(0);
  });

  it("shows REQUEST MACHINE DEMO link", () => {
    render(<GymProteinShakeMachine />);
    expect(screen.getByRole("link", { name: /request machine demo/i })).toBeInTheDocument();
  });

  it("shows VIEW MACHINE SPECS link", () => {
    render(<GymProteinShakeMachine />);
    expect(screen.getByRole("link", { name: /view machine specs/i })).toBeInTheDocument();
  });
});

// ─── ProteinShakeVendingMachine ───────────────────────────────────────────────
describe("ProteinShakeVendingMachine page", () => {
  it("renders without crashing", () => {
    render(<ProteinShakeVendingMachine />);
  });

  it("shows protein shake vending machine heading", () => {
    render(<ProteinShakeVendingMachine />);
    expect(screen.getAllByText(/protein shake vending machine/i).length).toBeGreaterThan(0);
  });

  it("shows THE FUTURE OF GYM REVENUE badge", () => {
    render(<ProteinShakeVendingMachine />);
    expect(screen.getByText(/the future of gym revenue/i)).toBeInTheDocument();
  });

  it("shows REQUEST MACHINE DEMO link", () => {
    render(<ProteinShakeVendingMachine />);
    expect(screen.getByRole("link", { name: /request machine demo/i })).toBeInTheDocument();
  });
});

// ─── ProteinVendingMachineIndia ───────────────────────────────────────────────
describe("ProteinVendingMachineIndia page — default (India)", () => {
  it("renders without crashing", () => {
    render(<ProteinVendingMachineIndia />);
  });

  it("shows Protein Vending Machine in India heading", () => {
    render(<ProteinVendingMachineIndia />);
    expect(screen.getAllByText(/protein vending machine/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/india/i).length).toBeGreaterThan(0);
  });

  it("shows REQUEST MACHINE DEMO link", () => {
    render(<ProteinVendingMachineIndia />);
    expect(screen.getByRole("link", { name: /request machine demo/i })).toBeInTheDocument();
  });
});

describe("ProteinVendingMachineIndia page — city prop (Delhi)", () => {
  it("renders without crashing when cityName is provided", () => {
    render(<ProteinVendingMachineIndia cityName="Delhi" />);
  });

  it("shows Delhi in the heading", () => {
    render(<ProteinVendingMachineIndia cityName="Delhi" />);
    expect(screen.getAllByText(/delhi/i).length).toBeGreaterThan(0);
  });
});
