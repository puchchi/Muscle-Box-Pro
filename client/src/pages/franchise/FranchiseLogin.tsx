"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, IndianRupee, Map } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  FRANCHISE_SESSION_QUERY_KEY,
  fetchFranchiseSession,
  signInToFranchisePortal,
} from "@/lib/franchiseSession";

/**
 * The franchise portal's front door.
 *
 * [GymLogin](../gym/GymLogin.tsx) is the model and the three habits worth knowing are carried
 * over from it: the "already signed in" probe below is what lets every link into the portal
 * point here rather than having to know whether a cookie exists; the form renders before that
 * probe finishes, because almost everyone opening this page is not signed in and making all of
 * them wait to see a password field is the wrong trade; and the session this page learns is
 * handed to the dashboard through the query cache, so whoever navigates away from here owes it
 * the answer or the franchisee waits twice for one click.
 *
 * There is no "remember me" and no way to sign up. The session's length is the server's to
 * decide, and the door into a franchise is the nine-step application, not this form.
 *
 * The three lines on the left panel are the ones the dashboard can actually answer today.
 * Sales, payouts and capital recovery all wait on a settlement pipeline that does not exist,
 * and promising them on the sign-in page is how a franchisee arrives expecting figures we do
 * not have.
 */

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  // Non-empty, not eight characters. The account's password policy is enforced where a password
  // is chosen; restating it here would lock out an older account whose password is shorter than
  // what we ask for today, on a form that has no business having an opinion.
  password: z.string().min(1, "Enter your password"),
});

const portalPromises = [
  { icon: Map, text: "Your territory and the terms you signed" },
  { icon: IndianRupee, text: "What you have paid, and what we have confirmed" },
  { icon: FileText, text: "Your signed agreement, with its date and reference" },
];

export default function FranchiseLogin() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /**
   * Set on a successful sign-in and never cleared: this component is on its way out.
   *
   * It keeps the button reading "Signing in..." through the route change, which is where the
   * remaining wait lives. Separate from `isSubmitting` so an unexpected throw still releases the
   * form rather than locking a franchisee out of their own login page.
   */
  const [isLeaving, setIsLeaving] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    let cancelled = false;
    fetchFranchiseSession().then((session) => {
      if (!session || cancelled) return;
      // Handed on rather than thrown away, for the same reason as in `onSubmit`.
      queryClient.setQueryData(FRANCHISE_SESSION_QUERY_KEY, session);
      router.replace("/franchise/dashboard");
    });
    // Guards a redirect firing after the component is gone: someone who starts typing and
    // navigates away mid-probe should not be yanked to the dashboard.
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await signInToFranchisePortal(values.email, values.password);
      if (!result.ok) {
        // The seam has already decided what a franchisee reads: one generic message for every
        // credential failure, so this page is not the thing that turns the server's deliberate
        // silence into a list of who holds a franchise.
        setNotice(result.error.message);
        return;
      }

      // The login response *is* the session, so it is written into the cache the dashboard reads
      // rather than invalidated. Invalidating throws away the answer this request just paid for,
      // and the dashboard then sits on a loading line asking the same question again.
      queryClient.setQueryData(FRANCHISE_SESSION_QUERY_KEY, result.data);
      setIsLeaving(true);
      router.push("/franchise/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="theme-console min-h-screen flex">

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-neutral-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-primary/30 blur-3xl -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-2xl translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 hero-rise">
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-12 w-auto brightness-0 invert cursor-pointer" />
          </Link>
        </div>

        <div className="relative z-10 hero-rise">
          <h2
            className="font-display font-black text-white uppercase leading-none mb-4 text-balance"
            style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)" }}
          >
            Your territory,{" "}
            <br className="hidden sm:inline" />
            <span className="text-white/80">on the record.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Sign in to your franchise portal to see the terms you signed, the territory you were
            granted, and every payment we have confirmed.
          </p>

          <div className="space-y-4">
            {portalPromises.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/90 text-sm font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs hero-rise">
          © 2026 MuscleBoxPro. All rights reserved.
        </p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="hero-rise w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
              Franchise login
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your MuscleBoxPro franchise portal
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
                        placeholder="you@yourcompany.in"
                        type="email"
                        autoComplete="email"
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
                      <Link href="/franchise/forgot-password">
                        <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
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
                <div
                  className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
                  role="alert"
                  data-testid="login-notice"
                >
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
                disabled={isSubmitting || isLeaving}
                className="w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm hover:bg-primary-fill/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-2"
                data-testid="button-login"
              >
                {isSubmitting || isLeaving ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          {/* No signup link. A portal account is created at the last step of the franchise
              application, once the agreement is signed and the first instalment is in. */}
          <p className="text-muted-foreground text-sm text-center mt-6">
            Not a franchisee yet?{" "}
            <Link href="/franchise">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-semibold">
                See the franchise program
              </span>
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
