import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

/**
 * Mocked at the session seam rather than at Supabase.
 *
 * The dashboard asks `@/lib/gymSession` who is signed in and no longer knows or cares
 * whether the answer came from a Supabase token or an `HttpOnly` cookie from
 * `api.muscleboxpro.com`. Mocking the seam keeps these tests true of both.
 */
const { mockFetchSession, mockSignOut } = vi.hoisted(() => ({
  mockFetchSession: vi.fn(),
  mockSignOut: vi.fn(),
}));
vi.mock("@/lib/gymSession", () => ({
  GYM_SESSION_QUERY_KEY: ["gym-session"],
  fetchGymSession: mockFetchSession,
  signOutOfPortal: mockSignOut,
}));

const { mockRemoveQueries } = vi.hoisted(() => ({ mockRemoveQueries: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    removeQueries: mockRemoveQueries,
  },
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

/**
 * Lets a test replace the reporting call for the failure and in-flight paths, while
 * every other test keeps the real one — which reads the fixture above and, importantly,
 * validates it. Two different things are worth proving: that a *thrown* fetch reaches
 * the error state, and that a fetch which succeeds but returns a malformed snapshot
 * reaches the same place. Only the second needs the real function.
 */
const { portalOverride } = vi.hoisted(() => ({
  portalOverride: { value: null as null | (() => Promise<never>) },
}));
vi.mock("@/lib/gymPortalApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gymPortalApi")>();
  return {
    ...actual,
    fetchGymPortalSnapshot: () =>
      portalOverride.value ? portalOverride.value() : actual.fetchGymPortalSnapshot(),
  };
});

import GymDashboard from "@/pages/gym/GymDashboard";
import { GYM_PORTAL_QUERY_KEY, GymPortalRequestError } from "@/lib/gymPortalApi";
import type { GymPortalSnapshot, Statement } from "@shared/gym/portal";

/** The real fixture, unaffected by whatever a test has set. */
async function realSnapshot(): Promise<GymPortalSnapshot> {
  const actual = await vi.importActual<typeof import("@shared/gym/fixtures")>(
    "@shared/gym/fixtures",
  );
  return actual.DEMO_GYM_PORTAL;
}

/** The fixture's statement list, out from behind its `PortalSection` wrapper. */
function statementsOf(snapshot: GymPortalSnapshot): Statement[] {
  if (!snapshot.statements.available) throw new Error("expected the fixture to report statements");
  return snapshot.statements.data;
}

/**
 * The four reporting sections, all marked absent for the reason the endpoint gives today.
 *
 * Spread over a snapshot rather than importing `PARTIAL_GYM_PORTAL`, because
 * `@shared/gym/fixtures` is mocked in this file and only `DEMO_GYM_PORTAL` survives the
 * mock's getter.
 */
const NO_TRADING_DATA = {
  sales: { available: false, reason: "not_implemented" },
  adRevenue: { available: false, reason: "not_implemented" },
  electricity: { available: false, reason: "not_implemented" },
  statements: { available: false, reason: "not_implemented" },
} as const satisfies Partial<GymPortalSnapshot>;

/**
 * The figures now arrive through a query, so the component needs a provider.
 *
 * A **fresh** `QueryClient` per render, not the app's: the app's sets
 * `staleTime: Infinity`, so a shared client would serve the first test's snapshot to
 * every later one and the `snapshotOverride` tests would silently assert against the
 * default fixture.
 *
 * `retry: false` no longer takes effect — the component sets its own `retry` predicate, so it
 * can decline to retry a rejected session, and a `useQuery` option beats a default. Hence
 * `retryDelay: 0`: without it the failure tests sit through exponential backoff.
 */
function renderPortal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GymDashboard />
    </QueryClientProvider>,
  );
}

/** Renders with a session and waits for the cards. */
async function renderDashboard() {
  mockFetchSession.mockResolvedValue(signedIn);
  renderPortal();
  await waitFor(() => screen.getByTestId("card-payout"));
}

const signedIn = {
  email: "owner@yourgym.com",
  gymId: "gym_iron_temple",
  role: "owner",
  gymStatus: "trading",
};

describe("GymDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    snapshotOverride.value = undefined;
    portalOverride.value = null;
    // Deliberately not `restoreAllMocks`: the `next/navigation` mock is a `vi.fn` with
    // its implementation supplied at construction, and `mockRestore` would wipe it and
    // leave `useRouter()` returning undefined for every later test. Spies are scoped to
    // the test that creates them instead.
  });

  it("sends signed-out visitors to the gym login page", async () => {
    mockFetchSession.mockResolvedValue(null);
    renderPortal();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/gym/login");
    });
  });

  it("shows the signed-in email once a session resolves", async () => {
    mockFetchSession.mockResolvedValue(signedIn);
    renderPortal();

    await waitFor(() => {
      expect(screen.getByText("owner@yourgym.com")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the six partner metric cards", async () => {
    mockFetchSession.mockResolvedValue(signedIn);
    renderPortal();

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
    mockFetchSession.mockResolvedValue(signedIn);
    renderPortal();

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
        sales: {
          available: true,
          data: {
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
            },
          },
        },
        adRevenue: { available: true, data: { period: "2026-08", revenueExTaxInr: 0 } },
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

  /**
   * `GET /gym/portal` ships partial — cups, advertising revenue, electricity readings and
   * settled statements are four separate feeds and none of them exists yet (`mbp-backend`
   * `docs/gym-onboarding-api-design.md` §2.6, gated on §9.4).
   *
   * Everything below is one assertion in four costumes: **a section with no data must not
   * render as zero.** A gym shown ₹0 settled concludes it earned nothing and believes that
   * number long before it suspects the page — which is the same failure the error state was
   * written to avoid, except this one happens on a working dashboard.
   */
  describe("when the reporting pipeline has nothing to report", () => {
    it("shows every card and not a single rupee figure", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderDashboard();

      // The cards stay, with their headings, so a gym learns the figures are coming
      // rather than never discovering the feature exists.
      for (const testId of ["card-cups", "card-revenue", "card-profit", "card-payout"]) {
        expect(
          within(screen.getByTestId(testId)).getByTestId(`${testId}-unavailable`),
        ).toBeInTheDocument();
      }
      expect(screen.getByTestId("card-advertising-unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("card-electricity-unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("statements-unavailable")).toBeInTheDocument();

      // The whole point. Not ₹0, not "—", not an empty card.
      expect(screen.queryByText("₹0")).toBeNull();
      expect(screen.queryByText("0")).toBeNull();
      expect(screen.getAllByText(/not available yet/i).length).toBeGreaterThan(0);
      // And it is our doing, not theirs.
      expect(
        screen.getAllByText(/nothing you are owed depends on it/i).length,
      ).toBeGreaterThan(0);
    });

    it("still shows the machine, the deposit and the signed agreement", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderDashboard();

      // The reason the endpoint ships partial rather than not at all: these three come
      // from our own table and are exactly what a gym signs in to check.
      // "Installed and trading" is the label for the backend's `installed`. It read
      // "Trading" while the frontend had a `trading` status of its own invention.
      expect(
        within(screen.getByTestId("card-machine")).getByText("Installed and trading"),
      ).toBeInTheDocument();
      expect(within(screen.getByTestId("card-deposit")).getByText("₹50,000")).toBeInTheDocument();
      expect(screen.getByTestId("agreement-summary")).toBeInTheDocument();
    });

    it("claims nothing about a month it cannot name", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderDashboard();

      // "August so far — provisional, settles by the 15th" is a statement about a trading
      // month, and there is no trading month.
      const asOf = screen.getByTestId("as-of");
      expect(asOf).toHaveTextContent(/as at 22 August 2026/);
      expect(asOf).not.toHaveTextContent(/provisional/);
      expect(screen.queryByText(/figures shown here before the 15th/i)).toBeNull();
    });

    it("distinguishes a machine that has not started from a feed we have not built", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        // The state a real gym is in the day it signs: the pipeline works, and this gym
        // has genuinely sold nothing yet. Telling it "we are still building this" would
        // be false, and telling it "₹0" would be true but unreadable as such.
        sales: { available: false, reason: "no_data_yet" },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const cups = within(screen.getByTestId("card-cups"));

      expect(cups.getByText(/once your machine is installed and trading/i)).toBeInTheDocument();
      expect(cups.queryByText(/still building/i)).toBeNull();
    });

    it("says a payout excludes advertising rather than quietly understating it", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        // Cups work, the ad network does not — the order these two feeds will actually
        // arrive in, and the reason they are separate sections.
        adRevenue: { available: false, reason: "not_implemented" },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const payout = within(screen.getByTestId("card-payout"));

      // ₹3,380 of shake share, with the ₹800 advertising share absent from both the
      // headline and the rows — so the headline has to say what it is.
      expect(payout.getAllByText("₹3,380")).toHaveLength(2);
      expect(payout.queryByText("₹4,180")).toBeNull();
      expect(payout.queryByText("₹800")).toBeNull();
      expect(payout.getByTestId("payout-excludes-advertising")).toBeInTheDocument();
      expect(screen.getByTestId("card-advertising-unavailable")).toBeInTheDocument();
    });

    it("keeps the cup figures when only the electricity readings are missing", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        electricity: { available: false, reason: "not_implemented" },
      } satisfies GymPortalSnapshot;

      await renderDashboard();

      // One absent feed must not take the others down with it. Before the sections were
      // separate, the dashboard's single guard sent the whole page to its error state.
      expect(within(screen.getByTestId("card-cups")).getByText("260")).toBeInTheDocument();
      expect(screen.getByTestId("card-electricity-unavailable")).toBeInTheDocument();
      expect(screen.queryByTestId("portal-error")).toBeNull();
    });
  });

  /**
   * The figures arrive over a network in build item 11. These are the two states that
   * did not exist while the fixture was returned synchronously, and both of them are
   * about not lying: an in-flight page must not look empty, and a failed one must not
   * look like a bad month.
   */
  describe("while the figures are loading or unavailable", () => {
    it("shows placeholders in the shape of the cards, not an empty page", async () => {
      mockFetchSession.mockResolvedValue(signedIn);
      // A fetch that never settles — the only reliable way to hold the pending state,
      // since the seam resolves instantly under test.
      portalOverride.value = () => new Promise<never>(() => {});
      renderPortal();

      await waitFor(() => screen.getByTestId("portal-loading"));
      expect(screen.getByTestId("portal-loading")).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByTestId("card-payout")).toBeNull();
      expect(screen.queryByTestId("portal-error")).toBeNull();
      // The frame stays, so there is still a way out of the page.
      expect(screen.getByTestId("button-signout")).toBeInTheDocument();
    });

    it("says the figures are unavailable rather than showing zeros", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchSession.mockResolvedValue(signedIn);
      portalOverride.value = () => Promise.reject(new Error("reporting endpoint down"));
      renderPortal();

      await waitFor(() => screen.getByTestId("portal-error"));

      // The point of the state. `compute.ts` clamps a bad input to ₹0, which is right
      // as a guard and wrong as an answer: a gym owed ₹5,870 and shown ₹0 will believe
      // the number long before it suspects the page.
      expect(screen.queryByText("₹0")).toBeNull();
      expect(screen.queryByTestId("card-payout")).toBeNull();
      expect(screen.queryByTestId("as-of")).toBeNull();
      expect(screen.getByText(/still trading and every cup is still counted/i)).toBeInTheDocument();
      // Nothing about our field names, exceptions or endpoints on a gym owner's screen.
      expect(screen.queryByText(/reporting endpoint down/)).toBeNull();
      // It does go to the console, which is where we need it.
      expect(consoleError).toHaveBeenCalled();
      expect(screen.getByTestId("button-signout")).toBeInTheDocument();
      consoleError.mockRestore();
    });

    it("treats a response that fails validation exactly like a failed one", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const snapshot = await realSnapshot();
      // The seam succeeds — it is the *contents* that are unrenderable. A 32-character
      // digest and a `javascript:` link are the two things the boundary schema exists
      // for, and neither must reach a card.
      snapshotOverride.value = {
        ...snapshot,
        agreement: { version: "2.2", signedAt: "2026-04-27T11:42:00.000Z", contentHash: "a".repeat(32) },
        statements: {
          available: true,
          data: [{ ...statementsOf(snapshot)[0], documentUrl: "javascript:alert(1)" }],
        },
      } satisfies GymPortalSnapshot;
      mockFetchSession.mockResolvedValue(signedIn);
      renderPortal();

      await waitFor(() => screen.getByTestId("portal-error"));
      expect(screen.queryByTestId("card-payout")).toBeNull();
      consoleError.mockRestore();
    });

    it("recovers when a retry succeeds", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchSession.mockResolvedValue(signedIn);
      portalOverride.value = () => Promise.reject(new Error("transient"));
      renderPortal();
      const user = userEvent.setup();

      await waitFor(() => screen.getByTestId("portal-error"));

      // A retry button that cannot actually recover the page is decoration.
      portalOverride.value = null;
      await user.click(screen.getByTestId("button-retry-snapshot"));

      await waitFor(() => screen.getByTestId("card-payout"));
      expect(screen.queryByTestId("portal-error")).toBeNull();
      consoleError.mockRestore();
    });
  });

  describe("signing out", () => {
    it("calls the server and returns to the login page", async () => {
      // The call matters as much as the redirect: only the server can expire an `HttpOnly`
      // cookie, so a sign-out that merely navigated away would leave the session live for
      // its full 12 hours on what is very often a shared gym office machine.
      mockFetchSession.mockResolvedValue(signedIn);
      mockSignOut.mockResolvedValue(undefined);
      renderPortal();
      const user = userEvent.setup();

      await waitFor(() => screen.getByTestId("button-signout"));
      await user.click(screen.getByTestId("button-signout"));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/gym/login");
      });
    });

    it("drops this gym's figures from the cache rather than refetching them", async () => {
      // `removeQueries`, not `invalidateQueries`. The cached snapshot is one gym's revenue
      // and payout; invalidating leaves it in place and schedules a refetch, so on a shared
      // machine the next gym to sign in can see the previous one's numbers in the window
      // before their own arrive.
      mockFetchSession.mockResolvedValue(signedIn);
      mockSignOut.mockResolvedValue(undefined);
      renderPortal();
      const user = userEvent.setup();

      await waitFor(() => screen.getByTestId("button-signout"));
      await user.click(screen.getByTestId("button-signout"));

      await waitFor(() => {
        expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: GYM_PORTAL_QUERY_KEY });
      });
      expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ["gym-session"] });
    });
  });

  /**
   * The session ending *after* the guard let us through — a 12 hour cookie expiring on a tab
   * left open overnight, or an admin revoking the account. Without this the gym lands on the
   * amber "this is a problem at our end" panel and presses Try again forever, which is both
   * the wrong explanation and an unactionable one.
   */
  describe("a session that ends mid-session", () => {
    it("sends a rejected request back to the login page", async () => {
      mockFetchSession.mockResolvedValue(signedIn);
      portalOverride.value = () =>
        Promise.reject(new GymPortalRequestError("expired_token", "Your session has expired."));
      renderPortal();

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/gym/login");
      });
      expect(screen.queryByTestId("portal-error")).toBeNull();
    });

    it("does not sign anyone out over a dropped connection", async () => {
      // The distinction this whole branch turns on. A `network` failure is transient and the
      // session behind it is fine; treating it as an expiry would sign a gym out of a live
      // session every time their gym's wifi hiccuped.
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchSession.mockResolvedValue(signedIn);
      portalOverride.value = () =>
        Promise.reject(new GymPortalRequestError("network", "We couldn't reach us just now."));
      renderPortal();

      await waitFor(() => screen.getByTestId("portal-error"));
      expect(mockReplace).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
