"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MapPin, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      const { error: invokeError } = await supabase.functions.invoke(
        "contact-request",
        { body: { name, email, message } },
      );
      if (invokeError) throw invokeError;
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your message right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Get in Touch
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              Contact{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Us
              </span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed">
              Have questions? Our team is here to help you fuel your fitness journey.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-5 gap-8 items-start">

            {/* ── Left: Info ── */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2 space-y-4"
            >
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Email Us</h3>
                  <a
                    href="mailto:contact@muscleboxpro.com"
                    className="text-gray-600 text-sm hover:text-primary transition-colors"
                  >
                    contact@muscleboxpro.com
                  </a>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Our Office</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Blendbox Innovations LLP<br />
                    Sector 75, Noida<br />
                    Uttar Pradesh, India
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-accent/10 to-primary/10 border border-primary/10 rounded-2xl p-6">
                <p className="font-bold text-gray-900 text-sm mb-1">Looking to install a machine?</p>
                <p className="text-gray-600 text-xs leading-relaxed mb-3">
                  Gym owners can request a free demo directly from our Gym Demo page.
                </p>
                <a
                  href="/gym-demo"
                  className="inline-flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
                >
                  Request a Demo <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>

            {/* ── Right: Form / Success ── */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {submitted ? (
                  /* ── Success State ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="p-8 flex flex-col items-center text-center"
                  >
                    {/* Icon */}
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30">
                          <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      {/* Pulse ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                    </div>

                    {/* Heading */}
                    <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-2 tracking-tight">
                      Message Sent!
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
                      Thanks for reaching out. We've received your message and will get back to you shortly.
                    </p>

                    {/* Response time badge */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-8">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-gray-600 text-xs font-medium">Typical response within 24 hours</span>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-100 mb-6" />

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                      >
                        Send Another Message
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
                    className="p-8"
                  >
                    <h2 className="font-display font-black text-foreground uppercase text-xl mb-6">
                      Send a Message
                    </h2>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-gray-700 text-sm font-semibold">Name</label>
                        <Input
                          className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          placeholder="Your Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-gray-700 text-sm font-semibold">Email</label>
                        <Input
                          type="email"
                          className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-gray-700 text-sm font-semibold">Message</label>
                        <Textarea
                          className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors rounded-xl min-h-[130px] resize-none"
                          placeholder="How can we help?"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-primary text-white font-bold hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20"
                      >
                        {isSubmitting ? "Sending..." : "Send Message"}
                        {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
