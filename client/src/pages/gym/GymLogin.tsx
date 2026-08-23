"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, IndianRupee, FileText } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import {
  GYM_SESSION_QUERY_KEY,
  fetchGymSession,
  signInToPortal,
} from "@/lib/gymSession";
import { useEffect, useState } from "react";

/**
 * The partner portal's front door.
 *
 * It talks to `@/lib/gymSession` rather than to an auth provider, so the page is the same
 * whether the session is Supabase's or the `HttpOnly` cookie from `api.muscleboxpro.com`.
 * Two consequences worth knowing before editing:
 *
 * **This page carries the "already signed in" check for the whole site.** Under cookie
 * sessions script cannot read whether a session exists, so `Navbar` can no longer label its
 * button "DASHBOARD" — it always says "GYM LOGIN" and always points here. That is only
 * acceptable because arriving here with a live session lands you on the dashboard anyway.
 * Removing the effect below re-breaks a link on every marketing page. The reasoning is
 * recorded in `@/components/layout/Navbar`, where the button used to make that decision.
 *
 * **The form renders before the check finishes**, deliberately. Almost everyone who opens
 * this page is not signed in, and making all of them wait on a round trip to see a password
 * field is the wrong trade; the signed-in minority get a brief form and then a redirect.
 *
 * There is no "remember me". It used to sit below the password field promising 30 days and
 * was wired to nothing at all — the value never left the form. The cookie sessions make it
 * worse than decorative: a session is 12 hours and does not refresh, and the server decides
 * that, so the checkbox would be a promise this page cannot keep.
 */

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const partnerPerks = [
  { icon: BarChart3, text: "Cups sold today, this month, and lifetime" },
  { icon: IndianRupee, text: "Revenue, net profit, and your payout share" },
  { icon: FileText, text: "Your signed agreement and monthly statements" },
];

export default function GymLogin() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    let cancelled = false;
    fetchGymSession().then((session) => {
      if (session && !cancelled) router.replace("/gym/dashboard");
    });
    // Guards against a redirect firing after the component is gone — someone who starts
    // typing and navigates away mid-probe should not be yanked to the dashboard.
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await signInToPortal(values.email, values.password);
      if (!result.ok) {
        // The seam has already decided what a gym owner should read: one generic message
        // for every credential failure, so this page is not the thing that turns a
        // server's deliberate silence into an account-enumeration oracle.
        setNotice(result.error.message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: GYM_SESSION_QUERY_KEY });
      router.push("/gym/dashboard");
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 className="font-display font-black text-white uppercase leading-none mb-4"
            style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)" }}>
            Your machine,<br />
            <span className="text-white/80">your numbers.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Sign in to your partner portal to track your machine's performance and your share of the profit.
          </p>

          <div className="space-y-4">
            {partnerPerks.map((perk, i) => (
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
          © 2026 MuscleBoxPro. All rights reserved.
        </motion.p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
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

          <div className="mb-8">
            <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
              Partner login
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your gym's MuscleBoxPro portal
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-sm font-semibold">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@yourgym.com"
                        type="email"
                        {...field}
                        className="bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-gray-700 text-sm font-semibold">Password</FormLabel>
                      <Link href="/gym/forgot-password">
                        <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        className="bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {notice && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-0.5">Sign in failed</p>
                    <p className="text-xs text-red-600 leading-relaxed">{notice}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-2"
                data-testid="button-login"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          {/*
            No signup link, by design. Portal accounts are created by the onboarding
            flow once a gym has signed its agreement — see docs/gym-onboarding.md §1.
          */}
          <p className="text-muted-foreground text-sm text-center mt-6">
            Not a partner yet?{" "}
            <Link href="/gym-demo">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-semibold">
                Request a machine
              </span>
            </Link>
          </p>
        </motion.div>
      </div>

    </div>
  );
}
