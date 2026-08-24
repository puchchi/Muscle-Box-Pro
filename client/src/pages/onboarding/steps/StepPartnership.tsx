"use client";

import {
  AlertTriangle,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  Handshake,
  Megaphone,
  Ruler,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MACHINE_SPEC, dimensionsSpelled } from "@shared/machine/spec";
import { INDICATIVE_ECONOMICS, PARTNERSHIP, formatInr } from "@shared/partnership/summary";
import type { MachineSummary, OnboardingTerms } from "@shared/onboarding/types";
import type { StepViewProps } from "../types";

/**
 * Step 2 — Your partnership.
 *
 * No input. Its job is to establish what the deal is *before* showing anyone
 * forty-seven clauses. Because step 1 has already run, every figure here comes from
 * that gym's own terms row rather than the indicative numbers on `/gym-partnership`.
 *
 * The one editorial rule for this screen: **the uncomfortable parts go on it
 * deliberately.** A gym owner surprised by §14 in month three is a dispute; one who
 * read it here is a partner. The temptation is to make this page pure sell, and the
 * "Worth knowing" block below exists to resist that. If someone later asks to move
 * those five items further down or into a collapsed panel, the answer is no — they
 * are the reason "I have read and agree" can be a true statement in step 3.
 *
 * Continuing records `partnership_ack_at`: cheap to store, and it is the evidence
 * that the commercials were shown before the contract was.
 */
export default function StepPartnership({ state, readOnly, isSubmitting, actions }: StepViewProps) {
  const { terms, machine } = state;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700 leading-relaxed max-w-[68ch]">
        These are the terms on <strong className="text-foreground">{state.gymDisplayName}</strong>'s
        record — not a brochure. Every figure below is what your agreement will say in step 3.
      </p>

      {/* ── The six headlines ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-testid="terms-cards">
        {headlineCards(terms).map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 min-w-0">
            <card.icon className="w-4 h-4 text-primary mb-2" aria-hidden="true" />
            {/*
              `text-base` first: at 375px these are two columns about 160px wide, and
              "₹1,00,000" or "20% → 35%" at `text-lg` was wider than that. `break-words`
              is the backstop for a longer figure rather than a horizontal scrollbar.
            */}
            <p className="font-display font-black text-base sm:text-lg leading-tight text-foreground mb-1 tabular-nums break-words">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── The detail behind them ─────────────────────────────────────────── */}
      <Panel title="The detail">
        <dl className="divide-y divide-gray-200" data-testid="terms-list">
          {detailRows(terms).map((row) => (
            <div key={row.label} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-sm font-semibold text-foreground">{row.label}</dt>
              <dd className="text-sm text-gray-700 leading-relaxed mt-0.5 max-w-[68ch]">{row.body}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* ── The parts that cause arguments later ───────────────────────────── */}
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5"
        data-testid="worth-knowing"
      >
        <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" aria-hidden="true" />
          Worth knowing before you sign
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-3 max-w-[68ch]">
          The restrictions that come with a machine we own and run. All five are in the agreement you
          will read next — they are here so none of them is a surprise.
        </p>
        <ul role="list" className="space-y-2.5">
          {RESTRICTIONS.map((item) => (
            <li key={item.clause} className="flex items-start gap-2.5">
              <span className="text-xs font-bold text-amber-900 bg-amber-100 rounded px-2 py-0.5 flex-shrink-0 tabular-nums">
                {item.clause}
              </span>
              <span className="text-sm text-foreground leading-relaxed max-w-[68ch]">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Both sides of the arrangement ──────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Panel title="What we cover" icon={Wrench}>
          <ul role="list" className="space-y-2">
            {PARTNERSHIP.includedInService.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="What we need from you" icon={Ruler} testId="what-we-need">
          <ul role="list" className="space-y-2">
            {PARTNERSHIP.gymProvides.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                The refundable deposit of {formatInr(terms.securityDepositInr)} — payable after
                signing, and you can defer it
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* ── The actual machine ─────────────────────────────────────────────── */}
      <Panel title="The machine you're getting" testId="machine-panel">
        <div className="flex flex-col sm:flex-row gap-4">
          {/*
            Intrinsic size and `loading="lazy"`: it is a 1536×1024 render most of the way
            down a long page, and without the dimensions the whole panel below it jumped
            when it decoded.
          */}
          <img
            src={MACHINE_SPEC.imageSrc}
            alt={`${machine.model} protein shake machine`}
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="w-full sm:w-32 h-40 sm:h-auto object-contain rounded-xl bg-gray-50 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground" data-testid="machine-model">
              {machine.model}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-1 max-w-[68ch]">
              {machineBlurb(machine)}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-2 max-w-[68ch]">
              Its serial number and installation date go into Schedule A at installation, which you
              and our technician sign on site — see step 5.
            </p>
          </div>
        </div>
      </Panel>

      {/* ── What happens after this ────────────────────────────────────────── */}
      <Panel title="From here to your first payout" testId="timeline">
        <ol role="list" className="space-y-3">
          {timeline(terms).map((item, index) => (
            <li key={item.title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-primary/10 text-primary-ink text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-sm text-gray-700 leading-relaxed max-w-[68ch]">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      {!readOnly && (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-gray-700 leading-relaxed max-w-[68ch]">
            Continuing records that you have read these terms. It is not a signature — the agreement
            comes next, and you can still stop there.
          </p>
          <Button
            type="button"
            onClick={() => actions.ackPartnership()}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
            data-testid="button-continue"
          >
            {isSubmitting ? "Working..." : "These terms look right"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Content ─────────────────────────────────────────────────────────────────

/**
 * The six figures a gym owner repeats back to a business partner.
 *
 * All from `state.terms`, which is that gym's row. `formatInr(0)` rather than a
 * literal "₹0" so the one case where a gym *is* charged for something would show up
 * instead of being painted over.
 */
function headlineCards(terms: OnboardingTerms) {
  return [
    { icon: BadgeIndianRupee, value: formatInr(0), label: "For the machine, ever" },
    {
      icon: ShieldCheck,
      value: formatInr(terms.securityDepositInr),
      label: "Refundable security deposit",
    },
    { icon: CalendarClock, value: `${terms.termMonths} months`, label: "Initial term" },
    {
      icon: Handshake,
      value: `${terms.gymSharePctBeforeMilestone}% → ${terms.gymSharePctAfterMilestone}%`,
      label: "Your share of net profit",
    },
    {
      icon: Zap,
      value: formatInr(terms.electricityInrPerBlock),
      label: `Electricity, per ${terms.electricityCupsPerBlock.toLocaleString("en-IN")} cups`,
    },
    { icon: Megaphone, value: `${terms.advertisingGymSharePct}%`, label: "Of advertising revenue" },
  ];
}

/**
 * The four things the cards can't say in three words.
 *
 * The milestone row leads with "whichever comes first" rather than the cup count,
 * and names the margin the second test depends on. Which of the two lands first is a
 * fact about this machine's economics, not about the contract — see
 * `bindingMilestone()` — so the row states both and shows the arithmetic rather than
 * quoting one figure the gym may then watch not happen.
 */
function detailRows(terms: OnboardingTerms) {
  const netProfitPerCupInr =
    INDICATIVE_ECONOMICS.avgSellingPriceInr - INDICATIVE_ECONOMICS.directCostPerCupInr;
  const cupsToProfit = Math.ceil(terms.milestoneNetProfitInr / netProfitPerCupInr);

  return [
    {
      label: `Your share rises to ${terms.gymSharePctAfterMilestone}% at the milestone`,
      body: `Whichever comes first of ${terms.milestoneCups.toLocaleString("en-IN")} paid cups or ${formatInr(
        terms.milestoneNetProfitInr,
      )} of cumulative net profit — profit as clause 7 defines it, which is sales less the direct cost of ingredients, cup and payment processing. At a typical ${formatInr(
        netProfitPerCupInr,
      )} of profit a cup that second test lands at roughly ${cupsToProfit.toLocaleString(
        "en-IN",
      )} cups. A machine with thinner margins reaches the cup count first instead, and your share rises on whichever happens.`,
    },
    {
      label: `Advertising stays at ${terms.advertisingGymSharePct}% for the whole term`,
      body: "Your cut of what the screen on the machine earns. Unlike the profit share, this one never re-ratios — it does not step up and it does not step down.",
    },
    {
      label: "Electricity is reimbursed, not estimated",
      body: `${formatInr(terms.electricityInrPerBlock)} for every completed ${terms.electricityCupsPerBlock.toLocaleString(
        "en-IN",
      )} paid cups, assessed over each ${terms.electricityReviewWindowMonths}-month review period rather than monthly, with a minimum of ${formatInr(
        PARTNERSHIP.electricity.floorInrPerWindow,
      )} a period whatever the machine sells.`,
    },
    {
      label: `You are paid within ${terms.settlementDaysAfterMonthEnd} days of month-end`,
      body: "Against a statement showing cups, gross sales, direct costs and your share. Your dashboard shows the running numbers in the meantime, marked provisional until the statement.",
    },
  ];
}

/**
 * The restrictions, with clause numbers.
 *
 * Clause references are deliberate: they let a gym owner — or their lawyer — go
 * straight to the text in step 3 and check that this summary is honest.
 */
const RESTRICTIONS = [
  { clause: "§3", text: "The machine stays our property throughout. You are its custodian, not its owner." },
  { clause: "§14", text: "You cannot open it, refill it, or change what goes into a shake. Ingredients and hygiene are ours, and it is a food-safety line rather than a preference." },
  { clause: "§21", text: "You cannot move the machine, even within your own premises, without our written agreement." },
  { clause: "§12.4", text: `If the machine persistently underperforms we may remove it on ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice rather than leave it occupying your floor.` },
  { clause: "§5.6", text: "Your deposit can be drawn against loss or avoidable damage while the machine is in your custody. It is returned in full if there is nothing owing." },
] as const;

/** Machine facts: the model from the gym's own record, the hardware from the spec. */
function machineBlurb(machine: MachineSummary): string {
  const fitted = machine.accessories ? ` Fitted with: ${machine.accessories.toLowerCase()}.` : "";
  return (
    `${dimensionsSpelled()} — roughly the footprint of a locker bay. ` +
    `${MACHINE_SPEC.displayInches}-inch touch screen, ${MACHINE_SPEC.canisters} canisters holding ` +
    `${MACHINE_SPEC.capacityLitres} litres, ${MACHINE_SPEC.connectivity}, card and UPI.${fitted}`
  );
}

/** Sign → deposit → survey → installation → first payout. */
function timeline(terms: OnboardingTerms) {
  return [
    { title: "You sign", body: "Online, in step 3. We countersign and email you both copies." },
    {
      title: "Deposit",
      body: `${formatInr(terms.securityDepositInr)} by card, UPI or bank transfer — or defer it and we'll send the link.`,
    },
    {
      title: "Site survey",
      body: "We check the spot, the power point and the water access before anything ships.",
    },
    {
      title: "Installation",
      body: `We deliver, install and commission it. You and our technician sign Schedule A on site, and your ${terms.termMonths}-month term starts from that date.`,
    },
    {
      title: "First payout",
      body: `Within ${terms.settlementDaysAfterMonthEnd} days of the first month-end, with the statement behind it.`,
    },
  ];
}

// ── Presentational ──────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  testId,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid={testId}
    >
      {/* A heading, like the other card titles in this flow, under the shell's `h1`. */}
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
