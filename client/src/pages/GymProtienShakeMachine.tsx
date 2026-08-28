"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, Activity, Droplets, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Post-Workout Nutrition",
    desc: "Capitalize on the anabolic window. Members get instant access to premium whey isolate.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Zap,
    title: "Member Convenience",
    desc: "No lines, no waiting. Just scan, blend, and go with seamless cashless payment.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ShieldCheck,
    title: "Vending Automation",
    desc: "Zero staff required. The machine handles everything from ordering to dispensing.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Droplets,
    title: "Unmatched Hygiene",
    desc: "Built-in self-cleaning cycles after every shake ensure perfect sanitation standards.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const faqs = [
  {
    q: "How much space does a gym protein shake machine need?",
    a: "Our automated shake machines are designed with a compact footprint, requiring less than 1 square meter (10 sq ft) of floor space and a standard power/water connection.",
  },
  {
    q: "Do members need a special card to buy shakes?",
    a: "No, the machine accepts all major cashless payments including credit cards, debit cards, UPI, and the MuscleBoxPro digital wallet app.",
  },
  {
    q: "How does the self-cleaning system work?",
    a: "After every shake is dispensed, the machine automatically runs a high-pressure hot water and UV sanitation cycle through the mixing chamber, ensuring perfect hygiene without staff intervention.",
  },
];

export default function GymProteinShakeMachine() {
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
              <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
                Automated Shake Dispenser
              </span>
              <h1
                className="font-display font-black text-white uppercase leading-none mb-5 text-balance"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}
              >
                The ultimate{" "}
                <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  gym protein shake machine
                </span>
              </h1>
              <p className="text-white/55 text-base leading-relaxed max-w-lg mb-8">
                Upgrade your fitness center with our state-of-the-art automated shake dispenser. Deliver perfectly chilled, freshly blended post-workout shakes in 60 seconds.
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
            <div className="mt-10 lg:mt-0 lg:w-[380px] flex-shrink-0 hero-rise">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]">
                <img
                  src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                  alt="MuscleBoxPro gym protein shake machine"
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Why Choose Section ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                Why choose us
              </span>
              <h2
                className="font-display font-black text-foreground uppercase mb-3"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
              >
                Why your fitness center needs an{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  automated shake machine
                </span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Replace messy, high-overhead juice bars with a self-cleaning, fully automated vending solution.
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
                The Business Case for a Gym Protein Shake Machine
              </h2>
              <p className="text-gray-600 leading-relaxed">
                For decades, gym owners struggled with the logistics of providing on-site nutrition. Staffing a smoothie bar is expensive, and manual mixing leads to inconsistent quality and wasted inventory. A dedicated <strong>gym protein shake machine</strong> or <strong>automated post-workout drink dispenser</strong> eliminates these hurdles entirely through intelligent vending automation.
              </p>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                Maximizing Gym Revenue Per Square Foot
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Occupying less than one square meter of floor space, our{" "}
                <Link href="/protein-shake-vending-machine" className="text-primary hover:underline font-medium">
                  automated shake dispenser
                </Link>{" "}
                is designed for maximum profitability. By offering premium, chilled post-workout shakes exactly when members need them most, you create a high-margin, passive revenue stream. Whether running a boutique fitness studio or launching a{" "}
                <Link href="/protein-vending-machine-india" className="text-primary hover:underline font-medium">
                  vending machine business in India
                </Link>
                , these smart kiosks maximize ROI.
              </p>

              <ul className="space-y-3 pt-2">
                {[
                  { label: "Flawless Hygiene", text: "Automated self-cleaning prevents bacteria buildup and ensures compliance with health standards." },
                  { label: "Ultimate Convenience", text: "Seamless app integration and cashless payments make purchasing frictionless." },
                  { label: "Zero Overhead", text: "No need to hire bartenders or staff. The machine runs 24/7." },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm"><strong className="text-gray-900">{item.label}:</strong> {item.text}</span>
                  </li>
                ))}
              </ul>

              <h3 className="font-display font-black text-foreground uppercase text-xl pt-4">
                The Future of Vending Automation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Modern fitness centers require modern solutions. Our <strong>gym protein shake machine</strong> isn't just a dispenser. It's a smart <strong>whey protein kiosk</strong>. Equipped with remote telemetry, you can track inventory, monitor sales, and run digital advertising campaigns from the machine's high-definition display.
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
                Gym Protein Machine FAQ
              </h2>
            </div>

            <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
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
              Install an automated shake dispenser today
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              Give your members the post-workout nutrition they crave and boost your bottom line.
            </p>
            <Link href="/gym-demo">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg"
              >
                Get Machine Pricing <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
