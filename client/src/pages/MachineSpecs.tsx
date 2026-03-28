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

const keyStats = [
  { value: "76×60×180", label: "Size (cm)", sub: "W × D × H" },
  { value: "27\"", label: "HD Touch Display", sub: "Smart Interface" },
  { value: "28L", label: "Total Capacity", sub: "7 Canisters" },
  { value: "4G + WiFi", label: "Connectivity", sub: "Always Online" },
];

const specs = [
  {
    group: "Smart Core",
    color: "bg-blue-500",
    items: [
      { icon: Cpu, label: "OS", value: "Android System & Smart Cloud Management" },
      { icon: Maximize, label: "Display", value: "27-inch HD Touch Screen Interface" },
      { icon: Wifi, label: "Connectivity", value: "WiFi & 4G High-Speed Mode" },
      { icon: Droplets, label: "Maintenance", value: "Automated Pipe Cleaning System" },
    ],
  },
  {
    group: "Mixing & Capacity",
    color: "bg-primary",
    items: [
      { icon: Layers, label: "Flavors", value: "20+ Dynamic Mixed Drink Varieties" },
      { icon: Thermometer, label: "Stirring", value: "Independent Mechanical Stirring System" },
      { icon: Droplets, label: "Canisters", value: "7 Tall Canisters (28L Total Capacity)" },
      { icon: Layers, label: "Dispenser", value: "Auto Cup Dispenser (70pcs / 400ml)" },
    ],
  },
  {
    group: "Hardware & Precision",
    color: "bg-accent",
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
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              The ultimate high-performance vending solution designed for premium gym environments.
            </p>
          </div>
        </section>

        {/* ── Key Stats Row ── */}
        <section className="border-y border-gray-200 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
            {keyStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="py-8 px-6 text-center"
              >
                <p
                  className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none mb-1"
                  style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
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
              <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/80 border border-gray-100">
                <img
                  src="/assets/machine-specs.png"
                  alt="Muscle Box Pro Technical View"
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
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary" />
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
                    <div className={`w-1 h-5 rounded-full ${group.color}`} />
                    <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-gray-500">
                      {group.group}
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {group.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                          <item.icon className="w-4 h-4 text-primary" />
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
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
