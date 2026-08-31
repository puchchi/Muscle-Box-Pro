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
      <p className="text-sm text-gray-700 leading-relaxed">
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
            {/*
              `gray-700`, the colour every other explanatory sentence in this flow is set in,
              rather than `muted-foreground`. "₹0" and "20%" mean nothing without these six
              labels, so the label is the half of each card that carries the fact — and it was
              the faintest text on the step, under a figure set in `font-black`. The figure is
              still doing the shouting; there was no need to drain the label as well.
            */}
            <p className="text-xs text-gray-700 leading-tight">{card.label}</p>
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
              {/*
                No measure on the body, here or anywhere else on this step — the card edge
                is the measure. See the note above `SHELL` in `OnboardingFlow` for why: at
                `max-w-[56ch]` each of these four qualifiers stopped a third of the way
                short of its own card, under a `dt` that had no cap and so ran wider than
                the sentence explaining it.
              */}
              <dd className="text-sm text-gray-700 leading-relaxed mt-0.5">{row.body}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* ── The parts that cause arguments later ───────────────────────────── */}
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5"
        data-testid="worth-knowing"
      >
        {/* `text-base font-bold`, the same level as the white panels' headings — this block
            is their peer, not a note attached to one of them. See the scale in `Panel`. */}
        <h2 className="text-base font-bold text-foreground mb-1.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" aria-hidden="true" />
          Worth knowing before you sign
        </h2>
        {/*
          The count is derived, not typed. It said "All five" over a list rendered from
          `RESTRICTIONS`, which is the same trap "In short" already fell into once: the
          sentence claiming the list is complete is exactly the sentence that goes stale
          silently when someone adds a sixth item.
        */}
        {/*
          `text-gray-600` and not `gray-700`, which is the one place on this step that colour
          is doing hierarchy work. This sentence is *about* the list rather than part of it,
          and at body colour it was three lines of the same ink as the five restrictions
          under it — the heaviest paragraph in the block sitting above the thing a gym owner
          is meant to read. A notch lighter puts the restrictions themselves on top, which is
          the order they should be in. Still 7.5:1 on this amber, well past AA.

          `mb-4`: the items clear 10px of each other, so the gap between them and this
          framing has to be larger than that or the sentence joins the list as item zero.
        */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
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
              <span className="text-sm text-foreground leading-relaxed">{item.text}</span>
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

          **A bullet, not a tick.** The colour stays `text-primary` for the reason recorded
          earlier: these were `text-accent`, the flow's magenta and the only magenta in any
          of the five steps, and a second brand hue on the same glyph as the panel beside it
          reads as an accident. What changes is the glyph. A filled check circle means "yes,
          included", which is true of everything in "What we cover" and of nothing here —
          most plainly on the last item, where a tick beside a ₹50,000 deposit says it has
          been dealt with. A dot claims nothing. The geometry is the tick's, so the two
          lists still share a text left edge across the gap between the panels.
        */}
        <Panel title="What we need from you" icon={ClipboardList} testId="what-we-need">
          <ul role="list" className="space-y-2">
            {[
              ...PARTNERSHIP.gymProvides,
              // A noun phrase, like the three items above it. It read "…, payable after
              // signing, and you can defer it" — a clause bolted onto a list of things, and
              // the only item on the screen that changed grammatical person halfway through.
              `The refundable deposit of ${formatInr(terms.securityDepositInr)} after signing, which you can defer`,
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <span
                  aria-hidden="true"
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </span>
                <span>{item}</span>
              </li>
            ))}
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
            ~1.8 MB PNG rendered here at 144px wide, so a plain tag spent the better part of
            two megabytes of a gym owner's mobile data on a thumbnail. `sizes` is what makes
            the srcset useful rather than decorative: it tells the browser the real display
            width, so it fetches a ~144px AVIF instead of picking off the top of the list.
            `formats: ["image/avif", "image/webp"]` in next.config.mjs is already set.

            Intrinsic dimensions stay, for the reason they were added: without them the
            whole panel below jumped when the image decoded.

            `self-start` at both breakpoints, because this is a flex row whose default
            `align-items: stretch` resolves a definite cross-size — it gave the image box the
            full height of the paragraphs beside it, and `h-auto` cannot win against that.
            The render is a portrait tower on a plain backdrop, so it stays portrait at every
            width and is capped rather than spanning the card: `w-full` would be 457px tall on
            a 375px screen and push the specs that explain the machine off the fold.
          */}
          <Image
            src={MACHINE_SPEC.imageSrc}
            alt={`${machine.model} protein shake machine`}
            width={1024}
            height={1535}
            sizes="(min-width: 640px) 144px, 128px"
            className="w-32 sm:w-36 aspect-[3/4] object-cover rounded-xl bg-gray-50 flex-shrink-0 self-start"
          />
          <div className="min-w-0">
            {/* `font-semibold`, like every other labelled thing inside a panel on this step —
                the `dt`s in "The detail" and the timeline titles below. Bold at this size is
                the panel heading's weight, and this sits under one. */}
            <p className="text-sm font-semibold text-foreground" data-testid="machine-model">
              {machine.model}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-1">{machineBlurb(machine)}</p>
            {/*
              "See step 5." is gone. It pointed at a screen this gym has not reached, past
              a panel of its own numbered 1 to 5 and a rail numbered 1 to 5 — three
              competing sequences for one reader. The sentence says when the second
              signature happens, and the timeline directly below says it again in place.
            */}
            <p className="text-sm text-gray-700 leading-relaxed mt-2">
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
        {/* 16px between items, and the rule is what earns it: steps 5 and 6 both draw one, and
            without it five even blocks read as five separate errands rather than one path from
            here to the money. `flex-1` in a column that stretches to the row reaches the next
            numeral whether the item beside it runs to one line or three. */}
        <ol role="list">
          {timeline(terms).map((item, index, all) => {
            const isLast = index === all.length - 1;
            return (
              <li key={item.title} className="flex gap-3">
                <div className="flex flex-col items-center" aria-hidden="true">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums ${
                      item.yours ? "bg-primary/10 text-primary-ink" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {!isLast && <span className="w-px flex-1 bg-gray-200 my-1.5" />}
                </div>
                <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      {!readOnly && (
        <div className="space-y-3 pt-1">
          {/*
            One line. It was three, and two of them said the same thing twice: "not a
            signature", "commits you to nothing", "free to take your time". A reader at the
            bottom of six panels needs to know this button is not the signature and where it
            goes, which is what the button itself says.
          */}
          <p className="text-sm text-gray-700 leading-relaxed">
            This only records that you've read the terms. Nothing is committed until you sign.
          </p>
          {/*
            `sm:flex-row-reverse` with the primary action first in the DOM, matching step 4: the
            reading and tab order is "the thing you probably want, then the way back", while the
            visual order puts Continue on the right where this flow has trained a gym to look for
            it. On a phone they stack, primary on top.

            `sm:justify-between` sends the way back to the left edge rather than parking it
            against the primary. Two reasons, one of them the rail: it numbers left to right, so
            backwards is leftwards on this screen too. The other is that a ghost button the same
            height and radius as "Continue to the agreement", touching it, is a mis-tap that
            costs a gym the six panels it just read. `justify-content` and not the DOM, so the
            tab order above is untouched.
          */}
          <div className="flex flex-col sm:flex-row-reverse sm:justify-between items-stretch sm:items-center gap-3">
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
      )} of cumulative net profit, which is sales less the direct cost of ingredients, cup and payment processing.`,
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
 *
 * **UPI only.** The machine does not take cards. The card claim was in this sentence and is
 * still on `/` and `/protein-shake-vending-machine`, which is what the note in
 * `MACHINE_SPEC` warns about: the payment method is prose on three surfaces rather than a
 * field, so it drifts. Nothing here should mention cards until the hardware does.
 */
function machineBlurb(machine: MachineSummary): string {
  // A sentence, not a labelled field. "Fitted with: wall mount kit." was a colon dropped
  // into prose, and the only line in the panel that read as a form.
  const fitted = machine.accessories
    ? ` This one also comes fitted with ${machine.accessories.toLowerCase()}.`
    : "";
  return (
    `${dimensionsSpelled()}, roughly the footprint of a locker bay. ` +
    `It has a ${MACHINE_SPEC.displayInches}-inch touch screen and ${MACHINE_SPEC.canisters} ` +
    `canisters holding ${MACHINE_SPEC.capacityLitres} litres between them, connects over ` +
    `${MACHINE_SPEC.connectivity}, and takes payment by UPI.${fitted}`
  );
}

/**
 * Sign → deposit → survey → installation → first payout.
 *
 * Every title names **whose move it is**, because that is the one thing a reader wants from
 * a list like this and the one thing it was not saying. It ran "You sign", "Deposit", "Site
 * survey", "Installation", "First payout" — one sentence followed by four bare nouns, which
 * left a gym owner to work out from each body which of the five were waiting on them. Two of
 * the five are; the titles say so, and `yours` tints those two numerals to say it a second
 * time — a distinction carried only by the first word of a title is a distinction a reader
 * skimming a list of five never sees. Step 6's list marks its own two the same way.
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
      yours: true,
    },
    {
      title: "You pay the deposit",
      body: `${formatInr(terms.securityDepositInr)} by card, UPI or bank transfer. If the timing is awkward you can defer it, and we'll email you a payment link instead.`,
      yours: true,
    },
    {
      title: "We survey the site",
      body: "We visit to check the spot, the power point and the water access before anything ships.",
      yours: false,
    },
    {
      title: "We install it",
      body: `We deliver, install and commission the machine. You and our technician sign Schedule A on site, and your ${terms.termMonths}-month term runs from that date.`,
      yours: false,
    },
    {
      title: "We pay you",
      body: `Within ${terms.settlementDaysAfterMonthEnd} days of the first month-end, alongside the statement showing the cups sold and how your share was worked out.`,
      yours: false,
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
        `text-base font-bold`, which is what every card title in this flow uses — the sign
        panel, "In short", all four of step 4's and step 5's. There are four levels of text
        on these screens and each one is a step down from the one above it:

          16px bold foreground   — a panel heading (this)
          14px semibold foreground — a labelled thing inside it: a `dt`, a timeline title
          14px regular gray-700  — the sentence explaining that thing
          14px/12px gray-600     — framing copy and card captions

        These five started at 11px uppercase muted, which made each heading *smaller and
        lighter than the rows inside it*. The fix at the time was bold body size, which
        stopped the heading losing to its content but left it tying with it: "The detail" at
        `text-sm font-bold` and "Your share rises to 50%…" at `text-sm font-semibold` are
        one notch of weight apart at the same size, so the panel read as five peer rows
        rather than a heading over four. Size is the only lever that survives being
        squinted at, and `--font-display` is an alias of `--font-sans` here, so a heading
        cannot borrow a second typeface to do the job instead.

        `mb-4`, not `mb-3`. The rows below clear 20px of each other and the heading cleared
        12px of the first one, which puts the heading *closer to row one than row one is to
        row two* — the grouping the eye reads is "heading+row1, row2, row3, row4". A heading
        needs at least as much air beneath it as its content has between its own items.
      */}
      <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
