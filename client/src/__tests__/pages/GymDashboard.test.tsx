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

/**
 * The payout account is mocked here even though the seam already answers under test, because
 * the seam answers from module state: one test removing the account would decide what every
 * later test in this file sees. `payoutOverride` is the account on file, and null is a gym
 * that has not given us one.
 */
const { payoutOverride, mockFetchPayoutAccount } = vi.hoisted(() => ({
  payoutOverride: { value: null as unknown },
  mockFetchPayoutAccount: vi.fn(),
}));
vi.mock("@/lib/gymPayoutAccountApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gymPayoutAccountApi")>();
  return { ...actual, fetchPayoutAccount: mockFetchPayoutAccount };
});

import GymDashboard from "@/pages/gym/GymDashboard";
import { GYM_PORTAL_QUERY_KEY, GymPortalRequestError } from "@/lib/gymPortalApi";
import { GYM_PAYOUT_ACCOUNT_QUERY_KEY } from "@/lib/gymPayoutAccountApi";
import type { GymPortalSnapshot, Statement } from "@shared/gym/portal";
import type { PayoutAccount } from "@shared/gym/payoutAccount";

/** An account on file, which is the state most of this file's tests are indifferent to. */
const PAYOUT_ACCOUNT: PayoutAccount = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumberLast4: "4417",
  ifsc: "HDFC0001234",
  bankName: "HDFC Bank",
  accountType: "current",
  updatedAt: "2026-04-29T10:05:00.000Z",
};

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
/** The six figure cards, in the order they appear, for the states where none can be filled. */
const ABSENT_FIGURE_CARDS = [
  "card-cups",
  "card-revenue",
  "card-profit",
  "card-payout",
  "card-advertising",
  "card-electricity",
] as const;

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
function renderPortal({ cachedSession }: { cachedSession?: unknown } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  // What `GymLogin` leaves behind when it navigates here, which is the difference between
  // rendering the portal on the first frame and gating it on a round trip.
  if (cachedSession !== undefined) client.setQueryData(["gym-session"], cachedSession);
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

/**
 * Renders and switches to the account tab.
 *
 * The machine record, the statements and the deposit are a tab rather than a second band
 * of the same page, so anything asserting on them has to open it — which is also the
 * assertion that the tab works. `getByTestId("card-machine")` failing without this is the
 * intended behaviour: the panel is unmounted, not hidden.
 */
async function renderAccountTab() {
  const user = userEvent.setup();
  await renderDashboard();
  await user.click(screen.getByTestId("tab-account"));
  await waitFor(() => screen.getByTestId("card-machine"));
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
    payoutOverride.value = PAYOUT_ACCOUNT;
    mockFetchPayoutAccount.mockImplementation(async () => payoutOverride.value);
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

  /**
   * Two waits for one click was the bug: the login route answered with the session, the
   * dashboard threw that answer away and asked again, and the gym read "Loading your
   * portal..." for the length of a round trip before the figures request had even started.
   */
  it("renders the portal at once when signing in already answered who is signed in", async () => {
    // Never settles, so the only session in play is the one the login page left in the cache.
    mockFetchSession.mockReturnValue(new Promise(() => {}));
    renderPortal({ cachedSession: signedIn });

    // Synchronous on purpose: nothing is awaited before these hold.
    expect(screen.getByText("owner@yourgym.com")).toBeInTheDocument();
    expect(screen.queryByText(/loading your portal/i)).toBeNull();
    // And the figures request went out with the first frame rather than after the session.
    expect(screen.getByTestId("portal-loading")).toBeInTheDocument();
    await waitFor(() => screen.getByTestId("card-payout"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("waits for the session on a cold entry, which is the only place that gate belongs", async () => {
    // A bookmark or a refresh has nothing cached, and there is no email to put in the header
    // and no meaningful Sign out until we know there is a session at all.
    mockFetchSession.mockReturnValue(new Promise(() => {}));
    renderPortal();

    expect(screen.getByText(/loading your portal/i)).toBeInTheDocument();
    expect(screen.queryByTestId("button-signout")).toBeNull();
  });

  it("opens on the six figure cards, with the account record put away", async () => {
    mockFetchSession.mockResolvedValue(signedIn);
    renderPortal();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /cups sold/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /revenue collected/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /net profit/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your payout/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /advertising share/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /electricity reimbursement/i })).toBeInTheDocument();

    // The serial number, the agreement hash and the deposit receipt are looked up twice a
    // year and took up half the screen every day doing it. Not merely below the fold now:
    // the panel is not mounted at all.
    expect(screen.queryByTestId("card-machine")).toBeNull();
    expect(screen.queryByTestId("card-statements")).toBeNull();
    expect(screen.queryByTestId("card-deposit")).toBeNull();
  });

  it("shows the account record when its tab is chosen", async () => {
    await renderAccountTab();

    expect(screen.getByRole("heading", { name: /your machine/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /statements & agreement/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /security deposit/i })).toBeInTheDocument();
    // And the figures step aside rather than both panels being on screen at once.
    expect(screen.queryByTestId("card-payout")).toBeNull();
  });

  /**
   * Where the bank account sits, and how a gym without one is told.
   *
   * A tab away is right for details a gym changes when it changes banks, and wrong for a gym
   * that has never given us any: that gym cannot be paid and will not go looking. So the
   * prompt is on the tab the dashboard opens on, and it opens the form rather than merely
   * pointing at the tab that holds it.
   */
  describe("the bank account we transfer the payout to", () => {
    it("lives with the account record rather than among the figures", async () => {
      await renderDashboard();
      expect(screen.queryByTestId("card-payout-account")).toBeNull();

      await userEvent.setup().click(screen.getByTestId("tab-account"));

      await waitFor(() => screen.getByTestId("card-payout-account"));
      expect(
        within(screen.getByTestId("card-payout-account")).getByText("••••4417"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("payout-account-prompt")).toBeNull();
    });

    it("asks for one on the tab the dashboard opens on when there is none", async () => {
      payoutOverride.value = null;
      await renderDashboard();

      // Behind a tab this says nothing to the gym it is written for, since a gym that has
      // never entered bank details has no reason to open the account record looking for them.
      await waitFor(() => screen.getByTestId("payout-account-prompt"));
      expect(
        screen.getByText(/add a bank account so we can transfer your payout/i),
      ).toBeInTheDocument();
    });

    it("says nothing until the answer arrives", async () => {
      // A prompt that appears while the request is in flight tells a gym that has given us an
      // account that we have lost it.
      mockFetchPayoutAccount.mockReturnValue(new Promise(() => {}));
      await renderDashboard();

      expect(screen.queryByTestId("payout-account-prompt")).toBeNull();
    });

    it("opens the form itself rather than leaving the gym to find the card", async () => {
      payoutOverride.value = null;
      await renderDashboard();
      const user = userEvent.setup();

      await waitFor(() => screen.getByTestId("payout-account-prompt"));
      await user.click(screen.getByTestId("button-prompt-add-payout-account"));

      // One click: the tab changes and the form is up.
      await waitFor(() => screen.getByTestId("input-account-number"));
      expect(screen.getByTestId("card-payout-account")).toBeInTheDocument();
      expect(screen.queryByTestId("card-payout")).toBeNull();
    });
  });

  /**
   * `asOf` is stamped when the handler composes the response, so it is always moments old
   * and says nothing about the age of the figures inside it. `dataSyncedAt` is the reading
   * of the machine, which is the staleness a gym can actually be misled by, so the header
   * prefers it and changes its wording when it has it.
   */
  it("dates the figures by the machine sync, to the minute and in IST", async () => {
    await renderDashboard();
    const stamp = screen.getByTestId("as-of");

    // 06:15Z, which is 11:45 in Kolkata. A UTC render would say 06:15 am and be an hour
    // and a half out of the working day it describes.
    expect(stamp).toHaveTextContent(/Machine data synced/);
    expect(stamp).toHaveTextContent(/22 Aug 2026, 11:45 am IST/);
  });

  it("says only that the response is new when no machine sync is reported", async () => {
    const snapshot = await realSnapshot();
    snapshotOverride.value = { ...snapshot, dataSyncedAt: null } satisfies GymPortalSnapshot;

    await renderDashboard();
    const stamp = screen.getByTestId("as-of");

    // "Updated" is the strongest honest word for a timestamp that only proves the server
    // answered. Claiming a sync we were not told about is the failure to avoid.
    expect(stamp).toHaveTextContent(/Updated 22 Aug 2026, 12:00 pm IST/);
    expect(stamp).not.toHaveTextContent(/synced/i);
  });

  // §8.3 of the agreement makes the monthly statement the amount actually owed.
  it("states that pre-settlement figures are provisional", async () => {
    mockFetchSession.mockResolvedValue(signedIn);
    renderPortal();

    await waitFor(() => {
      expect(
        screen.getByText(/provisional until your monthly statement/i),
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
        cups.getByText(/Tracking ₹5,00,000 of net profit/),
      ).toBeInTheDocument();
    });

    it("keeps advertising at its own ratio and out of net profit", async () => {
      await renderDashboard();
      const ads = within(screen.getByTestId("card-advertising"));

      expect(ads.getByText("₹800")).toBeInTheDocument();
      expect(ads.getByText("₹4,000")).toBeInTheDocument();
      // §9.4 — stated on the card, because a gym that steps up to 50% on shakes will
      // otherwise read a 20% advertising share as a mistake.
      expect(ads.getByText(/80:20 for the whole term/)).toBeInTheDocument();
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
      expect(power.getByText(/Part-blocks do not carry past 30 September 2026/)).toBeInTheDocument();
    });

    it("lists settled months without pretending a PDF exists", async () => {
      await renderAccountTab();
      const july = within(screen.getByTestId("statement-2026-07"));

      expect(july.getByText("July 2026")).toBeInTheDocument();
      expect(july.getByText(/settled 11 August 2026/)).toBeInTheDocument();
      expect(july.getByText("₹5,870")).toBeInTheDocument();
      expect(july.getByText("PDF not yet issued")).toBeInTheDocument();
    });

    it("shows the paid deposit with its receipt, and no banner", async () => {
      await renderAccountTab();
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

      // A gym that deferred at step 4 is live and trading with a receivable against it.
      // That must not be discoverable only by scrolling — and now that the deposit card
      // lives behind a tab, not by opening one either. The banner sits above both.
      expect(banner.getByText(/still outstanding/)).toBeInTheDocument();
      expect(banner.getByTestId("link-deposit-payment")).toHaveAttribute(
        "href",
        "https://rzp.io/i/deferred-deposit",
      );

      // And no receipt card in the account tab, because there is no receipt.
      await userEvent.setup().click(screen.getByTestId("tab-account"));
      await waitFor(() => screen.getByTestId("card-machine"));
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

      await renderAccountTab();
      const machine = within(screen.getByTestId("card-machine"));

      // "Awaiting installation", not the backend's "allocated". Allocation is our word for
      // a warehouse fact; what the gym needs to know is that the unit is not in yet, which
      // is also why every figure on the page is empty.
      expect(machine.getByText("Awaiting installation")).toBeInTheDocument();
      expect(machine.getByText("Not yet allocated")).toBeInTheDocument();
      expect(machine.getByText("Pending")).toBeInTheDocument();
      // The same words in the header, where a gym sees them without opening anything.
      expect(screen.getByTestId("machine-status")).toHaveTextContent("Awaiting installation");
    });
  });

  /**
   * `GET /gym/portal` ships partial — cups, advertising revenue, electricity readings and
   * settled statements are four separate feeds and none of them exists yet (`mbp-backend`
   * `docs/gym-onboarding-api-design.md` §2.6, gated on §9.4).
   *
   * Everything below turns on one distinction: **zero is a figure where no cup can have
   * been sold, and a lie where one can.** A trading gym shown ₹0 concludes it earned
   * nothing and believes that number long before it suspects the page — the same failure
   * the error state was written to avoid, except this one happens on a working dashboard.
   * Before installation the opposite holds, and a grid of "not available yet" badges is
   * six evasions of a question whose answer is nought.
   */
  describe("when the reporting pipeline has nothing to report", () => {
    it("refuses to print zero beside a machine that is trading", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderDashboard();

      // The cards stay, with their headings, so a gym learns the figures are coming rather
      // than never discovering the feature exists. This fixture's machine is installed and
      // trading, so each of these has a real non-zero value we are simply not reading yet:
      // a dash, never a nought.
      for (const testId of ABSENT_FIGURE_CARDS) {
        const card = within(screen.getByTestId(`${testId}-unavailable`));
        expect(card.getByText("—")).toBeInTheDocument();
        expect(card.getByText(/not reported here yet/i)).toBeInTheDocument();
      }
      expect(screen.queryByText("₹0")).toBeNull();
      expect(screen.queryByText("0")).toBeNull();
      // And it is our doing, not theirs.
      expect(screen.getByText(/your settled statements are unaffected/i)).toBeInTheDocument();
    });

    it("reads zero across the board before the machine is installed", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        ...NO_TRADING_DATA,
        // The state every gym is in on day one. Nothing has dispensed a cup, so nought is
        // the true figure whatever our feeds are doing, and six cards hedging about
        // reporting we have not built answers a question the gym did not ask.
        machine: {
          ...snapshot.machine,
          status: "allocated",
          serialNumber: null,
          installationDate: null,
          lastServiceAt: null,
        },
      } satisfies GymPortalSnapshot;

      await renderDashboard();

      for (const testId of ABSENT_FIGURE_CARDS) {
        const card = within(screen.getByTestId(`${testId}-unavailable`));
        expect(card.getByText(testId === "card-cups" ? "0" : "₹0")).toBeInTheDocument();
        expect(card.getByText(/awaiting installation/i)).toBeInTheDocument();
      }
      expect(screen.queryByText("—")).toBeNull();
      // Not "we are still building it". Both are true, and only one of them is the gym's
      // answer.
      expect(
        screen.getByText(/figures start on the day your machine is installed/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/not reported here yet/i)).toBeNull();
    });

    it("still shows the machine, the deposit and the signed agreement", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderAccountTab();

      // The reason the endpoint ships partial rather than not at all: these three come
      // from our own table and are exactly what a gym signs in to check.
      // "Installed and trading" is the label for the backend's `installed`. It read
      // "Trading" while the frontend had a `trading` status of its own invention.
      expect(
        within(screen.getByTestId("card-machine")).getByText("Installed and trading"),
      ).toBeInTheDocument();
      expect(within(screen.getByTestId("card-deposit")).getByText("₹50,000")).toBeInTheDocument();
      expect(screen.getByTestId("agreement-summary")).toBeInTheDocument();
      expect(screen.getByTestId("statements-unavailable")).toBeInTheDocument();
    });

    it("claims nothing about a month it cannot name", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = { ...snapshot, ...NO_TRADING_DATA } satisfies GymPortalSnapshot;

      await renderDashboard();

      // "August so far — provisional, settles by the 15th" is a statement about a trading
      // month, and there is no trading month. The timestamp survives, because when the
      // response was read is true either way — but it drops the sync wording, which would
      // claim a reading of figures that are not there.
      expect(screen.queryByTestId("period-note")).toBeNull();
      const asOf = screen.getByTestId("as-of");
      expect(asOf).toHaveTextContent(/Updated 22 Aug 2026, 12:00 pm IST/);
      expect(asOf).not.toHaveTextContent(/provisional/i);
      expect(screen.queryByText(/figures shown here before the 15th/i)).toBeNull();
    });

    it("distinguishes a machine that has not started from a feed we have not built", async () => {
      const snapshot = await realSnapshot();
      snapshotOverride.value = {
        ...snapshot,
        // The pipeline works and this gym has genuinely sold nothing this month. Zero is
        // the answer even though the machine is installed, because the feed is the thing
        // saying so, and "not reported here yet" would be false.
        sales: { available: false, reason: "no_data_yet" },
      } satisfies GymPortalSnapshot;

      await renderDashboard();
      const cups = within(screen.getByTestId("card-cups"));

      expect(cups.getByText("0")).toBeInTheDocument();
      expect(cups.getByText(/none this month/i)).toBeInTheDocument();
      expect(cups.queryByText("—")).toBeNull();
      expect(cups.queryByText(/not reported here yet/i)).toBeNull();
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
      expect(screen.getByText(/every cup is still counted/i)).toBeInTheDocument();
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
      // Same reasoning, and this one names a bank account rather than a figure.
      expect(mockRemoveQueries).toHaveBeenCalledWith({
        queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY,
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
