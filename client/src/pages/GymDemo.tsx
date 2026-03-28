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
import { motion } from "framer-motion";
import { CheckCircle2, Wrench, TrendingUp, Palette, ArrowRight, Star } from "lucide-react";
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
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", gymName: "", email: "", mobile: "", location: "", message: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setNotice(null);
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke("demo-request", { body: values });
      if (error) throw error;
      setNotice({
        type: "success",
        message: (data as { message?: string })?.message || "Thanks for your interest. We will contact you shortly to schedule your demo.",
      });
      form.reset();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to submit your request right now. Please try again.",
      });
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
                <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm">
                  Increase member satisfaction and generate passive revenue. We handle stocking, cleaning, and service.
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
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 lg:p-10"
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
                  {notice && (
                    <div className={
                      notice.type === "success"
                        ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
                        : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    }>
                      {notice.message}
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
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
