"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const categories = ["All Blends", "Classic", "Banana", "Chocolate", "Milk-Based", "Premium"];

const quickStats = [
  { val: "60s", label: "blend time" },
  { val: "12", label: "blends" },
  { val: "₹120", label: "from" },
  { val: "UPI", label: "payments" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background pt-16">
      {/* Right-half muted background panel — Airbnb split layout */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gray-50 hidden lg:block pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Live pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/20 text-primary text-sm font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Now live in gyms across India
            </div>

            {/* Headline */}
            <h1
              className="font-display font-black text-foreground leading-[0.88] mb-6 uppercase"
              style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}
            >
              Protein shakes.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Right in your gym.
              </span>
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              12 fresh protein blends blended in 60 seconds. No staff. No shaker bottles. Just fuel.
            </p>

            {/* Category chips — Airbnb style */}
            <div className="flex gap-2 flex-wrap mb-10">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-4 py-2 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-200 hover:text-gray-900 transition-all cursor-pointer select-none"
                >
                  {cat}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex gap-3 flex-wrap">
              <Link href="/gym-demo">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer text-base shadow-lg shadow-primary/20"
                >
                  Request a Demo
                </Button>
              </Link>
              <Link href="/menu">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 rounded-full font-semibold text-gray-800 border-gray-300 hover:bg-gray-100 cursor-pointer text-base"
                >
                  Explore Menu →
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex gap-8 mt-12">
              {quickStats.map((item, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <strong className="text-foreground font-bold text-base font-display">{item.val}</strong>
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Machine image with floating chips */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <img
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
              alt="Protein shake vending machine for gyms"
              className="w-full rounded-2xl object-cover shadow-2xl shadow-gray-300/60"
              style={{ maxHeight: "78vh", objectPosition: "center" }}
            />

            {/* Floating chip: blend time */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -left-8 top-14 bg-white px-5 py-4 rounded-2xl shadow-xl border border-gray-100"
            >
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] mb-1">Blend Time</p>
              <p
                className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none"
                style={{ fontSize: "2.4rem" }}
              >
                60s
              </p>
            </motion.div>

            {/* Floating chip: protein */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="absolute -right-8 bottom-16 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 min-w-[190px]"
            >
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] mb-2">Protein Per Shake</p>
              <p
                className="font-display font-black text-gray-900 leading-none mb-3"
                style={{ fontSize: "2.6rem" }}
              >
                25g
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-gradient-to-r from-accent to-primary rounded-full" />
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
