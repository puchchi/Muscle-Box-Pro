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
  Package,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  Users,
} from "lucide-react";

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

type Mark = "yes" | "no" | "partial";

interface ComparisonRow {
  dimension: string;
  mbp: { mark: Mark; note: string };
  counter: { mark: Mark; note: string };
}

const rows: ComparisonRow[] = [
  {
    dimension: "Capital Required to Start",
    mbp: { mark: "yes", note: "₹0 — machine, installation, and maintenance all covered by MuscleBoxPro" },
    counter: { mark: "no", note: "₹1.5–4 L initial inventory + display fixtures, shelving (est. Q1 2026)" },
  },
  {
    dimension: "Inventory Risk & Expiry",
    mbp: { mark: "yes", note: "MuscleBoxPro manages restocking; gym owner bears zero inventory risk" },
    counter: { mark: "no", note: "Gym ties up capital in stock; FSSAI expiry rules mean unsold tubs are a write-off" },
  },
  {
    dimension: "Shrinkage / Theft",
    mbp: { mark: "yes", note: "Electromagnetic auto-door + cashless payments eliminate cash theft; machine logs every transaction" },
    counter: { mark: "no", note: "Open retail shelving is vulnerable; industry average shrinkage 1–3% of GMV" },
  },
  {
    dimension: "Staff Overhead",
    mbp: { mark: "yes", note: "Fully automated — no dedicated counter staff needed" },
    counter: { mark: "no", note: "Front-desk staff diverted to sales; specialist supplement knowledge expected" },
  },
  {
    dimension: "Impulse Purchase Conversion",
    mbp: { mark: "yes", note: "Post-workout placement on gym floor drives immediate, impulse-driven shake purchases" },
    counter: { mark: "partial", note: "Supplement tubs require considered purchase; most members shop online for better price" },
  },
  {
    dimension: "Passive vs. Active Sales",
    mbp: { mark: "yes", note: "Machine sells 24/7 without any active selling effort from gym staff" },
    counter: { mark: "no", note: "Counter requires staff to initiate conversations, upsell, and manage transactions" },
  },
  {
    dimension: "Average Transaction Value",
    mbp: { mark: "partial", note: "₹75–₹140 per shake — lower ticket but extremely high frequency" },
    counter: { mark: "yes", note: "₹1,500–₹5,000 per tub — high ticket but low conversion rate; member usually shops online" },
  },
  {
    dimension: "Monthly Revenue Predictability",
    mbp: { mark: "yes", note: "High daily transaction frequency smooths revenue; ad display adds a second income stream" },
    counter: { mark: "no", note: "Lumpy — one or two tub sales per day in a typical mid-size gym; vulnerable to Amazon price pressure" },
  },
  {
    dimension: "Hygiene & Compliance",
    mbp: { mark: "yes", note: "Automated cleaning; every serve is freshly blended — no open tubs or cross-contamination risk" },
    counter: { mark: "partial", note: "Pre-packaged products are safe, but open testers or scoop sharing raises hygiene questions" },
  },
  {
    dimension: "Digital Advertising Revenue",
    mbp: { mark: "yes", note: "HD 4K display lets brands advertise to gym members — generating ad income alongside shake sales" },
    counter: { mark: "no", note: "No equivalent advertising capability from a retail shelf" },
  },
];

function MarkIcon({ m }: { m: Mark }) {
  if (m === "yes") return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  if (m === "no") return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
  return <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
}

const roiTable = [
  { metric: "Monthly shake revenue (50 shakes/day @ ₹110 avg)", mbp: "₹1,65,000 GMV", counter: "—" },
  { metric: "Gym's revenue share (indicative)", mbp: "₹49,500–₹66,000", counter: "—" },
  { metric: "Monthly supplement tub sales (avg mid-size gym)", mbp: "—", counter: "₹18,000–₹35,000 GMV" },
  { metric: "Gross margin after cost of goods", mbp: "Managed by MuscleBoxPro", counter: "~30–40% = ₹5,400–₹14,000" },
  { metric: "Staff cost deduction", mbp: "₹0", counter: "₹6,000–₹10,000 (staff time allocation)" },
  { metric: "Inventory write-off / shrinkage (est.)", mbp: "₹0", counter: "₹500–₹1,500" },
  { metric: "Net monthly income to gym", mbp: "₹49,500–₹66,000+", counter: "₹3,900–₹8,500" },
];

const faqs = [
  {
    q: "Can I run both a supplement counter and a MuscleBoxPro machine in the same gym?",
    a: "Yes, and many gyms do. The counter serves members looking to buy bulk supplements, while the machine captures post-workout impulse purchases. The products don't directly compete — a shake is a consumed service, a tub is a retail product.",
  },
  {
    q: "Why do gyms struggle to sell supplements at the counter when big brands like Amazon dominate online?",
    a: "Online platforms offer lower prices, broader selection, and subscription discounts that a gym counter simply can't match. Members who want to buy a tub typically do their research online. The counter works better for accessories (straps, shakers) and impulse items like bars and sachets than for bulk tubs.",
  },
  {
    q: "What is shrinkage and why does it matter for supplement counters?",
    a: "Shrinkage refers to inventory losses from theft, damage, or accounting errors. Open retail supplement shelving at a gym can see 1–3% shrinkage. At ₹30,000 GMV/month, that's ₹300–₹900 per month in direct losses — on top of tight margins.",
  },
  {
    q: "Does MuscleBoxPro handle restocking and ingredient supply?",
    a: "Yes. BlendBox Innovations LLP manages the entire supply chain including ingredient procurement, canister refilling, and restocking logistics. The gym owner's only responsibility is ensuring the machine has access to power and running water.",
  },
  {
    q: "How does the MuscleBoxPro advertising display generate revenue for gyms?",
    a: "The machine's HD display shows brand advertisements to gym members. Brands pay MuscleBoxPro for this captive audience placement, and the gym earns a share of that advertising income — creating a second passive revenue stream alongside shake sales.",
  },
];

export default function VsSupplementCounter() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <AffiliationBanner />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <nav className="flex items-center justify-center gap-2 text-white/30 text-xs mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/50">Vending Machine vs. Supplement Counter</span>
          </nav>

          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            ROI Analysis · Q1 2026
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-5"
            style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.4rem)" }}
          >
            Vending Machine vs.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              Supplement Counter
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/55 text-base leading-relaxed max-w-2xl mx-auto mb-8"
          >
            An honest ROI analysis for Indian gym owners: is a traditional front-desk supplement
            retail counter generating the returns you expect — or is an automated protein shake
            machine a smarter use of that floor space?
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-7 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 shadow-lg shadow-primary/25">
                Request Free Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/protein-shake-vending-machine">
              <Button size="lg" variant="outline" className="h-12 px-7 rounded-full font-semibold border-white/20 text-white/80 hover:bg-white/8">
                How It Works
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Quick stats ── */}
        <section className="py-12 px-4 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: "Capital Required", mbp: "₹0", counter: "₹1.5–4 L" },
              { label: "Inventory Risk", mbp: "Zero", counter: "Moderate–High" },
              { label: "Theft / Shrinkage", mbp: "Eliminated", counter: "1–3% GMV" },
              { label: "Revenue Type", mbp: "Passive", counter: "Active / Staffed" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center"
              >
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">{s.label}</p>
                <div className="flex gap-2 justify-center">
                  <div className="flex-1 bg-primary/8 rounded-xl p-2">
                    <p className="text-[10px] text-primary font-semibold mb-0.5">MuscleBoxPro</p>
                    <p className="text-gray-900 font-black text-sm">{s.mbp}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-xl p-2">
                    <p className="text-[10px] text-gray-500 font-semibold mb-0.5">Suppl. Counter</p>
                    <p className="text-gray-700 font-black text-sm">{s.counter}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Comparison table ── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Feature by Feature</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl mb-3">
                10-Dimension Comparison
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Evaluating both models on the metrics that drive real profitability for gym owners in India.
                <span className="block mt-1 text-xs text-amber-700">All cost figures are estimates as of Q1 2026.</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-2">
                <div />
                <div className="text-center">
                  <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MuscleBoxPro</span>
                </div>
                <div className="text-center">
                  <span className="inline-block bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">Supplement Counter</span>
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
                      <MarkIcon m={row.mbp.mark} />
                      <p className="text-gray-600 text-sm leading-relaxed">{row.mbp.note}</p>
                    </div>
                    <div className="p-4 flex items-start gap-3">
                      <MarkIcon m={row.counter.mark} />
                      <p className="text-gray-600 text-sm leading-relaxed">{row.counter.note}</p>
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

        {/* ── ROI table ── */}
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Numbers Side by Side</span>
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl mb-3">
                Monthly Revenue Estimate
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Illustrative figures for a mid-size Indian gym with 200 active members. All values are estimates as of Q1 2026 and will vary with footfall and pricing strategy.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold text-xs uppercase tracking-wider w-1/2">Metric</th>
                    <th className="px-5 py-4 text-center">
                      <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MuscleBoxPro</span>
                    </th>
                    <th className="px-5 py-4 text-center">
                      <span className="inline-block bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">Supplement Counter</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {roiTable.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-5 py-4 text-gray-700 leading-snug">{row.metric}</td>
                      <td className="px-5 py-4 text-center font-semibold text-gray-900">{row.mbp}</td>
                      <td className="px-5 py-4 text-center font-semibold text-gray-900">{row.counter}</td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                    <td className="px-5 py-5 text-gray-900 font-bold">Net Monthly Income to Gym (est.)</td>
                    <td className="px-5 py-5 text-center text-primary font-black text-base">₹49,500–₹66,000+</td>
                    <td className="px-5 py-5 text-center text-gray-700 font-black text-base">₹3,900–₹8,500</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              MuscleBoxPro figure includes indicative revenue share on 50 shakes/day at ₹110 average. Supplement counter net income assumes 30–40% gross margin minus staff time allocation and shrinkage. Both are estimates and not guarantees of income.
            </p>
          </div>
        </section>

        {/* ── Deep-dive content ── */}
        <section className="py-20 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto space-y-10">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">The Hidden Cost of Inventory Risk</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                A supplement counter looks profitable on paper — whey tubs retail at{" "}
                <strong>₹2,500–₹5,000</strong> with a 30–40% margin. But the unit economics rarely hold in practice. Most gym members price-shop online and use the counter primarily for information, not purchase. Platforms like Amazon, Flipkart, and health supplement D2C brands consistently undercut gym counter pricing by 15–30%, and offer subscription discounts the gym simply cannot match.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The result: counters in mid-size Indian gyms typically move{" "}
                <strong>3–8 tubs per month</strong> — generating ₹3,000–₹16,000 in gross revenue before accounting for the staff time spent answering questions, ordering stock, managing expiry dates, and handling returns. Add 1–3% shrinkage from open shelving and the actual net income from a supplement counter is often surprisingly low.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Impulse Purchases vs. Considered Purchases</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                The fundamental difference between a vending machine and a supplement counter is{" "}
                <strong>purchase psychology</strong>. Buying a ₹3,500 tub of whey is a considered decision — members compare prices, read reviews, and typically shop online. Buying a ₹110 post-workout shake after 45 minutes of lifting is an impulse driven by immediate biological need.
              </p>
              <p className="text-gray-600 leading-relaxed">
                MuscleBoxPro machines are placed directly on the gym floor, where members are at peak motivation and lowest price sensitivity. A 60-second blend and cashless UPI payment removes all friction from that impulse. The result is high daily transaction frequency — the engine of consistent passive income for the gym owner.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="font-display font-black text-foreground uppercase text-xl">Theft & Shrinkage: A Genuine Problem</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                Open retail shelving in a high-traffic gym environment is susceptible to product theft — both by members and occasionally by staff. Pre-packaged supplements are small, high-value, and easy to conceal. Industry estimates for gym retail shrinkage run at{" "}
                <strong>1–3% of GMV</strong>, which on ₹30,000 of monthly counter sales represents ₹300–₹900 in direct losses per month.
              </p>
              <p className="text-gray-600 leading-relaxed">
                MuscleBoxPro machines eliminate this entirely. The electromagnetic automatic door only opens during an active dispensing cycle. Every transaction is logged digitally and reconciled against inventory. Cash handling is removed from the equation entirely through UPI and card payments — meaning there is no cash till to skim. For more on machine security, see the{" "}
                <Link href="/specs" className="text-primary hover:underline font-medium">full machine specifications</Link>.
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
                <h2 className="font-display font-black text-foreground uppercase text-xl">Dual Revenue: Shakes + Advertising</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                A supplement counter generates exactly one revenue stream: margin on products sold. MuscleBoxPro machines generate two: shake revenue share and income from the{" "}
                <strong>HD 4K advertising display</strong>. Fitness brands, sports nutrition companies, and local businesses pay to advertise directly to your gym's members — a captive, highly targeted audience that most brands are willing to pay a premium to reach.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This second stream means the machine generates income even during slow shake-purchase periods — early mornings, weekday afternoons — when screen impressions still have value. See how the{" "}
                <Link href="/advertise" className="text-primary hover:underline font-medium">advertising model works for gym partners</Link>{" "}
                or read more about{" "}
                <Link href="/protein-shake-vending-machine" className="text-primary hover:underline font-medium">how MuscleBoxPro's vending machines work</Link>.
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
                <h2 className="font-display font-black text-foreground uppercase text-xl">Where the Supplement Counter Still Wins</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-3">
                In fairness, supplement counters do have a genuine use case. Large gyms with a certified nutritionist on staff can build real credibility through in-person consultations that drive supplement sales. For gyms with 500+ members in Tier-1 metros, a knowledgeable counter operated by a trained professional can generate meaningful revenue and brand authority that an automated machine cannot replicate.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Supplement counters also carry accessories (straps, shakers, gym bags) and food products (protein bars, sachets) that a shake machine cannot. If your gym has a well-established retail ecosystem and dedicated retail staff, the counter can complement rather than replace other revenue streams. For most mid-size gyms, however, the ROI comparison above tells the real story.
              </p>
            </motion.div>
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

        {/* ── Related links ── */}
        <section className="py-10 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Related Reading</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Shake Bar vs Vending Machine", href: "/vs/protein-shake-bar" },
                { label: "7 Passive Revenue Ideas for Gyms", href: "/alternatives/gym-revenue-ideas" },
                { label: "How Advertising on the Machine Works", href: "/advertise" },
                { label: "Machine Specifications", href: "/specs" },
                { label: "Protein Vending Machine in India", href: "/protein-vending-machine-india" },
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
              Turn unused floor space into passive income
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              Zero capital. Zero staff. Two revenue streams. Join gyms across 11 Indian cities already earning with MuscleBoxPro.
            </p>
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 shadow-lg">
                Request Your Free Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
