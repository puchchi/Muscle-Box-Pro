"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Target, Users, ArrowRight, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            Our Story
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-5"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            About{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              MuscleBoxPro
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/55 text-base leading-relaxed max-w-xl mx-auto"
          >
            We're on a mission to revolutionize fitness nutrition through smart automation
            delivering premium protein shakes to gym members at the push of a button.
          </motion.p>
        </div>
      </section>

      <main className="flex-1">

        {/* ── DPIIT Recognition Banner ── */}
        <section className="bg-gradient-to-r from-[#1a3a6b] to-[#0f2347] px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-5"
            >
              {/* Badge */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-7 h-7 text-yellow-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-yellow-400 text-xs font-bold tracking-[0.2em] uppercase">
                      Government of India · DPIIT
                    </span>
                  </div>
                  <p className="text-white font-bold text-base leading-tight">
                    Recognised Startup of Blendbox Innovations LLP
                  </p>
                  <p className="text-white/55 text-xs mt-0.5">
                    Certificate No: DIPP252770 &nbsp;·&nbsp; Food &amp; Beverages / Food Processing &nbsp;·&nbsp; Valid until Feb 2036
                  </p>
                  <p className="text-white/35 text-xs mt-1">
                    Blendbox Innovations LLP is the registered legal entity behind MuscleBoxPro.
                  </p>
                </div>
              </div>

              {/* Download link */}
              <a
                href="/assets/dpiit-certificate.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                View Certificate
              </a>
            </motion.div>
          </div>
        </section>

        {/* ── Mission + Team ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-8"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display font-black text-gray-900 uppercase text-xl mb-3">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                To become the global standard for on-demand fitness nutrition providing gym members with fresh,
                perfectly macro-balanced shakes at the touch of a button. Post-workout nutrition should be effortless,
                high-quality, and delicious.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-50 border border-gray-100 rounded-2xl p-8"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-display font-black text-gray-900 uppercase text-xl mb-3">Our Team</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                MuscleBoxPro is built by a team of fitness enthusiasts, engineers, and nutritionists who saw a gap in the
                market. We combined our expertise to create a machine that doesn't just vend it crafts a premium
                experience for every gym member.
              </p>
            </motion.div>

          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-4 bg-gradient-to-r from-accent to-primary">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Ready to bring MuscleBoxPro to your gym?
            </h2>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              Get a free demo machine installed with zero upfront cost.
            </p>
            <Link href="/gym-demo">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg"
              >
                Request a Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
