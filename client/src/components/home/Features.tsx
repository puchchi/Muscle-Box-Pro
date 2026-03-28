"use client";

import { Zap, Leaf, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Ready in 30 seconds",
    desc: "Touch the screen and your shake is blending. No clumps, perfectly smooth every time.",
    stat: "30s",
    statLabel: "Blend Time",
  },
  {
    icon: Leaf,
    title: "Real ingredients only",
    desc: "Fresh bananas, medjool dates, and premium whey isolate. No artificial junk, ever.",
    stat: "0",
    statLabel: "Artificial Add-ins",
  },
  {
    icon: Smartphone,
    title: "Smart & cashless",
    desc: "Track macros, save favorites, and pay with a tap. Full UPI support built in.",
    stat: "UPI",
    statLabel: "Payment Support",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute right-0 top-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section header */}
        <div className="grid lg:grid-cols-2 gap-8 items-end mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
              Why MuscleBoxPro
            </span>
            <h2
              className="font-display font-black text-white leading-none uppercase"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              Premium nutrition.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Zero compromise.
              </span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-gray-400 text-base leading-relaxed lg:text-right"
          >
            Forget warm shakers and lumpy powder. MuscleBoxPro delivers
            barista-quality protein shakes right where you train. Fresh fruit
            restocked daily by our partners.
          </motion.p>
        </div>

        {/* Feature cards — cleaner Airbnb-style */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-card rounded-2xl p-7 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 cursor-default"
            >
              {/* Icon — clean, subtle */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/18 transition-colors duration-300">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>

              <h3 className="font-display font-black text-xl text-white mb-2 uppercase tracking-wide">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {feature.desc}
              </p>

              {/* Stat footer */}
              <div className="flex items-baseline gap-2 pt-5 border-t border-white/8">
                <span
                  className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none"
                  style={{ fontSize: "1.75rem" }}
                >
                  {feature.stat}
                </span>
                <span className="text-[10px] text-gray-600 font-bold tracking-[0.2em] uppercase">
                  {feature.statLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Full-width image banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <img
            src="/images/fresh_banana_date_protein_shake_advertising_shot.png"
            alt="Fresh protein shake blend with banana and dates"
            className="w-full object-cover"
            style={{ height: "360px", objectPosition: "center 40%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent" />
          <div className="absolute inset-0 flex items-center px-8 sm:px-14">
            <div className="max-w-sm">
              <p className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3">
                Fresh daily
              </p>
              <h3
                className="font-display font-black text-white uppercase leading-none mb-3"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}
              >
                Real fruit.
                <br />
                Real protein.
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                We partner with local suppliers to ensure fresh fruit is
                restocked daily — no preservatives, no shortcuts.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
