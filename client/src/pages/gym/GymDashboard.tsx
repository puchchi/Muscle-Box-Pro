"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Cpu,
  FileText,
  IndianRupee,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * 5. **An absent section says so; it never renders as zero.** `GET /gym/portal` ships
 *    partial — cups, advertising revenue, electricity and settled statements are four
 *    separate feeds and none of them exists yet. Each is a `PortalSection`, and where one
 *    is absent the card keeps its heading and explains itself. ₹0 in those cards is the
 *    one output this file must not produce: a gym reading ₹0 settled concludes it earned
 *    nothing, and will believe that number long before it suspects the page. The card is
 *    kept rather than hidden so a gym also learns the figure is coming.
 *
 * The data source is still a fixture until the reporting endpoint exists (§15 of
 * docs/gym-onboarding.md), but it is reached asynchronously and validated, so the
 * pending and error paths below are the real ones rather than something written on the
 * day the network arrives. Swapping the source is one function body in
 * `@/lib/gymPortalApi`.
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

const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  allocated: "Allocated to you",
  installed: "Installed",
  trading: "Trading",
  service_due: "Service due",
  removed: "Removed",
};

export default function GymDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchGymSession().then((session) => {
      if (cancelled) return;
      if (!session) {
        router.replace("/gym/login");
        return;
      }
      setEmail(session.email);
      setIsChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    // The call goes first and its result is not checked: only the server can expire an
    // `HttpOnly` cookie, and a gym who has pressed Sign out on a shared office machine
    // must leave the screen either way. `removeQueries`, not `invalidateQueries` — the
    // snapshot in the cache is this gym's revenue, and invalidating would leave it sitting
    // there for whoever signs in next while the refetch is in flight.
    await signOutOfPortal();
    queryClient.removeQueries({ queryKey: GYM_PORTAL_QUERY_KEY });
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
    enabled: !isChecking,
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
  // and no meaningful Sign out. `sessionGone` shares this branch because the redirect it
  // triggers has not landed yet, and the chrome would otherwise flash a signed-in header
  // belonging to a session that has already ended.
  if (isChecking || sessionGone) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-muted-foreground">
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

  return (
    <>
      <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
        {snapshot.gymDisplayName}
      </h1>
      <p className="text-muted-foreground text-sm mb-8" data-testid="as-of">
        {sales.available ? (
          <>
            {monthName(sales.data.currentPeriod.period)} so far — provisional, settles by the{" "}
            {terms.settlementDaysAfterMonthEnd}th. Figures as at{" "}
            {formatAgreementDate(snapshot.asOf)}.
          </>
        ) : (
          // No period to name, so nothing is claimed about one. The timestamp still
          // belongs here: it is when the record below was read, and it is true whether or
          // not the trading feeds answered.
          <>Your account as at {formatAgreementDate(snapshot.asOf)}.</>
        )}
      </p>

      {snapshot.deposit.status !== "paid" && <DepositBanner snapshot={snapshot} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sales.available ? (
          <TradingCards
            trading={sales.data}
            terms={terms}
            adRevenue={adRevenue}
            statements={statements}
          />
        ) : (
          <TradingCardsUnavailable reason={sales.reason} />
        )}

        {adRevenue.available ? (
          <AdvertisingCard terms={terms} revenueExTaxInr={adRevenue.data.revenueExTaxInr} />
        ) : (
          <UnavailableCard
            icon={Megaphone}
            label="Advertising share"
            testId="card-advertising"
            reason={adRevenue.reason}
            what="Your share of screen advertising"
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
            what="Your electricity reimbursement"
          />
        )}

        <MachineCard machine={snapshot.machine} />
        <StatementsCard statements={statements} agreement={snapshot.agreement} />
        {snapshot.deposit.status === "paid" && <DepositCard snapshot={snapshot} />}
      </div>

      {sales.available && (
        <p className="text-xs text-muted-foreground mt-8 leading-relaxed max-w-3xl">
          Figures shown here before the 15th of a month are provisional. Your monthly statement is
          the settled amount, issued within {terms.settlementDaysAfterMonthEnd} days of month-end.
          Costs are shown as a single total because your share is calculated on net profit, not on
          our ingredient pricing.
        </p>
      )}
    </>
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
function TradingCardsUnavailable({ reason }: { reason: PortalAbsence }) {
  return (
    <>
      <UnavailableCard
        icon={BarChart3}
        label="Cups sold"
        testId="card-cups"
        reason={reason}
        what="Your cup count"
      />
      <UnavailableCard
        icon={IndianRupee}
        label="Revenue collected"
        testId="card-revenue"
        reason={reason}
        what="Revenue from your machine"
      />
      <UnavailableCard
        icon={TrendingUp}
        label="Net profit"
        testId="card-profit"
        reason={reason}
        what="Net profit on your machine"
      />
      <UnavailableCard
        icon={Wallet}
        label="Your payout"
        testId="card-payout"
        reason={reason}
        what="Your provisional payout"
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-9 w-auto cursor-pointer" />
          </Link>
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-sm text-muted-foreground truncate hidden sm:inline">{email}</span>
            <Button
              variant="outline"
              onClick={onSignOut}
              className="h-9 rounded-xl font-semibold text-sm"
              data-testid="button-signout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</main>
    </div>
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
      <div className="h-7 w-64 bg-gray-200 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-80 max-w-full bg-gray-100 rounded animate-pulse mb-8" />
      <p className="sr-only">Loading your figures</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse"
            aria-hidden="true"
          >
            <div className="h-3 w-24 bg-gray-100 rounded mb-4" />
            <div className="h-7 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-3 w-full bg-gray-100 rounded" />
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
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 max-w-2xl"
      data-testid="portal-error"
      role="alert"
    >
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        We can't show your figures right now
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
        This is a problem at our end, not with your machine or your account — it is still trading and
        every cup is still counted. Nothing you are owed is affected: your settled statements are
        issued from our records, not from this page.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        disabled={isRetrying}
        className="h-10 rounded-xl font-semibold text-sm mt-4"
        data-testid="button-retry-snapshot"
      >
        {isRetrying ? "Trying again..." : "Try again"}
      </Button>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

type CardProps = {
  icon: typeof Cpu;
  label: string;
  testId: string;
  children: React.ReactNode;
};

function Card({ icon: Icon, label, testId, children }: CardProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      </div>
      {children}
    </div>
  );
}

/** The headline number on a card. */
function Figure({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <p className="text-2xl font-display font-black text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

/**
 * A card whose section the endpoint could not answer.
 *
 * Rendered in place of the real card rather than instead of nothing, and with its heading
 * and icon intact, because two things have to be true at once: the gym must not read a
 * figure that is not there, and it should still learn that the figure exists and is
 * coming. A missing card teaches nothing; a card reading ₹0 teaches something false.
 *
 * `what` is the subject of the sentence, capitalised — "Your cup count", not "cups".
 * Passed in rather than derived from `label` because the heading is a noun phrase for a
 * grid ("Cups sold") and this is one for a sentence.
 */
function UnavailableCard({
  icon,
  label,
  testId,
  reason,
  what,
}: {
  icon: typeof Cpu;
  label: string;
  testId: string;
  reason: PortalAbsence;
  what: string;
}) {
  return (
    <Card icon={icon} label={label} testId={testId}>
      <div data-testid={`${testId}-unavailable`}>
        {/* Deliberately not styled as a `Figure`. The headline slot on every other card
            holds a number, and putting words in the same weight and size is how a
            skim-read turns "not available" into a value. */}
        <p className="text-sm font-semibold text-muted-foreground">Not available yet</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {reason === "no_data_yet" ? (
            <>{what} appears here once your machine is installed and trading.</>
          ) : (
            <>
              {what} is not reported on this page yet — we are still building it. Nothing you are
              owed depends on it: your settled statements are issued from our records.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

/** A label/value row for the detail lines under a figure. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
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
    <Card icon={BarChart3} label="Cups sold" testId="card-cups">
      <Figure value={count(shake.paidCups)} caption="this month, paid and dispensed" />
      <Row label="Lifetime" value={count(milestone.closingPaidCups)} />

      <div className="mt-1">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" data-testid="milestone-bar">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${milestone.progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed" data-testid="milestone-note">
          {milestone.reachedByPeriodEnd ? (
            <>
              Milestone reached — your share of net profit is now{" "}
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
          <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">
            {milestone.binding === "netProfit"
              ? `Tracking ${formatInr(terms.milestoneNetProfitInr)} of cumulative net profit — at your margin that arrives before ${count(terms.milestoneCups)} cups.`
              : `Tracking ${count(terms.milestoneCups)} cups — at your margin that arrives before ${formatInr(terms.milestoneNetProfitInr)} of net profit.`}
          </p>
        )}
      </div>
    </Card>
  );
}

function RevenueCard({ settlement }: { settlement: PeriodSettlement }) {
  return (
    <Card icon={IndianRupee} label="Revenue collected" testId="card-revenue">
      <Figure value={formatInr(settlement.shake.grossExTaxInr)} caption="this month, excluding GST" />
      <Row label="Lifetime" value={formatInr(settlement.milestone.closingGrossExTaxInr)} />
      <Row
        label="Average per cup"
        value={
          settlement.shake.paidCups > 0
            ? formatInr(settlement.shake.averageSellingPriceInr)
            : "—"
        }
      />
    </Card>
  );
}

function ProfitCard({ settlement }: { settlement: PeriodSettlement }) {
  const { shake } = settlement;

  return (
    <Card icon={TrendingUp} label="Net profit" testId="card-profit">
      <Figure value={formatInr(shake.netProfitInr)} caption="sales less direct costs, this month" />
      {/* One aggregate, never a per-unit schedule: §40's confidentiality runs both
          ways, and the gym needs this figure to verify net profit, not our cost card. */}
      <Row label="Direct costs" value={formatInr(shake.directVariableCostsInr)} />
      <Row label="Your share" value={`${shake.currentGymSharePct}%`} />
      {shake.split && (
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="split-note">
          Your milestone fell inside this month, so two rates apply:{" "}
          {shake.tranches[0].gymSharePct}% on the first {count(shake.tranches[0].paidCups)} cups and{" "}
          {shake.tranches[1].gymSharePct}% on the rest — an effective{" "}
          {shake.effectiveGymSharePct}%.
        </p>
      )}
    </Card>
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
    <Card icon={Wallet} label="Your payout" testId="card-payout">
      <Figure value={formatInr(settlement.gymPayoutInr)} caption="provisional, this month so far" />
      <Row label="Share of shake profit" value={formatInr(settlement.shake.gymShareInr)} />
      {advertisingReported && (
        <Row label="Share of advertising" value={formatInr(settlement.advertising.gymShareInr)} />
      )}
      {/* The headline above is `shake + advertising`, and advertising went in as zero
          because it was not reported. Stated rather than left implicit: the whole reason
          the absent sections are absent instead of zeroed is that an unexplained
          understatement is indistinguishable from a bad month. */}
      {!advertisingReported && (
        <p
          className="text-xs text-muted-foreground leading-relaxed"
          data-testid="payout-excludes-advertising"
        >
          This is your shake profit share only. Your advertising share is not reported here yet — it
          is settled with your monthly statement either way.
        </p>
      )}
      <div className="border-t border-gray-100 pt-2 mt-1">
        {!statements.available ? (
          // Not "your first statement is issued after your first full month": that would
          // be a claim about this gym's history, and we do not have it.
          <p className="text-xs text-muted-foreground">Settled months are not listed here yet.</p>
        ) : lastSettled ? (
          <Row
            label={`Settled ${monthName(lastSettled.period)}`}
            value={formatInr(statementTotalInr(lastSettled))}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Your first statement is issued after your first full month.
          </p>
        )}
      </div>
    </Card>
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
    <Card icon={Zap} label="Electricity reimbursement" testId="card-electricity">
      <Figure
        value={formatInr(electricity.earnedInr)}
        caption={`earned so far, ${reviewPeriod.label}`}
      />
      <Row
        label={`Completed blocks of ${count(terms.electricityCupsPerBlock)}`}
        value={`${electricity.completedBlocks}`}
      />
      {electricity.floorApplied && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          That is the {formatInr(terms.electricityInrPerBlock)} minimum for the review period,
          which you are paid whatever the cup count.
        </p>
      )}
      {/* Cups to the next *increase*, not to the next block boundary. Under the floor
          the two differ, and "600 more cups earns another ₹1,000" would be false. */}
      {electricity.nextIncreaseAtCups > 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="electricity-next">
          {count(electricity.cupsToNextIncrease)} more cups in this review period takes it to{" "}
          {formatInr(electricity.earnedInr + terms.electricityInrPerBlock)}.
        </p>
      )}
      {electricity.cupsInIncompleteBlock > 0 && (
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Part-blocks are not carried into the next review period, which ends{" "}
          {formatAgreementDate(reviewPeriod.endsOn)}.
        </p>
      )}
    </Card>
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
    <Card icon={Megaphone} label="Advertising share" testId="card-advertising">
      <Figure value={formatInr(advertising.gymShareInr)} caption="your share, this month" />
      <Row label="Screen revenue" value={formatInr(advertising.revenueExTaxInr)} />
      <Row label="Your share" value={`${advertising.gymSharePct}%`} />
      {/* §9.4. Stated on the card rather than in a tooltip, because a gym that has
          just stepped up to 50% on shakes will otherwise read this as an error. */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Advertising is shared {100 - advertising.gymSharePct}:{advertising.gymSharePct} for the
        whole term. It does not move with your shake profit share.
      </p>
    </Card>
  );
}

function MachineCard({ machine }: { machine: GymPortalSnapshot["machine"] }) {
  return (
    <Card icon={Cpu} label="Your machine" testId="card-machine">
      <p className="text-sm font-semibold text-foreground">{machine.model}</p>
      <Row label="Status" value={MACHINE_STATUS_LABEL[machine.status]} />
      <Row label="Serial" value={machine.serialNumber ?? "Not yet allocated"} />
      <Row
        label="Installed"
        value={machine.installationDate ? formatAgreementDate(machine.installationDate) : "Pending"}
      />
      <Row
        label="Last serviced"
        value={machine.lastServiceAt ? formatAgreementDate(machine.lastServiceAt) : "—"}
      />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Servicing, restocking and repairs are ours. Anything wrong with the machine is a call to
        us, at no cost to you.
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
        <p className="text-xs text-muted-foreground" data-testid="statements-unavailable">
          {statements.reason === "no_data_yet"
            ? "Your first statement appears here after your first full month of trading."
            : "Settled statements are not listed here yet — we are still building this. They are issued from our records and emailed to you as usual."}
        </p>
      ) : statements.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No settled months yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {statements.data.map((statement) => (
            <div
              key={statement.period}
              className="flex items-baseline justify-between gap-3 text-xs"
              data-testid={`statement-${statement.period}`}
            >
              <span className="text-muted-foreground">
                {monthName(statement.period)}
                <span className="block text-[11px] text-muted-foreground/70">
                  settled {formatAgreementDate(statement.settledOn)}
                </span>
              </span>
              <span className="text-right">
                <span className="font-semibold text-foreground block">
                  {formatInr(statementTotalInr(statement))}
                </span>
                {statement.documentUrl ? (
                  <a
                    href={statement.documentUrl}
                    className="text-[11px] text-primary font-semibold hover:underline"
                  >
                    Download PDF
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground/70">PDF not yet issued</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {agreement && (
        <div className="border-t border-gray-100 pt-2 mt-1" data-testid="agreement-summary">
          <Row label="Agreement" value={`v${agreement.version}`} />
          <Row label="Signed" value={formatAgreementDate(agreement.signedOn)} />
          <p className="text-[11px] text-muted-foreground/70 mt-1 break-all">
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
        <>
          <Row label="Receipt" value={receipt.receiptNo} />
          <Row label="Paid by" value={receipt.method} />
          <Row label="Paid on" value={formatAgreementDate(receipt.paidAt)} />
        </>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Refundable within 30 days of the machine being returned in working order, less any amounts
        properly due.
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
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
      data-testid="deposit-banner"
    >
      <div>
        <p className="text-sm font-semibold text-amber-900">
          Security deposit of {formatInr(snapshot.terms.securityDepositInr)} is still outstanding
        </p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          Your machine is running and your share is accruing. The deposit is refundable and is due
          under clause 5.1 of your agreement.
        </p>
      </div>
      {snapshot.deposit.paymentUrl && (
        <a
          href={snapshot.deposit.paymentUrl}
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-amber-900 text-white text-sm font-semibold flex-shrink-0"
          data-testid="link-deposit-payment"
        >
          Pay the deposit
        </a>
      )}
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
