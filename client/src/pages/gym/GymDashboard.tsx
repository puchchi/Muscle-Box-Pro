"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
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
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatInr } from "@shared/partnership/summary";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { DEMO_GYM_PORTAL } from "@shared/gym/fixtures";
import type { GymPortalSnapshot, MachineStatus, Statement } from "@shared/gym/portal";
import {
  computeElectricityWindow,
  computePeriodSettlement,
  type ElectricityWindow,
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
 * 2. **No business state from `session.user.user_metadata`.** That field is writable
 *    by the account holder, so a gym could edit its own payout figure. It is exactly
 *    the vulnerability the old consumer Account page shipped (TODO A2). The session is
 *    used for one thing here — is this person signed in, and what is their email.
 *
 * 3. **Live figures are labelled provisional.** §8.3 makes the monthly statement the
 *    amount actually owed; a gym treating a mid-month number as a debt is a support
 *    conversation nobody wants.
 *
 * The data is a fixture until the reporting endpoint exists (§15 of
 * docs/gym-onboarding.md). Swapping it is one line — `useSnapshot` below — because the
 * fixture is typed as the endpoint's response shape rather than as demo props.
 */

/**
 * Build item 11 replaces the body of this hook with a query against the BFF
 * (browser → Supabase edge function → `mbp-backend`), keyed on the gym resolved from
 * the JWT. Nothing else in the file changes: the derived figures below are computed
 * from whatever this returns.
 */
function useSnapshot(): GymPortalSnapshot {
  return DEMO_GYM_PORTAL;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/gym/login");
        return;
      }
      setEmail(session.user.email ?? null);
      setIsChecking(false);
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    await queryClient.invalidateQueries({ queryKey: ["supabase-session"] });
    router.replace("/gym/login");
  }

  const snapshot = useSnapshot();
  const settlement = useMemo(
    () => computePeriodSettlement(snapshot.terms, snapshot.currentPeriod, snapshot.opening),
    [snapshot],
  );
  const electricity = useMemo(
    () => computeElectricityWindow(snapshot.terms, snapshot.electricityWindow.paidCups),
    [snapshot],
  );

  if (isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-muted-foreground">
        Loading your portal...
      </div>
    );
  }

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
              onClick={handleSignOut}
              className="h-9 rounded-xl font-semibold text-sm"
              data-testid="button-signout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
          {snapshot.gymDisplayName}
        </h1>
        <p className="text-muted-foreground text-sm mb-8" data-testid="as-of">
          {monthName(snapshot.currentPeriod.period)} so far — provisional, settles by the{" "}
          {snapshot.terms.settlementDaysAfterMonthEnd}th. Figures as at{" "}
          {formatAgreementDate(snapshot.asOf)}.
        </p>

        {snapshot.deposit.status !== "paid" && <DepositBanner snapshot={snapshot} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CupsCard settlement={settlement} terms={snapshot.terms} />
          <RevenueCard settlement={settlement} />
          <ProfitCard settlement={settlement} />
          <PayoutCard settlement={settlement} statement={snapshot.statements[0]} />
          <ElectricityCard
            electricity={electricity}
            reviewPeriod={snapshot.electricityWindow}
            terms={snapshot.terms}
          />
          <AdvertisingCard settlement={settlement} />
          <MachineCard machine={snapshot.machine} />
          <StatementsCard snapshot={snapshot} />
          {snapshot.deposit.status === "paid" && <DepositCard snapshot={snapshot} />}
        </div>

        <p className="text-xs text-muted-foreground mt-8 leading-relaxed max-w-3xl">
          Figures shown here before the 15th of a month are provisional. Your monthly statement is
          the settled amount, issued within {snapshot.terms.settlementDaysAfterMonthEnd} days of
          month-end. Costs are shown as a single total because your share is calculated on net
          profit, not on our ingredient pricing.
        </p>
      </main>
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
  statement,
}: {
  settlement: PeriodSettlement;
  statement: Statement | undefined;
}) {
  return (
    <Card icon={Wallet} label="Your payout" testId="card-payout">
      <Figure value={formatInr(settlement.gymPayoutInr)} caption="provisional, this month so far" />
      <Row label="Share of shake profit" value={formatInr(settlement.shake.gymShareInr)} />
      <Row label="Share of advertising" value={formatInr(settlement.advertising.gymShareInr)} />
      <div className="border-t border-gray-100 pt-2 mt-1">
        {statement ? (
          <Row
            label={`Settled ${monthName(statement.period)}`}
            value={formatInr(statementTotalInr(statement))}
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
  electricity,
  reviewPeriod,
  terms,
}: {
  electricity: ElectricityWindow;
  reviewPeriod: GymPortalSnapshot["electricityWindow"];
  terms: GymPortalSnapshot["terms"];
}) {
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

function AdvertisingCard({ settlement }: { settlement: PeriodSettlement }) {
  const { advertising } = settlement;

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

function StatementsCard({ snapshot }: { snapshot: GymPortalSnapshot }) {
  return (
    <Card icon={FileText} label="Statements & agreement" testId="card-statements">
      {snapshot.statements.length === 0 ? (
        <p className="text-xs text-muted-foreground">No settled months yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {snapshot.statements.map((statement) => (
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

      {snapshot.agreement && (
        <div className="border-t border-gray-100 pt-2 mt-1" data-testid="agreement-summary">
          <Row label="Agreement" value={`v${snapshot.agreement.version}`} />
          <Row label="Signed" value={formatAgreementDate(snapshot.agreement.signedOn)} />
          <p className="text-[11px] text-muted-foreground/70 mt-1 break-all">
            {/* The hash is here so a gym can check its own copy against ours. It is
                evidence, and evidence you cannot see is not much use. */}
            Document hash {snapshot.agreement.contentHash.slice(0, 16)}…
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
