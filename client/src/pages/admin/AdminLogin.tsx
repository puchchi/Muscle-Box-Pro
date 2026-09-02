"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { ADMIN_SESSION_QUERY_KEY, fetchAdminSession, signInAsAdmin } from "@/lib/adminSession";

/**
 * The admin front door. Deliberately plain.
 *
 * No brand panel, no marketing copy, no animation — the four people who see this screen
 * work here. `GymLogin` earns its left-hand panel because a gym owner arriving there may be
 * deciding whether to trust us; nobody lands on this page by accident, and every element
 * that is not a field is one more thing to keep working.
 *
 * What it does carry, because these are not cosmetic:
 *
 * - **It renders the server's message verbatim.** `POST /admin/login` answers one fixed
 *   message for "no such admin", "wrong password" and "disabled account" alike, so there is
 *   no distinction for this page to leak — and it answers something different and useful on
 *   a 429 ("too many attempts, try again shortly"), which a page substituting its own copy
 *   would throw away. See `signInAsAdmin`.
 * - **No forgot-password link.** There is no self-service admin reset and there is no email
 *   sender (§9.2), so a link here would lead to a page that cannot help. Recovery is
 *   `seedAdmin` against the table, by someone with AWS access.
 * - **No signup.** Admins exist because a row was seeded, never because a form was filled.
 *
 * `robots: { index: false }` on the route is the control that keeps this out of search, not
 * the `Disallow` in robots.txt — several crawlers there are given a blanket `Allow: /` that
 * overrides the wildcard block.
 */

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  // `min(1)`, not `min(6)`. This is a login, so the password already exists and its rules
  // were enforced when it was set; a length check here can only refuse to submit a
  // credential that would have worked, and it tells an admin their own password is wrong
  // when the real answer is that this form disagreed with the seeder.
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    let cancelled = false;
    // Same trade as the partner login: the form renders immediately rather than waiting on
    // this, because almost everyone opening it is not signed in and making them watch a
    // spinner to reach a password field is the wrong order.
    fetchAdminSession().then((session) => {
      if (session && !cancelled) router.replace("/admin");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await signInAsAdmin(values.email, values.password);
      if (!result.ok) {
        setNotice(result.error.message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="theme-console min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-login-heading"
          >
            MuscleBoxPro admin
          </h1>
          <p className="text-muted-foreground text-sm">Internal use only.</p>
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
                      placeholder="you@muscleboxpro.com"
                      type="email"
                      autoComplete="username"
                      {...field}
                      className="bg-white border-gray-200 h-11 rounded-xl"
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
                  <FormLabel className="text-gray-700 text-sm font-semibold">Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      autoComplete="current-password"
                      {...field}
                      className="bg-white border-gray-200 h-11 rounded-xl"
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
                data-testid="admin-login-error"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{notice}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              // `cursor-pointer` explicitly: Tailwind v4 dropped `cursor: pointer` from its
              // button reset, and `components/ui/button.tsx` sets no cursor of its own, so a
              // button without this reads as unclickable however well it works. Every other
              // hand-written button in the app does the same — see `GymLogin`.
              className="w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm rounded-xl cursor-pointer"
              data-testid="button-login"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
