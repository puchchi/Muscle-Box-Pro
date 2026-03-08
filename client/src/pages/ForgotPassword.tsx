import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Dumbbell, Mail, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const token = new URLSearchParams(window.location.search).get("token");
  const isResetMode = Boolean(token);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw error;
      setNotice({
        type: "success",
        message:
          "If an account exists for this email, a password reset link has been sent.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send reset email right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setNotice(null);

    if (password !== confirmPassword) {
      setNotice({
        type: "error",
        message: "Passwords do not match. Please enter the same password in both fields.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      setNotice({
        type: "success",
        message:
          "Your password has been reset successfully. Redirecting to login...",
      });
      setTimeout(() => setLocation("/login"), 1200);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not reset password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <span className="inline-flex items-center gap-2 group cursor-pointer mb-6">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
          </Link>
          <h1 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-tighter">
            {isResetMode ? "SET NEW PASSWORD" : "RESET PASSWORD"}
          </h1>
          <p className="text-gray-400">
            {isResetMode
              ? "Create a new password for your account"
              : "Enter your email to receive a recovery link"}
          </p>
        </div>

        <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={isResetMode ? handleResetPassword : handleResetRequest} className="space-y-6">
            {notice && (
              <div
                className={
                  notice.type === "success"
                    ? "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                    : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                }
              >
                {notice.message}
              </div>
            )}

            {isResetMode ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-mono uppercase tracking-widest">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-background/50 border-white/10 pl-10 focus:border-primary"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-mono uppercase tracking-widest">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-background/50 border-white/10 pl-10 focus:border-primary"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-mono uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="bg-background/50 border-white/10 pl-10 focus:border-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <Button disabled={isSubmitting} type="submit" className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90 transition-all">
              {isSubmitting
                ? "PROCESSING..."
                : isResetMode
                  ? "UPDATE PASSWORD"
                  : "SEND RECOVERY LINK"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link href="/login">
              <span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
