"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Clock,
  Users,
  DollarSign,
  Shield,
  Zap,
  BarChart3,
} from "lucide-react";

/* ─── Affiliation Banner ─── */
function AffiliationBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
      <div className="max-w-4xl mx-auto text-center text-amber-800 text-xs leading-relaxed">
        <strong>Disclosure:</strong> This page is published by{" "}
        <strong>BlendBox Innovations LLP</strong>, the company behind MuscleBoxPro.
        We have made every effort to present balanced, accurate information about
        both options. All pricing figures are estimates as of Q1 2026.
      </div>
    </div>
  );
}

/* ─── Comparison data ─── */
type Mark = "yes" | "no" | "partial";

interface ComparisonRow {
  dimension: string;
  mbp: { mark: Mark; note: string };
  bar: { mark: Mark; note: string };
}

const rows: ComparisonRow[] = [
  {
    dimension: "Upfront Cost to Gym Owner",
    mbp: { mark: "yes", note: "₹0 — machine supplied free of charge under revenue-share model" },
    bar: { mark: "no", note: "₹2–8 L for equipment, refrigerators, blenders, counter fit-out (est. Q1 2026)" },
  },
  {
    dimension: "Staff Requirement",
    mbp: { mark: "yes", note: "Zero — fully automated blending, dispensing, and self-cleaning" },
    bar: { mark: "no", note: "1–2 dedicated staff per shift; wages ₹12,000–₹22,000/month each (est. Q1 2026)" },
  },
  {
    dimension: "24 / 7 Availability",
    mbp: { mark: "yes", note: "Operates around the clock; open even when gym staff go home" },
    bar: { mark: "no", note: "Limited to operating hours; early-morning / late-night members go unserved" },
  },
  {
    dimension: "Operational Complexity",
    mbp: { mark: "yes", note: "MuscleBoxPro handles maintenance, restocking logistics, and software updates" },
    bar: { mark: "no", note: "Gym owner manages stock ordering, spoilage, equipment servicing, and staff rosters" },
  },
  {
    dimension: "Hygiene & Consistency",
    mbp: { mark: "yes", note: "Automated pipe-cleaning system; calibrated dosing ensures identical shake every time" },
    bar: { mark: "partial", note: "Depends on individual staff training; human error affects portion sizes and cleaning" },
  },
  {
    dimension: "Revenue Share / Profit",
    mbp: { mark: "partial", note: "Gym earns a revenue-share percentage; MuscleBoxPro retains a portion for machine, maintenance, and ingredients" },
    bar: { mark: "yes", note: "Gym keeps 100% of margin after ingredient costs; higher upside if volume is strong" },
  },
  {
    dimension: "Menu Flexibility",
    mbp: { mark: "yes", note: "12+ variants; menu updated remotely via cloud dashboard without physical changes" },
    bar: { mark: "yes", note: "Fully customisable; staff can freestyle blends and seasonal specials" },
  },
  {
    dimension: "Cashless / UPI Payments",
    mbp: { mark: "yes", note: "UPI, PhonePe, Google Pay, Paytm, Visa, Mastercard, RuPay — all built-in" },
    bar: { mark: "partial", note: "Requires separate POS device; some bars still cash-only" },
  },
  {
    dimension: "Ad / Digital Revenue",
    mbp: { mark: "yes", note: "Built-in HD display generates brand advertising income — a second passive revenue stream" },
    bar: { mark: "no", note: "No equivalent digital advertising capability" },
  },
  {
    dimension: "Speed of Service",
    mbp: { mark: "yes", note: "60-second blend-to-cup from selection to dispensing" },
    bar: { mark: "partial", note: "2–5 minutes typical; longer during post-class rush periods" },
  },
];

function Mark({ m }: { m: Mark }) {
  if (m === "yes") return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  if (m === "no") return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
  return <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
}

/* ─── Verdict cards ─── */
const verdicts = [
  {
    icon: Clock,
    title: "Choose a Protein Shake Bar if…",
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
    points: [
      "Your gym has peak hours concentrated in 2–3 windows and staff are already on-site",
      "You want 100% control over the menu, including fresh-fruit smoothies",
      "You have capital and willingness to manage day-to-day bar operations",
      "High member count (500+/day) where bar throughput justifies the fixed overhead",
    ],
  },
  {
    icon: Zap,
    title: "Choose MuscleBoxPro if…",
    color: "border-emerald-200 bg-emerald-50",
    iconColor: "text-emerald-600",
    points: [
      "You want passive income with zero upfront investment or operational lift",
      "Your gym is open early mornings / late nights when staffing is impractical",
      "You're a mid-size gym (50–400 members) where a full bar is hard to justify",
      "You want a second revenue stream from digital advertising alongside shakes",
    ],
  },
];

const faqs = [
  {
    q: "Can a gym run both a protein shake bar and a MuscleBoxPro machine?",
    a: "Yes — some large gyms use a staffed bar for peak hours and a MuscleBoxPro machine for off-hours coverage. The machine handles early-morning and late-night members without additional staffing costs.",
  },
  {
    q: "Does MuscleBoxPro charge the gym owner anything?",
    a: "No upfront cost. MuscleBoxPro installs and maintains the machine for free. The gym earns a revenue share on every shake sold. There are no hidden rental or maintenance fees charged to the gym owner.",
  },
  {
    q: "How hygienic is an automated protein shake machine compared to a human-operated bar?",
    a: "MuscleBoxPro machines include an automated pipe-cleaning system that runs consistently after each use. Human-operated bars rely on staff training and manual cleaning, which can vary. Both approaches can meet FSSAI hygiene standards when managed correctly.",
  },
  {
    q: "Is a staffed protein shake bar more profitable than an automated machine?",
    a: "A well-run bar with high footfall keeps 100% of margin, but must absorb staff wages (₹24,000–₹44,000/month for two staff as of Q1 2026), spoilage, and equipment depreciation. MuscleBoxPro's revenue-share model delivers profit to the gym owner with zero operating overhead, making it more reliably profitable for small-to-mid-size gyms.",
  },
  {
    q: "Which cities in India does MuscleBoxPro cover?",
    a: "As of Q1 2026, MuscleBoxPro installs machines in Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Jaipur, Noida, and Gurugram.",
  },
];

export default function VsProteinShakeBar() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <AffiliationBanner />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-2 text-white/30 text-xs mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/50">Protein Shake Bar vs Vending Machine</span>
          </nav>

          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            Comparison Guide · Q1 2026
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-5"
            style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.4rem)" }}
          >
            Protein Shake Vending Machine{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              vs. Protein Shake Bar
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/55 text-base leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Which model generates more passive income for Indian gym owners in 2026 —
            a fully automated smart machine or a staffed protein shake bar? We break down
            cost, operations, hygiene, and revenue across 10 dimensions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-7 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 shadow-lg shadow-primary/25">
                Request Free Machine Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/specs">
              <Button size="lg" variant="outline" className="h-12 px-7 rounded-full font-semibold border-white/20 text-white/80 hover:bg-white/8">
                View Machine Specs
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Quick summary stats ── */}
        <section className="py-12 px-4 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: "Upfront Cost", mbp: "₹0", bar: "₹2–8 L" },
              { label: "Staff Required", mbp: "None", bar: "1–2 per shift" },
              { label: "Serving Speed", mbp: "60 seconds", bar: "2–5 minutes" },
              { label: "Operating Hours", mbp: "24 / 7", bar: "Staff hours only" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center"
              >
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">{s.label}</p>
                <div className="flex gap-2 justify-center items-start">
                  <div className="flex-1 bg-primary/8 rounded-xl p-2">
                    <p className="text-[10px] text-primary font-semibold mb-0.5">MuscleBoxPro</p>
                    <p className="text-gray-900 font-black text-sm">{s.mbp}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-xl p-2">
                    <p className="text-[10px] text-gray-500 font-semibold mb-0.5">Shake Bar</p>
                    <p className="text-gray-700 font-black text-sm">{s.bar}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Detailed comparison table ── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Feature by Feature</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl mb-3">
                Head-to-Head Comparison
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                10 dimensions that matter most to Indian gym owners evaluating nutrition revenue options.
                <span className="block mt-1 text-xs text-amber-700">All cost figures are estimates as of Q1 2026.</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-2">
                <div />
                <div className="text-center">
                  <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MuscleBoxPro</span>
                </div>
                <div className="text-center">
                  <span className="inline-block bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">Protein Shake Bar</span>
                </div>
              </div>

              {rows.map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="font-bold text-gray-800 text-sm">{row.dimension}</p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100">
                    <div className="p-4 flex items-start gap-3">
                      <Mark m={row.mbp.mark} />
                      <p className="text-gray-600 text-sm leading-relaxed">{row.mbp.note}</p>
                    </div>
                    <div className="p-4 flex items-start gap-3">
                      <Mark m={row.bar.mark} />
                      <p className="text-gray-600 text-sm leading-relaxed">{row.bar.note}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Legend: <CheckCircle2 className="inline w-3.5 h-3.5 text-emerald-500" /> Advantage &nbsp;
              <AlertCircle className="inline w-3.5 h-3.5 text-amber-400" /> Partial / Conditional &nbsp;
              <XCircle className="inline w-3.5 h-3.5 text-red-400" /> Disadvantage
            </p>
          </div>
        </section>

        {/* ── Deep-dive content ── */}
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto space-y-10">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Upfront Cost & Capital Risk</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                Setting up a manned protein shake bar is a meaningful capital commitment. A basic counter with two commercial blenders, a refrigeration unit, and modest fit-out typically runs{" "}
                <strong>₹2–5 lakh</strong>; premium counters with juicer stations, branding, and storage can reach{" "}
                <strong>₹6–8 lakh</strong> (estimates as of Q1 2026). That capital is at risk if footfall underperforms expectations.
              </p>
              <p className="text-gray-600 leading-relaxed">
                MuscleBoxPro's model flips this completely: the machine is supplied, installed, and maintained by BlendBox Innovations LLP at{" "}
                <strong>zero cost to the gym owner</strong>. The gym earns a revenue share on every shake sold without putting any capital on the line. For gyms still growing their membership base — or those wanting to test nutrition revenue before committing fully — the zero-risk entry is the primary advantage. The trade-off is that the gym does not retain 100% of the margin.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Staff & Operational Overhead</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                A staffed bar requires at least one employee per operating window. At minimum wage equivalents in India's metro gym market, two part-time staff members add{" "}
                <strong>₹24,000–₹44,000/month</strong> in wage costs before accounting for ESI/PF contributions, training time, and absenteeism coverage (est. Q1 2026). Gym managers frequently cite staff reliability as their largest operational headache.
              </p>
              <p className="text-gray-600 leading-relaxed">
                An automated machine eliminates this entirely. MuscleBoxPro's 27-inch touch-screen interface guides members through selection, the machine blends and dispenses in 60 seconds, and the automated pipe-cleaning system maintains hygiene without staff involvement. The gym's front-desk team is never pulled away from member service.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Hygiene & Consistency</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                Both models can meet FSSAI hygiene requirements, but for different reasons. A well-run bar with trained, conscientious staff can deliver excellent hygiene — but consistency relies entirely on human compliance. Portion sizes, cleaning frequency, and ingredient freshness all vary between staff members and shifts.
              </p>
              <p className="text-gray-600 leading-relaxed">
                MuscleBoxPro machines use an <strong>independent mechanical stirring system</strong> and{" "}
                <strong>automated pipe-cleaning</strong> after each use. Dosing is calibrated electronically, so every member gets an identical shake regardless of time of day. This is particularly valuable for members tracking macros, where consistency matters as much as taste. One real downside: if the machine's cleaning system malfunctions, service halts entirely — human bars can continue operating.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Revenue Model & Long-Term ROI</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                A well-operated shake bar at a 300+ member gym can yield strong margins — particularly if the owner sources protein powder in bulk and keeps staff costs tight. The ceiling on revenue is higher with full ownership. However, the floor — the break-even point — is also much higher due to fixed costs.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                MuscleBoxPro creates two revenue streams simultaneously: the{" "}
                <strong>shake revenue share</strong> and income from the machine's{" "}
                <strong>HD advertising display</strong>, which brands pay to reach gym members. This dual-stream model means a gym earns even when shake volume is low, smoothing out slower months.
              </p>
              <p className="text-gray-600 leading-relaxed">
                For detailed specs on the machine's capabilities, visit our{" "}
                <Link href="/specs" className="text-primary hover:underline font-medium">machine specifications page</Link>.
                To understand how the revenue share model works across your city, see{" "}
                <Link href="/protein-shake-vending-machine" className="text-primary hover:underline font-medium">how MuscleBoxPro protein shake vending machines work</Link>.
              </p>
            </motion.div>

          </div>
        </section>

        {/* ── Verdict ── */}
        <section className="py-20 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Our Verdict</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl">
                Which is right for your gym?
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {verdicts.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl border p-7 ${v.color}`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <v.icon className={`w-6 h-6 ${v.iconColor}`} />
                    <h3 className="font-bold text-gray-900 text-base">{v.title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {v.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">FAQ</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-primary/20 transition-colors"
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <h3 className="font-bold text-gray-900 mb-2" itemProp="name">{faq.q}</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p className="text-gray-600 text-sm leading-relaxed m-0" itemProp="text">{faq.a}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related Links ── */}
        <section className="py-10 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Related Comparisons</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Vending Machine vs. Supplement Counter", href: "/vs/supplement-counter" },
                { label: "7 Passive Revenue Ideas for Indian Gyms", href: "/alternatives/gym-revenue-ideas" },
                { label: "Protein Vending Machine in India", href: "/protein-vending-machine-india" },
                { label: "Machine Specifications", href: "/specs" },
              ].map((l, i) => (
                <Link
                  key={i}
                  href={l.href}
                  className="text-sm text-primary border border-primary/30 hover:bg-primary hover:text-white rounded-full px-4 py-1.5 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-gradient-to-r from-accent to-primary relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center relative z-10"
          >
            <h2 className="font-display font-black text-white uppercase leading-none mb-4" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
              Ready to add a machine at zero cost?
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              Join gyms across 11 Indian cities generating passive shake and advertising revenue — no capital required.
            </p>
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 shadow-lg">
                Get Your Free Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
