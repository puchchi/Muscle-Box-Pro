"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Support
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-3"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              Help{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Center
              </span>
            </h1>
            <p className="text-white/50 text-sm">How can we help you today?</p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Contact ── */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2
                className="font-display font-black text-foreground uppercase mb-2"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
              >
                Still need help?
              </h2>
              <p className="text-muted-foreground text-sm">Our support team is available 24/7.</p>
            </div>

            <a
              href="mailto:contact@muscleboxpro.com"
              className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer block"
            >
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1">Email Support</p>
              <p className="text-gray-500 text-xs">contact@muscleboxpro.com</p>
            </a>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
