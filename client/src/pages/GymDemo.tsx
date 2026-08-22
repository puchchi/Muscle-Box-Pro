"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Wrench, TrendingUp, Palette, ArrowRight, Star, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gymName: z.string().min(2, "Gym name is required"),
  email: z.string().email("Invalid email"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  location: z.string().min(2, "Location is required"),
  message: z.string().optional(),
});

const benefits = [
  { icon: CheckCircle2, text: "Free Installation", color: "text-primary", bg: "bg-primary/10" },
  { icon: TrendingUp, text: "Revenue Share Model", color: "text-accent", bg: "bg-accent/10" },
  { icon: Wrench, text: "Zero Maintenance", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Palette, text: "Custom Branding", color: "text-purple-500", bg: "bg-purple-50" },
];

const trustStats = [
  { val: "60s", label: "Blend time" },
  { val: "12+", label: "Shake varieties" },
  { val: "0", label: "Staff needed" },
];

export default function GymDemo() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", gymName: "", email: "", mobile: "", location: "", message: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      setIsSubmitting(true);
      const { error: invokeError } = await supabase.functions.invoke("demo-request", { body: values });
      if (invokeError) throw invokeError;
      setSubmitted(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">

        {/* ── Hero: dark full-width banner ── */}
        <section className="bg-gray-950 px-4 py-16 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">

              {/* Machine image */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
                className="lg:w-[420px] flex-shrink-0"
              >
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]">
                  <img
                    src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
                    alt="MuscleBoxPro machine in a modern gym"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
                  {/* Quick stats overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                    {trustStats.map((s, i) => (
                      <div key={i} className="flex-1 bg-black/50 backdrop-blur-sm rounded-xl py-2 px-2 text-center border border-white/10">
                        <p className="text-white font-display font-black text-base leading-none">{s.val}</p>
                        <p className="text-white/50 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Headline + benefits */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="mt-8 lg:mt-0 flex-1"
              >
                <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
                  Free Demo
                </span>
                <h1
                  className="font-display font-black text-white uppercase leading-none mb-4"
                  style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                >
                  Get a machine<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                    for your gym.
                  </span>
                </h1>
                <p className="text-white/50 text-sm leading-relaxed mb-4 max-w-sm">
                  Increase member satisfaction and generate passive revenue. We handle stocking, cleaning, and service.
                </p>

                {/* Some gyms want the commercials before they want a call. */}
                <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
                  Want the numbers first?{" "}
                  <Link
                    href="/gym-partnership"
                    className="text-primary font-semibold hover:underline"
                  >
                    Read the full partnership terms
                  </Link>
                  .
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {benefits.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.07 }}
                      className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl p-3"
                    >
                      <div className={`w-7 h-7 ${b.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
                      </div>
                      <span className="text-white/80 text-xs font-medium">{b.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.75 }}
                  className="mt-5 flex items-center gap-2"
                >
                  <div className="flex -space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-primary border-2 border-gray-950 flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    ))}
                  </div>
                  <p className="text-white/40 text-xs">Trusted by gyms across India</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Form section ── */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
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
                    className="p-8 lg:p-10 flex flex-col items-center text-center"
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
                      Request Submitted!
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
                      Thanks for your interest. Our team will contact you shortly to schedule your free demo.
                    </p>

                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-8">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-gray-600 text-xs font-medium">Our team will reach out within 24 hours</span>
                    </div>

                    <div className="w-full h-px bg-gray-100 mb-6" />

                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                      >
                        Submit Another Request
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
                    className="p-8 lg:p-10"
                  >
                    <div className="mb-7">
                      <h2 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
                        Request a demo
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Fill in your details and we'll reach out within 24 hours.
                      </p>
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 text-sm font-semibold">Contact Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="gymName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 text-sm font-semibold">Gym Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Iron Paradise" {...field} className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 text-sm font-semibold">Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="mobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 text-sm font-semibold">Mobile</FormLabel>
                                <FormControl>
                                  <Input placeholder="+91 98765 43210" {...field} className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 text-sm font-semibold">Gym Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="City, State" {...field} className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 text-sm font-semibold">Additional Notes <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about your gym, member count, and preferred demo time."
                                  {...field}
                                  className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors rounded-xl min-h-[100px] resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-12 bg-primary text-white font-bold hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-2"
                        >
                          {isSubmitting ? "Submitting..." : "Submit Request"}
                          {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
