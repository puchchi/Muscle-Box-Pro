"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeIndianRupee,
  CalendarClock,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Handshake,
  Megaphone,
  Package,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MACHINE_SPEC, dimensionsSpelled } from "@shared/machine/spec";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";
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
 * those items further down or into a collapsed panel, the answer is no — they are the
 * reason "I have read and agree" can be a true statement on the step after this one.
 *
 * Continuing records `partnership_ack_at`: cheap to store, and it is the evidence
 * that the commercials were shown before the contract was.
 */
export default function StepPartnership({
  state,
  readOnly,
  isSubmitting,
  goToStep,
  actions,
}: StepViewProps) {
  const { terms, machine } = state;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700 leading-relaxed max-w-[56ch]">
        These are the terms on <strong className="text-foreground">{state.gymDisplayName}</strong>'s
        record, not a brochure. Every figure below is what the agreement you sign next will say.
      </p>

      {/*
        ── The six headlines ────────────────────────────────────────────────
        Three across from `sm` rather than `lg`. Two columns held all the way to 1024px,
        which put a 350px-wide card around "₹0" on any tablet and made the six figures
        read as three unrelated pairs. At 640px three columns are 189px each, which is
        wider than the longest figure here at `text-lg`.
      */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="terms-cards">
        {headlineCards(terms).map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 min-w-0">
            <card.icon className="w-4 h-4 text-primary mb-2" aria-hidden="true" />
            {/*
              `text-base` first: at 375px these are two columns about 160px wide, and
              "₹1,00,000" or "20% → 35%" at `text-lg` was wider than that. `break-words`
              is the backstop for a longer figure rather than a horizontal scrollbar.
            */}
            <p className="font-display font-black text-base sm:text-lg leading-tight text-foreground mb-1 tabular-nums break-words">
              {/*
                A figure whose meaning is carried by a symbol gets a spoken form as well.
                "20% → 50%" is the one card on this step where the *change* is the point,
                and an arrow is not a word: VoiceOver reads it as "right arrow" and NVDA
                skips it outright, leaving "20% 50%" over a label that does not say which
                comes first. The visible glyph is the compact form and stays.
              */}
              {card.readAs ? (
                <>
                  <span aria-hidden="true">{card.value}</span>
                  <span className="sr-only">{card.readAs}</span>
                </>
              ) : (
                card.value
              )}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── The detail behind them ─────────────────────────────────────────── */}
      {/*
        An icon, because two of the five panels on this step carried one and three did not,
        which on a six-panel page meant the eye had nothing consistent to jump between — and
        it left "The detail" with no mark to separate it from the four bold `dt`s underneath,
        all of them `text-sm` and all of them dark. `Calculator` for the panel that holds
        every figure the cards above could not fit into three words.

        `py-2.5`, not `py-3`. At `py-3` two adjacent rows sat 24px apart inside a card
        while the cards themselves sat 20px apart, so the page read as one continuous
        list of eleven things rather than six groups. The rows now clear 20px and the
        stack clears 24px, which is the order those two gaps should be in.
      */}
      <Panel title="The detail" icon={Calculator}>
        <dl className="divide-y divide-gray-200" data-testid="terms-list">
          {detailRows(terms).map((row) => (
            <div key={row.label} className="py-2.5 first:pt-0 last:pb-0">
              <dt className="text-sm font-semibold text-foreground">{row.label}</dt>
              <dd className="text-sm text-gray-700 leading-relaxed mt-0.5 max-w-[56ch]">{row.body}</dd>
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
        {/*
          The count is derived, not typed. It said "All five" over a list rendered from
          `RESTRICTIONS`, which is the same trap "In short" already fell into once: the
          sentence claiming the list is complete is exactly the sentence that goes stale
          silently when someone adds a sixth item.
        */}
        <p className="text-sm text-gray-700 leading-relaxed mb-3 max-w-[56ch]">
          The {RESTRICTIONS.length} restrictions that come with a machine we own and run. Every one
          of them is in the agreement you read next, in the order you will meet them there, so none
          of them is a surprise.
        </p>
        {/*
          An `ol`, and the count is visible.

          The plain "1." to "5." is what makes the sentence above checkable: a reader told
          there are five of these can see that they have read five, and can say "the third
          one" on a phone call.

          It used to carry a §-chip beside the numeral too — "§3", "§5.6" — which went
          straight to that clause in the agreement on the next step. Removed deliberately:
          two markers on every row meant the restriction itself started 80px in, and a gym
          owner reading a plain-language summary is not the reader who wants a citation.
          `RESTRICTIONS` still records which clause each item summarises (see its docstring),
          so the mapping is one grep away for anyone checking this list is honest — it is
          just no longer on screen. Note that this is now the only place the summary can
          drift from the document without a reader being able to tell.

          Two fixed-width columns rather than a flex row: the numeral column is sized once
          so all five sentences share a left edge. Five sentences with five different left
          edges read as five unrelated notes.

          The numeral is `aria-hidden`: an `ol` already announces "1 of 5", and the visible
          copy of it would make that "one, one, the machine stays…". Same reason the timeline
          below and step 5's list hide theirs.
        */}
        <ol role="list" className="space-y-2.5">
          {RESTRICTIONS.map((item, index) => (
            <li key={item.clause} className="grid grid-cols-[1.5rem_1fr] items-start">
              <span
                aria-hidden="true"
                className="text-xs font-bold text-amber-900 py-0.5 tabular-nums"
              >
                {index + 1}.
              </span>
              <span className="text-sm text-foreground leading-relaxed max-w-[56ch]">{item.text}</span>
            </li>
          ))}
        </ol>
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

        {/*
          `ClipboardList`, not `Ruler`: the list under it is a power point, access and a
          {formatInr} deposit as well as floor space, and a ruler labelled the one item
          that happens to be a measurement.

          The ticks are `text-primary`, like the panel beside them. They were
          `text-accent` — the flow's magenta, and the only magenta in any of the five
          steps — which made two lists of the same glyph, side by side, look like one of
          them meant something different. The headings and their icons are what separate
          "ours" from "yours"; a second brand hue on the same tick reads as an accident.
        */}
        <Panel title="What we need from you" icon={ClipboardList} testId="what-we-need">
          <ul role="list" className="space-y-2">
            {PARTNERSHIP.gymProvides.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              {/*
                A noun phrase, like the three items above it. It read "…, payable after
                signing, and you can defer it" — a clause bolted onto a list of things,
                and the only item on the screen that changed grammatical person halfway
                through.
              */}
              <span>
                The refundable deposit of {formatInr(terms.securityDepositInr)} after signing, which
                you can defer
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      {/*
        ── The actual machine ───────────────────────────────────────────────
        "The machine we'll install", not "the machine you're getting". Four hundred pixels
        above this, §3 says the machine stays our property and the gym is its custodian
        rather than its owner — so a heading promising they are getting one contradicts the
        block whose whole job is to be honest about that. This says the same warm thing
        ("one is coming, at no cost to you") without the ownership claim.
      */}
      <Panel title="The machine we'll install" icon={Package} testId="machine-panel">
        <div className="flex flex-col sm:flex-row gap-4">
          {/*
            `next/image`, not a raw `<img>`. The asset behind `MACHINE_SPEC.imageSrc` is a
            1.9 MB 1536×1024 PNG, and this renders it at 128px wide on a desktop and about
            343px on a phone — so the plain tag spent the better part of two megabytes of a
            gym owner's mobile data on a thumbnail. `sizes` is what makes the srcset useful
            rather than decorative: it tells the browser the real display width, so it
            fetches a ~128px AVIF here instead of picking off the top of the list.
            `formats: ["image/avif", "image/webp"]` in next.config.mjs is already set.

            Intrinsic dimensions stay, for the reason they were added: without them the
            whole panel below jumped when the image decoded. `next/image` lazy-loads and
            decodes async by default, so those two attributes are gone rather than changed.
          */}
          <Image
            src={MACHINE_SPEC.imageSrc}
            alt={`${machine.model} protein shake machine`}
            width={1536}
            height={1024}
            sizes="(min-width: 640px) 128px, 100vw"
            className="w-full sm:w-32 h-40 sm:h-auto object-contain rounded-xl bg-gray-50 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground" data-testid="machine-model">
              {machine.model}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-1 max-w-[56ch]">
              {machineBlurb(machine)}
            </p>
            {/*
              "See step 5." is gone. It pointed at a screen this gym has not reached, past
              a panel of its own numbered 1 to 5 and a rail numbered 1 to 5 — three
              competing sequences for one reader. The sentence says when the second
              signature happens, and the timeline directly below says it again in place.
            */}
            <p className="text-sm text-gray-700 leading-relaxed mt-2 max-w-[56ch]">
              On the day it arrives, its serial number and that date are written into Schedule A of
              your agreement, and you and our technician sign that schedule together on site.
            </p>
          </div>
        </div>
      </Panel>

      {/* ── What happens after this ────────────────────────────────────────── */}
      {/* `Clock`, the same icon step 5 gives "What happens next" — the two panels are the
          same list of the same milestones seen from either side of the signature, and
          reaching for a second sequence icon would have said they were different things.
          `CalendarClock` is already spoken for by the "Initial term" card further up this
          screen, and one glyph meaning two things on one page is worse than no glyph. */}
      <Panel title="From here to your first payout" icon={Clock} testId="timeline">
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
                <p className="text-sm text-gray-700 leading-relaxed max-w-[56ch]">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      {!readOnly && (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-gray-700 leading-relaxed max-w-[56ch]">
            Continuing records that you've read these terms. It is not a signature and commits you
            to nothing — the full agreement comes next, and you're free to take your time over it
            before you decide.
          </p>
          {/*
            `sm:flex-row-reverse` with the primary action first in the DOM, matching step 4: the
            reading and tab order is "the thing you probably want, then the way back", while the
            visual order puts Continue on the right where this flow has trained a gym to look for
            it. On a phone they stack, primary on top.
          */}
          <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center gap-3">
            {/*
              "Continue to the agreement", not "These terms look right".

              The old label asked a gym to assert something this action does not record and
              this screen has not earned. `ackPartnership` writes `partnership_ack_at` — an
              audit fact that the commercials were shown before the contract was — and the
              sentence directly above the button says exactly that. A button reading "these
              terms look right" turns that into an approval, so a gym with a question about
              the profit share had a choice between endorsing terms it had not finished
              thinking about and appearing to refuse them.

              This one makes no claim at all. It names where the button goes, which is the
              part a reader at the bottom of six panels actually wants to know, and it leaves
              agreeing to the step that asks for a signature.
            */}
            <Button
              type="button"
              onClick={() => actions.ackPartnership()}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
              data-testid="button-continue"
            >
              {isSubmitting ? "Working..." : "Continue to the agreement"}
            </Button>
            {/*
              The way back to step 1.

              The rail at the top of the page can already do this, but this screen is six panels
              long and the rail scrolls away with the first of them — so by the time a gym has
              read the terms and thought "that entity name is wrong", the only control that goes
              back is off-screen above them. This is the moment the thought occurs, so this is
              where the button belongs.

              Step 1 is genuinely editable when reached from here rather than a read-only view of
              itself, which is what makes this worth offering: see `isEditableRevisit` in
              `useOnboarding`. Hidden along with the rest of this block when step 2 is being
              revisited, because from there step 1 is behind an acknowledgement and the server
              will no longer take a correction to it.
            */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => goToStep(1)}
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Back to my details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Content ─────────────────────────────────────────────────────────────────

type HeadlineCard = {
  icon: React.ElementType;
  /** The compact, visible form. May use a symbol. */
  value: string;
  /** What a screen reader should say instead, when `value` leans on a glyph. */
  readAs?: string;
  label: string;
};

/**
 * The six figures a gym owner repeats back to a business partner.
 *
 * All from `state.terms`, which is that gym's row. `formatInr(0)` rather than a
 * literal "₹0" so the one case where a gym *is* charged for something would show up
 * instead of being painted over.
 */
function headlineCards(terms: OnboardingTerms): HeadlineCard[] {
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
      readAs: `${terms.gymSharePctBeforeMilestone}% rising to ${terms.gymSharePctAfterMilestone}%`,
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
 * The four things the cards can't say in three words — in one line each, not four.
 *
 * Every row is a bold label that already carries the fact, so the body underneath only
 * has to carry the qualifier. Three things came out on that principle:
 *
 * **The worked arithmetic.** The milestone row used to show its own sums — "at a typical
 * ₹55 of profit a cup that second test lands at roughly 9,091 cups" — which is a third of
 * this panel's text spent on a figure derived from `INDICATIVE_ECONOMICS`, marketing
 * midpoints rather than anything in this gym's terms row. Worse, it is the one number here
 * a gym might hold us to and we have not promised: 9,091 is what *our* example machine
 * does. The example belongs on `/gym-partnership`, where it still is, with the ranges and
 * the caveats around it. What survives is "whichever comes first", which is the fact.
 *
 * **The clause reference.** "Profit is what clause 7 defines it as: sales less…" made a
 * gym look up a clause to be told what the same sentence then told them. The definition
 * stays; the pointer goes. The §-chips in "Worth knowing" are different and stay — those
 * are a summary of restrictions offering a way to check itself against the document, and
 * the chip is the check.
 *
 * **The restatements.** "never re-ratios: it does not step up and it does not step down"
 * is one fact said twice, and "a minimum of ₹1,000 a period whatever the machine sells" is
 * what a minimum is.
 *
 * The milestone row still leads with "whichever comes first" rather than the cup count. A
 * gym told "15,000 cups" and then stepped up at 9,000 has been undersold its own deal, and
 * which of the two tests binds is a fact about this machine's margins rather than about the
 * contract — see `bindingMilestone()`.
 */
function detailRows(terms: OnboardingTerms) {
  return [
    {
      label: `Your share rises to ${terms.gymSharePctAfterMilestone}% at the milestone`,
      body: `Whichever comes first of ${terms.milestoneCups.toLocaleString("en-IN")} paid cups or ${formatInr(
        terms.milestoneNetProfitInr,
      )} of cumulative net profit — sales less the direct cost of ingredients, cup and payment processing.`,
    },
    {
      label: `Advertising stays at ${terms.advertisingGymSharePct}% for the whole term`,
      body: "Your cut of what the screen on the machine earns. Unlike the profit share, it never steps up or down.",
    },
    {
      label: "Electricity is reimbursed, not estimated",
      body: `${formatInr(terms.electricityInrPerBlock)} for every completed ${terms.electricityCupsPerBlock.toLocaleString(
        "en-IN",
      )} paid cups, assessed over ${terms.electricityReviewWindowMonths}-month periods rather than monthly, with a floor of ${formatInr(
        PARTNERSHIP.electricity.floorInrPerWindow,
      )} a period.`,
    },
    {
      label: `You are paid within ${terms.settlementDaysAfterMonthEnd} days of month-end`,
      body: "Against a statement showing cups, gross sales, direct costs and your share. Your dashboard carries running figures in the meantime, marked provisional.",
    },
  ];
}

/**
 * The restrictions, with clause numbers.
 *
 * Clause references are deliberate: they let a gym owner — or their lawyer — go
 * straight to the text on the next step and check that this summary is honest.
 *
 * **Document order, ascending, and it must stay that way.** This ran §3, §14, §21,
 * §12.4, §5.6 — an escalating narrative (whose machine it is, what you can't do to it,
 * what we can do about it, what it can cost you) that nothing on the screen signposts.
 * What a reader sees is five clause numbers in no order at all, which undercuts the
 * point of printing clause numbers: checking the summary against the agreement means
 * scrolling the agreement, and the agreement is in numerical order. So is this.
 */
const RESTRICTIONS = [
  { clause: "§3", text: "The machine stays our property throughout. You are its custodian, not its owner." },
  { clause: "§5.6", text: "Your deposit can be drawn against loss or avoidable damage while the machine is in your custody. It is returned in full if there is nothing owing." },
  { clause: "§12.4", text: `If the machine persistently underperforms we may remove it on ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice rather than leave it occupying your floor.` },
  { clause: "§14", text: "You cannot open the machine, refill it, or change what goes into a shake. Ingredients and hygiene are our responsibility, and that is a food-safety line rather than a preference." },
  { clause: "§21", text: "You cannot move the machine, even within your own premises, without our written agreement." },
] as const;

/**
 * Machine facts: the model from the gym's own record, the hardware from the spec.
 *
 * Two sentences rather than a spec sheet with commas in it. The second half used to run
 * "27-inch touch screen, 7 canisters holding 28 litres, 4G + WiFi, card and UPI" — four
 * unrelated facts in one comma list, which is how a datasheet reads and not how a paragraph
 * does. The dimensions stay first and stay spelled out, because the question a gym owner is
 * actually asking is whether it fits against a particular wall.
 */
function machineBlurb(machine: MachineSummary): string {
  // A sentence, not a labelled field. "Fitted with: wall mount kit." was a colon dropped
  // into prose, and the only line in the panel that read as a form.
  const fitted = machine.accessories
    ? ` This one also comes fitted with ${machine.accessories.toLowerCase()}.`
    : "";
  return (
    `${dimensionsSpelled()} — roughly the footprint of a locker bay. ` +
    `It has a ${MACHINE_SPEC.displayInches}-inch touch screen and ${MACHINE_SPEC.canisters} ` +
    `canisters holding ${MACHINE_SPEC.capacityLitres} litres between them, connects over ` +
    `${MACHINE_SPEC.connectivity}, and takes both card and UPI.${fitted}`
  );
}

/**
 * Sign → deposit → survey → installation → first payout.
 *
 * Every title names **whose move it is**, because that is the one thing a reader wants from
 * a list like this and the one thing it was not saying. It ran "You sign", "Deposit", "Site
 * survey", "Installation", "First payout" — one sentence followed by four bare nouns, which
 * left a gym owner to work out from each body which of the five were waiting on them. Two of
 * the five are; the titles now say so at a glance.
 *
 * Deliberately no durations on the middle three. Survey and installation lead times are not
 * in `PARTNERSHIP` or anywhere else in this repo, and a timeline is exactly the screen where
 * an invented "within a week" becomes a promise a gym holds us to.
 */
function timeline(terms: OnboardingTerms) {
  return [
    {
      title: "You sign",
      // "Online, in step 3" sat inside a circle labelled "1", under a rail whose own
      // step 3 is this list's step 1. "The next screen" is the same fact without
      // asking a reader to reconcile two numbering schemes.
      body: "Online, on the next screen. We countersign the same document and email both copies to you.",
    },
    {
      title: "You pay the deposit",
      body: `${formatInr(terms.securityDepositInr)} by card, UPI or bank transfer. If the timing is awkward you can defer it, and we'll email you a payment link instead.`,
    },
    {
      title: "We survey the site",
      body: "We visit to check the spot, the power point and the water access before anything ships.",
    },
    {
      title: "We install it",
      body: `We deliver, install and commission the machine. You and our technician sign Schedule A on site, and your ${terms.termMonths}-month term runs from that date.`,
    },
    {
      title: "We pay you",
      body: `Within ${terms.settlementDaysAfterMonthEnd} days of the first month-end, alongside the statement showing the cups sold and how your share was worked out.`,
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
      {/*
        `text-sm font-bold text-foreground`, which is what every other card title in this
        flow uses — the sign panel, "In short", all four of step 4's and step 5's.

        These five were 11px uppercase muted, which made each panel heading *smaller and
        lighter than the rows inside it*: "THE DETAIL" was the least prominent text in a
        card whose own `dt`s are bold body size. A heading that loses to its content stops
        working as a heading, and on this step it also meant two different `h2` styles on
        one screen, since "Worth knowing before you sign" already reads at this weight.
      */}
      <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
