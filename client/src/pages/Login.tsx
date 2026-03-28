"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MailWarning, TriangleAlert, Zap, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

const brandPerks = [
  { icon: Zap, text: "Track your shake history & wallet balance" },
  { icon: Shield, text: "Secure UPI & card payments saved" },
  { icon: Clock, text: "60-second blends, ready when you are" },
];

export default function Login() {
  const { toast } = useToast();
  const router = useRouter();
  const [notice, setNotice] = useState<{
    type: "error" | "warning" | "success";
    message: string;
    canResend?: boolean;
  } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("email not verified")) {
          setNotice({ type: "warning", message: "Email not confirmed. Please verify your email before logging in.", canResend: true });
          return;
        }
        setNotice({ type: "error", message: "Incorrect email or password. Please try again." });
        return;
      }

      if (!data.session) {
        setNotice({ type: "error", message: "We couldn't sign you in. Please check your credentials." });
        return;
      }

      toast({ title: "Welcome Back!", description: "You've been logged in successfully." });
      router.push("/account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    const values = form.getValues();
    const emailFromDom = (document.querySelector('input[name="email"]') as HTMLInputElement | null)?.value ?? "";
    const email = values.email?.trim() || emailFromDom.trim();

    if (!email) {
      setNotice({ type: "warning", message: "Please enter your email to resend verification.", canResend: true });
      return;
    }

    try {
      setIsResending(true);
      if (!supabaseUrl || !publicAnonKey) throw new Error("Supabase environment variables are missing.");

      const response = await fetch(`${supabaseUrl}/functions/v1/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Unable to resend verification link.");

      setNotice({ type: "success", message: payload.message || "Verification link sent. Check your inbox." });
    } catch (rawError) {
      const error = rawError as Error;
      setNotice({ type: "error", message: error.message || "Unable to resend. Please try again.", canResend: true });
    } finally {
      setIsResending(false);
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
            Fuel your<br />
            <span className="text-white/80">every rep.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Sign in to manage your wallet, track your shakes, and access your gym's nutrition machine.
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
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your account
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
                        placeholder="you@example.com"
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
                      <Link href="/forgot-password">
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

              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        data-testid="checkbox-remember"
                      />
                    </FormControl>
                    <FormLabel className="text-muted-foreground text-sm font-normal cursor-pointer">
                      Remember me for 30 days
                    </FormLabel>
                  </FormItem>
                )}
              />

              {notice && (
                <div className={
                  notice.type === "warning"
                    ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700"
                    : notice.type === "success"
                      ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-primary"
                      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
                }>
                  <div className="flex items-start gap-2">
                    {notice.type === "warning"
                      ? <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                      : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                    <div className="space-y-2">
                      <p className="text-sm">{notice.message}</p>
                      {notice.canResend && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 text-xs border-current/30 hover:bg-black/5 cursor-pointer"
                          onClick={handleResendVerification}
                          disabled={isResending}
                        >
                          {isResending ? "Sending..." : "Resend verification link"}
                        </Button>
                      )}
                    </div>
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

          <p className="text-muted-foreground text-sm text-center mt-6">
            Don't have an account?{" "}
            <Link href="/signup">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-semibold">
                Sign up
              </span>
            </Link>
          </p>
        </motion.div>
      </div>

    </div>
  );
}
