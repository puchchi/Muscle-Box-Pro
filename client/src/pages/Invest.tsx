"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  IndianRupee,
  MapPin,
  Zap,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
} from "lucide-react";

const marketStats = [
  { val: "75,000+", label: "Gyms in India", sub: "Addressable market", color: "from-accent to-primary" },
  { val: "16–18%", label: "Annual growth", sub: "Indian fitness industry", color: "from-primary to-blue-500" },
  { val: "₹1,100 Cr+", label: "Annual TAM", sub: "Gym nutrition spend", color: "from-accent to-primary" },
];

const tractionStats = [
  { icon: IndianRupee, val: "₹70K+", label: "Max monthly GMV per machine", color: "text-primary", bg: "from-primary/10 to-primary/5" },
  { icon: TrendingUp, val: "45–55%", label: "Gross margin per shake", color: "text-accent", bg: "from-accent/10 to-accent/5" },
  { icon: Zap, val: "60s", label: "Blend-to-dispense time", color: "text-purple-600", bg: "from-purple-100 to-purple-50" },
];

const revenueStreams = [
  {
    icon: BarChart3,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Shake Revenue Share",
    desc: "Each machine sells 20–50 shakes/day at ₹100–₹150. Revenue is split between MuscleBoxPro and the partner gym — creating recurring, predictable income from day one.",
    metrics: ["₹100–₹150 avg. selling price", "₹45–₹70 cost per serve", "45–55% gross margin per shake"],
    highlight: "₹15K–₹70K+ / month per machine",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    title: "Advertising Display Revenue",
    desc: "Every machine includes a 32\" HD display. Fitness brands, sports nutrition companies, and local businesses pay to advertise to this captive, health-focused audience.",
    metrics: ["Captive 45-second ad exposure per shake", "92% reported brand recall rate", "3× higher conversion vs standard digital ads"],
    highlight: "Incremental revenue per placement",
  },
];

const whyNow = [
  { num: "01", text: "India's fitness industry growing at 16–18% annually post-COVID" },
  { num: "02", text: "UPI penetration eliminating cash-friction from impulse purchases" },
  { num: "03", text: "Rising gym member expectations for on-site nutrition services" },
  { num: "04", text: "No organised player in the automated gym nutrition segment at scale" },
  { num: "05", text: "Zero-capex model accelerates gym partner acquisition" },
];

const investorTypes = ["Angel Investor", "Venture Capital", "Family Office", "Strategic Partner", "Other"];

export default function Invest() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [investorType, setInvestorType] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      setIsSubmitting(true);
      const { error: invokeError } = await supabase.functions.invoke("investor-request", {
        body: { name, email, firm: firm || undefined, investorType: investorType || undefined, message: message || undefined },
      });
      if (invokeError) throw invokeError;
      setSubmitted(true);
      setName(""); setEmail(""); setFirm(""); setInvestorType(""); setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] bg-gradient-to-r from-accent/25 to-primary/25 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">

          {/* Credibility badges */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Award className="w-3 h-3" />
              DPIIT Recognised
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            Partner in India's{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              Fitness Revolution
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-base leading-relaxed max-w-xl mx-auto mb-10"
          >
            India's first automated gym nutrition network — zero-capex for gym partners, high-margin recurring revenue, and a scalable distribution moat across 75,000+ fitness centres.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
          >
            <a href="#investor-form">
              <Button size="lg" className="h-12 px-8 rounded-full font-bold bg-gradient-to-r from-accent to-primary text-white hover:opacity-90 border-0 cursor-pointer shadow-lg shadow-primary/25 transition-opacity">
                Request Pitch Deck <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
            <Link href="/specs">
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full font-semibold border-white/20 text-white/80 hover:bg-white/8 cursor-pointer">
                View Machine Specs
              </Button>
            </Link>
          </motion.div>

          {/* Proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-6 flex-wrap"
          >
            {["Zero-capex for gyms", "Multi-city presence", "Revenue from day 1"].map((chip, i) => (
              <span key={i} className="flex items-center gap-1.5 text-white/40 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                {chip}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Market Stats ── */}
      <section className="py-12 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-5">
          {marketStats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-gray-100 py-7 px-5 text-center bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <p
                className={`font-display font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color} leading-none mb-1.5`}
                style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.1rem)" }}
              >
                {s.val}
              </p>
              <p className="text-gray-800 font-semibold text-sm mb-0.5">{s.label}</p>
              <p className="text-gray-400 text-xs">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <main className="flex-1">

        {/* ── Traction ── */}
        <section className="py-20 px-4 bg-gray-50 border-b border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Traction</span>
              <h2 className="font-display font-black text-foreground uppercase mb-3" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                Real machines.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  Real revenue.
                </span>
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                MuscleBoxPro machines are live in gyms across India — generating daily transaction data, refining unit economics, and expanding the partner network.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {tractionStats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className={`w-11 h-11 bg-gradient-to-br ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <p className={`font-display font-black text-3xl mb-1.5 ${s.color}`}>{s.val}</p>
                  <p className="text-gray-500 text-sm leading-snug">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Revenue Streams ── */}
        <section className="py-20 px-4 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Business Model</span>
              <h2 className="font-display font-black text-foreground uppercase mb-3" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                Two revenue streams per machine
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Each installed machine generates recurring income from shake sales and advertising — simultaneously. Zero inventory risk, zero staffing cost.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {revenueStreams.map((rs, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-7 flex flex-col"
                >
                  <div className={`w-12 h-12 ${rs.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                    <rs.icon className={`w-6 h-6 ${rs.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{rs.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{rs.desc}</p>
                  <ul className="space-y-2 mb-5">
                    {rs.metrics.map((m, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{m}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15 px-4 py-3">
                    <p className="text-primary font-bold text-sm">{rs.highlight}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Now ── */}
        <section className="py-20 px-4 bg-gray-950 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-primary/15 to-accent/10 blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="mb-12">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Timing</span>
              <h2 className="font-display font-black text-white uppercase" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                Why the window is{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">now</span>
              </h2>
            </div>
            <div className="space-y-3">
              {whyNow.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:bg-white/8 hover:border-white/15 transition-colors"
                >
                  <span className="font-display font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary flex-shrink-0 w-6 text-center">
                    {point.num}
                  </span>
                  <div className="w-px h-5 bg-white/15 flex-shrink-0" />
                  <p className="text-white/80 text-sm leading-relaxed">{point.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Investor Contact Form ── */}
        <section id="investor-form" className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="grid lg:grid-cols-2">

                {/* Left: Info */}
                <div className="bg-gray-950 p-10 lg:p-14 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-accent/10 blur-[80px] pointer-events-none" />
                  <div className="relative z-10">
                    <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-4 block">Connect With Us</span>
                    <h2 className="font-display font-black text-white uppercase leading-tight mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
                      Request the pitch deck
                    </h2>
                    <p className="text-white/60 text-sm leading-relaxed mb-8">
                      We're raising to accelerate machine deployment across India's top gym chains. Reach out and we'll send the deck within 24 hours.
                    </p>
                    <div className="space-y-3.5">
                      {[
                        { icon: BarChart3, text: "Full financials & unit economics" },
                        { icon: MapPin, text: "Expansion roadmap by city" },
                        { icon: TrendingUp, text: "Revenue projections & milestones" },
                        { icon: Clock, text: "Response within 24 hours" },
                      ].map(({ icon: Icon, text }, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-white/70 text-sm">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Form */}
                <div className="p-10 lg:p-14">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center text-center h-full justify-center py-8"
                      >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center mb-6">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30">
                            <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <h3 className="font-display font-black text-gray-900 uppercase text-xl mb-2">Request Received</h3>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
                          We'll send the pitch deck to your email within 24 hours. Looking forward to connecting.
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2">
                          <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-gray-600 text-xs font-medium">Deck sent within 24 hours</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Get Started</span>
                        <h3 className="font-display font-black text-foreground uppercase mb-6" style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.8rem)" }}>
                          Investor Inquiry
                        </h3>

                        <div className="space-y-4">
                          {error && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Your Name</label>
                              <input
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                                placeholder="Rahul Sharma"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Email</label>
                              <input
                                type="email"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                                placeholder="rahul@fund.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-gray-700 text-sm font-semibold mb-1.5 block">
                              Firm / Organisation <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                              placeholder="Sequoia, AngelList, etc."
                              value={firm}
                              onChange={(e) => setFirm(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Investor Type</label>
                            <select
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary focus:bg-white focus:outline-none transition-colors cursor-pointer"
                              value={investorType}
                              onChange={(e) => setInvestorType(e.target.value)}
                            >
                              <option value="">Select type...</option>
                              {investorTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-gray-700 text-sm font-semibold mb-1.5 block">
                              Message <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                              rows={3}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors resize-none"
                              placeholder="Tell us about your investment thesis or what you'd like to know..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                            />
                          </div>

                          <Button
                            size="lg"
                            className="w-full h-12 bg-gradient-to-r from-accent to-primary text-white font-bold hover:opacity-90 transition-opacity rounded-xl cursor-pointer shadow-md shadow-primary/20"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !name || !email}
                          >
                            {isSubmitting ? "Sending..." : "Request Pitch Deck"}
                            {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
