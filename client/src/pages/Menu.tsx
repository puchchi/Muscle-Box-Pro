"use client";
import Navbar from "@/components/layout/Navbar";
import ShakeVariants from "@/components/home/ShakeVariants";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";

export default function Menu() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-accent via-primary to-orange-500 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold tracking-[0.25em] uppercase mb-5"
          >
            Our Menu
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-4"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            All 12 blends
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/75 text-base leading-relaxed max-w-md mx-auto"
          >
            Fresh ingredients, premium whey isolate. Every blend made to order in 60 seconds.
          </motion.p>
        </div>
      </section>

      <main>
        <ShakeVariants />
      </main>

      <Footer />
    </div>
  );
}
