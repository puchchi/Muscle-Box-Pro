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
import Image from "next/image";
import Link from "next/link";
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
  CupSoda,
  FileSignature,
  Handshake,
  Info,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Megaphone,
  Monitor,
  Ruler,
  Send,
  ShieldCheck,
  UserCheck,
  Wifi,
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
import { MACHINE_SPEC, dimensionsSpelled } from "@shared/machine/spec";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";
import {
  Section,
  SectionHeading,
  SectionNav,
  SkipLink,
  StickyCta,
} from "@/components/marketing/pageChrome";

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

/**
 * Three figures small enough to sit over the hero photograph.
 *
 * A subset of `machineFacts` rather than a fourth set of numbers, so the chips can be
 * `aria-hidden` — they are decoration over an image, and the strip in "The offer" is
 * where the same facts are readable.
 */
const heroSpecs = [
  { value: `${MACHINE_SPEC.displayInches}"`, label: "Touchscreen" },
  { value: `${MACHINE_SPEC.canisters}`, label: "Canisters" },
  { value: `${MACHINE_SPEC.cupMl} ml`, label: "Per cup" },
];

const machineFacts = [
  { icon: Monitor, value: `${MACHINE_SPEC.displayInches}-inch`, label: "Touchscreen" },
  { icon: Layers, value: `${MACHINE_SPEC.canisters}`, label: "Ingredient canisters" },
  { icon: CupSoda, value: `${MACHINE_SPEC.cupMl} ml`, label: "Per serving" },
  { icon: Wifi, value: MACHINE_SPEC.connectivity, label: "Always connected" },
];

export default function GymPartnership() {
  return (
    // `pb-24 lg:pb-0` clears the sticky mobile CTA bar, which is fixed and would
    // otherwise sit on top of the last rows of the footer. 24 rather than 20: at
    // 320px the bar's label wraps and it grows to 90px, which overran an 80px reserve.
    <div className="min-h-screen bg-background flex flex-col pb-24 lg:pb-0">
      <SkipLink />
      <Navbar />
      {/* Spacer for the fixed navbar, so the sticky jump nav below can pin at top-16. */}
      <div className="h-16 flex-shrink-0" aria-hidden="true" />
      <SectionNav sections={sections} />

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
            {/*
              The visible counterpart to the `BreadcrumbList` in the route shell. Structured
              data is meant to describe what the page shows, and this trail was markup only.

              Left-aligned above a centred hero deliberately: it is chrome rather than part
              of the headline block, and centred it reads as a first line of the heading. It
              is outside `.hero-rise` so it does not move — a breadcrumb that animates is a
              breadcrumb someone tries to click mid-flight.
            */}
            <nav aria-label="Breadcrumb" className="mb-7">
              <ol className="flex items-center gap-2 text-[13px]">
                <li>
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Home
                  </Link>
                </li>
                <li className="text-gray-600" aria-hidden="true">
                  /
                </li>
                <li className="text-gray-300" aria-current="page">
                  Gym Partnership
                </li>
              </ol>
            </nav>

            {/*
              Copy and machine side by side, the shape /gym-demo uses, so the object a
              gym is being offered is visible before the terms describing it.

              Copy first in the DOM at every width, which is also the stacking order on
              a phone: the `h1` is the LCP element and it should not queue behind a
              1024px image decode.
            */}
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 lg:items-center">
              {/*
                CSS, not framer-motion, and it moves the block without ever fading it.
                Driven from JS this was server-rendered with `opacity: 0` inline, so the
                `h1` below — the LCP element — stayed invisible until the bundle had
                downloaded, hydrated and run a 500ms fade. See `.hero-rise` in index.css.
              */}
              <div className="lg:col-span-7 hero-rise">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Gym Partnership
                </span>
                {/*
                  No forced `<br>`, unlike the centred full-width heroes elsewhere on the
                  site. In a ~580px column a forced break defeats `text-balance`: the
                  balancer honours it, then wraps the gradient half anyway and leaves
                  "gym" alone on line four. Balanced freely it splits after "machine".

                  The trailing `{" "}` is load-bearing for text extraction — the
                  HTML-to-text pass some crawlers and AI scrapers use would otherwise
                  read "machineat no cost".
                */}
                <h1 className="font-display font-black text-white uppercase text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-[3.25rem] leading-[0.95] tracking-tight mb-5 text-balance">
                  A protein shake vending machine{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                    at no cost to your gym
                  </span>
                </h1>
                {/*
                  No "we pay for everything it needs" — `heroProof` directly below opens
                  with "Nothing to buy or maintain", which is the same claim in the same
                  eyeful.
                */}
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl text-balance">
                  We install and run the machine, then share the profit with you every month.
                </p>

                {/* Factual reassurances, straight from PARTNERSHIP — not testimonials. */}
                <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-5 mt-6">
                  {heroProof.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-gray-300 text-[13px]">
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-[3px]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                {/*
                  A CTA above the eight sections of terms, not only after them. The
                  second button is an in-page jump rather than a route, so someone who
                  wants to read first is not sent off the page to do it.
                */}
                <div className="flex flex-col sm:flex-row gap-3 mt-9">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-12 rounded-full px-7 font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors"
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
              </div>

              {/*
                The in-gym photograph, not the studio render `/specs` and the offer
                section below use: the question this hero answers is what the thing looks
                like on a gym floor, and the render answers what it measures.

                `priority` because at `lg` it is the largest element above the fold and
                therefore a candidate for LCP; `sizes` is what stops Next handing a phone
                the 1024px candidate for a 358px box.
              */}
              <div className="lg:col-span-5 hero-rise">
                {/*
                  Capped and centred below `lg`, where the column becomes the full width
                  of the page. Uncapped at 704px wide the 4:5 crop is 880px tall, which
                  pushes the headline commercials a screen and a half down on a tablet.
                */}
                <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden border border-white/10 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]">
                  <Image
                    src="/assets/machine/machine_gym_bg2.png"
                    alt={`A ${MACHINE_SPEC.model} protein shake machine installed against the wall of a modern gym, members training behind it`}
                    width={1122}
                    height={1402}
                    priority
                    sizes="(min-width: 640px) 448px, 100vw"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/25 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-3 inset-x-3 grid grid-cols-3 gap-2" aria-hidden="true">
                    {heroSpecs.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm py-2 text-center"
                      >
                        <p className="text-white font-display font-black text-base leading-none">
                          {s.value}
                        </p>
                        <p className="text-white/60 text-[9px] uppercase tracking-wider mt-1">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/*
              One bordered strip with dividers rather than four floating cards, matching
              /franchise. The figures are a single set of headline commercials and reading
              them as one row of an accounts summary is closer to what they are.
            */}
            <dl className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl border border-white/10 bg-gray-900/70 divide-x divide-y lg:divide-y-0 divide-white/10 overflow-hidden mt-12 sm:mt-14">
              {headlines.map((h) => (
                <div
                  key={h.label}
                  className="p-4 sm:p-5 transition-colors hover:bg-white/[0.04]"
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

          One paragraph, in the same shape and order as /franchise: the bold pair, the
          qualifier, the document, who published it. Address, about and contact belong to
          the footer; repeating them here is what turns a notice into small print people
          skip.

          Left-aligned rather than centred: centred ragged text at 13px is the hardest
          thing on the page to read.

          **The linked PDF is not `shared/agreement/v2_3.ts`, and the sentence about the copy you
          sign is what covers the gap.** It still states the milestone on cumulative gross sales,
          an early-termination charge, a ₹2,00,000 liability cap and Bengaluru arbitration; v2_3
          settled all four the other way (its own note at the top of that file records why).
          Publishing it regardless was a deliberate call. The first of the four is the one that
          bites, because gross fires at roughly 4,167 cups where net profit fires at 9,100, so
          this page advertises a 50:50 milestone sooner than the signed copy grants it. Re-export
          from v2_3 and the gap closes; until then do not reword that sentence away.
        */}
        <div className="bg-amber-50 border-b border-amber-200 py-3.5 px-4 sm:px-6 lg:px-8" role="note">
          <p className="max-w-4xl mx-auto text-amber-900 text-[13px] leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
            <span>
              <strong>Indicative terms. Your signed agreement governs.</strong> Figures are the
              standard offer and typical volumes as of {INDICATIVE_ECONOMICS.asOf}, not a guarantee
              of income. Full terms:{" "}
              <a
                href="/assets/gym-partnership-terms-2026-09.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                Gym Partnership Program Standard Terms (PDF)
              </a>
              . Your own copy is shown clause by clause before you sign, and that copy is the one
              that binds. Published by BlendBox Innovations LLP.
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

          {/*
            The page carried no images at all, which in the section headed "what you get"
            meant a gym owner read six bullet points about a machine they could not see.

            Same asset as `/specs` and onboarding step 2, through `MACHINE_SPEC.imageSrc`, so
            a new render replaces all three at once. `sizes` is what stops Next serving the
            1024px candidate to a phone rendering it at 358.

            The render is a portrait tower, which is why it sits in its own column beside the
            details rather than above them: spanning the card it would be over 500px tall, and
            capped and centred it left two blank slabs either side of a narrow strip. The
            image cell carries the aspect ratio so it, not the prose, sets the row height, and
            `fill` lets it cover the cell when the prose is the taller of the two instead.
          */}
          <figure className="mt-9">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm grid sm:grid-cols-[minmax(0,38%)_minmax(0,1fr)] lg:grid-cols-[minmax(0,28%)_minmax(0,1fr)]">
              <div className="relative aspect-[3/4] bg-muted">
                <Image
                  src={MACHINE_SPEC.imageSrc}
                  alt={`The ${MACHINE_SPEC.model} protein shake vending machine, with a ${MACHINE_SPEC.displayInches}-inch touchscreen and a cup in the dispenser`}
                  fill
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 38vw, 100vw"
                  className="object-cover"
                />
              </div>

              <figcaption className="flex flex-col justify-center p-5 sm:p-7 lg:p-9 border-t sm:border-t-0 sm:border-l border-border">
                <p className="font-display font-black text-lg sm:text-xl leading-tight">
                  The {MACHINE_SPEC.model}
                </p>
                <p className="text-muted-foreground text-[15px] leading-relaxed mt-2">
                  {dimensionsSpelled()}, on a standard power point. No plumbing and no drainage
                  are required.
                </p>

                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 mt-7">
                  {machineFacts.map((fact) => (
                    <div key={fact.label}>
                      <fact.icon className="w-4 h-4 text-primary mb-2.5" aria-hidden="true" />
                      <div className="flex flex-col-reverse gap-1">
                        <dt className="text-muted-foreground text-xs leading-snug">
                          {fact.label}
                        </dt>
                        <dd className="font-display font-black text-base sm:text-lg leading-none tabular-nums">
                          {fact.value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>

                <p className="text-[13px] leading-relaxed mt-7">
                  <Link
                    href="/specs"
                    className="text-primary-ink font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Full specifications
                  </Link>
                </p>
              </figcaption>
            </div>
          </figure>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
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
        {/*
          Inverted, where the four sections around it are light. This is the section the
          hero's second button points at and the one a gym owner came to read; tinted the
          same grey as "Term and exit" it was the least conspicuous thing on the page.
          Anything inside sets its own light text colours.
        */}
        <Section id="money" tone="dark">
          <SectionHeading
            tone="dark"
            eyebrow="The economics"
            title="How the money works"
            blurb="You share the profit, not the gross. The costs come off first, and they are ours."
          />

          <div className="grid lg:grid-cols-5 gap-5 mt-9">
            {/* The worked month, on white inside the dark section — the inversion is what
                marks it as the arithmetic rather than more prose. */}
            <div className="lg:col-span-3 bg-card rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
                <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  One example month
                </h3>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground rounded-full border border-border px-2.5 py-1">
                  Illustration
                </span>
              </div>

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
                {/* `--primary-ink`, not `--primary`: 12px bold is small text, and the
                    lighter step is 3.25:1 on this white card. */}
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-primary-ink mb-4">
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
                dark
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
                dark
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
                dark
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
                dark
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
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-[15px] text-white mb-1">
                Want these numbers for your own footfall?
              </p>
              <p className="text-gray-400 text-[13px] leading-relaxed">
                Tell us your member count and we will run the same maths.
              </p>
            </div>
            <Button
              asChild
              className="min-h-12 rounded-full px-6 font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors flex-shrink-0"
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
        <Section id="term" tone="tinted">
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
        <Section id="faq" tone="tinted">
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
              {/*
                `nofollow` because robots.txt disallows `/gym/`. Without it this is the one
                link on an indexable page pointing at a blocked path, which spends crawl
                budget on a fetch that returns nothing and shows up in Search Console as a
                "blocked by robots.txt" discovery. The same link in the navbar is on every
                page and has the same problem.
              */}
              <Link
                href="/gym/login"
                rel="nofollow"
                className="text-white font-semibold underline underline-offset-2 hover:text-white/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Sign in to your dashboard
              </Link>
            </p>
            <p className="text-white/80 text-[13px] mt-2">
              Want to run a network of machines rather than host one?{" "}
              <Link
                href="/franchise"
                className="text-white font-semibold underline underline-offset-2 hover:text-white/80 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                See the franchise program
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <StickyCta
        title="Nothing to buy or maintain"
        subtitle={`${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% \u2192 ${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% profit share`}
        href="/gym-demo"
        label="Request a demo"
        testId="button-sticky-demo"
      />
    </div>
  );
}

// ─── Small presentational helpers ─────────────────────────────────────────────

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
  dark,
}: {
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
  /** For the money section, where `--foreground` is near-invisible. */
  dark?: boolean;
}) {
  return (
    // No `hover:shadow-md`: nothing in this card is clickable, and a card that lifts
    // under the cursor and then does nothing is a worse affordance than a flat one.
    <div
      className={`rounded-2xl p-5 ${
        dark ? "border border-white/10 bg-white/[0.04]" : "bg-card border border-border shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            dark ? "bg-primary/15" : "bg-primary/10"
          }`}
        >
          <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        </span>
        {/* A real heading: `#money` otherwise contributes nothing to the outline, so
            these four are unreachable by heading navigation. */}
        <h3 className={`font-bold text-[15px] ${dark ? "text-white" : ""}`}>{title}</h3>
      </div>
      <p className={`text-[13px] leading-relaxed ${dark ? "text-gray-400" : "text-muted-foreground"}`}>
        {body}
      </p>
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

        The gradient clip is the treatment /advertise gives its headline figures. It is
        only safe on type this size: `--primary` is 3.25:1 on white, which clears the 3:1
        that 24px-and-up bold display type needs and nothing smaller.
      */}
      <p className="font-display font-black text-2xl sm:text-3xl leading-none mb-1.5 tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
        {value}
      </p>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
        {label}
      </h3>
      <p className="text-muted-foreground text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}
