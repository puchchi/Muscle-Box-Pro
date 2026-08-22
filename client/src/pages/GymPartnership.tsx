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
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { motion } from "framer-motion";
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
  LogOut,
  Megaphone,
  Ruler,
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

const responsibilities = {
  mbp: [
    "Buys, delivers and installs the machine",
    "Stocks it with ingredients, cups and consumables",
    "Cleans, sanitises and services it on a schedule",
    "Repairs it, at our cost, including spare parts",
    "Takes and processes every member payment",
    "Carries the licences, insurance and product liability",
  ],
  // The first three are the same obligations listed under "What you put in";
  // reusing the array keeps one wording, and the two below are the restrictions
  // rather than the contributions (§14, §21).
  gym: [
    ...PARTNERSHIP.gymProvides,
    "Leaves the machine where it is, and unopened",
    "Keeps a competing shake machine out of the same premises",
  ],
};

const onboardingSteps = [
  { icon: UserCheck, title: "Confirm your details", body: "Gym name, address, GST, and who signs." },
  { icon: Handshake, title: "Your partnership", body: "Your specific terms, on one screen, before any document." },
  { icon: FileSignature, title: "Review and sign", body: "The full agreement, readable, then signed online." },
  { icon: CreditCard, title: "Security deposit", body: `${formatInr(PARTNERSHIP.securityDepositInr)}, refundable, paid securely.` },
  { icon: KeyRound, title: "You're set up", body: "Set a password and your dashboard goes live." },
];

const moneyRows = [
  { label: `Shakes sold in the month`, detail: `${example.cups.toLocaleString("en-IN")} cups`, amount: null },
  { label: "Gross revenue", detail: `at ${formatInr(INDICATIVE_ECONOMICS.avgSellingPriceInr)} a cup`, amount: example.grossInr },
  {
    label: "Direct costs",
    detail: `ingredients, cup, consumables at ${formatInr(INDICATIVE_ECONOMICS.directCostPerCupInr)} a cup`,
    amount: -example.directCostsInr,
  },
  { label: "Net profit", detail: "what the split applies to", amount: example.netProfitInr, emphasis: true },
];

export default function GymPartnership() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 px-4 py-16 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
                Gym Partnership
              </span>
              <h1 className="font-display font-black text-white uppercase text-3xl sm:text-4xl lg:text-5xl leading-none tracking-tight mb-5">
                A protein shake machine
                <br />
                <span className="text-primary">at no cost to your gym</span>
              </h1>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                We install and run a MuscleBoxPro machine on your floor, pay for everything it needs,
                and share the profit with you every month. This page is the whole deal in plain
                English — no sales call required to read it.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
              {headlines.map((h) => (
                <div
                  key={h.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-left"
                  data-testid={`headline-${h.label}`}
                >
                  <h.icon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-white font-display font-black text-xl leading-none mb-1">
                    {h.value}
                  </p>
                  <p className="text-gray-400 text-[11px] leading-tight">{h.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/*
          Load-bearing disclaimer. This page describes the standard offer; an
          individual gym's signed agreement can differ and is what binds. Do not
          remove it, and do not bury it below the fold — it is the reason we can
          publish commercials publicly at all.
        */}
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
          <p className="max-w-4xl mx-auto text-center text-amber-800 text-xs leading-relaxed flex items-start justify-center gap-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Indicative terms. Your signed agreement governs.</strong> Figures on this page
              are the standard offer and typical volumes as of Q1 2026, not a guarantee of income.
              Published by BlendBox Innovations LLP, the company behind MuscleBoxPro.
            </span>
          </p>
        </div>

        {/* ── What you get / what it costs ─────────────────────────────────── */}
        <section className="px-4 py-14">
          <div className="max-w-5xl mx-auto">
            <SectionHeading
              eyebrow="The offer"
              title="What you get, and what it costs"
              blurb="The machine stays our property and our expense. You provide the floor space."
            />

            <div className="grid md:grid-cols-2 gap-5 mt-8">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-display font-black uppercase text-lg tracking-tight mb-4">
                  Included at no cost
                </h3>
                <ul className="space-y-2.5">
                  {PARTNERSHIP.includedInService.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-display font-black uppercase text-lg tracking-tight mb-4">
                  What you put in
                </h3>
                <ul className="space-y-2.5">
                  {PARTNERSHIP.gymProvides.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <Ruler className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-sm font-semibold mb-1">
                    A refundable deposit of {formatInr(PARTNERSHIP.securityDepositInr)}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Held against loss or avoidable damage while the machine is in your custody, and
                    returned at the end of the partnership less anything properly due. It is not a
                    fee and it is not netted off your payouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How the money works ──────────────────────────────────────────── */}
        <section className="px-4 py-14 bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <SectionHeading
              eyebrow="The economics"
              title="How the money works"
              blurb="Your share is a share of profit, not of gross sales — so the costs come off before the split, and they are our costs, not yours."
            />

            <div className="grid lg:grid-cols-5 gap-5 mt-8">
              {/* Worked month */}
              <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground mb-1">
                  One example month
                </p>
                <p className="text-muted-foreground text-xs mb-5">
                  {example.cups.toLocaleString("en-IN")} cups is roughly{" "}
                  {Math.round(example.cups / 30)} shakes a day.
                </p>

                <div className="space-y-0">
                  {moneyRows.map((row) => (
                    <div
                      key={row.label}
                      className={`flex items-baseline justify-between gap-4 py-2.5 ${
                        row.emphasis ? "border-t border-border mt-1 pt-3" : ""
                      }`}
                    >
                      <div>
                        <p className={`text-sm ${row.emphasis ? "font-bold" : ""}`}>{row.label}</p>
                        <p className="text-muted-foreground text-[11px]">{row.detail}</p>
                      </div>
                      {row.amount !== null && (
                        <p
                          className={`font-display font-black tabular-nums whitespace-nowrap ${
                            row.emphasis ? "text-lg" : "text-base text-muted-foreground"
                          }`}
                        >
                          {row.amount < 0 ? `− ${formatInr(-row.amount)}` : formatInr(row.amount)}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-4 flex items-baseline justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">Your share</p>
                      <p className="text-muted-foreground text-[11px]">
                        {example.gymSharePct}% of net profit
                      </p>
                    </div>
                    <p
                      className="font-display font-black text-2xl text-primary tabular-nums whitespace-nowrap"
                      data-testid="example-gym-share"
                    >
                      {formatInr(example.gymShareInr)}
                    </p>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed mt-4">
                    The same month once your share steps up to{" "}
                    {exampleAtMilestone.gymSharePct}% pays you{" "}
                    <strong className="text-foreground">
                      {formatInr(exampleAtMilestone.gymShareInr)}
                    </strong>
                    . Illustration only — actual volumes depend on your footfall.
                  </p>
                </div>
              </div>

              {/* The three streams */}
              <div className="lg:col-span-2 space-y-4">
                <MoneyCard
                  icon={Handshake}
                  title="Profit share steps up"
                  body={
                    <>
                      You start at {PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% of net profit
                      and move to {PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% once the machine
                      clears its performance milestone — whichever comes first of{" "}
                      {PARTNERSHIP.milestone.cups.toLocaleString("en-IN")} paid cups or{" "}
                      {formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr)} of cumulative net
                      profit. On the economics above that second test lands at about{" "}
                      {milestone.cups.toLocaleString("en-IN")} cups; a machine with thinner margins
                      reaches the cup count first.
                    </>
                  }
                />
                <MoneyCard
                  icon={Megaphone}
                  title="Advertising, on top"
                  body={
                    <>
                      {PARTNERSHIP.advertisingGymSharePct}% of the advertising revenue the screen on
                      your machine earns. This one stays flat for the whole term — it does not step
                      up, and it does not step down.
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
                      reviewed every {PARTNERSHIP.electricity.reviewWindowMonths} months, with a
                      minimum of {formatInr(PARTNERSHIP.electricity.floorInrPerWindow)} a review
                      period whatever the machine sells.
                    </>
                  }
                />
                <MoneyCard
                  icon={CalendarClock}
                  title="Paid monthly, on a statement"
                  body={
                    <>
                      Settled within {PARTNERSHIP.settlementDaysAfterMonthEnd} days of month-end,
                      against a statement of cups, revenue, costs and your share. Your dashboard
                      shows live numbers in the meantime, marked provisional.
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Who does what ────────────────────────────────────────────────── */}
        <section className="px-4 py-14">
          <div className="max-w-5xl mx-auto">
            <SectionHeading
              eyebrow="Responsibilities"
              title="Who does what"
              blurb="The short version: we run the machine, you host it. You never touch stock, hygiene, repairs or payments."
            />

            <div className="grid md:grid-cols-2 gap-5 mt-8">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-black uppercase text-lg tracking-tight">
                    MuscleBoxPro
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {responsibilities.mbp.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-4 h-4 text-accent" />
                  <h3 className="font-display font-black uppercase text-lg tracking-tight">
                    Your gym
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {responsibilities.gym.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Term and exit ────────────────────────────────────────────────── */}
        <section className="px-4 py-14 bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <SectionHeading
              eyebrow="Term and exit"
              title="You are not locked in"
              blurb="The initial term is long enough for the machine to be worth installing, and short enough that you are not stuck with one that isn't working."
            />

            <div className="grid sm:grid-cols-3 gap-5 mt-8">
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
                body="For convenience, in writing, at any point. We collect the machine at our cost and return your deposit."
              />
              <TermCard
                icon={Wrench}
                value={`${PARTNERSHIP.noticeDays.mbpUnderperformance} days`}
                label="Our notice to remove"
                body="If the machine persistently underperforms, we may take it back rather than leave it occupying your floor."
              />
            </div>
          </div>
        </section>

        {/* ── Onboarding steps ─────────────────────────────────────────────── */}
        <section className="px-4 py-14">
          <div className="max-w-5xl mx-auto">
            <SectionHeading
              eyebrow="Getting started"
              title="Five steps, one link"
              blurb="Placement is invite-only. Once your gym is approved we send a single link — you can stop partway and pick up where you left off."
            />

            <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
              {onboardingSteps.map((step, i) => (
                <li
                  key={step.title}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-display font-black text-xs flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <step.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="font-bold text-sm mb-1.5">{step.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="px-4 py-14 bg-muted/30 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <SectionHeading eyebrow="Questions" title="Frequently asked" />

            <Accordion type="single" collapsible className="mt-8">
              {PARTNERSHIP_FAQ.map((faq, i) => (
                <AccordionItem key={faq.question} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-bold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display font-black uppercase text-2xl sm:text-3xl tracking-tight mb-3">
              See whether your gym is a fit
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-7">
              Tell us about your gym and we will come back honestly — including if we think the
              volumes would not justify a machine. There is no cost and no commitment in asking.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/gym-demo">
                <Button
                  size="lg"
                  className="bg-primary text-background hover:bg-primary/90 font-bold w-full sm:w-auto"
                  data-testid="button-request-demo"
                >
                  REQUEST A DEMO
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/specs">
                <Button size="lg" variant="outline" className="font-bold w-full sm:w-auto">
                  SEE THE MACHINE SPECS
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-xs mt-6">
              Already a partner?{" "}
              <Link href="/gym/login" className="text-primary font-semibold hover:underline">
                Sign in to your dashboard
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Small presentational helpers ─────────────────────────────────────────────

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
      <span className="inline-block text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2">
        {eyebrow}
      </span>
      <h2 className="font-display font-black uppercase text-2xl sm:text-3xl tracking-tight leading-none mb-3">
        {title}
      </h2>
      {blurb && <p className="text-muted-foreground text-sm leading-relaxed">{blurb}</p>}
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
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="font-bold text-sm">{title}</p>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
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
    <div className="bg-card border border-border rounded-2xl p-6">
      <Icon className="w-4 h-4 text-primary mb-3" />
      <p className="font-display font-black text-2xl leading-none mb-1">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        {label}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
    </div>
  );
}
