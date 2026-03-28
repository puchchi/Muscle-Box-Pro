"use client";

import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ShakeVariants from "@/components/home/ShakeVariants";
import { Monitor, TrendingUp, Users, Wrench, Heart, Percent, ArrowRight, Play, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Footer from "@/components/footer/index";

const revenueFeatures = [
  {
    icon: Wrench,
    title: "Zero maintenance",
    desc: "Our team handles restocking, cleaning, and support. You just collect the revenue.",
  },
  {
    icon: Percent,
    title: "High margins",
    desc: "Premium protein shakes command premium prices. Enjoy industry-leading profit sharing.",
  },
  {
    icon: Heart,
    title: "Member retention",
    desc: "Members who fuel up post-workout stay longer, train harder, and renew sooner.",
  },
];

const adFeatures = [
  { icon: Users, title: "Captive audience", text: "Users spend 45s watching while their shake blends." },
  { icon: Monitor, title: "HD 4K displays", text: "Stunning visual impact in premium gym environments." },
  { icon: TrendingUp, title: "Targeted reach", text: "Connect with fitness enthusiasts at the point of sale." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />

        {/* ── SEO (hidden) ── */}
        <section className="sr-only">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>Protein Vending and Shake Machine Solutions for Gyms</h2>
            <p>
              Looking for a protein vending machine for your fitness center? A gym protein shake machine delivers fresh post-workout shakes automatically. MuscleBoxPro's protein shake machine blends premium whey and natural ingredients in seconds. Fitness centers across India install a protein vending machine to boost revenue and member satisfaction.
            </p>
            <p>
              A gym protein shake machine requires zero staff—the protein shake machine handles blending, dispensing, and payments. Choose the right protein vending machine for your facility. A gym protein shake machine improves member retention. Our protein shake machine supports UPI and card payments. A protein vending machine creates passive income for gym owners.
            </p>
          </div>
        </section>

        <Features />

        {/* ── SEO (hidden) ── */}
        <section className="sr-only">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>What is a Protein Shake Vending Machine?</h2>
            <p>
              A protein shake vending machine automatically blends whey protein, fruits, and liquids to prepare fresh protein shakes instantly. These machines are increasingly used in gyms and fitness centers to provide members with convenient post-workout nutrition without requiring shaker bottles or manual preparation.
            </p>
            <p>
              MuscleBoxPro allows gym members to enjoy fresh protein shake blends in seconds while helping gym owners create an additional revenue stream through automated protein vending.
            </p>
          </div>
        </section>

        <section className="sr-only py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>How the Protein Shake Vending Machine Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "1. Select your shake", description: "Gym members choose their preferred protein shake blend." },
                { title: "2. Automated blending", description: "The machine mixes whey protein, banana, dates or other ingredients automatically." },
                { title: "3. Fresh shake served", description: "A hygienic protein shake is prepared and dispensed within seconds." },
              ].map((step) => (
                <div key={step.title} className="rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sr-only py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>Why Gyms Install Protein Shake Vending Machines</h2>
            <ul className="space-y-3 text-muted-foreground text-lg mb-8">
              <li>• Instant post-workout nutrition for gym members</li>
              <li>• No shaker bottles required</li>
              <li>• Additional revenue for fitness centers</li>
              <li>• Hygienic automated blending system</li>
              <li>• Convenient protein shake access inside the gym</li>
            </ul>
          </div>
        </section>

        <ShakeVariants limit={3} />

        {/* ── SEO (hidden) ── */}
        <section className="sr-only">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>Protein Shake Vending Machines for Gyms in India</h2>
            <p>
              MuscleBoxPro offers protein shake vending machines for gyms in India, helping fitness centers in cities like Delhi, Mumbai, Bengaluru, Hyderabad, Pune, and Chennai deliver instant post-workout nutrition.
            </p>
            <p>
              Our automated protein vending solution is built for Indian gym operations, enabling hygienic shake preparation, faster member service, and additional in-gym revenue.
            </p>
          </div>
        </section>

        {/* ── For Gym Owners ── */}
        <section className="py-24 bg-muted relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14"
            >
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                For gym owners
              </span>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <h2
                  className="font-display font-black text-foreground leading-none uppercase"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
                >
                  Turn floor space
                  <br />
                  into{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                    gym revenue.
                  </span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs lg:text-right">
                  Zero staff required. Passive income from an automated
                  protein shake machine inside your gym.
                </p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-10 items-start">
              {/* Left: Revenue card */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-accent/5 to-primary/5 rounded-full blur-[60px]" />

                <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-4">
                  Avg monthly revenue per machine
                </p>
                <p
                  className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none mb-2"
                  style={{ fontSize: "clamp(3.5rem, 9vw, 6rem)" }}
                >
                  ₹35K+
                </p>
                <p className="text-muted-foreground text-sm mb-8">
                  Passive income. No effort on your end.
                </p>

                <div className="h-px w-full bg-gray-100 mb-6" />

                <Link href="/gym-demo">
                  <Button
                    size="lg"
                    className="w-full h-13 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer text-base"
                  >
                    Request a demo machine
                  </Button>
                </Link>
              </motion.div>

              {/* Right: Feature rows */}
              <div className="space-y-4">
                {revenueFeatures.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Advertise ── */}
        <section className="py-24 bg-background relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-14 items-center">

              {/* Left: Text */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                  Advertising opportunities
                </span>
                <h2
                  className="font-display font-black text-foreground leading-none uppercase mb-5"
                  style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
                >
                  Your brand on
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                    every screen.
                  </span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm">
                  MuscleBoxPro machines include high-resolution 4K displays
                  that advertise directly to gym members — a captive, high-intent audience.
                </p>

                <div className="space-y-4 mb-8">
                  {adFeatures.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="mt-0.5 w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                        <item.icon size={16} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-0.5">{item.title}</h4>
                        <p className="text-muted-foreground text-sm">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/advertise">
                  <Button
                    className="h-12 px-7 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer"
                  >
                    Become a partner
                  </Button>
                </Link>
              </motion.div>

              {/* Right: Screen mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_24px_60px_-8px_rgba(0,0,0,0.18),0_8px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100"
              >
                {/* Screen background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

                {/* Content area */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-white fill-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-display font-black text-white text-xl tracking-[0.2em] uppercase mb-1">
                      Your Ad Here
                    </p>
                    <p className="text-white/50 text-xs tracking-wider uppercase">
                      HD display · 45 seconds · Captive audience
                    </p>
                  </div>
                </div>

                {/* Bottom status bar */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/40 backdrop-blur-sm border-t border-white/10 flex items-center px-4 justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/60 text-xs font-medium">LIVE</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Wifi className="w-3 h-3" />
                    <span className="text-xs">MuscleBoxPro Network</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner — full-bleed gradient, keeps working on light theme ── */}
        <section className="py-24 px-4 bg-gradient-to-r from-accent to-primary relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative z-10 max-w-3xl mx-auto text-center"
          >
            <h2
              className="font-display font-black text-white leading-none uppercase mb-5"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              Ready to fuel
              <br />
              your gym?
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
              Join gyms across India already generating passive revenue with
              MuscleBoxPro's automated protein shake machines.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/gym-demo">
                <Button
                  size="lg"
                  className="h-14 px-10 rounded-full font-semibold bg-white text-gray-900 hover:bg-white/90 border-0 cursor-pointer text-base shadow-xl"
                >
                  Request a demo
                </Button>
              </Link>
              <Link href="/specs">
                <Button
                  size="lg"
                  className="h-14 px-10 rounded-full font-semibold text-white bg-white/15 border border-white/30 hover:bg-white/25 cursor-pointer text-base"
                >
                  View machine specs <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
