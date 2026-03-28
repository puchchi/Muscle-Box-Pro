"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Monitor, Users, TrendingUp, BarChart2, Zap, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const perks = [
  {
    icon: Users,
    title: "Captive Audience",
    desc: "Users stare at the screen for 45 seconds while their shake blends — guaranteed eyes on your brand.",
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
    desc: "Target health-conscious individuals right after their workout — peak purchase intent.",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleCampaignRequest = async () => {
    setNotice(null);
    const values = { brandName, email, mobile };
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke(
        "campaign-request",
        { body: values },
      );
      if (error) throw error;
      setNotice({
        type: "success",
        message:
          (data as { message?: string })?.message ||
          "Thank you! Our advertising team will contact you shortly.",
      });
      setBrandName("");
      setEmail("");
      setMobile("");
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit inquiry right now. Please try again.",
      });
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
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            Advertise with Us
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Reach active users<br />
            <span className="text-white/75">at the moment of impact</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Display your brand on our high-definition 32&quot; screens while users wait for their shake.
            The perfect captive audience for fitness, health, and lifestyle brands.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <a href="#campaign-form">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg"
              >
                Start a Campaign <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </motion.div>
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
              <div className="p-10 lg:p-14">
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
                  {notice && (
                    <div
                      className={
                        notice.type === "success"
                          ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
                          : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                      }
                    >
                      {notice.message}
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
              </div>

              {/* Image side */}
              <div className="relative min-h-72 lg:min-h-0">
                <img
                  src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                  alt="Muscle Box Pro machine in a modern gym"
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
