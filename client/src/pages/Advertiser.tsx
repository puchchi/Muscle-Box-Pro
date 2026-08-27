"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Users, TrendingUp, BarChart2, Zap, Target, ArrowRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const perks = [
  {
    icon: Users,
    title: "Captive Audience",
    desc: "Users stare at the screen for 45 seconds while their shake blends. Guaranteed eyes on your brand.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Monitor,
    title: "HD Displays",
    desc: "Vibrant high-definition screens ensure your brand looks premium in every gym environment.",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    icon: TrendingUp,
    title: "High Conversion",
    desc: "Target health-conscious individuals right after their workout, at peak purchase intent.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

const stats = [
  { icon: Zap, val: "45s", label: "Avg. screen exposure" },
  { icon: Target, val: "92%", label: "Brand recall rate" },
  { icon: BarChart2, val: "3×", label: "Higher conversion" },
];

const benefits = [
  "Real-time analytics on impressions & engagement",
  "Geo-targeted campaigns by gym location",
  "Custom creative guidelines provided",
  "Dedicated account manager",
];

export default function Advertiser() {
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCampaignRequest = async () => {
    setError(null);
    const values = { brandName, email, mobile, comment };
    try {
      setIsSubmitting(true);
      const { error: invokeError } = await supabase.functions.invoke(
        "campaign-request",
        { body: values },
      );
      if (invokeError) throw invokeError;
      setSubmitted(true);
      setBrandName("");
      setEmail("");
      setMobile("");
      setComment("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit inquiry right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-accent via-primary to-orange-500 pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 hero-rise">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold tracking-[0.25em] uppercase mb-6">
            Advertise with Us
          </span>
          <h1
            className="font-display font-black text-white uppercase leading-none mb-6 text-balance"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Reach active users{" "}
            <br className="hidden sm:inline" />
            <span className="text-white/75">at the moment of impact</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Display your brand on our high-definition 32&quot; screens while users wait for their shake.
            The perfect captive audience for fitness, health, and lifestyle brands.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#campaign-form">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg"
              >
                Start a Campaign <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Row ── */}
      <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm py-6 px-4 text-center"
            >
              <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center mx-auto mb-3">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <p
                className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary leading-none mb-1"
                style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}
              >
                {s.val}
              </p>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Why Advertise ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
              Why it works
            </span>
            <h2
              className="font-display font-black text-foreground uppercase mb-3"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
            >
              Built for brands that mean business
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Our machines put your brand in front of a qualified, motivated audience at the exact right moment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-7 cursor-default"
              >
                <div className={`w-12 h-12 ${perk.bg} rounded-xl flex items-center justify-center mb-5`}>
                  <perk.icon className={`w-6 h-6 ${perk.color}`} />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{perk.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Campaign Form ── */}
      <section id="campaign-form" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-2">

              {/* Form side */}
              <div className="p-10 lg:p-14 overflow-hidden">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    /* ── Success State ── */
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center text-center h-full justify-center py-8"
                    >
                      {/* Icon */}
                      <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30">
                            <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                      </div>

                      <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 tracking-tight">
                        Inquiry Received!
                      </h2>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
                        Thanks for your interest in advertising with us. Our team will reach out within 24 hours with pricing and next steps.
                      </p>

                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-8">
                        <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-gray-600 text-xs font-medium">Our ad team will contact you within 24 hours</span>
                      </div>

                      <div className="w-full h-px bg-gray-100 mb-6" />

                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                          onClick={() => setSubmitted(false)}
                          className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                        >
                          Submit Another Inquiry
                        </button>
                        <a
                          href="/"
                          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-accent to-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/20"
                        >
                          Back to Home <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Form State ── */
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                        Get Started
                      </span>
                      <h2
                        className="font-display font-black text-foreground uppercase mb-3"
                        style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}
                      >
                        Start your campaign
                      </h2>
                      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                        Packages start at just ₹500/month per location network. Our team will get back within 24 hours.
                      </p>

                      <div className="space-y-4 mb-6">
                        {benefits.map((b, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{b}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 pt-6 space-y-4">
                        {error && (
                          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-red-700 mb-0.5">Submission failed</p>
                              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Brand Name</label>
                            <input
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                              placeholder="Nike, GymShark..."
                              value={brandName}
                              onChange={(e) => setBrandName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Work Email</label>
                            <input
                              type="email"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                              placeholder="marketing@brand.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-700 text-sm font-semibold mb-1.5 block">Mobile Number</label>
                          <input
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
                            placeholder="+91 98765 43210"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-gray-700 text-sm font-semibold mb-1.5 block">
                            Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <textarea
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none transition-colors resize-none"
                            placeholder="Tell us about your brand, campaign goals, target locations..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                        </div>

                        <Button
                          size="lg"
                          className="w-full h-12 bg-primary text-white font-bold hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20"
                          onClick={handleCampaignRequest}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Submitting..." : "Contact for Pricing"}
                          {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Image side */}
              <div className="relative min-h-72 lg:min-h-0">
                <img
                  src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                  alt="MuscleBoxPro machine in a modern gym"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <p className="text-white font-display font-black text-2xl uppercase leading-tight mb-1">
                    32&quot; HD screens.<br />
                    <span className="text-primary">Zero distractions.</span>
                  </p>
                  <p className="text-white/70 text-sm">
                    Your ad plays while every shake is blended.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
