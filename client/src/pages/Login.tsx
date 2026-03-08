import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell, MailWarning, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
    setLocation("/account");
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
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;

      setNotice({
        type: "success",
        message: "Verification link has been sent, please click on then login.",
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

  async function handleGoogleLogin() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description:
          error instanceof Error ? error.message : "Could not start Google authentication.",
      });
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-gray-500">OR</span>
            </div>
          </div>

          {/* Guest Access */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 border-white/10 text-white hover:bg-white/5 font-medium flex items-center justify-center gap-2"
              data-testid="button-google-login"
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>
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
