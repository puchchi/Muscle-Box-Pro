import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { FranchisePortalSnapshot, UnbuiltSection } from "@shared/franchise/portal";

const { api, franchise, portal } = vi.hoisted(() => ({
  api: { fetchViewer: vi.fn(), fetchMachineSummary: vi.fn(), fetchSalesStats: vi.fn(), listFeedback: vi.fn() },
  franchise: {
    FRANCHISE_SESSION_QUERY_KEY: ["franchise-session"],
    fetchFranchiseSession: vi.fn(),
    signOutOfFranchisePortal: vi.fn(),
  },
  portal: { fetchFranchisePortalSnapshot: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/adminMachineApi", () => api);
vi.mock("@/lib/franchiseSession", () => franchise);
vi.mock("@/lib/franchisePortalApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/franchisePortalApi")>()),
  fetchFranchisePortalSnapshot: portal.fetchFranchisePortalSnapshot,
}));
vi.mock("@/lib/apiClient", () => ({ apiBaseUrl: () => "https://api.example" }));
vi.mock("@/lib/machineConsoleSignIn", () => ({ signOutOfMachineConsole: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import FranchiseDashboard from "@/pages/franchise/FranchiseDashboard";
import { queryClient } from "@/lib/queryClient";

const ABSENT = { available: false, reason: "not_implemented" } as const satisfies UnbuiltSection;

function snapshot(onboardingStatus: FranchisePortalSnapshot["onboardingStatus"]): FranchisePortalSnapshot {
  return {
    franchiseId: "FR-1",
    franchiseDisplayName: "Test Franchise",
    onboardingStatus,
    user: { email: "p@x.in", role: "franchise_owner" },
    terms: {
      tier: "territory",
      investmentPaise: 250_000_000,
      machineAllocation: 5,
      paymentSchedule: [{ pct: 100, trigger: "On signing" }],
      capitalRecoveryPaise: 295_000_000,
      proteinSharePctDuringRecovery: 100,
      proteinSharePctAfterRecovery: 50,
      advertisingFranchiseeSharePct: 25,
      advertisingMbpSharePct: 75,
    },
    territory: null,
    operations: null,
    documents: [],
    payments: [],
    agreement: null,
    sales: ABSENT,
    consumption: ABSENT,
    costs: ABSENT,
    advertising: ABSENT,
    profit: ABSENT,
    payouts: ABSENT,
    capitalRecoveryProgress: ABSENT,
    machines: ABSENT,
    statements: ABSENT,
    alerts: ABSENT,
    asOf: "2026-10-13T04:15:00.000Z",
  };
}

const sales = {
  period: "day",
  from: "2026-10-01",
  to: "2026-10-13",
  rows: [],
  totals: { drinks: 0, amountInr: 0 },
};

function renderDashboard(view?: "overview" | "record") {
  return render(
    <QueryClientProvider client={queryClient}>
      <FranchiseDashboard view={view} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
  franchise.fetchFranchiseSession.mockResolvedValue({
    email: "p@x.in",
    franchiseId: "FR-1",
    role: "owner",
    franchiseDisplayName: "Test Franchise",
    franchiseStatus: "active",
    expiresAt: null,
  });
  api.fetchViewer.mockResolvedValue({ ok: false, error: { code: "invalid_token" } });
  api.fetchMachineSummary.mockResolvedValue({
    ok: true,
    data: { machines: 2, online: 1, offline: 1, faulty: 0, lowStock: 0, restartPending: 0 },
  });
  api.fetchSalesStats.mockResolvedValue({ ok: true, data: sales });
});

describe("Franchise overview", () => {
  it("leads a trading franchise with its sales and machines", async () => {
    portal.fetchFranchisePortalSnapshot.mockResolvedValue(snapshot("active"));
    renderDashboard();
    expect(await screen.findByTestId("metric-sales-month")).toHaveAttribute("href", "/machines/statistics");
    expect(screen.getByTestId("metric-machines")).toHaveTextContent("1 online now");
    expect(screen.getByText(/1 online now/)).toHaveClass("text-amber-200");
    expect(screen.getByTestId("coming-soon")).toBeInTheDocument();
    expect(screen.queryByTestId("metric-investment")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-terms")).not.toBeInTheDocument();
  });

  it("falls back to the money sent when sales can't be read", async () => {
    portal.fetchFranchisePortalSnapshot.mockResolvedValue(snapshot("active"));
    api.fetchSalesStats.mockResolvedValue({ ok: false, error: { code: "invalid_token" } });
    renderDashboard();
    expect(await screen.findByTestId("metric-confirmed")).toBeInTheDocument();
    expect(screen.queryByTestId("metric-sales-month")).not.toBeInTheDocument();
  });

  it("shows a franchise that isn't live its instalments, without asking for sales", async () => {
    portal.fetchFranchisePortalSnapshot.mockResolvedValue(snapshot("payment_claimed"));
    renderDashboard();
    expect(await screen.findByTestId("franchise-not-live")).toBeInTheDocument();
    expect(screen.getByTestId("card-payments")).toBeInTheDocument();
    expect(screen.queryByTestId("coming-soon")).not.toBeInTheDocument();
    expect(api.fetchSalesStats).not.toHaveBeenCalled();
  });

  it("keeps the terms and instalments on the record", async () => {
    portal.fetchFranchisePortalSnapshot.mockResolvedValue(snapshot("active"));
    renderDashboard("record");
    expect(await screen.findByTestId("card-terms")).toHaveTextContent("Capital to recover₹29,50,000");
    expect(screen.getByTestId("card-payments")).toBeInTheDocument();
  });
});
