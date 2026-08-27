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
 * It carries a lot of contract detail, and five presentation decisions keep that from
 * reading as a wall. They are what to preserve when editing:
 *
 *   - **The page alternates light and dark.** The money section is inverted, which gives
 *     the commercials their own weight and breaks eight same-coloured sections into
 *     acts. Anything inside a dark section sets its own light text colours; the
 *     `--muted-foreground` token is near-invisible there.
 *   - **A fact is stated in exactly one place.** Every term here also appears in the
 *     FAQ, in the journey and in the program data, so a fact restated in prose gets
 *     printed three or four times over. When a section needs a term that another
 *     section owns, it links or it leaves it out. `tierIncludes()` is the mechanical
 *     version of the same rule: eleven of the tiers' fourteen inclusions are identical,
 *     so the cards carry only what differs and the shared list is stated once.
 *   - **A ratio is drawn, not described.** The three profit splits and the worked
 *     recovery example are marks, in components/marketing/franchiseViz, and the prose
 *     around them is cut to what a mark cannot say. Three sentences replaced two cards
 *     of paragraphs, and the comparison the money section exists to make is now visible
 *     at a glance: protein steps down at recovery, advertising does not move.
 *   - **Short enumerations are chips, long ones are checklists.** A tick beside
 *     "Warehousing" implies a benefit; a tick beside "Move machines between approved
 *     locations" is one.
 *   - **Nothing fades in on scroll** except the hero, gated on `useReducedMotion`. This
 *     is a document people scan, jump around in and come back to.
 *
 * Chrome is shared with /gym-partnership, in components/marketing/pageChrome.
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
  Factory,
  Gauge,
  LayoutDashboard,
  Lock,
  MapPin,
  Megaphone,
  ShieldCheck,
  Warehouse,
  X,
} from "lucide-react";
import {
  DistributionBar,
  MachineCount,
  RecoveryMeter,
  StreamSplitFigure,
  Swatch,
} from "@/components/marketing/franchiseViz";
import {
  DASHBOARD_VISIBILITY,
  FRANCHISE,
  FRANCHISE_TIERS,
  MACHINE_RIGHTS,
  PERFORMANCE_REQUIREMENTS,
  RESERVED_ACCOUNTS,
  RESPONSIBILITIES,
  formatInr,
  formatLakh,
  franchiseTier,
  journeyByPhase,
  recoveryExample,
  tierIncludes,
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
const includes = tierIncludes();
const journey = journeyByPhase();

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

/**
 * Facts from the program, phrased for the hero. Never a claim the data does not carry,
 * and never one the headline strip below it already makes. The machine count and both
 * profit shares are in that strip, so repeating them here would print the page's four
 * headline numbers twice inside one screen.
 */
const heroProof = [
  `${FRANCHISE.proteinProfitSharePct.duringRecovery}% of protein profit until you recover your investment`,
  "No separate technical service fee while you recover",
  "Machine-level financial dashboard",
];

/**
 * The two profit streams, as the three bars the money section leads with.
 *
 * Every share is read from the program, and the two protein rows are ordered so the
 * recovery threshold falls between them, which is what lets the figure draw it as the
 * boundary it is rather than as a footnote.
 */
const streams = [
  {
    title: "Protein business",
    icon: Gauge,
    rows: [
      {
        label: "Until capital recovery",
        yourSharePct: FRANCHISE.proteinProfitSharePct.duringRecovery,
      },
      {
        label: "After capital recovery",
        yourSharePct: FRANCHISE.proteinProfitSharePct.afterRecovery,
      },
    ],
  },
  {
    title: "Advertising",
    icon: Megaphone,
    rows: [
      {
        label: "Before and after, throughout",
        yourSharePct: FRANCHISE.advertising.franchiseeSharePct,
      },
    ],
  },
];

/**
 * The worked example's three parts, in the order they come off the distribution. The
 * `fill` keys tie each one to its row in the table beside the bar, which is what makes
 * an unlabelled bar readable. See franchiseViz.
 */
const distribution = [
  { key: "recovery", amountInr: example.completesRecoveryInr, fill: "recovery" as const },
  { key: "yours", amountInr: example.postRecoveryToFranchiseeInr, fill: "share" as const },
  { key: "mbp", amountInr: example.postRecoveryToMbpInr, fill: "mbp" as const },
];

/**
 * Every cost that comes off before the franchise share, with the gym-level ones first.
 *
 * The gym list is a subset of the franchise list, and that containment is the comparison
 * the money section draws. Ordering the subset first lets it read as a group rather than
 * as two marked chips scattered through ten.
 */
const gymLevelCosts = new Set<string>(FRANCHISE.gymLevelCosts);
const costsBeforeYourShare: string[] = [
  ...FRANCHISE.gymLevelCosts,
  ...FRANCHISE.franchiseLevelCosts.filter((cost) => !gymLevelCosts.has(cost)),
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
        <section className="bg-gray-950 px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-14 relative overflow-hidden">
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
              `animate` always names the visible state, and reduced motion is honoured by
              dropping the duration rather than by dropping the animation. Leaving both
              props off under reduced motion left the server-rendered `opacity: 0` on the
              element with nothing to clear it, so the hero never appeared at all.
            */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
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

              {/*
                A column on a phone, a row from `sm` up. Wrapped as a centred row at
                390px the middle item ran to two lines and left its tick alone at the far
                left of the pair, which read as a rendering fault.
              */}
              <ul className="flex flex-col items-start gap-2 text-left max-w-sm mx-auto mt-6 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5">
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

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 rounded-full px-7 font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors"
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

            {/*
              One bordered strip with dividers rather than four floating cards. The
              figures are a single set of headline commercials, and reading them as a row
              of an accounts summary is closer to what they are.
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
                    <dt className="text-gray-400 text-xs leading-snug">{h.label}</dt>
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
          fold. It is the reason a proposed franchise program can be published with
          rupee figures on it at all.

          Left-aligned rather than centred: it runs to three lines on a phone, and
          centred ragged text at 13px is the hardest thing on the page to read.
        */}
        <div className="bg-muted/60 border-b border-border px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="max-w-4xl text-muted-foreground text-[13px] leading-relaxed flex items-start gap-2">
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
        </div>

        {/* ── The two franchises ───────────────────────────────────────────── */}
        <Section id="tiers">
          <SectionHeading
            eyebrow="The franchises"
            title="Two ways in"
            blurb="They differ in one thing: how much market you take responsibility for."
          />

          <div className="grid lg:grid-cols-2 gap-5 mt-10">
            {FRANCHISE_TIERS.map((tier) => (
              <div
                key={tier.id}
                data-testid={`tier-${tier.id}`}
                className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden transition-colors hover:border-primary/30"
              >
                <div className="p-6 sm:p-7 flex-1">
                  <div className="flex items-center gap-2.5 mb-5">
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

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-display font-black text-3xl sm:text-4xl leading-none tabular-nums">
                      {formatLakh(tier.investmentInr)}
                    </p>
                    <p className="text-muted-foreground text-[13px] tabular-nums">
                      {formatInr(tier.investmentInr)}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 mt-5">
                    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Machines
                      </dt>
                      <dd className="font-bold text-[15px] tabular-nums mt-0.5">
                        {tier.initialMachines} machines
                        {/* Five against ten is the comparison between the tiers, and it
                            is countable at a glance as glyphs. */}
                        <MachineCount count={tier.initialMachines} />
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Market rights
                      </dt>
                      <dd className="font-bold text-[15px] mt-0.5 leading-snug">
                        {tier.marketRights}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-muted-foreground text-[15px] leading-relaxed mt-5">
                    {tier.positioning}
                  </p>

                  {/*
                    The payment schedule, or an honest statement that it is not published.
                    Rendering nothing for the City tier read as "pay it all up front".
                  */}
                  <CardLabel>Payment schedule</CardLabel>
                  {tier.paymentSchedule ? (
                    <ol className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                      {tier.paymentSchedule.map((stage) => (
                        <li
                          key={stage.trigger}
                          className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-[13px]"
                        >
                          <span className="text-muted-foreground">{stage.trigger}</span>
                          <span className="font-bold tabular-nums flex-shrink-0">
                            {formatInr((tier.investmentInr * stage.pct) / 100)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground text-[13px] leading-relaxed rounded-xl border border-border px-3.5 py-2.5">
                      Generally linked to franchise registration and machine procurement
                      readiness, with the exact schedule set in the definitive agreement.
                    </p>
                  )}

                  <CardLabel>Specific to this franchise</CardLabel>
                  <ul className="space-y-2">
                    {includes.unique[tier.id].map((item) => (
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

                <div className="px-6 sm:px-7 pb-6 sm:pb-7">
                  <Button
                    onClick={() => chooseTier(tier.id)}
                    data-testid={`button-apply-${tier.id}`}
                    className="min-h-12 w-full rounded-full font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors"
                  >
                    Apply for the {tier.shortName}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/*
            The twelve inclusions both tiers share, stated once. Printed inside both
            cards it was 24 rows the reader had to compare line by line to find the two
            that actually differ.
          */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-7 mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-5">
              <h3 className="font-display font-black uppercase text-lg tracking-tight">
                Included in both franchises
              </h3>
              <p className="text-muted-foreground text-[13px]">
                {includes.shared.length} inclusions, identical either way
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
              {includes.shared.map((item) => (
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

          {/*
            Ownership used to be stated here too, and again as the whole subject of the
            very next section. It now lives once, in that section's standfirst.
          */}
          <p className="text-muted-foreground text-[13px] leading-relaxed mt-5 max-w-3xl flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              The exact territory is mutually defined and documented before the franchise
              becomes operational.
            </span>
          </p>
        </Section>

        {/* ── The money ────────────────────────────────────────────────────── */}
        <Section id="economics" tone="dark">
          {/*
            The one qualifier the bars below cannot carry, and the thing a reader needs
            before reading "100%". Not a summary of the figure: its groups, row labels and
            caption already say two streams, protein funds recovery, advertising does not.
          */}
          <SectionHeading
            tone="dark"
            eyebrow="The money"
            title="Recover your capital first"
            blurb="Every percentage below is a share of distributable profit, after the costs of running the network. Not a share of revenue."
          />

          {/*
            Two cards of ratio tiles and paragraphs before this, which asked the reader to
            hold three splits in their head to notice the one thing that matters: protein
            steps down at recovery and advertising does not move. Drawn, that is the first
            thing they see, and the caption carries only what a bar cannot: that the
            {duringRecovery}% is a recovery mechanism rather than a margin, and that
            advertising sits outside recovery entirely.
          */}
          <div className="mt-10">
            <StreamSplitFigure
              streams={streams}
              milestone="Capital recovery complete"
              note={
                <>
                  <p>
                    The {FRANCHISE.proteinProfitSharePct.duringRecovery}% is a capital
                    recovery mechanism, not a margin. It runs until you have received
                    cumulative eligible protein-business profit of{" "}
                    {formatInr(example.thresholdInr)} on the {territory.shortName}, and the{" "}
                    {city.shortName} threshold is set in its own agreement.
                  </p>
                  {/*
                    One paragraph, no nested elements around the phrase itself: this is the
                    single place on the page that says advertising sits outside recovery,
                    and it is the term people most often read the other way round.
                  */}
                  <p className="mt-2">
                    Advertising across machine displays, digital screens and campaign
                    placements is monetised centrally, your share is calculated after
                    applicable advertising costs, and it never counts toward capital
                    recovery.
                  </p>
                </>
              }
            />
          </div>

          {/*
            Worked recovery illustration (§20), on white inside the dark section. It is
            the one block on the page a prospective franchisee will read twice, and the
            inversion is what marks it as the worked example rather than more prose.
          */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1.5">
              <h3 className="font-display font-black uppercase text-lg tracking-tight">
                How recovery adds up
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground rounded-full border border-border px-2.5 py-1">
                Illustration
              </span>
            </div>
            <p className="text-muted-foreground text-[13px] leading-relaxed mb-7 max-w-2xl">
              An illustration of the mechanism on a {territory.shortName}, not a forecast of
              what a machine earns.
            </p>

            {/*
              Stacked rather than two columns: the meter is one strip and the split is a
              bar plus four rows, so side by side left the shorter half of the card empty
              for the height of the taller one. Read down, they are also the order the
              example happens in.
            */}
            <div className="space-y-7">
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatInr(example.alreadyReceivedInr)} received
                  </span>
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    of {formatInr(example.thresholdInr)}
                  </span>
                </div>
                {/*
                  Not the Progress component: this illustrates a stated example rather
                  than live state, so `aria-valuenow` would claim a measurement. The
                  figures either side say it in text.
                */}
                <RecoveryMeter fraction={example.progress} />
                <p className="text-muted-foreground text-[13px] mt-2.5">
                  Remaining recovery amount:{" "}
                  <strong className="font-bold text-foreground tabular-nums">
                    {formatInr(example.remainingInr)}
                  </strong>
                </p>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-[13px] font-semibold mb-2">
                  Where the next {formatInr(example.nextDistributionInr)} goes
                </p>
                {/*
                  The point of §20 is that a distribution straddling the threshold is not
                  paid out whole, and the proportions are the argument: two thirds of this
                  one completes recovery, and the remainder is halved. The bar carries no
                  labels of its own: on a phone its narrow segments are under 60px. The
                  table below is both the label layer and the accessible twin, tied to it
                  by the swatches.
                */}
                <DistributionBar segments={distribution} />

                <div className="overflow-x-auto -mx-1 px-1 mt-4">
                  <table className="w-full text-[14px]">
                    <caption className="sr-only">
                      What happens to the next {formatInr(example.nextDistributionInr)} of
                      eligible protein-business profit
                    </caption>
                    <thead>
                      <tr className="border-b-2 border-foreground/10">
                        <th scope="col" className="text-left font-bold py-2.5 pr-3">
                          Split of that {formatInr(example.nextDistributionInr)}
                        </th>
                        <th scope="col" className="text-right font-bold py-2.5 pl-3 w-28">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <th scope="row" className="text-left font-normal py-3 pr-3">
                          <Swatch fill="recovery" />
                          Completes capital recovery, paid to you in full
                        </th>
                        <td className="text-right py-3 pl-3 tabular-nums font-semibold">
                          {formatInr(example.completesRecoveryInr)}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="text-left font-normal py-3 pr-3">
                          <Swatch fill="share" />
                          Your share of the {formatInr(example.postRecoveryPoolInr)} past the
                          threshold
                        </th>
                        <td className="text-right py-3 pl-3 tabular-nums font-semibold">
                          {formatInr(example.postRecoveryToFranchiseeInr)}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <th scope="row" className="text-left font-normal py-3 pr-3">
                          <Swatch fill="mbp" />
                          MuscleBox Pro&rsquo;s share of that{" "}
                          {formatInr(example.postRecoveryPoolInr)}
                        </th>
                        <td className="text-right py-3 pl-3 tabular-nums font-semibold text-muted-foreground">
                          {formatInr(example.postRecoveryToMbpInr)}
                        </td>
                      </tr>
                      <tr className="bg-primary/[0.06]">
                        <th
                          scope="row"
                          className="text-left font-bold py-3 pl-3 pr-3 rounded-l-lg"
                        >
                          To you from this {formatInr(example.nextDistributionInr)}
                        </th>
                        <td className="text-right py-3 pl-3 pr-3 tabular-nums font-display font-black text-lg rounded-r-lg">
                          {formatInr(example.totalToFranchiseeInr)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/*
            The two cost lists, as one set with a subset marked, rather than as two lists
            side by side. Every gym-level cost is also a franchise-level cost, and printing
            the lists separately hid that containment behind a two-column diff. The reader
            had to compare ten chips against two to find out that the gym's two are the
            same two. Marked in place, the relationship and the difference in scope are the
            same glance.
          */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7 mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-4">
              <h3 className="font-bold text-[15px] text-white">
                What your share is calculated on
              </h3>
              <p className="flex items-center gap-2 text-gray-400 text-[13px]">
                <span
                  className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                  aria-hidden="true"
                />
                also comes off a gym&rsquo;s own share
              </p>
            </div>
            <p className="text-gray-400 text-[13px] leading-relaxed mb-4">
              Franchise profit is worked out after all of these, which is the difference in
              scope: a gym&rsquo;s share is calculated on the cup, yours on the actual
              economics of running a local network.
            </p>
            <ul className="flex flex-wrap gap-2">
              {costsBeforeYourShare.map((cost) => {
                const alsoGymLevel = gymLevelCosts.has(cost);
                return (
                  <li
                    key={cost}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] ${
                      alsoGymLevel
                        ? "border-primary/40 bg-primary/[0.12] text-white"
                        : "border-white/15 bg-white/[0.06] text-gray-200"
                    }`}
                  >
                    {alsoGymLevel && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    {cost}
                  </li>
                );
              })}
            </ul>
            <p className="text-gray-400 text-[13px] leading-relaxed mt-4">
              Gym arrangements themselves run at splits such as{" "}
              {FRANCHISE.gymProfitSharingExamples.join(" or ")}, set by MuscleBox Pro per
              location.
            </p>
          </div>

          {/* A CTA where conviction forms, rather than only at the top and the bottom. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 mt-5">
            <p className="text-gray-300 text-[15px] leading-snug">
              Ready to talk about a specific market?
            </p>
            <Button
              asChild
              className="min-h-11 rounded-full px-6 font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors flex-shrink-0"
            >
              <a href="#apply">
                Apply for a franchise
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </Section>

        {/* ── Machines ─────────────────────────────────────────────────────── */}
        <Section id="ownership">
          <SectionHeading
            eyebrow="Machines"
            title="You operate them. We own them."
            blurb="The franchise investment is not a purchase of the machines. It buys the right to operate them in your territory, and on expiry or termination they remain ours."
          />

          {/*
            One card in two halves rather than two cards. The lists are four and six
            items, so as separate cards the shorter one carried visible dead space, and
            the pairing is the point being made.
          */}
          <div className="bg-card border border-border rounded-2xl shadow-sm grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border mt-10">
            <div className="p-6 sm:p-7">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-base tracking-tight mb-4">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
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

            <div className="p-6 sm:p-7 bg-muted/30">
              <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-base tracking-tight mb-4">
                <span className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center flex-shrink-0">
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

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-5 flex flex-col sm:flex-row gap-4 sm:gap-6">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Factory className="w-4 h-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-[15px] mb-1.5">Procurement transparency</h3>
              <p className="text-muted-foreground text-[14px] leading-relaxed max-w-3xl">
                You get visibility into the OEM order, specifications, manufacturing and
                dispatch status, and the procurement documentation for your allocation.
                Transparency about where your investment is, not a transfer of ownership.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Who does what ────────────────────────────────────────────────── */}
        <Section id="network" tone="tinted">
          <SectionHeading
            eyebrow="Who does what"
            title="We run the ecosystem. You run the ground."
            blurb="The line between the two sides is your warehouse. We run everything upstream of it."
          />

          {/*
            One diagram where there were four prose cards, two lists and a fifth card.
            The cards were a paragraph-length retelling of the very list beside them
            ("Machines and procurement" against "Machine procurement, OEM coordination and
            delivery"), so the section said everything it had to say twice, at four times
            the length. The lists are the canonical version, and the seam between them is
            the one thing the lists could not show: where the handover actually happens.
          */}
          <div className="bg-card border border-border rounded-2xl shadow-sm grid lg:grid-cols-[1fr_auto_1fr] mt-10 overflow-hidden">
            <ResponsibilityColumn
              icon={Cpu}
              title="MuscleBox Pro provides"
              items={RESPONSIBILITIES.mbp}
              tone="primary"
            />

            {/*
              The seam. A labelled boundary on desktop, a labelled divider on a phone,
              where a vertical rail would either rotate text or eat the column.
            */}
            <div className="flex lg:flex-col items-center gap-3 px-6 py-4 lg:px-5 lg:py-8 bg-muted/50 border-y lg:border-y-0 lg:border-x border-border">
              <span className="h-px flex-1 lg:h-auto lg:w-px lg:flex-1 bg-border" />
              <span className="flex items-center gap-2 lg:flex-col text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                <Warehouse className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="lg:[writing-mode:vertical-rl] lg:rotate-180">Your warehouse</span>
              </span>
              <span className="h-px flex-1 lg:h-auto lg:w-px lg:flex-1 bg-border" />
            </div>

            <ResponsibilityColumn
              icon={Warehouse}
              title="You provide"
              items={RESPONSIBILITIES.franchisee}
              tone="accent"
            />
          </div>

          <p className="text-muted-foreground text-[13px] leading-relaxed mt-5 max-w-3xl flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Consumer pricing, the gym profit-sharing model and dispute resolution stay
              central to MuscleBox Pro, whoever found the gym.
            </span>
          </p>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm mt-5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="font-bold text-[15px]">Your dashboard</h3>
            </div>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-4">
              Machine level, not territory level. Every figure your share is calculated from is
              visible to you.
            </p>
            <ul className="flex flex-wrap gap-2">
              {DASHBOARD_VISIBILITY.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[13px]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* ── Territory & growth ───────────────────────────────────────────── */}
        <Section id="growth">
          <SectionHeading
            eyebrow="Territory & growth"
            title="Exclusivity you keep by earning it"
            blurb="Territorial exclusivity is real, and it is conditional. A franchisee cannot pay for a city, leave most of it undeveloped, and block MuscleBox Pro from expanding into it."
          />

          <div className="grid md:grid-cols-2 gap-5 mt-10">
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
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-4 pt-4 border-t border-border">
                A {territory.shortName} may be required to deploy all{" "}
                {territory.initialMachines} machines within an agreed period, and a{" "}
                {city.shortName} its {city.initialMachines} progressively. Missing those can
                put exclusivity under review.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-bold text-[15px] mb-2.5">
                <span className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </span>
                Reserved accounts
              </h3>
              <p className="text-muted-foreground text-[14px] leading-relaxed mb-4">
                These sit outside territorial exclusivity, handled directly by MuscleBox Pro or
                under a separately agreed arrangement.
              </p>
              <ul className="flex flex-wrap gap-2">
                {RESERVED_ACCOUNTS.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[13px] text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm mt-5">
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-7 lg:gap-10">
              <div>
                <h3 className="font-display font-black uppercase text-lg tracking-tight mb-2">
                  Adding machines
                </h3>
                <p className="text-muted-foreground text-[14px] leading-relaxed mb-5">
                  Machine networks expand in blocks, subject to approval based on existing
                  machine performance, compliance, territory capacity, the availability of
                  suitable gyms and further investment.
                </p>

                {/* The expansion example from §34, as a row rather than the doc's arrows. */}
                <div className="flex flex-wrap items-center gap-2.5 text-[14px]">
                  <span className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 font-semibold tabular-nums">
                    {territory.initialMachines} machines
                  </span>
                  <span className="text-muted-foreground font-bold" aria-hidden="true">
                    +
                  </span>
                  <span className="rounded-xl border border-primary/25 bg-primary/[0.06] px-3.5 py-2.5 font-semibold tabular-nums">
                    {territory.initialMachines} more
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 font-semibold tabular-nums">
                    {territory.initialMachines * 2} machines
                  </span>
                </div>
                <p className="text-muted-foreground text-[13px] mt-2.5">
                  in the same territory, not a larger one
                </p>
              </div>

              {/*
                The two misreadings, as their own labelled notes. Buried in a paragraph
                they were the two sentences a prospective franchisee most needed to see
                and least likely to reach.
              */}
              <ul className="space-y-3 lg:border-l lg:border-border lg:pl-10">
                <li className="rounded-xl bg-muted/40 border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                    What this does not mean
                  </p>
                  <p className="text-[14px] leading-relaxed">
                    That additional machines cost what yours did. Their price is set at the
                    time of expansion, because OEM pricing, technology, logistics and taxes
                    move.
                  </p>
                </li>
                <li className="rounded-xl bg-muted/40 border border-border p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                    Or this
                  </p>
                  <p className="text-[14px] leading-relaxed">
                    That they enlarge your territory. Expansion of the territory itself is
                    approved separately, though a franchisee who consistently meets its
                    requirements may be offered new capacity first.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <Section id="journey" tone="tinted">
          <SectionHeading
            eyebrow="How it works"
            title="From application to long-term partnership"
            blurb="Eleven steps in four stages, of which the first is a conversation about whether your market has room for a MuscleBox Pro network at all."
          />

          {/*
            Four columns of grouped steps, not four full-width bands.

            Stacked, the eleven steps ran to most of a screen and a half of near-empty
            rows: a 15rem stage label beside a 13rem step title beside one line of body
            left two thirds of every row blank, and the process read as more of the page's
            terms to get through. Read across, the four stages are a progression and the
            whole thing fits one screen, which is what a "how it works" is for.

            The rail behind the stage numbers is the progression, and it is drawn rather
            than described. `aria-hidden` on it and on every numeral: the nested `ol`s
            already carry the order.
          */}
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 items-start gap-4 mt-10">
            {journey.map((phase, phaseIndex) => (
              <li
                key={phase.id}
                className="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col"
              >
                {/*
                  A fixed header height so the first step starts on the same line in all
                  four cards. One of the stage labels wraps to two lines and the others do
                  not, which otherwise offsets that column's whole list.
                */}
                <div className="flex items-center gap-2.5 mb-4 lg:min-h-[2.75rem]">
                  <span
                    className="w-7 h-7 rounded-full bg-primary/10 text-primary-ink font-display font-black text-[13px] flex items-center justify-center flex-shrink-0 tabular-nums"
                    aria-hidden="true"
                  >
                    {phaseIndex + 1}
                  </span>
                  <h3 className="font-display font-black uppercase text-[13px] tracking-tight leading-tight">
                    {phase.title}
                  </h3>
                  {phaseIndex < journey.length - 1 && (
                    <span className="hidden lg:block h-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>

                <ol className="space-y-3.5">
                  {phase.steps.map((step) => (
                    <li key={step.title}>
                      <h4 className="flex items-baseline gap-2 font-bold text-[14px] leading-snug">
                        {/*
                          `--muted-foreground` on the numeral, not white on `--primary`:
                          it is 11px, so 4.5:1 applies and the brand fill is 3.25:1.
                        */}
                        <span
                          className="text-muted-foreground text-[11px] font-display font-black tabular-nums flex-shrink-0"
                          aria-hidden="true"
                        >
                          {String(step.position).padStart(2, "0")}
                        </span>
                        {step.title}
                      </h4>
                      <p className="text-muted-foreground text-[13px] leading-relaxed mt-1 pl-[1.6rem]">
                        {step.body}
                      </p>
                    </li>
                  ))}
                </ol>
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
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-4">
                {FRANCHISE_FAQ.length} answers on the terms people ask about most. Anything
                else, ask in the application.
              </p>
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
                  className="border border-border rounded-2xl bg-card px-4 sm:px-5 transition-colors hover:border-primary/30"
                >
                  <AccordionTrigger className="min-h-[3.5rem] text-left text-[15px] font-bold hover:no-underline cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed">
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

/** One side of the warehouse seam in "Who does what". */
function ResponsibilityColumn({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  items: readonly string[];
  tone: "primary" | "accent";
}) {
  const hue = tone === "primary" ? "text-primary" : "text-accent";
  return (
    <div className="p-6 sm:p-7">
      <h3 className="flex items-center gap-2.5 font-display font-black uppercase text-base tracking-tight mb-4">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            tone === "primary" ? "bg-primary/10" : "bg-accent/10"
          }`}
        >
          <Icon className={`w-4 h-4 ${hue}`} aria-hidden={true} />
        </span>
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[14px]">
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hue}`} aria-hidden="true" />
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The label above a block inside a card. `h4`, since every one of these sits under an `h3`. */
function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-6 mb-3">
      {children}
    </h4>
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
      className="scroll-mt-20 lg:scroll-mt-32 px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20 bg-muted/40 border-t border-border"
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
              {/*
                The evaluation criteria are journey step 2's whole body. What is left is the
                part that is a commitment rather than a process description.
              */}
              <p className="text-gray-300 text-[15px] leading-relaxed mb-8">
                Nothing about the tier or the territory is confirmed until we have looked at
                your market. If it has no room for a MuscleBox Pro network, we will say so.
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
                    {/* On a white card, so the darker step of the hue. See index.css. */}
                    <span className="inline-block text-primary-ink text-xs font-bold tracking-[0.2em] uppercase mb-2.5">
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
                    className="w-full min-h-12 rounded-full font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors"
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
