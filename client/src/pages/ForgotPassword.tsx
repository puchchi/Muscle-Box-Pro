"use client";

import { motion } from "framer-motion";
import { Mail, ArrowLeft, Lock, ShieldCheck, KeyRound, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";

const brandPerks = [
  { icon: ShieldCheck, text: "Your account is protected with 256-bit encryption" },
  { icon: KeyRound, text: "Reset links expire after 1 hour for security" },
  { icon: Zap, text: "Back to your shakes in seconds" },
];

function ForgotPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const token = searchParams.get("token");
  const isResetMode = Boolean(token);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke("forgot-password", {
        body: { email },
      });
      if (error) throw new Error(error.message || "Unable to send reset email right now.");
      setNotice({ type: "success", message: (data as { message?: string } | null)?.message || "If an account exists for this email, a password reset link has been sent." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Unable to send reset email right now." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setNotice(null);

    if (password !== confirmPassword) {
      setNotice({ type: "error", message: "Passwords do not match. Please enter the same password in both fields." });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice({ type: "success", message: "Password reset successfully. Redirecting to login..." });
      setTimeout(() => router.push("/login"), 1200);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Could not reset password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-accent via-primary to-orange-500 flex-col justify-between p-12 relative overflow-hidden">
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
            {isResetMode ? "Almost\nthere." : "No worries,\n"}
            <span className="text-white/80">{isResetMode ? "" : "we've got you."}</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            {isResetMode
              ? "Enter your new password below. Make it strong and memorable."
              : "Enter your email and we'll send you a secure link to reset your password."}
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
              {isResetMode ? "Set new password" : "Reset password"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isResetMode
                ? "Create a new password for your account"
                : "Enter your email to receive a recovery link"}
            </p>
          </div>

          <form onSubmit={isResetMode ? handleResetPassword : handleResetRequest} className="space-y-5">
            {notice && (
              <div className={
                notice.type === "success"
                  ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }>
                {notice.message}
              </div>
            )}

            {isResetMode ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-gray-700 text-sm font-semibold">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-gray-50 border-gray-200 pl-10 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-700 text-sm font-semibold">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-gray-50 border-gray-200 pl-10 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-gray-700 text-sm font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="bg-gray-50 border-gray-200 pl-10 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <Button
              disabled={isSubmitting}
              type="submit"
              className="w-full h-11 bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20"
            >
              {isSubmitting
                ? "Processing..."
                : isResetMode
                  ? "Update Password"
                  : "Send Recovery Link"}
            </Button>
          </form>

          <Link href="/login">
            <span className="mt-6 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </span>
          </Link>
        </motion.div>
      </div>

    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  );
}
