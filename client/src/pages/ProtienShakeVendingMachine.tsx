"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  TrendingUp,
  Zap,
  Shield,
  Monitor,
  ArrowRight,
  IndianRupee,
  Clock,
  ChevronDown,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "High ROI",
    desc: "Premium pricing for fresh, customized protein shakes leads to excellent profit margins.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Zap,
    title: "Zero Staff Needed",
    desc: "Fully automated dispensing, payment, and self-cleaning mechanisms.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Turnkey Operation",
    desc: "We handle maintenance, restocking, and technical support. You collect the revenue.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Monitor,
    title: "Dual Revenue",
    desc: "High-resolution displays let brands advertise to gym members, creating a second income stream.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

const heroStats = [
  { icon: IndianRupee, val: "₹0", label: "Upfront investment" },
  { icon: Zap, val: "60s", label: "Blend time" },
  { icon: Clock, val: "24/7", label: "Automated operation" },
  { icon: Layers, val: "12+", label: "Protein blends" },
];

const faqs = [
  {
    q: "Is a protein shake vending machine profitable?",
    a: "Yes, automated protein shake dispensers offer excellent ROI due to the high retail price of freshly blended shakes compared to the low cost of whey powder and water/milk.",
  },
  {
    q: "Who handles the maintenance of the supplement kiosk?",
    a: "Our turnkey solution means MuscleBoxPro handles all maintenance, software updates, and major cleaning. Staff only need to run simple daily automated cleaning cycles.",
  },
  {
    q: "Do these machines only dispense whey protein?",
    a: "No, our smart vending machines can be configured to dispense whey isolate, plant-based vegan protein, pre-workouts, and BCAAs.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-gray-200 rounded-2xl overflow-hidden"
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
    >
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-bold text-gray-900 text-sm pr-4" itemProp="name">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            itemScope
            itemProp="acceptedAnswer"
            itemType="https://schema.org/Answer"
          >
            <p
              className="px-6 pb-5 pt-3 text-gray-600 text-sm leading-relaxed border-t border-gray-100"
              itemProp="text"
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProteinShakeVendingMachine() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-14">

            {/* Text */}
            <div className="flex-1 hero-rise">
              <span className="inline-block px-4 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-bold tracking-[0.25em] uppercase mb-6">
                The Future of Gym Revenue
              </span>
              <h1
                className="font-display font-black text-white uppercase leading-none mb-5 text-balance"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}
              >
                Protein Shake{" "}
                <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  Vending Machine
                </span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-lg mb-8">
                Transform unused floor space into a passive income stream. Our fully automated machines deliver premium post-workout nutrition with zero staff required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/gym-demo">
                  <Button
                    size="lg"
                    className="h-12 px-7 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer shadow-lg shadow-primary/25"
                  >
                    Request Machine Demo <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/specs">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-7 rounded-full font-semibold border-white/20 text-white/80 hover:bg-white/8 cursor-pointer"
                  >
                    View Machine Specs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Machine image */}
            <div className="mt-10 lg:mt-0 lg:w-[340px] flex-shrink-0 hero-rise">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]">
                <img
                  src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                  alt="MuscleBoxPro protein shake vending machine in a modern gym"
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats Row ── */}
      <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {heroStats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm py-5 px-4 text-center"
            >
              <div className="w-9 h-9 bg-primary/8 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <p
                className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none mb-1"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
              >
                {s.val}
              </p>
              <p className="text-gray-500 text-xs font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <main className="flex-1">

        {/* ── Why Choose Section ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                Why invest
              </span>
              <h2
                className="font-display font-black text-foreground uppercase mb-3"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
              >
                Why invest in a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  protein vending machine?
                </span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Gym owners are upgrading from traditional juice bars to automated vending solutions to maximize ROI and minimize overhead.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-6 cursor-default"
                >
                  <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEO Content Section ── */}
        <section className="py-20 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="font-display font-black text-foreground uppercase text-2xl md:text-3xl">
                How a Protein Shake Vending Machine Boosts Gym Revenue
              </h2>
              <p className="text-gray-600 leading-relaxed">
                For gym owners across India, providing on-site nutrition is one of the highest-ROI decisions you can make. Running a manned juice bar requires hiring staff, managing perishable inventory, and absorbing significant overhead, often ₹25,000–₹60,000 per month in operational costs before a single rupee of profit. A <strong>protein shake vending machine</strong> or <strong>automated supplement kiosk</strong> solves all of these problems by providing 24/7 access to premium post-workout nutrition with zero staff involvement.
              </p>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                The Revenue Opportunity
              </h3>

              {/* Revenue callout */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 not-prose">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-lg mb-1">₹15,000–₹70,000+ per month</p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      MuscleBoxPro partner gyms generate this in total machine revenue depending on daily footfall. Under our revenue-sharing model, gym owners receive <strong>₹3,000–₹12,000/month</strong> passive income, with zero upfront investment and zero maintenance cost.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed">
                Selling price per shake averages ₹100–₹150, while ingredient costs per serve range from ₹45–₹70, delivering gross margins of 45–55%+ on each transaction. At 20–30 shakes per day, a gym in a mid-tier Indian city can expect consistent, compounding shake revenue that grows alongside membership, without adding a single operational task to the owner's plate.
              </p>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                The Ultimate Post-Workout Convenience
              </h3>
              <p className="text-gray-600 leading-relaxed">
                The anabolic window, the critical 30–45 minutes after a workout, is when muscles are most primed to absorb protein for recovery and growth. Most gym members want to capitalise on this window but find shaker bottles, powders, and warm water inconvenient. By placing an{" "}
                <Link href="/gym-protein-shake-machine" className="text-primary hover:underline font-medium">
                  automated shake dispenser
                </Link>{" "}
                directly on your gym floor, you remove all friction: a perfectly mixed, chilled protein shake is ready within 60 seconds of the member finishing their last set. Payment via UPI, credit/debit card, or the MuscleBoxPro digital wallet keeps the experience seamless.
              </p>

              <ul className="space-y-3 pt-2">
                {[
                  { label: "Cashless Payments", text: "UPI, cards, and digital wallet. No cash handling required." },
                  { label: "12 Protein Blends", text: "Whey isolate, plant-based vegan, pre-workout, and BCAA options." },
                  { label: "Smart Telemetry", text: "Real-time inventory tracking, sales analytics, and remote diagnostics." },
                  { label: "Self-Cleaning Cycles", text: "Automated hygiene cycles maintain food-safety standards without staff." },
                  { label: "Less than 10 sq ft", text: "Compact footprint designed for busy gym floors." },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm"><strong className="text-gray-900">{item.label}:</strong> {item.text}</span>
                  </li>
                ))}
              </ul>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                Member Retention Impact
              </h3>
              <p className="text-gray-600 leading-relaxed">
                On-site nutrition is one of the strongest retention levers available to gym owners. Members who consume protein within 45 minutes of training see measurably faster results, and members who see results stay. MuscleBoxPro partner gyms report that members who use the vending machine regularly visit 18–22% more frequently than non-users, creating a compounding retention effect that reduces churn and stabilises monthly membership revenue. Retaining one additional member per month in a gym charging ₹2,000/month membership is worth ₹24,000/year, far exceeding the passive income from shake sales alone.
              </p>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                Dual Revenue: Shakes + Advertising
              </h3>
              <p className="text-gray-600 leading-relaxed">
                MuscleBoxPro <strong>whey protein vending machines</strong> include high-resolution digital displays that brands can use to advertise directly to gym members, one of the most targeted fitness audiences in India. This captive audience model creates a second passive income stream for the gym beyond shake revenue. Brands in sports nutrition, fitness apparel, and health supplements actively seek premium gym placements; MuscleBoxPro manages these brand relationships and shares advertising revenue with partner gyms, further compounding total returns without adding any work for the owner.
              </p>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                Zero-Risk Installation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Unlike a juice bar (₹2–5 lakh upfront) or a supplement counter (₹50,000–₹1,50,000 in working capital), the MuscleBoxPro machine requires <strong>zero capital investment</strong> from the gym owner. MuscleBoxPro handles the full installation, ingredient stocking, technical maintenance, and restocking on an ongoing basis. The gym earns a revenue share from day one with no financial risk, making it the only gym revenue idea on our{" "}
                <Link href="/alternatives/gym-revenue-ideas" className="text-primary hover:underline font-medium">
                  passive income ranked list
                </Link>{" "}
                that has a zero cost of entry. For a city-by-city breakdown of our current expansion,{" "}
                <Link href="/protein-vending-machine-india" className="text-primary hover:underline font-medium">
                  see protein vending machines available in your city
                </Link>.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">FAQ</span>
              <h2
                className="font-display font-black text-foreground uppercase"
                style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}
              >
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <FAQItem q={faq.q} a={faq.a} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compare ── */}
        <section className="py-16 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display font-black text-gray-900 uppercase mb-3" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
              See How It Compares
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              Detailed comparisons to help you make the right choice for your gym.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { href: "/vs/protein-shake-bar", title: "Vending Machine vs. Protein Shake Bar", sub: "Staff cost · hygiene · revenue" },
                { href: "/vs/supplement-counter", title: "Vending Machine vs. Supplement Counter", sub: "ROI · inventory risk · shrinkage" },
                { href: "/alternatives/gym-revenue-ideas", title: "7 Ways to Generate Gym Passive Revenue", sub: "Ranked by ROI for Indian gyms" },
              ].map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex flex-col items-center gap-2 bg-white border border-gray-200 hover:border-primary/40 hover:shadow-md rounded-2xl p-5 transition-all duration-200 cursor-pointer"
                >
                  <span className="font-semibold text-gray-800 group-hover:text-primary transition-colors text-sm">{card.title}</span>
                  <span className="text-xs text-gray-400">{card.sub}</span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
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
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center relative z-10"
          >
            <h2
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Ready to upgrade your gym?
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              Join modern fitness centers across India generating passive revenue with our smart vending solutions.
            </p>
            <Link href="/gym-demo">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg"
              >
                Secure Your Machine Today <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
