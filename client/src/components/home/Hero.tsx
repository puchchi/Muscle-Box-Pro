"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const categories = ["All Blends", "Classic", "Banana", "Chocolate", "Milk-Based", "Premium"];

const quickStats = [
  { val: "30s", label: "blend time" },
  { val: "12", label: "blends" },
  { val: "₹120", label: "from" },
  { val: "UPI", label: "payments" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background machine image */}
      <img
        src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
        alt="Protein shake vending machine for gyms by MuscleBoxPro"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />
      {/* Gradient fade to background at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-20">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/85 text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          Now live in gyms across India
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display font-black text-white leading-[0.88] mb-6 uppercase"
          style={{ fontSize: "clamp(3rem, 7.5vw, 5.5rem)" }}
        >
          Protein shakes.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
            Right in your gym.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-white/60 text-lg leading-relaxed mb-10 max-w-md mx-auto"
        >
          12 fresh protein blends blended in 30 seconds. No staff. No shaker bottles. Just fuel.
        </motion.p>

        {/* Category chips — Airbnb style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex gap-2 justify-center flex-wrap mb-10"
        >
          {categories.map((cat) => (
            <span
              key={cat}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/75 text-sm font-medium hover:bg-white/20 hover:text-white transition-all cursor-pointer select-none"
            >
              {cat}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex gap-3 justify-center flex-wrap"
        >
          <Link href="/gym-demo">
            <Button
              size="lg"
              className="h-14 px-8 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer text-base shadow-lg shadow-primary/25"
            >
              Request a Demo
            </Button>
          </Link>
          <Link href="/menu">
            <Button
              size="lg"
              className="h-14 px-8 rounded-full font-semibold bg-white/10 backdrop-blur-sm text-white border border-white/25 hover:bg-white/20 cursor-pointer text-base"
            >
              Explore Menu →
            </Button>
          </Link>
        </motion.div>

        {/* Quick stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex justify-center gap-6 sm:gap-10 mt-14"
        >
          {quickStats.map((item, i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <strong className="text-white/90 font-bold text-base font-display">{item.val}</strong>
              <span className="text-white/40 text-[11px] uppercase tracking-wider">{item.label}</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </section>
  );
}
