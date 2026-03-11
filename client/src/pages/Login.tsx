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
import { Dumbbell, MailWarning, TriangleAlert } from "lucide-react";
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

export default function Login() {
  const { toast } = useToast();
  const router = useRouter();
  const [notice, setNotice] = useState<{
    type: "error" | "warning" | "success";
    message: string;
    canResend?: boolean;
  } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setNotice(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("email not confirmed") ||
        msg.includes("email not verified")
      ) {
        setNotice({
          type: "warning",
          message:
            "Email is not confirmed. Please verify your email before logging in.",
          canResend: true,
        });
        return;
      }

      setNotice({
        type: "error",
        message: "We couldn't sign you in. Please check your email and password and try again.",
      });
      return;
    }

    if (!data.session) {
      setNotice({
        type: "error",
        message: "We couldn't sign you in. Please check your email and password and try again.",
      });
      return;
    }

    toast({
      title: "Welcome Back!",
      description: "You've been logged in successfully.",
    });
    router.push("/account");
  }

  async function handleResendVerification() {
    const values = form.getValues();
    const emailFromDom =
      (document.querySelector('input[name="email"]') as HTMLInputElement | null)
        ?.value ?? "";
    const email = values.email?.trim() || emailFromDom.trim();

    if (!email) {
      setNotice({
        type: "warning",
        message: "Please enter your email to resend verification.",
        canResend: true,
      });
      return;
    }

    try {
      setIsResending(true);
      if (!supabaseUrl || !publicAnonKey) {
        throw new Error("Supabase environment variables are missing.");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to resend verification link.");
      }

      const responseMessage = payload.message;
      setNotice({
        type: "success",
        message:
          responseMessage ||
          "Verification link has been sent, please click on then login.",
      });
    } catch (rawError) {
      const error = rawError as Error;
      setNotice({
        type: "error",
        message:
          error.message || "Unable to resend verification link. Please try again.",
        canResend: true,
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/">
            <span className="inline-flex items-center gap-2 group cursor-pointer mb-6">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white group-hover:text-primary transition-colors">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
          </Link>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            SIGN IN
          </h1>
          <p className="text-gray-400">
            Access your account and check your balance
          </p>
        </div>

        {/* Login Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        {...field}
                        className="bg-background/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:bg-background/70 transition-colors h-11"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white font-medium">Password</FormLabel>
                      <Link href="/forgot-password">
                        <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                          Forgot?
                        </span>
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        className="bg-background/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:bg-background/70 transition-colors h-11"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me */}
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        data-testid="checkbox-remember"
                      />
                    </FormControl>
                    <FormLabel className="text-gray-400 text-sm font-normal cursor-pointer">
                      Remember me for 30 days
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              {notice && (
                <div
                  className={
                    notice.type === "warning"
                      ? "rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-300"
                      : notice.type === "success"
                        ? "rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-primary"
                        : "rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive"
                  }
                >
                  <div className="flex items-start gap-2">
                    {notice.type === "warning" ? (
                      <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div className="space-y-2">
                      <p className="text-sm">{notice.message}</p>
                      {notice.canResend && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 border-current/40 text-current hover:bg-white/10"
                          onClick={handleResendVerification}
                          disabled={isResending}
                        >
                          {isResending
                            ? "SENDING..."
                            : "Resend verification link"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90 transition-colors mt-8"
                data-testid="button-login"
              >
                SIGN IN
              </Button>
            </form>
          </Form>

        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <Link href="/signup">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium">
                Sign up here
              </span>
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}
