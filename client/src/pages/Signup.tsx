"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, TrendingUp, Users, Star, CheckCircle2, AlertCircle, Mail, Clock, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const userSignupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().min(10, "Valid mobile number is required"),
});

const gymContactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(8, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email address"),
});

const brandPerks = [
  { icon: Star, text: "12 fresh protein blends, ready in 60 seconds" },
  { icon: TrendingUp, text: "Track usage, wallet & favourite blends" },
  { icon: Users, text: "Join thousands of members across India" },
];

export default function Signup() {
  const [accountType, setAccountType] = useState<"user" | "gym">("user");
  const [signupMessage, setSignupMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [gymMessage, setGymMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [isGymSubmitting, setIsGymSubmitting] = useState(false);

  const userForm = useForm<z.infer<typeof userSignupSchema>>({
    resolver: zodResolver(userSignupSchema),
    defaultValues: { name: "", email: "", password: "", mobile: "" },
  });

  const gymForm = useForm<z.infer<typeof gymContactSchema>>({
    resolver: zodResolver(gymContactSchema),
    defaultValues: { name: "", address: "", phone: "", email: "" },
  });

  async function onUserSignup(values: z.infer<typeof userSignupSchema>) {
    setSignupMessage(null);
    setIsUserSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-signup", {
        body: { name: values.name, email: values.email, password: values.password, mobile: values.mobile },
      });

      if (error) {
        setSignupMessage({ type: "error", text: error.message || "Could not create account. Please try again." });
        return;
      }

      setSignupMessage({
        type: "success",
        text: (data as { message?: string } | null)?.message || "Verification link sent — check your inbox.",
      });
    } finally {
      setIsUserSubmitting(false);
    }
  }

  async function onGymContactSubmit(values: z.infer<typeof gymContactSchema>) {
    setGymMessage(null);
    setIsGymSubmitting(true);
    const message = `Gym onboarding request\nAddress: ${values.address}\nPhone: ${values.phone}`;

    const { data, error } = await supabase.functions.invoke("contact-request", {
      body: { name: values.name, email: values.email, message },
    });

    if (error) {
      setGymMessage({ type: "error", text: error.message || "Could not submit your request. Please try again." });
      setIsGymSubmitting(false);
      return;
    }

    setGymMessage({
      type: "success",
      text: (data as { message?: string } | null)?.message || "We've received your request and will contact you soon.",
    });
    gymForm.reset();
    setIsGymSubmitting(false);
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-accent via-primary to-orange-500 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-12 w-auto brightness-0 invert cursor-pointer" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative z-10"
        >
          <h2
            className="font-display font-black text-white uppercase leading-none mb-4"
            style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)" }}
          >
            Start your<br />
            <span className="text-white/80">journey.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Create your account and get instant access to premium protein shakes at your gym — no staff, no wait.
          </p>

          <div className="space-y-4">
            {brandPerks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <perk.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/90 text-sm font-medium">{perk.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 text-white/40 text-xs"
        >
          © 2026 Muscle Box Pro. All rights reserved.
        </motion.p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
              Create account
            </h1>
            <p className="text-muted-foreground text-sm">
              Choose your account type to get started
            </p>
          </div>

          <Tabs
            value={accountType}
            onValueChange={(v) => setAccountType(v as "user" | "gym")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1 mb-6">
              <TabsTrigger
                value="user"
                className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <User className="h-3.5 w-3.5" /> User
              </TabsTrigger>
              <TabsTrigger
                value="gym"
                className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5" /> Gym Owner
              </TabsTrigger>
            </TabsList>

            {/* ── User Signup ── */}
            <TabsContent value="user">
              <AnimatePresence mode="wait">
                {signupMessage?.type === "success" ? (
                  <motion.div
                    key="user-success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    {/* Icon */}
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30">
                          <Mail className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                    </div>

                    <h3 className="font-display font-black text-gray-900 uppercase text-xl mb-2 tracking-tight">
                      Check your email
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-5">
                      {signupMessage.text}
                    </p>

                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-6">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-gray-600 text-xs font-medium">Verification link expires in 24 hours</span>
                    </div>

                    <div className="w-full h-px bg-gray-100 mb-5" />

                    <div className="flex flex-col gap-3 w-full">
                      <a
                        href="/login"
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-accent to-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/20"
                      >
                        Go to Sign In <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setSignupMessage(null)}
                        className="text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer py-1"
                      >
                        Wrong email? Try again
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="user-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSignup)} className="space-y-4">
                  {signupMessage?.type === "error" && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{signupMessage.text}</p>
                    </div>
                  )}

                  <FormField
                    control={userForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91 98765 43210"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="••••••••"
                            type="password"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isUserSubmitting}
                    className="w-full h-11 bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-2"
                  >
                    {isUserSubmitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ── Gym Owner Contact ── */}
            <TabsContent value="gym">
              <AnimatePresence mode="wait">
                {gymMessage?.type === "success" ? (
                  <motion.div
                    key="gym-success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    {/* Icon */}
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30">
                          <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                    </div>

                    <h3 className="font-display font-black text-gray-900 uppercase text-xl mb-2 tracking-tight">
                      Request Received!
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-5">
                      {gymMessage.text}
                    </p>

                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-6">
                      <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-gray-600 text-xs font-medium">Our team will reach out within 24 hours</span>
                    </div>

                    <div className="w-full h-px bg-gray-100 mb-5" />

                    <div className="flex flex-col gap-3 w-full">
                      <a
                        href="/"
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-accent to-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-primary/20"
                      >
                        Back to Home <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setGymMessage(null)}
                        className="text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer py-1"
                      >
                        Submit another request
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="gym-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
              <Form {...gymForm}>
                <form onSubmit={gymForm.handleSubmit(onGymContactSubmit)} className="space-y-4">
                  {gymMessage?.type === "error" && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{gymMessage.text}</p>
                    </div>
                  )}

                  <FormField
                    control={gymForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Your Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Gym owner name"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="owner@gym.com"
                            type="email"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91 98765 43210"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-semibold">Gym Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Fitness St, Mumbai"
                            {...field}
                            className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isGymSubmitting}
                    className="w-full h-11 bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-2"
                  >
                    {isGymSubmitting ? "Sending..." : "Contact Us"}
                  </Button>
                </form>
              </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>

          <p className="text-muted-foreground text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-semibold">
                Sign in
              </span>
            </Link>
          </p>
        </motion.div>
      </div>

    </div>
  );
}
