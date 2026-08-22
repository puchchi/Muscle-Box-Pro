import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockPush, mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/account"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Recharts needs some canvas mocks in jsdom
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

import Account from "@/pages/Account";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderAccount() {
  return render(<Account />, { wrapper: makeWrapper() });
}

function mockSession(overrides: Record<string, unknown> = {}) {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          email: "test@example.com",
          user_metadata: {
            full_name: "John Doe",
            account_type: "user",
            wallet_balance: 250.5,
            monthly_shakes: 12,
            favorite_blend: "Banana Blast",
            transactions: [],
            ...overrides,
          },
        },
      },
    },
  });
}

// ─── Loading state ────────────────────────────────────────────────────────────
describe("Account — loading state", () => {
  it("shows 'Checking session...' while loading", () => {
    // Never resolve — stays in loading
    mockGetSession.mockReturnValue(new Promise(() => {}));
    renderAccount();
    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
  });
});

// ─── Not logged in ────────────────────────────────────────────────────────────
describe("Account — not logged in", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it("shows ACCOUNT ACCESS card when not authenticated", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/account access/i)).toBeInTheDocument();
    });
  });

  it("shows SIGN IN TO DASHBOARD button linking to /login", async () => {
    renderAccount();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /sign in to dashboard/i });
      expect(link).toHaveAttribute("href", "/login");
    });
  });
});

// ─── User dashboard ───────────────────────────────────────────────────────────
describe("Account — member (user) dashboard", () => {
  beforeEach(() => {
    mockSession();
  });

  it("renders MEMBER DASHBOARD heading", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/member dashboard/i)).toBeInTheDocument();
    });
  });

  it("displays formatted display name", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument();
    });
  });

  it("shows wallet balance", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/₹250\.50/)).toBeInTheDocument();
    });
  });

  it("shows monthly shakes count", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });

  it("shows favourite blend name", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("Banana Blast")).toBeInTheDocument();
    });
  });

  it("shows 'Not available' when wallet_balance is missing", async () => {
    mockSession({ wallet_balance: undefined });
    renderAccount();
    await waitFor(() => {
      expect(screen.getAllByText(/not available/i).length).toBeGreaterThan(0);
    });
  });

  it("shows '--' when monthly_shakes is null", async () => {
    mockSession({ monthly_shakes: null });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("--")).toBeInTheDocument();
    });
  });

  it("shows 'No recent activity yet' when transactions are empty", async () => {
    mockSession({ transactions: [] });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/no recent activity yet/i)).toBeInTheDocument();
    });
  });

  it("renders transaction rows when transactions are present", async () => {
    mockSession({
      transactions: [
        { id: "t1", item: "Chocolate Pure Shake", date: "2026-03-10", amount: -85, location: "Gold's Gym" },
        { id: "t2", item: "Wallet Top-up", date: "2026-03-08", amount: 500, location: "App" },
      ],
    });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("Chocolate Pure Shake")).toBeInTheDocument();
      expect(screen.getByText("Wallet Top-up")).toBeInTheDocument();
    });
  });

  it("formats positive transaction amounts with '+' sign", async () => {
    mockSession({
      transactions: [
        { id: "t1", item: "Top-up", date: "2026-03-10", amount: 500, location: "App" },
      ],
    });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("+₹500.00")).toBeInTheDocument();
    });
  });

  it("shows ADD FUNDS button for user account type", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add funds/i })).toBeInTheDocument();
    });
  });

  it("shows LOGOUT button", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });
  });

  it("calls signOut and pushes to '/' on logout", async () => {
    mockSignOut.mockResolvedValue({});
    renderAccount();
    const user = userEvent.setup();

    await waitFor(() =>
      screen.getByRole("button", { name: /logout/i })
    );

    await user.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});

// ─── Gym owner dashboard ──────────────────────────────────────────────────────
describe("Account — gym owner dashboard", () => {
  beforeEach(() => {
    mockSession({ account_type: "gym" });
  });

  it("renders GYM OWNER PORTAL heading", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/gym owner portal/i)).toBeInTheDocument();
    });
  });

  it("shows Weekly Revenue card", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/weekly revenue/i)).toBeInTheDocument();
      expect(screen.getByText("₹42,500")).toBeInTheDocument();
    });
  });

  it("renders the revenue bar chart", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  it("shows Top Selling Blends with percentage bars", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/banana blast/i)).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
    });
  });

  it("does NOT show ADD FUNDS button for gym accounts", async () => {
    renderAccount();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /add funds/i })).not.toBeInTheDocument();
    });
  });
});

// ─── toDisplayName utility — tested through component rendering ───────────────
describe("toDisplayName (via Account component)", () => {
  it("converts kebab-case to Title Case", async () => {
    mockSession({ full_name: "john-doe-smith" });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/welcome back, john doe smith/i)).toBeInTheDocument();
    });
  });

  it("converts underscore_names to Title Case", async () => {
    mockSession({ full_name: "jane_doe" });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/welcome back, jane doe/i)).toBeInTheDocument();
    });
  });

  it("falls back to email prefix when full_name is absent", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: "raj.fitness@example.com",
            user_metadata: {
              account_type: "user",
            },
          },
        },
      },
    });
    renderAccount();
    await waitFor(() => {
      // email prefix "raj.fitness" → toDisplayName → "Raj Fitness"
      expect(screen.getByText(/welcome back, raj fitness/i)).toBeInTheDocument();
    });
  });

  it("falls back to 'Member' when both name and email are absent", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: undefined,
            user_metadata: { account_type: "user" },
          },
        },
      },
    });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/welcome back, member/i)).toBeInTheDocument();
    });
  });
});

// ─── parseMemberTransactions — tested through component rendering ─────────────
describe("parseMemberTransactions (via Account component)", () => {
  it("skips entries with invalid or missing amount", async () => {
    mockSession({
      transactions: [
        { id: "t1", item: "Valid", amount: 100, date: "2026-01-01", location: "Gym" },
        { id: "t2", item: "Bad", amount: "notanumber", date: "2026-01-02", location: "App" },
        null,
        "string-entry",
      ],
    });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText("Valid")).toBeInTheDocument();
      expect(screen.queryByText("Bad")).not.toBeInTheDocument();
    });
  });

  it("uses defaults for missing string fields", async () => {
    mockSession({
      transactions: [{ amount: 50 }], // no id, item, date, location
    });
    renderAccount();
    await waitFor(() => {
      // Default item is "Transaction"
      expect(screen.getByText("Transaction")).toBeInTheDocument();
    });
  });

  it("returns empty array when transactions is not an array", async () => {
    mockSession({ transactions: "not-an-array" });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/no recent activity yet/i)).toBeInTheDocument();
    });
  });

  it("returns empty array when transactions is null", async () => {
    mockSession({ transactions: null });
    renderAccount();
    await waitFor(() => {
      expect(screen.getByText(/no recent activity yet/i)).toBeInTheDocument();
    });
  });

  it("parses numeric string amounts correctly", async () => {
    mockSession({
      transactions: [
        { id: "t1", item: "Date Delight Shake", amount: "-75.50", date: "2026-01-01", location: "Gym" },
      ],
    });
    renderAccount();
    await waitFor(() => {
      // Negative amount → displayed as "₹75.50" (no + prefix)
      expect(screen.getByText("₹75.50")).toBeInTheDocument();
    });
  });
});

// ─── Add Funds dialog ─────────────────────────────────────────────────────────
describe("Account — Add Funds dialog", () => {
  beforeEach(() => {
    mockSession();
  });

  it("opens Add Funds dialog when button is clicked", async () => {
    renderAccount();
    const user = userEvent.setup();

    await waitFor(() =>
      screen.getByRole("button", { name: /add funds/i })
    );

    await user.click(screen.getByRole("button", { name: /add funds/i }));

    await waitFor(() => {
      expect(screen.getByText(/load wallet/i)).toBeInTheDocument();
    });
  });

  it("shows preset amount buttons in the dialog", async () => {
    renderAccount();
    const user = userEvent.setup();

    await waitFor(() => screen.getByRole("button", { name: /add funds/i }));
    await user.click(screen.getByRole("button", { name: /add funds/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /₹500/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /₹1000/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /₹2000/i })).toBeInTheDocument();
    });
  });

  it("custom amount input updates state", async () => {
    renderAccount();
    const user = userEvent.setup();

    await waitFor(() => screen.getByRole("button", { name: /add funds/i }));
    await user.click(screen.getByRole("button", { name: /add funds/i }));

    await waitFor(() => screen.getByPlaceholderText(/enter amount/i));

    await user.type(screen.getByPlaceholderText(/enter amount/i), "750");

    expect(screen.getByPlaceholderText(/enter amount/i)).toHaveValue(750);
  });
});
