"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import {
  Cpu, Wifi, Droplets, Layers, Maximize, Thermometer,
  ShieldCheck, CreditCard, QrCode, Smartphone, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MACHINE_SPEC, dimensionsCm } from "@shared/machine/spec";

// Sourced from the shared spec so this page and onboarding step 2 cannot describe
// two different machines. See shared/machine/spec.ts.
const keyStats = [
  { value: dimensionsCm(), label: "Size (cm)", sub: "W × D × H" },
  { value: `${MACHINE_SPEC.displayInches}"`, label: "HD Touch Display", sub: "Smart Interface" },
  {
    value: `${MACHINE_SPEC.capacityLitres}L`,
    label: "Total Capacity",
    sub: `${MACHINE_SPEC.canisters} Canisters`,
  },
  { value: MACHINE_SPEC.connectivity, label: "Connectivity", sub: "Always Online" },
];

const specs = [
  {
    group: "Smart Core",
    dotColor: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    items: [
      { icon: Cpu, label: "OS", value: "Android System & Smart Cloud Management" },
      { icon: Maximize, label: "Display", value: "27-inch HD Touch Screen Interface" },
      { icon: Wifi, label: "Connectivity", value: "WiFi & 4G High-Speed Mode" },
      { icon: Droplets, label: "Maintenance", value: "Automated Pipe Cleaning System" },
    ],
  },
  {
    group: "Mixing & Capacity",
    dotColor: "bg-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    items: [
      { icon: Layers, label: "Flavors", value: "20+ Dynamic Mixed Drink Varieties" },
      { icon: Thermometer, label: "Stirring", value: "Independent Mechanical Stirring System" },
      { icon: Droplets, label: "Canisters", value: "7 Tall Canisters (28L Total Capacity)" },
      { icon: Layers, label: "Dispenser", value: "Auto Cup Dispenser (70pcs / 400ml)" },
    ],
  },
  {
    group: "Hardware & Precision",
    dotColor: "bg-accent",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    items: [
      { icon: ShieldCheck, label: "Build", value: "Industrial Carbon Steel Panel Material" },
      { icon: Thermometer, label: "Thermals", value: "Hot (1.8L) & Compressor Refrig (2L)" },
      { icon: Maximize, label: "Motion", value: "X/Y Two-Axis Motion Track Precision" },
      { icon: ShieldCheck, label: "Security", value: "Electromagnetic Automatic Door" },
    ],
  },
];

const paymentMethods = [
  { icon: CreditCard, label: "Credit / Debit Cards", desc: "Visa, Mastercard, RuPay" },
  { icon: Smartphone, label: "UPI Payments", desc: "PhonePe, Google Pay, Paytm" },
  { icon: QrCode, label: "Dynamic QR", desc: "Instant Scan & Pay on Screen" },
];

export default function MachineSpecs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>

        {/* ── Hero ── */}
        <section className="pt-32 pb-16 px-4 text-center bg-background">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Engineering Excellence
            </span>
            <h1
              className="font-display font-black text-foreground uppercase leading-none mb-5"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              Machine{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Specifications
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed mb-8">
              The ultimate high-performance vending solution designed for premium gym environments.
            </p>
            <Link href="/gym-demo">
              <Button
                variant="outline"
                className="h-11 px-7 rounded-full font-semibold border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Request a Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ── Key Stats Row ── */}
        <section className="py-10 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {keyStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm py-7 px-5 text-center"
              >
                <p
                  className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none mb-2"
                  style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.9rem)" }}
                >
                  {stat.value}
                </p>
                <p className="text-gray-900 text-sm font-semibold mb-0.5">{stat.label}</p>
                <p className="text-gray-400 text-[11px] uppercase tracking-wider">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Machine Image + Specs ── */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">

            {/* Machine image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="sticky top-24"
            >
              <div className="relative aspect-[3/4] max-w-md mx-auto rounded-3xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25),0_8px_24px_-4px_rgba(0,0,0,0.15)] border border-gray-100">
                <img
                  src="/assets/machine-specs.png"
                  alt="MuscleBoxPro Technical View"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-6 right-6">
                  <p className="text-white font-display text-2xl font-black uppercase tracking-tight">
                    76 × 60 × 180 CM
                  </p>
                  <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mt-1">
                    Width × Depth × Height
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Spec groups */}
            <div className="space-y-10">
              {specs.map((group, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase text-white ${group.dotColor}`}>
                      {group.group}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {group.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group"
                      >
                        <div className={`w-11 h-11 rounded-xl ${group.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <item.icon className={`w-5 h-5 ${group.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                            {item.label}
                          </p>
                          <p className="text-gray-900 text-sm font-semibold leading-snug">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gradient Stats Banner ── */}
        <section className="bg-gradient-to-r from-accent to-primary py-16 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { val: "20+", label: "Drink Varieties" },
              { val: "400ml", label: "Cup Capacity" },
              { val: "70 pcs", label: "Auto Cup Stack" },
              { val: "MDB", label: "Payment Protocol" },
            ].map((item, i) => (
              <div key={i}>
                <p className="font-display font-black text-white leading-none mb-1" style={{ fontSize: "2.5rem" }}>
                  {item.val}
                </p>
                <p className="text-white/70 text-xs uppercase tracking-[0.2em] font-semibold">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Payment Options ── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                Payments
              </span>
              <h2
                className="font-display font-black text-foreground uppercase mb-3"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
              >
                Every payment method. Covered.
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Our machines support all modern payment methods for a completely frictionless experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {paymentMethods.map((method, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary transition-colors duration-300">
                    <method.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h4 className="text-gray-900 font-bold mb-1">{method.label}</h4>
                  <p className="text-gray-400 text-sm">{method.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-background text-center">
          <div className="max-w-xl mx-auto">
            <h2
              className="font-display font-black text-foreground uppercase mb-4"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Ready to install one
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                in your gym?
              </span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Get a free demo and see the machine in action at a gym near you.
            </p>
            <Link href="/gym-demo">
              <Button
                size="lg"
                className="h-14 px-10 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer text-base shadow-lg shadow-primary/20"
              >
                Request a Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <p className="text-muted-foreground text-sm mt-6">
              Or read the{" "}
              <Link href="/gym-partnership" className="text-primary font-semibold hover:underline">
                full partnership terms
              </Link>{" "}
              first — what it costs, how the profit share works, and who pays for what.
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
