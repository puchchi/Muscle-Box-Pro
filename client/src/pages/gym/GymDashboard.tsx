"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Cpu,
  Download,
  FileText,
  IndianRupee,
  Info,
  Landmark,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import {
  GYM_PORTAL_QUERY_KEY,
  GymPortalRequestError,
  fetchGymPortalSnapshot,
} from "@/lib/gymPortalApi";
import {
  GYM_SESSION_QUERY_KEY,
  fetchGymSession,
  signOutOfPortal,
} from "@/lib/gymSession";
import { formatInr } from "@shared/partnership/summary";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import type {
  ElectricityWindowPeriod,
  GymPortalSnapshot,
  MachineStatus,
  PortalAbsence,
  Statement,
  TradingFigures,
} from "@shared/gym/portal";
import {
  computeAdvertisingShare,
  computeElectricityWindow,
  computePeriodSettlement,
  type PeriodSettlement,
} from "@shared/settlement/compute";
import {
  GYM_PAYOUT_ACCOUNT_QUERY_KEY,
  fetchPayoutAccount,
} from "@/lib/gymPayoutAccountApi";
import PayoutAccountCard from "./PayoutAccountCard";
import { Card, Row, RowGroup, type CardProps } from "./portalCards";
import { formatIstDate, formatIstDateTime } from "./istDates";

/**
 * The gym's portal.
 *
 * Three rules hold this file together, and each of them is a thing that has gone
 * wrong somewhere before:
 *
 * 1. **No arithmetic in this file.** Every rupee and percentage comes out of
 *    `shared/settlement/compute.ts`, which is tested against §§6–10 directly. A card
 *    that computes its own 20% is a card that keeps paying 20% after the milestone.
 *
 * 2. **No business state from the session.** The old consumer Account page read figures
 *    out of `session.user.user_metadata`, which the account holder can write to — a gym
 *    could edit its own payout percentage (TODO A2). The session is used for two things
 *    here: is this person signed in, and what is their email. Everything with a rupee sign
 *    on it comes from `GET /gym/portal`, which resolves the gym from the session server-side
 *    and is why `fetchGymPortalSnapshot` takes no gym parameter.
 *
 * 3. **Live figures are labelled provisional.** §8.3 makes the monthly statement the
 *    amount actually owed; a gym treating a mid-month number as a debt is a support
 *    conversation nobody wants.
 *
 * 4. **Nothing renders from an unvalidated response.** The figures arrive through
 *    `fetchGymPortalSnapshot`, which parses them against
 *    `shared/gym/portalSchema.ts` first. `compute.ts` clamps its own inputs, but
 *    `statementTotalInr` below adds two endpoint values directly and `formatInr(NaN)`
 *    is the string "₹NaN" — so a bad response has to fail into the error state, not
 *    into a card.
 *
 * 5. **Zero only where zero is a fact.** `GET /gym/portal` ships partial — cups,
 *    advertising revenue, electricity and settled statements are four separate feeds and
 *    none of them exists yet. Each is a `PortalSection`, and where one is absent the card
 *    keeps its heading and `UnavailableCard` decides what may go in the numeral slot:
 *
 *      - Nothing has been installed, or the feed reports no data for this gym: **0**. No
 *        cup can have been sold, so zero is the true figure and not a placeholder.
 *      - The machine is trading and the feed is unbuilt: **a dash**. ₹0 here is the one
 *        output this file must not produce, because a gym reading ₹0 concludes it earned
 *        nothing and will believe that number long before it suspects the page.
 *
 *    The reassurance that goes with an absence — that settled statements are unaffected —
 *    is one line from `ReportingNotice` for the whole page, not a paragraph in each of the
 *    six cards that can be absent at once. Six copies of the same apology is how a working
 *    dashboard comes to look like a broken one.
 *
 * The data source is still a fixture until the reporting endpoint exists (§15 of
 * docs/gym-onboarding.md), but it is reached asynchronously and validated, so the
 * pending and error paths below are the real ones rather than something written on the
 * day the network arrives. Swapping the source is one function body in
 * `@/lib/gymPortalApi`.
 *
 * The whole screen is scoped dark by the `dark` class on `PortalChrome`'s root, so the
 * tokens in `index.css` resolve to their dark values and every shadcn control inside
 * follows. Nothing here hardcodes a surface colour, which is what makes that one class
 * enough.
 *
 * The figures and the account record are two tabs rather than two bands of one long page.
 * The machine's serial, the agreement hash and the deposit receipt are things a gym looks
 * up perhaps twice a year, and while they sat below the figures they took up half the
 * screen every day to do it. Only the selected panel is mounted, so the reference cards
 * are genuinely not rendered rather than merely scrolled past.
 *
 * The one thing on the account tab that is not a record is `PayoutAccountCard`, which
 * writes. Being a tab away is right for a bank account a gym changes when it changes banks
 * and wrong for a gym that has never given us one — so `PayoutAccountPrompt` says so on the
 * tab that is open by default, and its button opens the form rather than merely pointing at
 * the tab that holds it.
 */

/**
 * Did this fail because the session ended, or because something else went wrong?
 *
 * The distinction decides between two completely different screens — a redirect to the login
 * page, or an amber panel insisting the machine is still trading and nothing owed is
 * affected. Showing the second when the first is true is the failure worth avoiding: it tells
 * a gym its figures are broken when its session merely expired.
 *
 * Only the three session codes count. `frozen` and `wrong_step` belong to the onboarding
 * wizard and cannot reach this endpoint; `network` explicitly must not appear here, because a
 * dropped connection would then sign the gym out of a session that is perfectly alive.
 */
function isSessionGone(error: unknown): boolean {
  if (!(error instanceof GymPortalRequestError)) return false;
  return (
    error.code === "invalid_token" ||
    error.code === "expired_token" ||
    error.code === "revoked_token"
  );
}

/**
 * `mbp-backend`'s machine states, in a partner's words.
 *
 * Exhaustive over `MachineStatus`, so a state added on the backend fails the type check
 * here rather than rendering `undefined` in the status row. `replaced` and `removed` read
 * differently on purpose — a replaced unit means there is a working machine on the floor,
 * a removed one means there is not.
 *
 * `allocated` says "Awaiting installation" rather than "Allocated to you". Allocation is
 * our word for a warehouse fact, and a gym reading it learns nothing it can act on; what
 * it actually needs to know is that the unit is not in yet, which is also the answer to
 * why every figure on the page is empty.
 */
const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  allocated: "Awaiting installation",
  installed: "Installed and trading",
  servicing: "Being serviced",
  replaced: "Replaced with a newer unit",
  removed: "Removed",
};

/**
 * The dot beside that label. Exhaustive for the same reason, and colour is never the only
 * carrier: the words are right there next to it.
 */
const MACHINE_STATUS_TONE: Record<MachineStatus, string> = {
  allocated: "bg-amber-400",
  installed: "bg-emerald-400",
  servicing: "bg-amber-400",
  replaced: "bg-emerald-400",
  removed: "bg-rose-400",
};

/**
 * Has this gym's machine ever been able to sell a cup?
 *
 * It decides whether an absent figure may be shown as 0. Before installation every trading
 * figure is genuinely zero, whatever the state of our feeds, so a dashboard of zeros is
 * accurate and reads as one — while for a trading machine the same zero would be a lie.
 * `allocated` is the only status that precedes installation, and the date is checked too
 * because a status can be moved on before the engineer's visit is recorded.
 */
function neverInstalled(machine: GymPortalSnapshot["machine"]): boolean {
  return machine.status === "allocated" || machine.installationDate === null;
}

export default function GymDashboard() {
  const router = useRouter();

  /**
   * Who is signed in, through the cache rather than fetched on arrival.
   *
   * Signing in already answered this, and `GymLogin` writes the answer here before it
   * navigates — so coming from the form the portal renders on the first frame and the
   * figures request starts immediately, instead of a full-page wait for a round trip that
   * repeats what the login response just said. Two waits, one after the other, for one
   * click.
   *
   * A cold entry — a bookmark, a refresh, a link from an email — has nothing cached, and
   * then this is the guard it always was.
   */
  const { data: session, isPending: isCheckingSession } = useQuery({
    queryKey: GYM_SESSION_QUERY_KEY,
    queryFn: fetchGymSession,
  });
  const email = session?.email ?? null;
  const signedOut = !isCheckingSession && !session;

  useEffect(() => {
    if (signedOut) router.replace("/gym/login");
  }, [signedOut, router]);

  async function handleSignOut() {
    // The call goes first and its result is not checked: only the server can expire an
    // `HttpOnly` cookie, and a gym who has pressed Sign out on a shared office machine
    // must leave the screen either way. `removeQueries`, not `invalidateQueries` — the
    // snapshot in the cache is this gym's revenue, and invalidating would leave it sitting
    // there for whoever signs in next while the refetch is in flight.
    await signOutOfPortal();
    queryClient.removeQueries({ queryKey: GYM_PORTAL_QUERY_KEY });
    // For the same reason, and this one names a bank account rather than a figure.
    queryClient.removeQueries({ queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY });
    queryClient.removeQueries({ queryKey: GYM_SESSION_QUERY_KEY });
    router.replace("/gym/login");
  }

  const {
    data: snapshot,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: GYM_PORTAL_QUERY_KEY,
    queryFn: fetchGymPortalSnapshot,
    // Not until we know there is a session. Otherwise every unauthenticated visit
    // fires a reporting call on its way to the login redirect.
    enabled: session != null,
    // A rejected session is not a transient failure, so retrying it three times only
    // delays the redirect below by a few seconds of backoff while the gym reads
    // "we can't show your figures" about something that is really "sign in again".
    retry: (attempt, err) => !isSessionGone(err) && attempt < 2,
  });

  // The guard above proved there was a session; this covers it ending afterwards — a 12
  // hour cookie expiring on a tab left open overnight, or an admin revoking the account.
  // Without it that gym sits on the amber "problem at our end" panel pressing Try again,
  // which is both wrong and unactionable.
  const sessionGone = isError && isSessionGone(error);
  useEffect(() => {
    if (sessionGone) router.replace("/gym/login");
  }, [sessionGone, router]);

  // No chrome here on purpose: there is no session yet, so there is no email to show
  // and no meaningful Sign out. `sessionGone` and `signedOut` share this branch because the
  // redirect they trigger has not landed yet, and the chrome would otherwise flash a
  // signed-in header belonging to nobody.
  //
  // Only a cold entry reaches this. Arriving from the login form, the session is already
  // in the cache and the first thing on screen is the portal itself.
  if (isCheckingSession || signedOut || sessionGone) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your portal...
      </div>
    );
  }

  // Everything from here renders inside the chrome, including the failures. A gym whose
  // figures will not load must still be able to sign out — a bare error page that
  // strips the header is a page you can only leave with the back button.
  if (isPending) {
    return (
      <PortalChrome email={email} onSignOut={handleSignOut}>
        <PortalLoading />
      </PortalChrome>
    );
  }

  if (isError || !snapshot) {
    return (
      <PortalChrome email={email} onSignOut={handleSignOut}>
        <PortalError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </PortalChrome>
    );
  }

  return (
    <PortalChrome email={email} onSignOut={handleSignOut}>
      <PortalContent snapshot={snapshot} />
    </PortalChrome>
  );
}

/**
 * The loaded dashboard.
 *
 * Its own component so that every `useMemo` below runs against a snapshot that exists.
 * Hooks cannot be conditional, so while these lived in `GymDashboard` they each had to
 * take an optional snapshot and return null, and the loaded branch then had to re-check
 * for a null that could not happen. With four reporting sections that can each be absent
 * that pattern stops being merely awkward — an unreachable null and a legitimately absent
 * section would be indistinguishable at the point where the copy is chosen, which is
 * exactly the distinction this screen exists to keep.
 */
function PortalContent({ snapshot }: { snapshot: GymPortalSnapshot }) {
  const { terms, sales, adRevenue, electricity, statements } = snapshot;

  // Whether an absent figure may read 0 — see `neverInstalled`.
  const preInstall = neverInstalled(snapshot.machine);

  /**
   * Controlled, so `PayoutAccountPrompt` can bring the tab that holds the form into view
   * and open it in the same click. `defaultValue` cannot be told to change.
   */
  const [tab, setTab] = useState("figures");
  const [addingPayoutAccount, setAddingPayoutAccount] = useState(false);

  /**
   * The same query the card runs, sharing one cache entry, and here only to decide whether
   * to prompt for an account at all.
   *
   * A gym with no account on file has to be told on the tab it actually looks at: the card
   * is one tab away, and a bank account nobody is asked for is a payout that cannot be
   * transferred on settlement day.
   */
  const payoutAccount = useQuery({
    queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY,
    queryFn: fetchPayoutAccount,
  });
  // Only on a settled answer. Prompting while the request is in flight would flash a banner
  // at every gym that has one, and prompting on a failure would claim something we do not know.
  const needsPayoutAccount = payoutAccount.isSuccess && payoutAccount.data === null;

  // One notice for the whole page, so `UnavailableCard` can stay a caption.
  const anythingUnbuilt =
    (!sales.available && sales.reason === "not_implemented") ||
    (!adRevenue.available && adRevenue.reason === "not_implemented") ||
    (!electricity.available && electricity.reason === "not_implemented") ||
    (!statements.available && statements.reason === "not_implemented");

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            {snapshot.gymDisplayName}
          </h1>
          {/* Only when there is a trading month to name. With the feeds absent this said
              "Your account as at ...", which is a sentence about nothing — the freshness
              stamp beside the tabs already carries the timestamp. */}
          {sales.available && (
            <p
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
              data-testid="period-note"
            >
              {monthName(sales.data.currentPeriod.period)} so far. Provisional, settles by the{" "}
              {terms.settlementDaysAfterMonthEnd}th of next month.
            </p>
          )}
        </div>
        <MachineStatusPill status={snapshot.machine.status} />
      </div>

      {snapshot.deposit.status !== "paid" && <DepositBanner snapshot={snapshot} />}

      {needsPayoutAccount && (
        <PayoutAccountPrompt
          onAdd={() => {
            setTab("account");
            setAddingPayoutAccount(true);
          }}
        />
      )}

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="h-auto rounded-xl border border-border bg-card p-1 text-muted-foreground">
            <TabsTrigger
              value="figures"
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold ring-offset-background data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              data-testid="tab-figures"
            >
              Figures
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold ring-offset-background data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              data-testid="tab-account"
            >
              Your account
            </TabsTrigger>
          </TabsList>
          <LastUpdated snapshot={snapshot} />
        </div>

        <TabsContent value="figures" className="mt-6">
          {/* One grid, not a four-up band and a two-up band: advertising and electricity are
              money the gym is owed on the same terms as the rest, and a card twice the width
              of its neighbours is a card that is mostly empty. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sales.available ? (
              <TradingCards
                trading={sales.data}
                terms={terms}
                adRevenue={adRevenue}
                statements={statements}
              />
            ) : (
              <TradingCardsUnavailable reason={sales.reason} preInstall={preInstall} />
            )}

            {adRevenue.available ? (
              <AdvertisingCard terms={terms} revenueExTaxInr={adRevenue.data.revenueExTaxInr} />
            ) : (
              <UnavailableCard
                icon={Megaphone}
                label="Advertising share"
                testId="card-advertising"
                reason={adRevenue.reason}
                preInstall={preInstall}
                zero={formatInr(0)}
              />
            )}

            {electricity.available ? (
              <ElectricityCard reviewPeriod={electricity.data} terms={terms} />
            ) : (
              <UnavailableCard
                icon={Zap}
                label="Electricity reimbursement"
                testId="card-electricity"
                reason={electricity.reason}
                preInstall={preInstall}
                zero={formatInr(0)}
              />
            )}
          </div>

          {anythingUnbuilt && <ReportingNotice preInstall={preInstall} />}

          {sales.available && (
            <p className="mt-6 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
              Provisional until your monthly statement, which is the settled amount and is issued
              within {terms.settlementDaysAfterMonthEnd} days of month-end. Costs are one total
              because your share is calculated on net profit.
            </p>
          )}
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* First, because it is the only card here a gym ever has to act on. The other
                three are a record it reads. */}
            <PayoutAccountCard
              formOpen={addingPayoutAccount}
              onFormOpenChange={setAddingPayoutAccount}
            />
            <MachineCard machine={snapshot.machine} />
            <StatementsCard statements={statements} agreement={snapshot.agreement} />
            {snapshot.deposit.status === "paid" && <DepositCard snapshot={snapshot} />}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

/**
 * How old the figures are, in one line.
 *
 * Two different claims, and which one is true depends on what the endpoint sent, so the
 * copy changes with it rather than picking the friendlier wording:
 *
 *   - `dataSyncedAt` — when our records last read the machine. This is the number that
 *     answers "is this cup count current?", and the only one a gym can be misled by.
 *   - `asOf` — when the response was composed. Always moments ago, so it says nothing
 *     about the figures' age. It is the fallback because it is what the endpoint has
 *     today, and "Updated" is the strongest honest word for it.
 *
 * The sync line is withheld when the trading feeds are absent: a sync timestamp beside no
 * figures describes a reading of nothing.
 */
function LastUpdated({ snapshot }: { snapshot: GymPortalSnapshot }) {
  const syncedAt = snapshot.sales.available ? snapshot.dataSyncedAt : null;

  return (
    <p
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground"
      data-testid="as-of"
    >
      <RefreshCw className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" aria-hidden="true" />
      {syncedAt ? (
        <>
          <span className="text-muted-foreground">Machine data synced</span>{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatIstDateTime(syncedAt)} IST
          </span>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">Updated</span>{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatIstDateTime(snapshot.asOf)} IST
          </span>
        </>
      )}
    </p>
  );
}

/**
 * The four cards derived from one period's trading: cups, revenue, profit and payout.
 *
 * Grouped because they share one `computePeriodSettlement` call and are absent or present
 * together — cups, gross and direct costs arrive as a single feed, and none of these four
 * figures can be stated without all three. Advertising is *not* in that set, which is why
 * it is a separate section and a separate card: it has its own feed and its own permanent
 * ratio (§9.4).
 */
function TradingCards({
  trading,
  terms,
  adRevenue,
  statements,
}: {
  trading: TradingFigures;
  terms: GymPortalSnapshot["terms"];
  adRevenue: GymPortalSnapshot["adRevenue"];
  statements: GymPortalSnapshot["statements"];
}) {
  // Zero when advertising is not being reported. Safe only because the payout card says
  // so in words — see `PayoutCard`. An unlabelled payout silently missing its advertising
  // component would be the same lie as a ₹0 card, just harder to spot.
  const adRevenueExTaxInr = adRevenue.available ? adRevenue.data.revenueExTaxInr : 0;

  const settlement = useMemo(
    () =>
      computePeriodSettlement(
        terms,
        { ...trading.currentPeriod, adRevenueExTaxInr },
        trading.opening,
      ),
    [terms, trading, adRevenueExTaxInr],
  );

  return (
    <>
      <CupsCard settlement={settlement} terms={terms} />
      <RevenueCard settlement={settlement} />
      <ProfitCard settlement={settlement} />
      <PayoutCard
        settlement={settlement}
        statements={statements}
        advertisingReported={adRevenue.available}
      />
    </>
  );
}

/** The same four cards, with nothing to put in them. */
function TradingCardsUnavailable({
  reason,
  preInstall,
}: {
  reason: PortalAbsence;
  preInstall: boolean;
}) {
  const shared = { reason, preInstall };
  return (
    <>
      {/* A count, not a currency: `zero` carries the unit so the empty card is the same
          shape as the one that replaces it. */}
      <UnavailableCard icon={BarChart3} label="Cups sold" testId="card-cups" zero={count(0)} {...shared} />
      <UnavailableCard
        icon={IndianRupee}
        label="Revenue collected"
        testId="card-revenue"
        zero={formatInr(0)}
        {...shared}
      />
      <UnavailableCard
        icon={TrendingUp}
        label="Net profit"
        testId="card-profit"
        zero={formatInr(0)}
        {...shared}
      />
      <UnavailableCard
        icon={Wallet}
        label="Your payout"
        testId="card-payout"
        zero={formatInr(0)}
        {...shared}
      />
    </>
  );
}

// ── Frame and its two failure states ────────────────────────────────────────

/**
 * The header and page frame, shared by the loaded, loading and failed views.
 *
 * Extracted when the data became asynchronous. The alternative — three full-page
 * layouts — is three places for the sign-out button to be forgotten in, and the failed
 * view is exactly the one where a gym owner most needs it.
 */
function PortalChrome({
  email,
  onSignOut,
  children,
}: {
  email: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative min-h-screen bg-background text-foreground">
      {/* Deliberately not `overflow-hidden` anywhere above the header: an overflow
          ancestor makes `position: sticky` stick to a box that never scrolls. The glow is
          a background on a full-width box for the same reason, rather than a blurred blob
          that would need clipping. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(70%_100%_at_50%_0%,hsl(var(--primary)/0.10),transparent_72%)]"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* The wordmark in `logo.png` is black, so on this surface it needs the same
                  treatment the login page's dark panel gives it. */}
              <img
                src="/assets/logo.png"
                alt="MuscleBoxPro"
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Partner portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/50 py-1 pl-1 pr-3 sm:flex">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white"
                >
                  {email.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[180px] truncate text-xs font-medium text-muted-foreground lg:max-w-none">
                  {email}
                </span>
              </span>
            )}
            <Button
              variant="ghost"
              onClick={onSignOut}
              className="h-9 cursor-pointer rounded-xl border-border bg-secondary/50 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              data-testid="button-signout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function MachineStatusPill({ status }: { status: MachineStatus }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground"
      data-testid="machine-status"
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${MACHINE_STATUS_TONE[status]}`} />
      {MACHINE_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Said once for the page, not once per card.
 *
 * Four feeds can be absent at the same time, and six of the nine cards would otherwise
 * carry the same apology. That is the state a real gym is in today, so it is the state the
 * layout has to look right in.
 *
 * Before installation the honest reason the cards read zero is that there is no machine
 * yet, not that we have not built the reporting — both are true, and only one of them is
 * the gym's answer. Nothing is said about settled statements in that case because a gym
 * with no machine is owed none.
 */
function ReportingNotice({ preInstall }: { preInstall: boolean }) {
  return (
    <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" aria-hidden="true" />
      <span className="max-w-[80ch]">
        {preInstall
          ? "Your figures start on the day your machine is installed."
          : "Some figures are not reported here yet. Your settled statements are unaffected."}
      </span>
    </p>
  );
}

/**
 * Placeholders in the shape of the cards that are coming.
 *
 * Not a spinner: the grid is nine cards deep, and a centred spinner followed by a full
 * page appearing at once reads as a slower load than it is. `aria-busy` carries the
 * state for a screen reader, which the shimmer cannot.
 */
function PortalLoading() {
  return (
    <div data-testid="portal-loading" aria-busy="true">
      <div className="border-b border-border pb-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-secondary/60" />
      </div>
      <p className="sr-only">Loading your figures</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-border bg-card p-5"
            aria-hidden="true"
          >
            <div className="mb-6 h-3 w-24 rounded bg-secondary/70" />
            <div className="mb-3 h-8 w-32 rounded bg-secondary" />
            <div className="h-3 w-full rounded bg-secondary/60" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-border bg-card p-5"
            aria-hidden="true"
          >
            <div className="mb-6 h-3 w-32 rounded bg-secondary/70" />
            <div className="mb-3 h-7 w-28 rounded bg-secondary" />
            <div className="h-3 w-4/5 rounded bg-secondary/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * What a gym owner sees when the figures cannot be trusted.
 *
 * Deliberately not zeros. `compute.ts` clamps a bad input to ₹0, which is right as a
 * guard and wrong as an answer: a gym owed ₹5,870 and shown ₹0 cannot tell that from a
 * bad month, and it will believe the number before it believes the dashboard is broken.
 * Saying nothing is available is the only honest state.
 *
 * No field names, no validation issues, no exception message on screen — those go to
 * the console for us. What the owner gets is the fact, a retry, and the one number that
 * does not depend on our reporting stack: their own settled statements are unaffected,
 * so the email trail is still authoritative.
 */
function PortalError({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  useEffect(() => {
    if (error) console.error("[GymPortal] snapshot unavailable:", error);
  }, [error]);

  return (
    <div
      className="max-w-2xl rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5 sm:p-6"
      data-testid="portal-error"
      role="alert"
    >
      <p className="flex items-center gap-2.5 text-sm font-bold text-amber-100">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
        We can't show your figures right now
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
        This is a problem at our end, not with your machine or your account. Every cup is still
        counted, and your settled statements are issued from our records rather than from this page.
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 h-10 cursor-pointer rounded-xl border-amber-400/30 bg-amber-400/10 px-5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
        data-testid="button-retry-snapshot"
      >
        {isRetrying ? "Trying again..." : "Try again"}
      </Button>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

/**
 * One of the four figures a gym signs in for.
 *
 * Label above, icon out to the right, numeral on its own line at display weight. The
 * point of the different shape is that these four are the reason for the page and the
 * other five are reference: a grid of nine identical cards gave a gym no idea where to
 * look first.
 *
 * `accent` is for the payout, which is the one figure an owner is actually looking for.
 */
function MetricCard({
  icon: Icon,
  label,
  testId,
  accent = false,
  children,
}: CardProps & { accent?: boolean }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 ${
        accent ? "border-primary/25" : "border-border"
      }`}
      data-testid={testId}
    >
      {accent && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent to-primary"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
          />
        </>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </h3>
        <span
          className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ring-1 ring-inset ${
            accent
              ? "bg-primary/10 text-primary ring-primary/25"
              : "bg-secondary/50 text-muted-foreground ring-border"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="relative mt-4 flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

/**
 * The headline number on a card.
 *
 * White on every card including the payout, which is the one that matters most. The
 * brand gradient was tried here and reads magenta at this length — a colour this app uses
 * for nothing else, on the one figure that must not look like a warning. The payout card
 * is distinguished by its frame instead.
 */
function Figure({
  value,
  caption,
  muted = false,
}: {
  value: string;
  caption: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display text-[26px] font-black leading-none tracking-tight tabular-nums ${
          muted ? "text-muted-foreground/60" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{caption}</p>
    </div>
  );
}

/**
 * A card whose section the endpoint could not answer.
 *
 * Rendered in place of the real card rather than instead of nothing, and with its heading
 * and icon intact, because two things have to be true at once: the gym must not read a
 * figure that is not there, and it should still learn that the figure exists and is coming.
 * A missing card teaches nothing.
 *
 * What goes in the numeral slot is the whole judgement here, and it is not a matter of
 * taste (see rule 5 at the top of the file). Zero when no cup can have been sold — nothing
 * installed, or a live feed reporting none — because then zero is the figure. A dash when
 * the machine is trading and we simply are not reading it yet, because ₹0 beside a working
 * machine is a number a gym will act on.
 *
 * The caption does the explaining in three or four words. `ReportingNotice` carries the
 * reassurance once for the page, which is what keeps six of these from reading as six
 * separate faults.
 */
function UnavailableCard({
  icon,
  label,
  testId,
  reason,
  preInstall,
  zero,
}: {
  icon: typeof Cpu;
  label: string;
  testId: string;
  reason: PortalAbsence;
  preInstall: boolean;
  zero: string;
}) {
  const trueZero = preInstall || reason === "no_data_yet";

  return (
    <MetricCard icon={icon} label={label} testId={testId}>
      <div data-testid={`${testId}-unavailable`}>
        {trueZero ? (
          <Figure value={zero} caption={preInstall ? "awaiting installation" : "none this month"} />
        ) : (
          // Muted, because at full contrast in the numeral slot a dash reads as a value
          // that has been struck out. It is in the slot at all so the card keeps the
          // height of its neighbours.
          <Figure value="—" caption="not reported here yet" muted />
        )}
      </div>
    </MetricCard>
  );
}

function CupsCard({
  settlement,
  terms,
}: {
  settlement: PeriodSettlement;
  terms: GymPortalSnapshot["terms"];
}) {
  const { milestone, shake } = settlement;

  return (
    <MetricCard icon={BarChart3} label="Cups sold" testId="card-cups">
      <Figure value={count(shake.paidCups)} caption="this month, paid and dispensed" />
      <RowGroup>
        <Row label="Lifetime" value={count(milestone.closingPaidCups)} />
      </RowGroup>

      <div className="mt-auto pt-1">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
          data-testid="milestone-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={milestone.progressPct}
          aria-label={`Progress to a ${terms.gymSharePctAfterMilestone}% share of net profit`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            style={{ width: `${milestone.progressPct}%` }}
          />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground" data-testid="milestone-note">
          {milestone.reachedByPeriodEnd ? (
            <>
              Milestone reached. Your share of net profit is now{" "}
              {terms.gymSharePctAfterMilestone}%.
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {milestone.progressPct}% of the way
              </span>{" "}
              to {terms.gymSharePctAfterMilestone}%.{" "}
              {milestone.cupsToStepUp === null
                ? "Your terms do not set a step-up threshold."
                : `Your share moves to ${terms.gymSharePctAfterMilestone}% after about ${count(
                    milestone.cupsToStepUp,
                  )} more cups.`}
            </>
          )}
        </p>
        {!milestone.reachedByPeriodEnd && milestone.binding !== null && (
          // Which of §6.1's two tests is being tracked, and why. A bar tracking the
          // 15,000-cup figure would read 48% here while the real threshold is 94% of the
          // way in — the gym would think the step-up is a year off when it is a month.
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">
            {milestone.binding === "netProfit"
              ? `Tracking ${formatInr(terms.milestoneNetProfitInr)} of net profit, which at your margin comes before ${count(terms.milestoneCups)} cups.`
              : `Tracking ${count(terms.milestoneCups)} cups, which at your margin comes before ${formatInr(terms.milestoneNetProfitInr)} of net profit.`}
          </p>
        )}
      </div>
    </MetricCard>
  );
}

function RevenueCard({ settlement }: { settlement: PeriodSettlement }) {
  return (
    <MetricCard icon={IndianRupee} label="Revenue collected" testId="card-revenue">
      <Figure value={formatInr(settlement.shake.grossExTaxInr)} caption="this month, excluding GST" />
      <RowGroup className="mt-auto">
        <Row label="Lifetime" value={formatInr(settlement.milestone.closingGrossExTaxInr)} />
        <Row
          label="Average per cup"
          value={
            settlement.shake.paidCups > 0
              ? formatInr(settlement.shake.averageSellingPriceInr)
              : "—"
          }
        />
      </RowGroup>
    </MetricCard>
  );
}

function ProfitCard({ settlement }: { settlement: PeriodSettlement }) {
  const { shake } = settlement;

  return (
    <MetricCard icon={TrendingUp} label="Net profit" testId="card-profit">
      <Figure value={formatInr(shake.netProfitInr)} caption="sales less direct costs, this month" />
      {/* One aggregate, never a per-unit schedule: §40's confidentiality runs both
          ways, and the gym needs this figure to verify net profit, not our cost card. */}
      <RowGroup className={shake.split ? undefined : "mt-auto"}>
        <Row label="Direct costs" value={formatInr(shake.directVariableCostsInr)} />
        <Row label="Your share" value={`${shake.currentGymSharePct}%`} />
      </RowGroup>
      {shake.split && (
        <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground" data-testid="split-note">
          Your milestone fell inside this month: {shake.tranches[0].gymSharePct}% on the first{" "}
          {count(shake.tranches[0].paidCups)} cups, {shake.tranches[1].gymSharePct}% on the rest, an
          effective {shake.effectiveGymSharePct}%.
        </p>
      )}
    </MetricCard>
  );
}

function PayoutCard({
  settlement,
  statements,
  advertisingReported,
}: {
  settlement: PeriodSettlement;
  statements: GymPortalSnapshot["statements"];
  advertisingReported: boolean;
}) {
  const lastSettled = statements.available ? statements.data[0] : undefined;

  return (
    <MetricCard icon={Wallet} label="Your payout" testId="card-payout" accent>
      <Figure value={formatInr(settlement.gymPayoutInr)} caption="provisional, this month so far" />
      <RowGroup>
        <Row label="Share of shake profit" value={formatInr(settlement.shake.gymShareInr)} />
        {advertisingReported && (
          <Row label="Share of advertising" value={formatInr(settlement.advertising.gymShareInr)} />
        )}
      </RowGroup>
      {/* The headline above is `shake + advertising`, and advertising went in as zero
          because it was not reported. Stated rather than left implicit: the whole reason
          the absent sections are absent instead of zeroed is that an unexplained
          understatement is indistinguishable from a bad month. */}
      {!advertisingReported && (
        <p
          className="text-[13px] leading-relaxed text-muted-foreground"
          data-testid="payout-excludes-advertising"
        >
          Shake profit only. Your advertising share is settled with your statement.
        </p>
      )}
      <div className="mt-auto border-t border-border/70 pt-2">
        {!statements.available ? (
          // Not "your first statement is issued after your first full month": that would
          // be a claim about this gym's history, and we do not have it.
          <p className="text-[13px] text-muted-foreground">Settled months are not listed yet.</p>
        ) : lastSettled ? (
          <RowGroup>
            <Row
              label={`Settled ${monthName(lastSettled.period)}`}
              value={formatInr(statementTotalInr(lastSettled))}
            />
          </RowGroup>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Your first statement is issued after your first full month.
          </p>
        )}
      </div>
    </MetricCard>
  );
}

function ElectricityCard({
  reviewPeriod,
  terms,
}: {
  reviewPeriod: ElectricityWindowPeriod;
  terms: GymPortalSnapshot["terms"];
}) {
  const electricity = useMemo(
    () => computeElectricityWindow(terms, reviewPeriod.paidCups),
    [terms, reviewPeriod.paidCups],
  );

  return (
    <MetricCard icon={Zap} label="Electricity reimbursement" testId="card-electricity">
      <Figure
        value={formatInr(electricity.earnedInr)}
        caption={`earned so far, ${reviewPeriod.label}`}
      />
      <RowGroup>
        <Row
          label={`Completed blocks of ${count(terms.electricityCupsPerBlock)}`}
          value={`${electricity.completedBlocks}`}
        />
      </RowGroup>
      {electricity.floorApplied && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The {formatInr(terms.electricityInrPerBlock)} minimum, paid whatever the cup count.
        </p>
      )}
      {/* Cups to the next *increase*, not to the next block boundary. Under the floor
          the two differ, and "600 more cups earns another ₹1,000" would be false. */}
      {electricity.nextIncreaseAtCups > 0 && (
        <p className="text-[13px] leading-relaxed text-muted-foreground" data-testid="electricity-next">
          {count(electricity.cupsToNextIncrease)} more cups takes it to{" "}
          {formatInr(electricity.earnedInr + terms.electricityInrPerBlock)}.
        </p>
      )}
      {electricity.cupsInIncompleteBlock > 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground/80">
          Part-blocks do not carry past {formatAgreementDate(reviewPeriod.endsOn)}.
        </p>
      )}
    </MetricCard>
  );
}

/**
 * Derived straight from the advertising feed, not from the shake settlement.
 *
 * §9.4 makes this ratio permanent and independent of the shake split, and the response
 * now reflects that by reporting advertising revenue as its own section — so this card
 * renders for a month whose cup figures have not arrived. It calls the same
 * `computeAdvertisingShare` that `computePeriodSettlement` calls internally, so when both
 * sections are available the figure here and the row on the payout card are the same
 * function of the same input and cannot disagree.
 */
function AdvertisingCard({
  terms,
  revenueExTaxInr,
}: {
  terms: GymPortalSnapshot["terms"];
  revenueExTaxInr: number;
}) {
  const advertising = useMemo(
    () => computeAdvertisingShare(terms, revenueExTaxInr),
    [terms, revenueExTaxInr],
  );

  return (
    <MetricCard icon={Megaphone} label="Advertising share" testId="card-advertising">
      <Figure value={formatInr(advertising.gymShareInr)} caption="your share, this month" />
      <RowGroup>
        <Row label="Screen revenue" value={formatInr(advertising.revenueExTaxInr)} />
        <Row label="Your share" value={`${advertising.gymSharePct}%`} />
      </RowGroup>
      {/* §9.4. Stated on the card rather than in a tooltip, because a gym that has
          just stepped up to 50% on shakes will otherwise read this as an error. */}
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Shared {100 - advertising.gymSharePct}:{advertising.gymSharePct} for the whole term,
        whatever your shake profit share.
      </p>
    </MetricCard>
  );
}

function MachineCard({ machine }: { machine: GymPortalSnapshot["machine"] }) {
  return (
    <Card icon={Cpu} label="Your machine" testId="card-machine">
      <p className="text-sm font-semibold text-foreground">{machine.model}</p>
      <RowGroup>
        <Row label="Status" value={MACHINE_STATUS_LABEL[machine.status]} />
        <Row label="Serial" value={machine.serialNumber ?? "Not yet allocated"} />
        <Row
          label="Installed"
          value={machine.installationDate ? formatAgreementDate(machine.installationDate) : "Pending"}
        />
        <Row
          label="Last serviced"
          value={machine.lastServiceAt ? formatIstDate(machine.lastServiceAt) : "—"}
        />
      </RowGroup>
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Servicing, restocking and repairs are ours, at no cost to you.
      </p>
    </Card>
  );
}

/**
 * Two things in one card, and only one of them can be absent.
 *
 * The agreement summary comes from our own record and is always answerable; the settled
 * statements come from a pipeline that does not exist yet. Keeping them together means a
 * gym with no statements can still see and check its signed agreement, which is the one
 * thing on this screen it may actually need.
 */
function StatementsCard({
  statements,
  agreement,
}: {
  statements: GymPortalSnapshot["statements"];
  agreement: GymPortalSnapshot["agreement"];
}) {
  return (
    <Card icon={FileText} label="Statements & agreement" testId="card-statements">
      {!statements.available ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground" data-testid="statements-unavailable">
          {statements.reason === "no_data_yet"
            ? "Your first statement appears after your first full month of trading."
            : "Settled statements are not listed here yet."}
        </p>
      ) : statements.data.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No settled months yet.</p>
      ) : (
        <div className="divide-y divide-border/70">
          {statements.data.map((statement) => (
            <div
              key={statement.period}
              className="flex items-baseline justify-between gap-3 py-2.5 text-[13px] first:pt-0"
              data-testid={`statement-${statement.period}`}
            >
              <span className="text-muted-foreground">
                <span className="block font-semibold text-foreground">
                  {monthName(statement.period)}
                </span>
                <span className="block text-xs text-muted-foreground/80">
                  settled {formatAgreementDate(statement.settledOn)}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums text-foreground">
                  {formatInr(statementTotalInr(statement))}
                </span>
                {statement.documentUrl ? (
                  <a
                    href={statement.documentUrl}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    Download PDF
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground/80">PDF not yet issued</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {agreement && (
        <div className="mt-auto border-t border-border/70 pt-3" data-testid="agreement-summary">
          <RowGroup>
            <Row label="Agreement" value={`v${agreement.version}`} />
            <Row label="Signed" value={formatIstDate(agreement.signedAt)} />
          </RowGroup>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground/80">
            {/* The hash is here so a gym can check its own copy against ours. It is
                evidence, and evidence you cannot see is not much use. */}
            Document hash {agreement.contentHash.slice(0, 16)}…
          </p>
        </div>
      )}
    </Card>
  );
}

function DepositCard({ snapshot }: { snapshot: GymPortalSnapshot }) {
  const { receipt } = snapshot.deposit;

  return (
    <Card icon={ShieldCheck} label="Security deposit" testId="card-deposit">
      <Figure
        value={formatInr(
          receipt ? receipt.amountPaise / 100 : snapshot.terms.securityDepositInr,
        )}
        caption="paid and held, refundable"
      />
      {receipt && (
        <RowGroup>
          <Row label="Receipt" value={receipt.receiptNo} />
          <Row label="Paid by" value={receipt.method} />
          <Row label="Paid on" value={formatAgreementDate(receipt.paidAt)} />
        </RowGroup>
      )}
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Refunded within 30 days of the machine being returned in working order, less any amounts
        due.
      </p>
    </Card>
  );
}

/**
 * §13: the outstanding deposit is a persistent banner, not a card.
 *
 * A gym that deferred at step 4 is live and trading with a receivable against it. That
 * is a deliberate and reasonable state — but it should not be discoverable only by
 * scrolling, and it must carry the link, because the person who reads this dashboard
 * is often not the person who releases payments.
 */
function DepositBanner({ snapshot }: { snapshot: GymPortalSnapshot }) {
  return (
    <div
      className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5 sm:flex-row sm:items-center"
      data-testid="deposit-banner"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-amber-100">
            Security deposit of {formatInr(snapshot.terms.securityDepositInr)} is still outstanding
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
            Refundable, and due under clause 5.1. Your share keeps accruing meanwhile.
          </p>
        </div>
      </div>
      {snapshot.deposit.paymentUrl && (
        <a
          href={snapshot.deposit.paymentUrl}
          className="inline-flex h-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-bold text-amber-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-testid="link-deposit-payment"
        >
          Pay the deposit
        </a>
      )}
    </div>
  );
}

/**
 * No bank account on file, said on the tab the gym is actually looking at.
 *
 * The card that fixes this is one tab away, which is right for a record a gym checks twice
 * a year and wrong for the one thing standing between it and being paid. So the prompt is
 * here, it is one line, and its button both switches tabs and opens the form — a button
 * that merely reveals another button is a button that gets ignored.
 *
 * Not styled as a warning. Nothing is broken and nothing is late: most gyms reach this
 * screen before their first settlement, so this is a task, not a fault.
 */
function PayoutAccountPrompt({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center"
      data-testid="payout-account-prompt"
    >
      <div className="flex items-start gap-3">
        <Landmark className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">
          Add a bank account so we can transfer your payout
        </p>
      </div>
      <Button
        type="button"
        onClick={onAdd}
        className="h-10 flex-shrink-0 cursor-pointer rounded-xl px-5 text-sm font-bold"
        data-testid="button-prompt-add-payout-account"
      >
        Add bank account
      </Button>
    </div>
  );
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * What a settled month actually paid.
 *
 * The two components are stored separately because they answer to different clauses —
 * §8.3 settles the profit share monthly, §10.4 assesses electricity per three-month
 * window — but what left our account is the sum, and that is the figure a gym
 * reconciles against its bank statement.
 */
function statementTotalInr(statement: Statement): number {
  return statement.gymPayoutInr + statement.electricityInr;
}

/** 15000 → "15,000". Indian grouping, matching `formatInr`. */
function count(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** "2026-08" → "August 2026". Falls back to the raw label rather than throwing. */
function monthName(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
