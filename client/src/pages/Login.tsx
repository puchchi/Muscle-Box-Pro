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
import { MailWarning, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

export default function Login() {
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

      await queryClient.invalidateQueries({ queryKey: ["supabase-session"] });
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
                notice.type === "warning" ? (
                  /* ── Warning: email not verified ── */
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <MailWarning className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800 mb-0.5">Email not verified</p>
                        <p className="text-xs text-amber-700 leading-relaxed">{notice.message}</p>
                      </div>
                    </div>
                    {notice.canResend && (
                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={isResending}
                          className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          {isResending ? "Sending…" : "Resend verification email"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : notice.type === "success" ? (
                  /* ── Success: verification sent ── */
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 mb-0.5">Verification email sent!</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">{notice.message}</p>
                    </div>
                  </div>
                ) : (
                  /* ── Error ── */
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-0.5">Sign in failed</p>
                      <p className="text-xs text-red-600 leading-relaxed">{notice.message}</p>
                    </div>
                  </div>
                )
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
