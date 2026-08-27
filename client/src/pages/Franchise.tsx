"use client";

/**
 * The public, pre-sales explanation of the MuscleBox Pro franchise program.
 *
 * Read alongside /gym-partnership, which is the same kind of page for the other side of
 * the network: a gym is offered a machine at no cost, a franchisee invests ₹25–50 lakh
 * to develop a territory. Both publish their commercials openly, and both depend on the
 * same three rules to be able to:
 *
 *   1. **Every number comes from @shared/franchise/program.** Never hardcode a rupee
 *      figure, a percentage or a machine count in this file.
 *   2. **The disclaimer stays visible and stays above the fold.** This describes a
 *      proposed program; it is not an offer, not a guarantee of returns and not the
 *      definitive franchise agreement, which is what binds
 *      (docs/FranchiseOnboardingPlan.md §55). It is the reason we can publish at all.
 *   3. **No projected earnings anywhere on the page.** The only worked figures are §20's
 *      capital-recovery illustration, which is arithmetic on a stated threshold rather
 *      than a forecast of what a machine will earn. A revenue calculator here would be a
 *      performance representation, which §55 exists to disclaim.
 *
 * Layout follows /gym-partnership deliberately — jump nav, sticky mobile CTA, and
 * nothing fading in on scroll except the hero. A reference document that animates on
 * every pass fights the way it is actually read. Chrome is shared, in
 * components/marketing/pageChrome.
 *
 * The one piece of state on the page is the selected tier, which the tier cards write
 * and the application form reads. That link is the point: someone who has decided
 * between Territory and City on the cards should not have to say so again in the form.
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Section,
  SectionHeading,
  SectionNav,
  SkipLink,
  StickyCta,
} from "@/components/marketing/pageChrome";
import {
  AlertCircle,
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  Factory,
  Gauge,
  Lock,
  MapPin,
  Megaphone,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import {
  DASHBOARD_VISIBILITY,
  FRANCHISE,
  FRANCHISE_JOURNEY,
  FRANCHISE_TIERS,
  MACHINE_RIGHTS,
  PERFORMANCE_REQUIREMENTS,
  RESERVED_ACCOUNTS,
  RESPONSIBILITIES,
  formatInr,
  formatLakh,
  franchiseTier,
  recoveryExample,
  type FranchiseTierId,
} from "@shared/franchise/program";
import { FRANCHISE_FAQ } from "@shared/franchise/faq";
import {
  franchiseApplicationSchema,
  type FranchiseApplicationInput,
} from "@shared/validation/franchise";
import { submitFranchiseApplication } from "@/lib/franchiseApi";
import { scrollIntoViewGently } from "@/lib/motion";

const territory = franchiseTier("territory");
const city = franchiseTier("city");
const example = recoveryExample("territory");

/**
 * The jump nav, and the `id`s the sections carry. One list so a section renamed here
 * cannot leave a dead anchor behind.
 */
const sections = [
  { id: "tiers", label: "The franchises" },
  { id: "economics", label: "The money" },
  { id: "ownership", label: "Machines" },
  { id: "network", label: "Who does what" },
  { id: "growth", label: "Territory & growth" },
  { id: "journey", label: "How it works" },
  { id: "faq", label: "FAQ" },
  { id: "apply", label: "Apply" },
];

const headlines = [
  {
    icon: BadgeIndianRupee,
    label: "Investment from",
    value: formatLakh(territory.investmentInr),
  },
  { icon: Boxes, label: "Machines from", value: String(territory.initialMachines) },
  {
    icon: Gauge,
    label: "Protein profit during recovery",
    value: `${FRANCHISE.proteinProfitSharePct.duringRecovery}%`,
  },
  {
    icon: Megaphone,
    label: "Advertising profit share",
    value: `${FRANCHISE.advertising.franchiseeSharePct}%`,
  },
];

/** Facts from the program, phrased for the hero. Never a claim the data does not carry. */
const heroProof = [
  "Machines supplied by MuscleBox Pro",
  `${FRANCHISE.proteinProfitSharePct.duringRecovery}% of protein profit until you recover your investment`,
  "Machine-level financial dashboard",
];

const whatWeRun = [
  {
    icon: Factory,
    title: "Machines and procurement",
    body: "We place the OEM order, coordinate manufacturing and deliver. You get order, specification, manufacturing and dispatch visibility throughout.",
  },
  {
    icon: Package,
    title: "Protein supply pipeline",
    body: "Approved products, specifications and supply coordination, delivered to your warehouse. Only approved formulations run in the machines.",
  },
  {
    icon: CreditCard,
    title: "Payments and accounting",
    body: "Every customer payment runs through our infrastructure. That is what makes machine-level revenue tracking and automated franchise calculations possible.",
  },
  {
    icon: Wrench,
    title: "Technology and support",
    body: `Platform, software and firmware updates, remote diagnostics, OEM and warranty coordination. No separate technical service fee during capital recovery.`,
  },
];

export default function Franchise() {
  const reduceMotion = useReducedMotion();
  const applyRef = useRef<HTMLDivElement>(null);
  const [selectedTier, setSelectedTier] = useState<FranchiseTierId>("territory");

  /** A tier card's CTA: carry the choice into the form rather than asking for it twice. */
  const chooseTier = (id: FranchiseTierId) => {
    setSelectedTier(id);
    scrollIntoViewGently(applyRef.current, { block: "start" });
  };

  return (
    // `pb-24 lg:pb-0` reserves room for the sticky mobile CTA, which is fixed and would
    // otherwise sit on top of the last rows of the footer.
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
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                Franchise Program
              </span>
              <h1 className="font-display font-black text-white uppercase text-3xl sm:text-4xl lg:text-5xl leading-[0.95] tracking-tight mb-5">
                Build and operate a
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  MuscleBox Pro network
                </span>
              </h1>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-balance">
                Develop a territory or a city on our machines, our technology and our protein
                pipeline. You run the local network and share in the profit it generates.
              </p>

              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6">
                {heroProof.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-gray-300 text-[13px]">
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-primary flex-shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 rounded-full px-7 font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer transition-colors"
                >
                  <a href="#apply" data-testid="button-hero-apply">
                    Apply for a franchise
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 rounded-full px-7 font-bold text-white border-white/25 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <a href="#economics">See how the money works</a>
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
          Load-bearing disclaimer (§55). Do not remove it and do not move it below the
          fold — it is the reason a proposed franchise program can be published with
          rupee figures on it at all.

          Left-aligned rather than centred: it runs to three lines on a phone, and
          centred ragged text at 13px is the hardest thing on the page to read.
        */}
        <div className="bg-muted/60 border-b border-border px-4 sm:px-6 lg:px-8 py-3.5">
          <p className="max-w-5xl mx-auto text-muted-foreground text-[13px] leading-relaxed flex items-start gap-2">
            <ShieldCheck
              className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-foreground">
                Indicative program terms. Not an offer, and not a guarantee of returns.
              </strong>{" "}
              Availability, territory, investment, machine allocation and commercial terms are
              subject to approval, due diligence and the definitive franchise agreement, which
              is what governs. Take independent legal, tax and financial advice before
              committing.
            </span>
          </p>
        </div>

        {/* ── The two franchises ───────────────────────────────────────────── */}
        <Section id="tiers">
          <SectionHeading
            eyebrow="The franchises"
            title="Two ways in"
            blurb="Both give you machines, the technology platform, the protein pipeline, centralised payments and a financial dashboard. They differ in how much market you take responsibility for. Larger regional structures may be introduced later."
          />

          <div className="grid lg:grid-cols-2 gap-5 mt-9">
            {FRANCHISE_TIERS.map((tier) => (
              <div
                key={tier.id}
                data-testid={`tier-${tier.id}`}
                className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden"
              >
                <div className="p-6 sm:p-7 border-b border-border">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {tier.id === "city" ? (
                        <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                      ) : (
                        <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                      )}
                    </span>
                    <h3 className="font-display font-black uppercase text-lg tracking-tight">
                      {tier.shortName}
                    </h3>
                  </div>

                  <p className="font-display font-black text-3xl sm:text-4xl leading-none tabular-nums">
                    {formatLakh(tier.investmentInr)}
                  </p>
                  <p className="text-muted-foreground text-[13px] mt-1.5">
                    {formatInr(tier.investmentInr)} · {tier.initialMachines} machines ·{" "}
                    {tier.marketRights.replace(/^A /, "")}
                  </p>
                  <p className="text-muted-foreground text-[15px] leading-relaxed mt-4">
                    {tier.positioning}
                  </p>

                  {/*
                    The payment schedule, or an honest statement that it is not published.
                    Rendering nothing for the City tier read as "pay it all up front".
                  */}
                  <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                      Payment schedule
                    </h4>
                    {tier.paymentSchedule ? (
                      <ol className="space-y-2">
                        {tier.paymentSchedule.map((stage) => (
                          <li
                            key={stage.trigger}
                            className="flex items-baseline justify-between gap-3 text-[13px]"
                          >
                            <span className="text-muted-foreground">{stage.trigger}</span>
                            <span className="font-bold tabular-nums flex-shrink-0">
                              {formatInr((tier.investmentInr * stage.pct) / 100)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-muted-foreground text-[13px] leading-relaxed">
                        Generally linked to franchise registration and machine procurement
                        readiness, with the exact schedule set in the definitive agreement.
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    What it includes
                  </h4>
                  <ul className="space-y-2 flex-1">
                    {tier.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[14px]">
                        <CheckCircle2
                          className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => chooseTier(tier.id)}
                    data-testid={`button-apply-${tier.id}`}
                    className="mt-6 min-h-12 w-full rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer transition-colors"
                  >
                    Apply for the {tier.shortName}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground text-[13px] leading-relaxed mt-5 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              The franchise investment is not a purchase of the machines. Every machine remains
              the property of MuscleBox Pro. The exact territory is mutually defined and
              documented before the franchise becomes operational.
            </span>
          </p>
        </Section>

        {/* ── The money ────────────────────────────────────────────────────── */}
        <Section id="economics" tinted>
          <SectionHeading
            eyebrow="The money"
            title="Recover your capital first"
            blurb="Your franchise earns from two separate streams, and they behave differently. Protein profit funds your capital recovery. Advertising profit never does, and it never stops."
          />

          <div className="grid md:grid-cols-2 gap-5 mt-9">
            {/* Protein stream */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-4 h-4 text-primary" aria-hidden="true" />
                </span>
                <h3 className="font-display font-black uppercase text-lg tracking-tight">
                  Protein business
                </h3>
              </div>

              <dl className="space-y-3">
                <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                    Until capital recovery
                  </dt>
                  <dd className="font-display font-black text-2xl leading-none tabular-nums">
                    {FRANCHISE.proteinProfitSharePct.duringRecovery}%{" "}
                    <span className="text-sm font-bold uppercase tracking-tight">to you</span>
                  </dd>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                    After capital recovery
                  </dt>
                  <dd className="font-display font-black text-2xl leading-none tabular-nums">
                    {FRANCHISE.proteinProfitSharePct.afterRecovery}:
                    {100 - FRANCHISE.proteinProfitSharePct.afterRecovery}{" "}
                    <span className="text-sm font-bold uppercase tracking-tight">
                      you : MuscleBox Pro
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="text-muted-foreground text-[13px] leading-relaxed mt-4">
                {FRANCHISE.proteinProfitSharePct.duringRecovery}% is a capital recovery
                mechanism, not a margin. It runs until you have received cumulative eligible
                protein-business profit of {formatInr(example.thresholdInr)} on the{" "}
                {territory.shortName}. The {city.shortName} threshold is set in its own
                agreement.
              </p>
            </div>

            {/* Advertising stream */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-accent" aria-hidden="true" />
                </span>
                <h3 className="font-display font-black uppercase text-lg tracking-tight">
                  Advertising
                </h3>
              </div>

              <dl className="space-y-3">
                <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                    Before and after recovery
                  </dt>
                  <dd className="font-display font-black text-2xl leading-none tabular-nums">
                    {FRANCHISE.advertising.franchiseeSharePct}:
                    {FRANCHISE.advertising.mbpSharePct}{" "}
                    <span className="text-sm font-bold uppercase tracking-tight">
                      you : MuscleBox Pro
                    </span>
                  </dd>
                </div>
                {/*
                  The term people most often read the other way round, so it is stated as
                  a headline rather than left in the paragraph below.
                */}
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                    Counts toward capital recovery
                  </dt>
                  <dd className="font-display font-black text-2xl leading-none uppercase tracking-tight">
                    No
                  </dd>
                </div>
              </dl>

              <p className="text-muted-foreground text-[13px] leading-relaxed mt-4">
                Machine displays, digital screens and campaign placements across the network
                are monetised centrally. Your share is calculated after applicable advertising
                costs, it does not reduce your remaining recovery amount, and it continues
                after recovery completes.
              </p>
            </div>
          </div>

          {/* ── Worked recovery illustration (§20) ── */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm mt-5">
            <h3 className="font-display font-black uppercase text-lg tracking-tight mb-1.5">
              How recovery adds up
            </h3>
            <p className="text-muted-foreground text-[13px] leading-relaxed mb-6">
              An illustration of the mechanism on a {territory.shortName}, not a forecast of
              what a machine earns.
            </p>

            <div className="mb-6">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="text-[13px] font-semibold">
                  {formatInr(example.alreadyReceivedInr)} received
                </span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  of {formatInr(example.thresholdInr)}
                </span>
              </div>
              {/*
                A plain div rather than the Progress component: this is an illustration of
                a stated example, not live state, so `aria-valuenow` would claim a
                measurement. The figures either side say it in text.
              */}
              <div
                className="h-2.5 rounded-full bg-muted overflow-hidden"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                  style={{ width: `${Math.round(example.progress * 100)}%` }}
                />
              </div>
              <p className="text-muted-foreground text-[13px] mt-2">
                Remaining recovery amount:{" "}
                <strong className="font-bold text-foreground tabular-nums">
                  {formatInr(example.remainingInr)}
                </strong>
              </p>
            </div>

            {/*
              A real table. This is tabular data — a screen reader should read "Completes
              capital recovery, ₹5,00,000" as a row rather than as two unrelated runs of
              text.
            */}
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <caption className="sr-only">
                  What happens to the next {formatInr(example.nextDistributionInr)} of eligible
                  protein-business profit
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-left font-bold py-2.5 pr-3">
                      Next {formatInr(example.nextDistributionInr)} of eligible protein profit
                    </th>
                    <th scope="col" className="text-right font-bold py-2.5 pl-3 w-32">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <th scope="row" className="text-left font-normal py-3 pr-3">
                      Completes capital recovery
                      <span className="block text-muted-foreground text-[13px]">
                        paid to you in full, {FRANCHISE.proteinProfitSharePct.duringRecovery}%
                      </span>
                    </th>
                    <td className="text-right py-3 pl-3 tabular-nums font-semibold">
                      {formatInr(example.completesRecoveryInr)}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th scope="row" className="text-left font-normal py-3 pr-3">
                      Falls into the post-recovery split
                      <span className="block text-muted-foreground text-[13px]">
                        shared {FRANCHISE.proteinProfitSharePct.afterRecovery}:
                        {100 - FRANCHISE.proteinProfitSharePct.afterRecovery}
                      </span>
                    </th>
                    <td className="text-right py-3 pl-3 tabular-nums font-semibold">
                      {formatInr(example.postRecoveryPoolInr)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="text-left font-bold py-3 pr-3">
                      Your share of that {formatInr(example.postRecoveryPoolInr)}
                    </th>
                    <td className="text-right py-3 pl-3 tabular-nums font-display font-black text-lg">
                      {formatInr(example.postRecoveryToFranchiseeInr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground text-[13px] leading-relaxed mt-5 flex items-start gap-2">
              <Megaphone
                className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Any advertising income received over the same period is paid at{" "}
                {FRANCHISE.advertising.franchiseeSharePct}:{FRANCHISE.advertising.mbpSharePct}{" "}
                and does not reduce the {formatInr(example.remainingInr)} above.
              </span>
            </p>
          </div>

          {/* ── What comes off first ── */}
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[15px] mb-1.5">Gym-level profit</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-4">
                What a gym&rsquo;s own share is calculated on, under its gym agreement.
                Arrangements run at splits such as {FRANCHISE.gymProfitSharingExamples.join(" or ")}
                , set by MuscleBox Pro per location.
              </p>
              <ul className="space-y-1.5">
                {FRANCHISE.gymLevelCosts.map((cost) => (
                  <li
                    key={cost}
                    className="flex items-start gap-2 text-[14px] text-muted-foreground"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-[0.45rem]"
                      aria-hidden="true"
                    />
                    {cost}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[15px] mb-1.5">Franchise-level profit</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-4">
                What your share is calculated on. A longer list on purpose: franchise profit
                uses the actual economics of running a local network.
              </p>
              <ul className="space-y-1.5 sm:columns-2 sm:gap-6">
                {FRANCHISE.franchiseLevelCosts.map((cost) => (
                  <li
                    key={cost}
                    className="flex items-start gap-2 text-[14px] text-muted-foreground break-inside-avoid"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-[0.45rem]"
                      aria-hidden="true"
                    />
                    {cost}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Machines ─────────────────────────────────────────────────────── */}
        <Section id="ownership">
          <SectionHeading
            eyebrow="Machines"
            title="You operate them. We own them."
            blurb="This is the term to be clearest about before anyone pays. The franchise buys the contractual right to operate machines inside the MuscleBox Pro ecosystem and your assigned territory. It does not buy the machines, and on expiry or termination they remain ours."
          />

          <div className="grid md:grid-cols-2 gap-5 mt-9">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-lg tracking-tight mb-4">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
                </span>
                You may
              </h3>
              <ul className="space-y-2.5">
                {MACHINE_RIGHTS.may.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px]">
                    <CheckCircle2
                      className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-lg tracking-tight mb-4">
                <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </span>
                You may not
              </h3>
              <ul className="space-y-2.5">
                {MACHINE_RIGHTS.mayNot.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px]">
                    <X
                      className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-5">
            <h3 className="flex items-center gap-2.5 font-bold text-[15px] mb-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Factory className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              </span>
              Procurement transparency
            </h3>
            <p className="text-muted-foreground text-[14px] leading-relaxed">
              You get visibility into the OEM order, machine specifications, manufacturing
              status, dispatch status and the relevant procurement documentation for your
              allocation. Visibility is transparency about where your investment is, not a
              transfer of ownership.
            </p>
          </div>
        </Section>

        {/* ── Who does what ────────────────────────────────────────────────── */}
        <Section id="network" tinted>
          <SectionHeading
            eyebrow="Who does what"
            title="We run the ecosystem. You run the ground."
            blurb="MuscleBox Pro does not provide local operations or local logistics on your behalf. Your local operating costs are included in the franchise-level profit calculation, so the work you do locally is accounted for in the split rather than absorbed."
          />

          <div className="grid sm:grid-cols-2 gap-4 mt-9">
            {whatWeRun.map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  </span>
                  <h3 className="font-bold text-[15px]">{item.title}</h3>
                </div>
                <p className="text-muted-foreground text-[13px] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-lg tracking-tight mb-4">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-4 h-4 text-primary" aria-hidden="true" />
                </span>
                MuscleBox Pro provides
              </h3>
              <ul className="space-y-2.5">
                {RESPONSIBILITIES.mbp.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px]">
                    <CheckCircle2
                      className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-lg tracking-tight mb-4">
                <span className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Warehouse className="w-4 h-4 text-accent" aria-hidden="true" />
                </span>
                You provide
              </h3>
              <ul className="space-y-2.5">
                {RESPONSIBILITIES.franchisee.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px]">
                    <CheckCircle2
                      className="w-4 h-4 text-accent flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                </span>
                <h3 className="font-bold text-[15px]">Finding and keeping gyms</h3>
              </div>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We pass on leads, network opportunities and the standard gym commercial
                framework. You identify gyms, build the relationships and recommend new or
                replacement locations. Every location needs our approval before deployment, and
                we keep pricing, the profit-sharing model and dispute resolution central.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                </span>
                <h3 className="font-bold text-[15px]">Your dashboard</h3>
              </div>
              <ul className="space-y-1.5 mt-3">
                {DASHBOARD_VISIBILITY.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] text-muted-foreground"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-[0.4rem]"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Territory & growth ───────────────────────────────────────────── */}
        <Section id="growth">
          <SectionHeading
            eyebrow="Territory & growth"
            title="Exclusivity you keep by earning it"
            blurb="Territorial exclusivity is real, and it is conditional. A franchisee cannot pay for a city, leave most of it undeveloped, and block MuscleBox Pro from expanding into it."
          />

          <div className="grid md:grid-cols-2 gap-5 mt-9">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-bold text-[15px] mb-4">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                </span>
                What exclusivity depends on
              </h3>
              <ul className="space-y-2">
                {PERFORMANCE_REQUIREMENTS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px]">
                    <CheckCircle2
                      className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-4">
                A {territory.shortName} may be required to deploy all{" "}
                {territory.initialMachines} machines within an agreed period, and a{" "}
                {city.shortName} to deploy its {city.initialMachines} progressively. Missing
                those requirements can put exclusivity under review.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-bold text-[15px] mb-4">
                <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </span>
                Reserved accounts
              </h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-4">
                Some opportunities sit outside territorial exclusivity and are handled directly
                by MuscleBox Pro, or under a separately agreed arrangement. Better said now
                than discovered later:
              </p>
              <ul className="space-y-2">
                {RESERVED_ACCOUNTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[14px] text-muted-foreground"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0 mt-[0.45rem]"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm mt-5">
            <h3 className="font-display font-black uppercase text-lg tracking-tight mb-1.5">
              Adding machines
            </h3>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-5">
              Machine networks expand in blocks, subject to approval based on existing machine
              performance, compliance, territory capacity, the availability of suitable gyms
              and further investment.
            </p>

            {/* The expansion example from §34, as a row rather than the doc's vertical arrows. */}
            <div className="flex flex-wrap items-center gap-3 text-[14px]">
              <span className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 font-semibold tabular-nums">
                {territory.initialMachines} machines
              </span>
              <span className="text-muted-foreground font-bold" aria-hidden="true">
                +
              </span>
              <span className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5 font-semibold tabular-nums">
                {territory.initialMachines} more
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 font-semibold tabular-nums">
                {territory.initialMachines * 2} machines, same territory
              </span>
            </div>

            <p className="text-muted-foreground text-[13px] leading-relaxed mt-5">
              Two things this does not mean. The price of additional machines is set at the time
              of expansion and is not fixed at your initial per-machine investment, because OEM
              pricing, manufacturing, technology, logistics and taxes move. And additional
              machines do not by themselves enlarge your territory. Territory expansion is
              approved separately, though a franchisee who consistently meets its requirements
              may be offered new capacity before it is offered to anyone else.
            </p>
          </div>
        </Section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <Section id="journey" tinted>
          <SectionHeading
            eyebrow="How it works"
            title="From application to long-term partnership"
            blurb="Eleven steps, of which the first is a conversation about whether your market has room for a MuscleBox Pro network at all."
          />

          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-9">
            {FRANCHISE_JOURNEY.map((step, i) => (
              <li
                key={step.title}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col"
              >
                {/*
                  White on `--foreground` (15:1), not on `--primary` (3.25:1 at 12px).
                  `aria-hidden` on the digit: the `ol` already carries the order, and a
                  reader that announced both would say "item 2 … 2 Market evaluation".
                */}
                <span
                  className="w-7 h-7 rounded-full bg-foreground text-white font-display font-black text-xs flex items-center justify-center flex-shrink-0 mb-3"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="font-bold text-[15px] mb-1.5">{step.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <Section id="faq">
          {/*
            A heading rail beside the questions rather than above them, so the answers
            keep a readable measure without leaving a quarter of the column empty. The
            rail is sticky below both pinned bars.
          */}
          <div className="grid lg:grid-cols-[17rem_1fr] gap-8 lg:gap-14">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <SectionHeading eyebrow="Questions" title="Frequently asked" />
            </div>

            {/*
              `AccordionTrigger` carries no focus ring of its own, so one is added here.
              Every collapsed answer is otherwise invisible to a keyboard user, who cannot
              see which question they are about to open.
            */}
            <Accordion type="single" collapsible className="space-y-2.5">
              {FRANCHISE_FAQ.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  className="border border-border rounded-2xl bg-card px-4 sm:px-5"
                >
                  <AccordionTrigger className="min-h-[3.5rem] text-left text-[15px] font-bold hover:no-underline cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed max-w-[32rem]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>

        {/* ── Apply ────────────────────────────────────────────────────────── */}
        <ApplicationSection
          ref={applyRef}
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
        />
      </main>

      <Footer />
      <StickyCta
        title="Territory & city franchises"
        subtitle={`From ${formatLakh(territory.investmentInr)}, ${territory.initialMachines} machines`}
        href="#apply"
        label="Apply"
        testId="button-sticky-apply"
      />
    </div>
  );
}

// ─── Application form ─────────────────────────────────────────────────────────

const EMPTY_APPLICATION: FranchiseApplicationInput = {
  name: "",
  email: "",
  mobile: "",
  targetMarket: "",
  tier: "territory",
  company: "",
  background: "",
};

/**
 * The enquiry form, and the last section on the page.
 *
 * Its failure path is doing more work than usual, because
 * `POST /franchise/applications` is not deployed yet: on any failure it offers a mailto
 * carrying everything the applicant typed. A ₹25 lakh enquiry that hits a network error
 * and is told only "try again" is a lost enquiry, and this one is guaranteed to hit one
 * until the endpoint exists. See lib/franchiseApi.
 */
function ApplicationSection({
  ref,
  selectedTier,
  onTierChange,
}: {
  ref: React.Ref<HTMLDivElement>;
  selectedTier: FranchiseTierId;
  onTierChange: (id: FranchiseTierId) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ reference?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FranchiseApplicationInput>({
    resolver: zodResolver(franchiseApplicationSchema),
    defaultValues: EMPTY_APPLICATION,
  });

  // The tier cards above and the radio group below are two controls over one value.
  // Without this, choosing a tier on a card and submitting would send whatever the radio
  // group last had.
  useEffect(() => {
    form.setValue("tier", selectedTier, { shouldValidate: false });
  }, [form, selectedTier]);

  const onSubmit = async (values: FranchiseApplicationInput) => {
    setError(null);
    setIsSubmitting(true);
    const result = await submitFranchiseApplication(values);
    setIsSubmitting(false);

    if (!result.ok) {
      // Field-level errors go on the fields; anything else becomes the banner.
      const fieldErrors = result.error.fieldErrors;
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in EMPTY_APPLICATION) {
            form.setError(field as keyof FranchiseApplicationInput, { message });
          }
        }
      }
      setError(result.error.message);
      return;
    }

    setReceipt(result.data ?? {});
    form.reset(EMPTY_APPLICATION);
  };

  return (
    <section
      id="apply"
      ref={ref}
      className="scroll-mt-20 lg:scroll-mt-32 px-4 sm:px-6 lg:px-8 py-14 sm:py-16 bg-muted/40 border-t border-border"
    >
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden grid lg:grid-cols-[22rem_1fr]">
          {/* Left rail: what happens next */}
          <div className="bg-gray-950 p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-accent/10 blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-block text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2.5">
                Apply
              </span>
              <h2 className="font-display font-black uppercase text-white text-2xl sm:text-3xl tracking-tight leading-[1.05] mb-4">
                Tell us the market you want
              </h2>
              <p className="text-gray-300 text-[15px] leading-relaxed mb-8">
                We evaluate market potential, gym density, existing locations and territory
                capacity before confirming a tier or a territory. If your market has no room
                for a network, we will say so.
              </p>

              <ul className="space-y-3.5">
                {[
                  { icon: MapPin, text: "Territory or city availability checked first" },
                  { icon: BadgeIndianRupee, text: "Full commercial terms before any payment" },
                  { icon: Clock, text: "We reply within two working days" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    </span>
                    <span className="text-gray-300 text-[13px]">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="text-gray-400 text-[13px] leading-relaxed mt-8">
                Running a gym instead?{" "}
                <Link
                  href="/gym-partnership"
                  className="text-white font-semibold underline underline-offset-2 hover:text-gray-200 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                >
                  See the gym partnership
                </Link>
                , where the machine costs your gym nothing.
              </p>
            </div>
          </div>

          {/* Right: the form, or the receipt */}
          <div className="p-8 sm:p-10">
            {receipt ? (
              <div
                className="flex flex-col items-center text-center h-full justify-center py-6"
                data-testid="application-received"
              >
                <span className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-6">
                  <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <h3 className="font-display font-black uppercase text-xl tracking-tight mb-2">
                  Application received
                </h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm mb-5">
                  We will review the market you have asked for and come back within two working
                  days, including if the territory is already taken.
                </p>
                {receipt.reference && (
                  <p className="text-[13px] text-muted-foreground">
                    Your reference:{" "}
                    <strong className="font-bold text-foreground">{receipt.reference}</strong>
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => setReceipt(null)}
                  className="mt-7 min-h-11 rounded-full px-6 font-semibold cursor-pointer"
                >
                  Submit another application
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div>
                    <span className="inline-block text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2.5">
                      Franchise enquiry
                    </span>
                    <h3 className="font-display font-black uppercase text-xl tracking-tight">
                      Your details
                    </h3>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3.5 flex items-start gap-3"
                    >
                      <AlertCircle
                        className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-destructive mb-0.5">
                          We could not submit that
                        </p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {error}
                        </p>
                        {/*
                          The recovery path, not a courtesy line. Until the endpoint is
                          deployed this is how a franchise enquiry actually reaches us, so
                          it carries the answers rather than opening an empty message.
                        */}
                        <a
                          href={mailtoFallback(form.getValues())}
                          className="inline-block text-[13px] font-semibold text-primary-ink underline underline-offset-2 mt-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Email this application to us instead
                        </a>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Which franchise</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              onTierChange(value as FranchiseTierId);
                            }}
                            className="grid sm:grid-cols-2 gap-2.5"
                          >
                            {FRANCHISE_TIERS.map((tier) => {
                              const checked = field.value === tier.id;
                              return (
                                <label
                                  key={tier.id}
                                  htmlFor={`tier-${tier.id}`}
                                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                                    checked
                                      ? "border-primary bg-primary/[0.06]"
                                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                                  }`}
                                >
                                  <RadioGroupItem
                                    value={tier.id}
                                    id={`tier-${tier.id}`}
                                    className="mt-0.5 flex-shrink-0 cursor-pointer"
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-bold text-[14px] leading-snug">
                                      {tier.shortName}
                                    </span>
                                    <span className="block text-muted-foreground text-[13px] tabular-nums">
                                      {formatLakh(tier.investmentInr)} ·{" "}
                                      {tier.initialMachines} machines
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your name</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="name"
                              placeholder="Rahul Sharma"
                              className="min-h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetMarket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City or region you want</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Indore, or west Pune"
                              className="min-h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="rahul@example.com"
                              className="min-h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="98765 43210"
                              className="min-h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Company{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="organization"
                            placeholder="Sharma Ventures LLP"
                            className="min-h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="background"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Your background{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Businesses you run, gyms or distribution you already work with, warehouse space available, and when you would want to start."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    data-testid="button-submit-application"
                    className="w-full min-h-12 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? "Sending…" : "Submit application"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  </Button>

                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    Submitting an application does not create a franchise, reserve a territory
                    or commit either side to anything. Nothing is payable until a definitive
                    franchise agreement is executed.
                  </p>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The failure path's mailto, carrying whatever the applicant had typed. */
function mailtoFallback(values: FranchiseApplicationInput): string {
  const tier = FRANCHISE_TIERS.find((t) => t.id === values.tier);
  const body = [
    `Franchise: ${tier?.name ?? values.tier}`,
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Mobile: ${values.mobile}`,
    `City or region: ${values.targetMarket}`,
    values.company ? `Company: ${values.company}` : null,
    values.background ? `\n${values.background}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:contact@muscleboxpro.com?subject=${encodeURIComponent(
    "Franchise application",
  )}&body=${encodeURIComponent(body)}`;
}
