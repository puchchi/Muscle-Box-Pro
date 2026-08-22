import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => "/gym/dashboard"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: mockGetSession, signOut: mockSignOut } },
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));

/**
 * The dashboard reads one fixture and derives everything from it, so overriding the
 * fixture is the only way to reach the states a demo gym is not in — an outstanding
 * deposit, a gym past its milestone, a machine not yet installed. A getter rather than
 * a fixed object so each test can set its own and the default stays the real fixture.
 */
const { snapshotOverride } = vi.hoisted(() => ({
  snapshotOverride: { value: undefined as unknown },
}));
vi.mock("@shared/gym/fixtures", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/gym/fixtures")>();
  return {
    get DEMO_GYM_PORTAL() {
      return snapshotOverride.value ?? actual.DEMO_GYM_PORTAL;
    },
  };
});

import GymDashboard from "@/pages/gym/GymDashboard";
import type { GymPortalSnapshot } from "@shared/gym/portal";

/** The real fixture, unaffected by whatever a test has set. */
async function realSnapshot(): Promise<GymPortalSnapshot> {
  const actual = await vi.importActual<typeof import("@shared/gym/fixtures")>(
    "@shared/gym/fixtures",
  );
  return actual.DEMO_GYM_PORTAL;
}

/** Renders with a session and waits for the cards. */
async function renderDashboard() {
  mockGetSession.mockResolvedValue(signedIn);
  render(<GymDashboard />);
  await waitFor(() => screen.getByTestId("card-payout"));
}

const signedIn = {
  data: { session: { user: { email: "owner@yourgym.com" } } },
};

describe("GymDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    snapshotOverride.value = undefined;
  });

  it("sends signed-out visitors to the gym login page", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<GymDashboard />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/gym/login");
    });
  });

  it("shows the signed-in email once a session resolves", async () => {
    mockGetSession.mockResolvedValue(signedIn);
    render(<GymDashboard />);

    await waitFor(() => {
      expect(screen.getByText("owner@yourgym.com")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the six partner metric cards", async () => {
    mockGetSession.mockResolvedValue(signedIn);
    render(<GymDashboard />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /your machine/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /cups sold/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /revenue collected/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your payout/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /electricity reimbursement/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /statements & agreement/i })).toBeInTheDocument();
  });

  // §8.3 of the agreement makes the monthly statement the amount actually owed.
  it("states that pre-settlement figures are provisional", async () => {
    mockGetSession.mockResolvedValue(signedIn);
    render(<GymDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText(/figures shown here before the 15th of a month are provisional/i),
      ).toBeInTheDocument();
    });
  });

  /**
   * The figures below are all derived from the fixture's raw cups and rupees by
   * `shared/settlement/compute.ts` — 260 cups, ₹31,200 gross, ₹14,300 of cost, ₹4,000
   * of ad revenue, on top of 3,200 cups and ₹3,84,000 already banked. Nothing on the
   * screen is a typed-in number, which is the point of the whole arrangement, so these
   * assertions are what stops a card quietly reverting to a hardcoded value.
   */
  describe("derived figures", () => {
    it("shows a payout computed from the month's trading, broken into its two sources", async () => {
      await renderDashboard();
      const payout = within(screen.getByTestId("card-payout"));

      expect(payout.getByText("₹4,180")).toBeInTheDocument();
      expect(payout.getByText("₹3,380")).toBeInTheDocument();
      expect(payout.getByText("₹800")).toBeInTheDocument();
      // Last settled month, profit share plus the electricity that closed with it.
      expect(payout.getByText("₹5,870")).toBeInTheDocument();
    });

    it("shows net profit, the share in force, and costs only as a total", async () => {
      await renderDashboard();
      const profit = within(screen.getByTestId("card-profit"));

      expect(profit.getByText("₹16,900")).toBeInTheDocument();
      expect(profit.getByText("₹14,300")).toBeInTheDocument();
      expect(profit.getByText("20%")).toBeInTheDocument();
      // §40 confidentiality runs both ways: the gym gets the total it needs to verify
      // net profit, not our per-unit cost schedule.
      expect(profit.queryByText(/per cup/i)).toBeNull();
      expect(profit.queryByText("₹55")).toBeNull();
    });

    it("tracks the milestone test that actually fires first, not the headline one", async () => {
      await renderDashboard();
      const cups = within(screen.getByTestId("card-cups"));

      expect(cups.getByText("260")).toBeInTheDocument();
      expect(cups.getByText("7,260")).toBeInTheDocument();
      // 94.4% of ₹5,00,000 of net profit — where the cup count is at 7,260 of 15,000,
      // which as a progress bar would say 48% and imply the step-up is a year away.
      expect(cups.getByText(/94.4% of the way/)).toBeInTheDocument();
      expect(cups.getByText(/433 more cups/)).toBeInTheDocument();
      expect(
        cups.getByText(/Tracking ₹5,00,000 of cumulative net profit/),
      ).toBeInTheDocument();
    });

    it("keeps advertising at its own ratio and out of net profit", async () => {
      await renderDashboard();
      const ads = within(screen.getByTestId("card-advertising"));

      expect(ads.getByText("₹800")).toBeInTheDocument();
      expect(ads.getByText("₹4,000")).toBeInTheDocument();
      // §9.4 — stated on the card, because a gym that steps up to 50% on shakes will
      // otherwise read a 20% advertising share as a mistake.
      expect(ads.getByText(/shared 80:20 for the whole term/)).toBeInTheDocument();
      // The ad revenue is not in net profit.
      expect(within(screen.getByTestId("card-profit")).getByText("₹16,900")).toBeInTheDocument();
    });

    it("counts electricity cups to the next actual increase, not the next block", async () => {
      await renderDashboard();
      const power = within(screen.getByTestId("card-electricity"));

      // 1,180 cups in the window: one completed block of 1,000.
      expect(power.getByText("₹1,000")).toBeInTheDocument();
      expect(power.getByText("1")).toBeInTheDocument();
      expect(power.getByText(/820 more cups/)).toBeInTheDocument();
      // §10.6 — the 180 cups in the incomplete block do not carry forward.
      expect(power.getByText(/not carried into the next review period/)).toBeInTheDocument();
    });

    it("lists settled months without pretending a PDF exists", async () => {
      await renderDashboard();
      const july = within(screen.getByTestId("statement-2026-07"));

      expect(july.getByText("July 2026")).toBeInTheDocument();
      expect(july.getByText(/settled 11 August 2026/)).toBeInTheDocument();
      expect(july.getByText("₹5,870")).toBeInTheDocument();
      expect(july.getByText("PDF not yet issued")).toBeInTheDocument();
    });

    it("shows the paid deposit with its receipt, and no banner", async () => {
      await renderDashboard();
      const deposit = within(screen.getByTestId("card-deposit"));

      expect(deposit.getByText("₹50,000")).toBeInTheDocument();
      expect(deposit.getByText("MBP-DEP-0142")).toBeInTheDocument();
      expect(deposit.getByText("UPI")).toBeInTheDocument();
      expect(screen.queryByTestId("deposit-banner")).toBeNull();
    });
  });

  describe("states the demo gym is not in", () => {
    it("carries a persistent banner and a payment link while the deposit is outstanding", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        deposit: {
          status: "deferred",
          receipt: null,
          paymentUrl: "https://rzp.io/i/deferred-deposit",
        },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const banner = within(screen.getByTestId("deposit-banner"));

      // A gym that deferred at step 4 is live and trading with a receivable against
      // it. That must not be discoverable only by scrolling.
      expect(banner.getByText(/still outstanding/)).toBeInTheDocument();
      expect(banner.getByTestId("link-deposit-payment")).toHaveAttribute(
        "href",
        "https://rzp.io/i/deferred-deposit",
      );
      expect(screen.queryByTestId("card-deposit")).toBeNull();
    });

    it("shows both rates in the month the milestone splits", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        // ₹4,89,200 of net profit banked, so at ₹65 a cup ₹5,00,000 falls 167 cups
        // into a 400-cup month.
        opening: {
          openingPaidCups: 7_500,
          openingGrossExTaxInr: 9_00_000,
          openingNetProfitInr: 4_89_200,
        },
        currentPeriod: {
          period: "2026-08",
          paidCups: 400,
          grossExTaxInr: 48_000,
          directVariableCostsInr: 22_000,
          adRevenueExTaxInr: 0,
        },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const profit = within(screen.getByTestId("card-profit"));

      // The one month per gym where a single rate is wrong. If the split is silent,
      // the gym sees 50% on the card and a payout that is not 50% of net profit.
      expect(profit.getByTestId("split-note")).toBeInTheDocument();
      expect(profit.getByText(/20% on the first 167 cups/)).toBeInTheDocument();
      expect(profit.getByText(/an effective 37.5%/)).toBeInTheDocument();
      // Twice: as the headline payout and as the shake share, which are equal here
      // because this month has no advertising revenue.
      expect(within(screen.getByTestId("card-payout")).getAllByText("₹9,744")).toHaveLength(2);
    });

    it("says a machine is not yet installed rather than showing a blank", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        machine: {
          ...snapshot.machine,
          status: "allocated",
          serialNumber: null,
          installationDate: null,
          lastServiceAt: null,
        },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const machine = within(screen.getByTestId("card-machine"));

      expect(machine.getByText("Allocated to you")).toBeInTheDocument();
      expect(machine.getByText("Not yet allocated")).toBeInTheDocument();
      expect(machine.getByText("Pending")).toBeInTheDocument();
    });
  });

  it("signs out and returns to the login page", async () => {
    mockGetSession.mockResolvedValue(signedIn);
    mockSignOut.mockResolvedValue({ error: null });
    render(<GymDashboard />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByTestId("button-signout"));
    await user.click(screen.getByTestId("button-signout"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/gym/login");
    });
  });
});
