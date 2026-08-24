"use client";

/**
 * The public, pre-sales explanation of the gym partnership.
 *
 * This is one of three renderings of the same deal (docs/gym-onboarding.md §2):
 * this page shows *indicative* standard terms to anyone; onboarding step 2 shows
 * an invited gym *its own* terms; onboarding step 3 shows the full 47-section
 * agreement. Two rules follow from that and both matter legally:
 *
 *   1. Every number here comes from @shared/partnership — never hardcode a rupee
 *      figure or a percentage in this file.
 *   2. The full agreement text does not belong on a public page, and the
 *      "indicative terms" line must stay visible. A gym's signed agreement
 *      governs, not this summary.
 *
 * Three things about the layout are decisions rather than defaults, because this
 * page is read differently from the rest of the marketing site:
 *
 *   - **There is a CTA before the terms, not only after them.** A gym owner who is
 *     already sold should not have to scroll eight sections of contract summary to
 *     find the button. The sticky bar below the fold is the mobile equivalent.
 *   - **Nothing fades in on scroll.** Every other marketing page animates its
 *     sections into view; this one is a reference document that people scan, jump
 *     around in and come back to, and content that animates on every pass fights
 *     that. Only the hero moves, and it stops moving under
 *     `prefers-reduced-motion`.
 *   - **The worked month is a real `<table>`.** It is tabular data — a screen
 *     reader should be able to read "Gross revenue, ₹72,000" as a row rather than
 *     as two unrelated runs of text.
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileSignature,
  Handshake,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  Ruler,
  Send,
  ShieldCheck,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import {
  PARTNERSHIP,
  INDICATIVE_ECONOMICS,
  bindingMilestone,
  formatInr,
  workedMonth,
} from "@shared/partnership/summary";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";

const example = workedMonth();
const exampleAtMilestone = workedMonth(INDICATIVE_ECONOMICS.exampleCupsPerMonth, true);
const milestone = bindingMilestone();

const headlines = [
  { icon: BadgeIndianRupee, label: "Machine cost to you", value: formatInr(PARTNERSHIP.machineCostInr) },
  {
    icon: ShieldCheck,
    label: "Refundable deposit",
    value: formatInr(PARTNERSHIP.securityDepositInr),
  },
  {
    icon: Handshake,
    label: "Your profit share",
    value: `${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% → ${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}%`,
  },
  { icon: CalendarClock, label: "Initial term", value: `${PARTNERSHIP.initialTermMonths} months` },
];

/**
 * The jump nav, and the `id`s the sections carry. Kept as one list so a section
 * renamed here cannot leave a dead anchor behind.
 */
const sections = [
  { id: "offer", label: "The offer" },
  { id: "money", label: "The money" },
  { id: "responsibilities", label: "Who does what" },
  { id: "term", label: "Term & exit" },
  { id: "getting-started", label: "Getting started" },
  { id: "faq", label: "FAQ" },
];

const responsibilities = {
  mbp: [
    "Buys, delivers and installs the machine",
    "Stocks it with ingredients, cups and consumables",
    "Cleans, sanitises and services it on a schedule",
    "Repairs it, at our cost, including spare parts",
    "Takes and processes every member payment",
    "Carries the licences, insurance and product liability",
  ],
  // Two groups rather than one list, because they are two different kinds of
  // thing (§14, §21) and a tick beside "keeps a competitor out" reads as a perk
  // when it is a restriction. `gymProvides` is reused verbatim so the
  // contributions have one wording across this page and onboarding step 2.
  gymProvides: PARTNERSHIP.gymProvides,
  gymAgrees: [
    "Leaves the machine where it is, and unopened",
    "Keeps a competing shake machine out of the same premises",
  ],
};

/**
 * Where the visitor actually starts, which is before the invite link exists.
 *
 * Deliberately **unnumbered**, and separated from the five below rather than folded
 * in as a sixth. Steps 1–5 are the wizard's own steps: they carry these numbers in
 * `shared/onboarding/steps.ts`, in the onboarding progress rail and in the invitation
 * email. Calling the demo request "step 1" here would have every gym open its link
 * and find that "Step 1 of 6" was the thing this page called step 2.
 *
 * The wizard's step 6 — installation — is not in the list below for the mirror-image
 * reason: this section runs from demo to dashboard, and installation comes after the
 * dashboard exists. What this page owes a visitor about it is that we do it and that the
 * term counts from it, and both are said above.
 */
const firstMove = {
  icon: Send,
  title: "Request a demo",
  body: "Tell us about your gym. We show you the machine and check the fit.",
};

const onboardingSteps = [
  { icon: UserCheck, title: "Confirm your details", body: "Gym name, address, GST, and who signs." },
  { icon: Handshake, title: "Your partnership", body: "Your specific terms, on one screen, before any document." },
  { icon: FileSignature, title: "Review and sign", body: "The full agreement, readable, then signed online." },
  { icon: CreditCard, title: "Security deposit", body: `${formatInr(PARTNERSHIP.securityDepositInr)}, refundable, paid securely.` },
  { icon: KeyRound, title: "You're set up", body: "Set a password and your dashboard goes live." },
];

const moneyRows = [
  {
    // Not "shakes sold in the month" — the card is already headed "One example
    // month". The "about N a day" gloss lives here rather than in a paragraph above
    // the table, which stated the same cup count a second time three lines earlier.
    label: `Shakes sold`,
    detail: `${example.cups.toLocaleString("en-IN")} cups, about ${Math.round(example.cups / 30)} a day`,
    amount: null,
  },
  { label: "Gross revenue", detail: `at ${formatInr(INDICATIVE_ECONOMICS.avgSellingPriceInr)} a cup`, amount: example.grossInr },
  {
    label: "Direct costs",
    detail: `ingredients, cup, consumables at ${formatInr(INDICATIVE_ECONOMICS.directCostPerCupInr)} a cup`,
    amount: -example.directCostsInr,
  },
  { label: "Net profit", detail: "what the split applies to", amount: example.netProfitInr, emphasis: true },
];

/** Facts from `PARTNERSHIP`, phrased for the hero. Never a claim not in the data. */
const heroProof = [
  "Nothing to buy or maintain",
  `Exit on ${PARTNERSHIP.noticeDays.gymExit} days' notice`,
  "No early-termination charge",
];

export default function GymPartnership() {
  const reduceMotion = useReducedMotion();

  return (
    // `pb-24 lg:pb-0` clears the sticky mobile CTA bar, which is fixed and would
    // otherwise sit on top of the last rows of the footer. 24 rather than 20: at
    // 320px the bar's label wraps and it grows to 90px, which overran an 80px reserve.
    <div className="min-h-screen bg-background flex flex-col pb-24 lg:pb-0">
      <SkipLink />
      <Navbar />
      {/* Spacer for the fixed navbar, so the sticky jump nav below can pin at top-16. */}
      <div className="h-16 flex-shrink-0" aria-hidden="true" />
      <SectionNav />

      <main id="main" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="max-w-5xl mx-auto relative z-10">
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                Gym Partnership
              </span>
              <h1 className="font-display font-black text-white uppercase text-3xl sm:text-4xl lg:text-5xl leading-[0.95] tracking-tight mb-5">
                A protein shake machine
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  at no cost to your gym
                </span>
              </h1>
              {/*
                No "we pay for everything it needs" — `heroProof` directly below opens
                with "Nothing to buy or maintain", which is the same claim in the same
                eyeful. `text-balance` because at `max-w-xl` this wraps to two lines and
                the natural break orphans a short one.
              */}
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto text-balance">
                We install and run the machine, then share the profit with you every month.
              </p>

              {/* Factual reassurances, straight from PARTNERSHIP — not testimonials. */}
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6">
                {heroProof.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-gray-300 text-[13px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {/*
                A CTA above the eight sections of terms, not only after them. The
                second button is an in-page jump rather than a route, so someone who
                wants to read first is not sent off the page to do it.
              */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 rounded-full px-7 font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer transition-colors"
                >
                  <Link href="/gym-demo" data-testid="button-hero-demo">
                    Request a demo
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 rounded-full px-7 font-bold text-white border-white/25 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <a href="#money">See how the money works</a>
                </Button>
              </div>
            </motion.div>

            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
              {headlines.map((h) => (
                <div
                  key={h.label}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                  data-testid={`headline-${h.label}`}
                >
                  <h.icon className="w-4 h-4 text-primary mb-3" aria-hidden="true" />
                  {/* Reversed so the figure reads first visually while `dt` still
                      precedes its `dd` in the DOM. */}
                  <div className="flex flex-col-reverse gap-1">
                    <dt className="text-gray-300 text-xs leading-snug">{h.label}</dt>
                    <dd className="text-white font-display font-black text-xl sm:text-2xl leading-none tabular-nums">
                      {h.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/*
          Load-bearing disclaimer. This page describes the standard offer; an
          individual gym's signed agreement can differ and is what binds. Do not
          remove it, and do not bury it below the fold — it is the reason we can
          publish commercials publicly at all.

          Left-aligned rather than centred: it runs to three lines on a phone, and
          centred ragged text at 13px is the hardest thing on the page to read.
        */}
        <div className="bg-amber-50 border-b border-amber-200 py-3.5 px-4 sm:px-6 lg:px-8" role="note">
          <p className="max-w-4xl mx-auto text-amber-900 text-[13px] leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
            <span>
              <strong>Indicative terms. Your signed agreement governs.</strong> Figures on this page
              are the standard offer and typical volumes as of Q1 2026, not a guarantee of income.
              Published by BlendBox Innovations LLP, the company behind MuscleBoxPro.
            </span>
          </p>
        </div>

        {/* ── What you get / what it costs ─────────────────────────────────── */}
        <Section id="offer">
          <SectionHeading
            eyebrow="The offer"
            title="What you get, and what it costs"
            blurb="The machine stays our property and our expense. You provide the floor space."
          />

          <div className="grid md:grid-cols-2 gap-5 mt-9">
            <Card>
              <CardTitle icon={CheckCircle2} tone="primary">
                Included at no cost
              </CardTitle>
              <ul className="space-y-3">
                {PARTNERSHIP.includedInService.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <CheckCircle2
                      className="w-4 h-4 text-primary flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardTitle icon={Ruler} tone="accent">
                What you put in
              </CardTitle>
              <ul className="space-y-3">
                {PARTNERSHIP.gymProvides.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <Ruler className="w-4 h-4 text-accent flex-shrink-0 mt-1" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[15px] font-semibold mb-1.5">
                  A refundable deposit of {formatInr(PARTNERSHIP.securityDepositInr)}
                </p>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  Held against loss or avoidable damage, returned at the end less anything properly
                  due. Not a fee, and never netted off your payouts.
                </p>
              </div>
            </Card>
          </div>
        </Section>

        {/* ── How the money works ──────────────────────────────────────────── */}
        <Section id="money" tinted>
          <SectionHeading
            eyebrow="The economics"
            title="How the money works"
            blurb="You share the profit, not the gross. The costs come off first, and they are ours."
          />

          <div className="grid lg:grid-cols-5 gap-5 mt-9">
            {/* Worked month */}
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 sm:p-6">
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-4">
                One example month
              </h3>

              <table className="w-full">
                <caption className="sr-only">
                  Worked example: one month at {example.cups.toLocaleString("en-IN")} cups
                </caption>
                <tbody>
                  {moneyRows.map((row) => (
                    <tr key={row.label} className={row.emphasis ? "border-t border-border" : ""}>
                      <th
                        scope="row"
                        className={`text-left align-top font-normal pr-4 ${
                          row.emphasis ? "pt-3.5 pb-2.5" : "py-2.5"
                        }`}
                      >
                        <span className={`block text-[15px] ${row.emphasis ? "font-bold" : ""}`}>
                          {row.label}
                        </span>
                        <span className="block text-muted-foreground text-xs leading-snug mt-0.5">
                          {row.detail}
                        </span>
                      </th>
                      <td
                        className={`text-right align-top ${
                          row.emphasis ? "pt-3.5 pb-2.5" : "py-2.5"
                        }`}
                      >
                        {row.amount !== null && (
                          <span
                            className={`font-display font-black tabular-nums whitespace-nowrap ${
                              row.emphasis ? "text-lg" : "text-base text-muted-foreground"
                            }`}
                          >
                            {row.amount < 0 ? `− ${formatInr(-row.amount)}` : formatInr(row.amount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/*
                The step-up shown side by side rather than described in a sentence.
                Both figures are the *same* month at the two shares, so the pair is
                the comparison a gym owner actually wants and the bars carry the
                20:50 proportion without another number to read.
              */}
              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-primary mb-4">
                  Your share of that month
                </p>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    {/* Not "…% of net profit" on both halves: the table row directly
                        above is "Net profit — what the split applies to". */}
                    <p className="text-muted-foreground text-xs leading-snug mb-1.5">
                      From day one · {example.gymSharePct}%
                    </p>
                    <p
                      className="font-display font-black text-2xl sm:text-3xl text-foreground leading-none tabular-nums"
                      data-testid="example-gym-share"
                    >
                      {formatInr(example.gymShareInr)}
                    </p>
                    <div className="mt-3 h-1.5 rounded-full bg-primary/15" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{ width: `${example.gymSharePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs leading-snug mb-1.5">
                      After the milestone · {exampleAtMilestone.gymSharePct}%
                    </p>
                    <p className="font-display font-black text-2xl sm:text-3xl text-primary leading-none tabular-nums">
                      {formatInr(exampleAtMilestone.gymShareInr)}
                    </p>
                    <div className="mt-3 h-1.5 rounded-full bg-primary/15" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${exampleAtMilestone.gymSharePct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mt-4">
                  Illustration only. Your footfall sets the volume.
                </p>
              </div>
            </div>

            {/* The three streams */}
            <div className="lg:col-span-2 space-y-4">
              <MoneyCard
                icon={Handshake}
                title="Profit share steps up"
                body={
                  // The two triggers and the real cup count all stay: quoting 15,000 alone
                  // undersells a gym whose share rises at 9,091, and quoting 9,091 alone
                  // oversells one with thinner margins. The percentages do not — the
                  // headline cards and the example beside this both print them.
                  <>
                    Whichever comes first of{" "}
                    {PARTNERSHIP.milestone.cups.toLocaleString("en-IN")} paid cups or{" "}
                    {formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr)} of cumulative net
                    profit, which is about {milestone.cups.toLocaleString("en-IN")} cups at the
                    margin above. Thinner margins hit the cup count first.
                  </>
                }
              />
              <MoneyCard
                icon={Megaphone}
                title="Advertising, on top"
                body={
                  <>
                    {PARTNERSHIP.advertisingGymSharePct}% of what the screen on your machine earns.
                    This one stays flat for the whole term.
                  </>
                }
              />
              <MoneyCard
                icon={Zap}
                title="Electricity, reimbursed"
                body={
                  <>
                    {formatInr(PARTNERSHIP.electricity.inrPerBlock)} per completed{" "}
                    {PARTNERSHIP.electricity.cupsPerBlock.toLocaleString("en-IN")} paid cups,
                    reviewed every {PARTNERSHIP.electricity.reviewWindowMonths} months. Minimum{" "}
                    {formatInr(PARTNERSHIP.electricity.floorInrPerWindow)} a period.
                  </>
                }
              />
              <MoneyCard
                icon={CalendarClock}
                title="Paid monthly, on a statement"
                body={
                  <>
                    Within {PARTNERSHIP.settlementDaysAfterMonthEnd} days of month-end, with a
                    statement of cups, revenue, costs and your share. Live figures before then are
                    marked provisional.
                  </>
                }
              />
            </div>
          </div>

          {/* Mid-page CTA — placed at the point of highest intent, right after the maths. */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-[15px] mb-1">Want these numbers for your own footfall?</p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Tell us your member count and we will run the same maths.
              </p>
            </div>
            <Button
              asChild
              className="min-h-12 rounded-full px-6 font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer transition-colors flex-shrink-0"
            >
              <Link href="/gym-demo" data-testid="button-midpage-demo">
                Get an estimate
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Section>

        {/* ── Who does what ────────────────────────────────────────────────── */}
        <Section id="responsibilities">
          <SectionHeading
            eyebrow="Responsibilities"
            title="Who does what"
            blurb="We run the machine, you host it. You never touch stock, hygiene, repairs or payments."
          />

          {/*
            `items-start`, so each card is as tall as its own contents. Stretched to a
            common height the MBP card carried 74px of empty space below its last row,
            which reads as a card that failed to load the rest of itself. Two cards of
            honest, different heights read as two lists of different lengths.
          */}
          <div className="grid md:grid-cols-2 items-start gap-5 mt-9">
            <Card>
              <CardTitle icon={Wrench} tone="primary">
                MuscleBoxPro
              </CardTitle>
              {/*
                The card's own label, matching the two in the card beside it. Without
                it this list started 28px above its counterpart, so the two columns of
                bullets did not line up across the section — and the heavier half of
                the deal was the half with nothing naming it.
              */}
              <CardLabel id="resp-mbp">We handle</CardLabel>
              <ul className="space-y-3" aria-labelledby="resp-mbp">
                {responsibilities.mbp.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <CheckCircle2
                      className="w-4 h-4 text-primary flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardTitle icon={UserCheck} tone="accent">
                Your gym
              </CardTitle>
              <CardLabel id="resp-provide">You provide</CardLabel>
              <ul className="space-y-3" aria-labelledby="resp-provide">
                {responsibilities.gymProvides.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <CheckCircle2
                      className="w-4 h-4 text-accent flex-shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-5 border-t border-border">
                <CardLabel id="resp-agree">You also agree</CardLabel>
                <ul className="space-y-3" aria-labelledby="resp-agree">
                  {responsibilities.gymAgrees.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                      <Lock
                        className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </Section>

        {/* ── Term and exit ────────────────────────────────────────────────── */}
        <Section id="term" tinted>
          <SectionHeading
            eyebrow="Term and exit"
            title="You are not locked in"
            blurb="Long enough for the machine to be worth installing, short enough that you are not stuck with one that isn't working."
          />

          <div className="grid sm:grid-cols-3 gap-5 mt-9">
            <TermCard
              icon={CalendarClock}
              value={`${PARTNERSHIP.initialTermMonths} months`}
              label="Initial term"
              body="Counted from installation, not from the day you sign."
            />
            <TermCard
              icon={LogOut}
              value={`${PARTNERSHIP.noticeDays.gymExit} days`}
              label="Your notice to exit"
              body="In writing, at any point, for any reason. We collect the machine at our cost and return your deposit."
            />
            <TermCard
              icon={Wrench}
              value={`${PARTNERSHIP.noticeDays.mbpUnderperformance} days`}
              label="Our notice to remove"
              body="If the machine persistently underperforms, we may take it back rather than leave it on your floor."
            />
          </div>
        </Section>

        {/* ── Onboarding steps ─────────────────────────────────────────────── */}
        <Section id="getting-started">
          <SectionHeading
            eyebrow="Getting started"
            title="From demo to dashboard"
            blurb="Placement is invite-only. If your gym is a fit after the demo we send one link that walks you through every step. Stop partway and pick up later."
          />

          {/*
            Three across rather than the five-across rail this used to be: the demo
            request is now the first item, and six cards on one row leaves each of them
            too narrow for a title and a line of body text. The horizontal connector
            went with it — it can only be drawn honestly across a single row, and the
            numbered badges carry the sequence without it.
          */}
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-9">
            {/*
              The one card here that is also a control. Every other step needs the
              invite link before it can be started, and this one is a route the visitor
              can take now — so it is the only one that lifts, changes colour and
              takes a cursor. Six identical cards, one of which silently happened to be
              actionable, had the affordance and the interaction disagreeing.
            */}
            <li className="relative">
              <Link
                href="/gym-demo"
                data-testid="button-step-demo"
                className="group h-full flex flex-col bg-primary/5 border border-primary/30 rounded-2xl p-5 shadow-sm cursor-pointer transition-colors hover:bg-primary/[0.09] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="px-2.5 h-7 rounded-full bg-foreground text-white font-display font-black text-[10px] uppercase tracking-[0.12em] flex items-center flex-shrink-0">
                    Start here
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <firstMove.icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="font-bold text-[15px] mb-1.5 flex items-center gap-1.5">
                  {firstMove.title}
                  {/* Transform only, so the nudge cannot reflow the title beside it. */}
                  <ArrowRight
                    className="w-3.5 h-3.5 text-primary flex-shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">{firstMove.body}</p>
              </Link>
            </li>

            {onboardingSteps.map((step, i) => (
              <li
                key={step.title}
                className="relative bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  {/*
                    White on `--foreground` (15:1), not on `--primary` (3.25:1 at 12px)
                    and not the grey-on-grey tint this was: five washed-out badges on a
                    white section read as five cards that had failed to load. Solid dark
                    matches the "Start here" pill above, so the badges read as one rail
                    of step labels rather than as decoration.

                    `aria-hidden` on the digit: the unnumbered "Start here" card is
                    still item 1 of this `ol`, so a reader that announced both would say
                    "item 2 … 1 Confirm your details". The list position carries the
                    order; the digit is there to match the wizard's own labels.
                  */}
                  <span
                    className="w-7 h-7 rounded-full bg-foreground text-white font-display font-black text-xs flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  {/*
                    Accent, where the demo card's chip is primary — orange is the move
                    available now, pink is the wizard that follows it. Same split the
                    responsibilities cards already use. 4.6:1 on white, well past the
                    3:1 a non-text graphic needs.
                  */}
                  <span className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="font-bold text-[15px] mb-1.5">{step.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <Section id="faq" tinted>
          {/*
            A heading rail beside the questions rather than above them. Stacked, the
            accordion needs a `max-w-*` to keep the answers at a readable measure, and
            any width that does that leaves a quarter of the section's 1024px column
            empty on the right — every other section fills it, so the FAQ alone read as
            shifted left. Side by side, the same measure fills the row.

            The rail is sticky below both pinned bars, so the visitor keeps the heading
            while working down eleven questions.
          */}
          <div className="grid lg:grid-cols-[17rem_1fr] gap-8 lg:gap-14">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <SectionHeading eyebrow="Questions" title="Frequently asked" />
            </div>

            {/*
              `AccordionTrigger` from components/ui carries no focus ring of its own,
              so one is added here. Every collapsed answer is otherwise invisible to a
              keyboard user, who cannot see which question they are about to open.
            */}
            <Accordion type="single" collapsible className="space-y-2.5">
              {PARTNERSHIP_FAQ.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  className="border border-border rounded-2xl bg-card px-4 sm:px-5"
                >
                  <AccordionTrigger className="min-h-[3.5rem] text-left text-[15px] font-bold hover:no-underline cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {faq.question}
                  </AccordionTrigger>
                  {/*
                    The measure is capped on the prose, not on the accordion: the
                    trigger stays the full width of its row so the whole card is a
                    target, while the answer wraps inside the 65–75 characters a line
                    that body text reads at. Uncapped it ran to 94.

                    32rem, not `ch`: this font's `0` is ~11px at 15px against an
                    average glyph of ~7px, so `70ch` resolves to 769px — wider than the
                    column, and the cap does nothing. 512px measures at ~73 characters.
                  */}
                  <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed max-w-[32rem]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-r from-accent to-primary px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="font-display font-black uppercase text-white text-2xl sm:text-4xl tracking-tight leading-tight mb-4">
              See whether your gym is a fit
            </h2>
            {/*
              Solid white, not `white/85`. Dimmed white over this gradient measures
              2.7:1 at its orange end — the lowest-contrast text on the site. Solid
              white is 3.25:1 there, which is still under 4.5 because `--primary`
              cannot carry small white text at all; see the note on `Section`.
            */}
            <p className="text-white text-[15px] sm:text-lg leading-relaxed mb-8">
              We will come back honestly, including if your volumes would not justify a machine.
              No cost, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="min-h-12 rounded-full px-8 font-bold bg-white text-gray-900 hover:bg-white/90 border-0 shadow-lg cursor-pointer transition-colors w-full sm:w-auto"
              >
                <Link href="/gym-demo" data-testid="button-request-demo">
                  Request a demo
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="min-h-12 rounded-full px-8 font-bold text-white bg-white/15 border border-white/30 hover:bg-white/25 cursor-pointer transition-colors w-full sm:w-auto"
              >
                <Link href="/specs">See the machine specs</Link>
              </Button>
            </div>
            <p className="text-white text-[13px] mt-7">
              Already a partner?{" "}
              <Link
                href="/gym/login"
                className="text-white font-semibold underline underline-offset-2 hover:text-white/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Sign in to your dashboard
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <StickyCta />
    </div>
  );
}

// ─── Chrome ───────────────────────────────────────────────────────────────────

/**
 * First thing in the tab order, invisible until focused.
 *
 * The footer on this page carries roughly forty links, so without this a keyboard
 * user arriving from another page tabs through the whole nav before reaching the
 * terms. `z-[60]` rather than the site's `z-50` scale on purpose: it has to sit
 * over the fixed navbar, which is the one thing it would otherwise appear behind.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
    >
      Skip to content
    </a>
  );
}

/**
 * Jump nav for a page that is eight sections of reference material.
 *
 * Desktop only. The mobile equivalent of "let me get to the bit I care about" is a
 * horizontally scrolling strip, which is the one thing a phone layout should not
 * introduce; phones get the sticky CTA instead. No active-section highlighting —
 * that needs a scroll observer running on every marketing page view to move a
 * colour, and the anchors are already the useful part.
 */
function SectionNav() {
  return (
    <nav
      aria-label="On this page"
      className="hidden lg:block sticky top-16 z-40 border-b border-border bg-white/90 backdrop-blur-md"
    >
      <ul className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 h-12">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block px-3 py-2 rounded-lg text-[13px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The mobile CTA.
 *
 * Fixed rather than revealed on scroll: a scroll listener to hide it over the hero
 * buys one visual nicety and costs a listener on every phone visit, and the bar is
 * the only CTA in reach while someone is four sections deep in the terms.
 */
function StickyCta() {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight">Nothing to buy or maintain</p>
        <p className="text-muted-foreground text-xs leading-tight mt-0.5">
          {PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% →{" "}
          {PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% profit share
        </p>
      </div>
      <Button
        asChild
        className="ml-auto min-h-11 rounded-full px-5 font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer flex-shrink-0"
      >
        <Link href="/gym-demo" data-testid="button-sticky-demo">
          Request a demo
        </Link>
      </Button>
    </div>
  );
}

// ─── Small presentational helpers ─────────────────────────────────────────────

/**
 * One section wrapper so padding, container width and the `scroll-mt` that keeps
 * an anchored heading clear of the two stacked sticky bars are defined once. Get
 * `scroll-mt` wrong and every jump-nav link lands with its heading under the nav.
 */
function Section({
  id,
  tinted,
  children,
}: {
  id: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      // `scroll-mt` clears the navbar alone on mobile and the navbar plus the
      // jump nav on desktop, where both are pinned.
      className={`scroll-mt-20 lg:scroll-mt-32 px-4 sm:px-6 lg:px-8 py-14 sm:py-16 ${
        tinted ? "bg-muted/40 border-y border-border" : ""
      }`}
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="inline-block text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2.5">
        {eyebrow}
      </span>
      <h2 className="font-display font-black uppercase text-2xl sm:text-3xl tracking-tight leading-[1.05] mb-3">
        {title}
      </h2>
      {blurb && (
        <p className="text-muted-foreground text-[15px] leading-relaxed">{blurb}</p>
      )}
    </div>
  );
}

/**
 * The label above a list inside a card.
 *
 * `h4`, not the styled `p` these were: they sit under a `CardTitle`'s `h3` and they
 * are the only thing that says which of a card's two lists a row belongs to. As
 * paragraphs the "You also agree" restrictions were an unlabelled list — a screen
 * reader announced five items in a row with no hint that the last two are
 * obligations rather than things we supply.
 */
function CardLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h4
      id={id}
      className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3"
    >
      {children}
    </h4>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">{children}</div>
  );
}

function CardTitle({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ElementType;
  tone: "primary" | "accent";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          tone === "primary" ? "bg-primary/10" : "bg-accent/10"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${tone === "primary" ? "text-primary" : "text-accent"}`}
          aria-hidden="true"
        />
      </span>
      <h3 className="font-display font-black uppercase text-lg tracking-tight">{children}</h3>
    </div>
  );
}

function MoneyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
}) {
  return (
    // No `hover:shadow-md`: nothing in this card is clickable, and a card that lifts
    // under the cursor and then does nothing is a worse affordance than a flat one.
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        </span>
        {/* A real heading: `#money` otherwise contributes nothing to the outline, so
            these four are unreachable by heading navigation. */}
        <h3 className="font-bold text-[15px]">{title}</h3>
      </div>
      <p className="text-muted-foreground text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}

function TermCard({
  icon: Icon,
  value,
  label,
  body,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  body: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
      </span>
      {/*
        The figure reads first and is the bigger type, but `label` is the heading —
        "Initial term" is what this card is about; "24 months" is its value. So the
        `h3` goes on the label even though it sits second.
      */}
      <p className="font-display font-black text-2xl sm:text-3xl leading-none mb-1.5 tabular-nums">
        {value}
      </p>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
        {label}
      </h3>
      <p className="text-muted-foreground text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}
