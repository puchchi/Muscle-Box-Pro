import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

const { mockReplace, api, franchise } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  api: { fetchViewer: vi.fn(), fetchMachineSummary: vi.fn(), fetchSalesStats: vi.fn(), listFeedback: vi.fn() },
  franchise: {
    FRANCHISE_SESSION_QUERY_KEY: ["franchise-session"],
    fetchFranchiseSession: vi.fn(),
    signOutOfFranchisePortal: vi.fn(),
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: mockReplace }) }));
vi.mock("@/lib/adminMachineApi", () => api);
vi.mock("@/lib/franchiseSession", () => franchise);
vi.mock("@/lib/franchisePortalApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/franchisePortalApi")>()),
  fetchFranchisePortalSnapshot: () => new Promise(() => {}),
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

const session = {
  email: "p@x.in",
  franchiseId: "FR-1",
  role: "owner",
  franchiseDisplayName: "Test Franchise",
  franchiseStatus: "onboarding",
  expiresAt: null,
};

function renderDashboard() {
  return render(
    <QueryClientProvider client={queryClient}>
      <FranchiseDashboard />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
  franchise.fetchFranchiseSession.mockResolvedValue(session);
});

describe("Franchise dashboard in the console", () => {
  it("opens on the franchise session alone when the console can't read who it is", async () => {
    api.fetchViewer.mockResolvedValue({ ok: false, error: { code: "invalid_token" } });
    renderDashboard();
    expect(await screen.findByTestId("machines-tab-overview")).toHaveAttribute("href", "/franchise/dashboard");
    expect(screen.getByTestId("machines-tab-record")).toBeInTheDocument();
    expect(screen.queryByTestId("machines-tab-machines")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("adds the console's pages when the console knows the franchise", async () => {
    api.fetchViewer.mockResolvedValue({
      ok: true,
      data: {
        role: "franchise",
        name: "Test Franchise",
        email: "p@x.in",
        operatorId: null,
        franchiseId: "FR-1",
        gymId: null,
        can: new Set(["machines.list.view"]),
      },
    });
    renderDashboard();
    expect(await screen.findByTestId("machines-tab-machines")).toHaveAttribute("href", "/machines");
  });

  it("signs out of the franchise portal and returns to its sign-in", async () => {
    api.fetchViewer.mockResolvedValue({ ok: false, error: { code: "invalid_token" } });
    renderDashboard();
    await userEvent.setup().click(await screen.findByTestId("button-signout"));
    expect(franchise.signOutOfFranchisePortal).toHaveBeenCalled();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/franchise/login"));
  });

  it("sends a visitor with no franchise session to the franchise sign-in", async () => {
    franchise.fetchFranchiseSession.mockResolvedValue(null);
    renderDashboard();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/franchise/login"));
    expect(api.fetchViewer).not.toHaveBeenCalled();
  });
});
