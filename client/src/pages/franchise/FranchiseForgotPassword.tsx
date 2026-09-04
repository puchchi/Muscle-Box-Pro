"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Mail, MailCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MBP_NOTICES } from "@shared/onboarding/agreementFields";
import { requestFranchisePasswordReset } from "@/lib/franchiseSession";

/**
 * A forgotten franchise portal password: type your address, get a link.
 *
 * `POST /franchise/password-reset` mints a single-use handle and mails it to the address on the
 * account. The link lands on
 * [/franchise/set-password/[handle]](../../../app/franchise/set-password/[handle]/page.tsx),
 * which spends it and deliberately does not open a session.
 *
 * ## The two rules this page must keep
 *
 * **The confirmation is neutral.** It must not differ between an address we know and one we do
 * not, or the page becomes a way to find out who holds a MuscleBoxPro franchise, which is a
 * shorter and more valuable list than the gym one. That is why the panel below says "if we have
 * an account" rather than "we have emailed you", and why it renders on any accepted request
 * rather than on a found account. The route is written to the same rule: one body and one
 * status for every outcome it has, throttled included.
 *
 * **The panel puts no number on the link's lifetime.** The expiry is the server's to choose and
 * change, and a page that states it will be wrong silently.
 *
 * The mailto stays on every state of the page. The route declines quietly in cases a franchisee
 * cannot see or fix, a disabled account among them, and answers those with the same
 * confirmation as a send. A person is the only way out of those.
 */

const resetSchema = z.object({
  email: z.string().email("A valid email is required"),
});

/** What the route actually promises, one line each. */
const resetFacts = [
  { icon: Mail, text: "The link goes to the address on your franchise account" },
  { icon: ShieldCheck, text: "It works once, and only for setting a password" },
  { icon: RotateCcw, text: "Ask again any time. The newest link is the one that works" },
];

export default function FranchiseForgotPassword() {
  // Lives here rather than in `ResetForm`, because the subhead answers to it: "enter your email"
  // above a screen with no email field is the page asking for something twice.
  const [sent, setSent] = useState(false);

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
            Locked out? <span className="text-white/80">Let&apos;s fix that.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Your agreement, your territory and every payment we have confirmed are all on the
            record. None of it depends on you being able to sign in.
          </p>

          <div className="space-y-4">
            {resetFacts.map((fact, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <fact.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/90 text-sm font-medium">{fact.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs hero-rise">
          © 2026 MuscleBoxPro. All rights reserved.
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="hero-rise w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
              Reset password
            </h1>
            {!sent && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                Enter your account email. We&apos;ll send a link to set a new password.
              </p>
            )}
          </div>

          {sent ? (
            <ResetRequested onRetry={() => setSent(false)} />
          ) : (
            <ResetForm onSent={() => setSent(true)} />
          )}

          <Link
            href="/franchise/login"
            className="mt-8 flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>

    </div>
  );
}

/**
 * What we say once the request has been accepted.
 *
 * Accepted, never "found": the server does not tell this side which it was, and the copy is
 * written so that it could not use the difference if it were handed one.
 */
function ResetRequested({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <div
        className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
        data-testid="reset-requested"
        role="status"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MailCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">Request received</p>
        </div>

        <p className="text-sm text-foreground leading-relaxed mt-3">
          If we have an account for that address, a link to set a new password is on its way.
        </p>
      </div>

      {/* A typo in the address is the likeliest reason nothing arrives, and this screen is
          otherwise a dead end: the only way back to the field was the login page. */}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 text-sm font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        data-testid="button-try-again"
      >
        Try a different address
      </button>

      <p className="text-muted-foreground text-xs leading-relaxed mt-4">
        Still nothing? Check the spam folder, then email{" "}
        <a
          href={`mailto:${MBP_NOTICES.email}?subject=${encodeURIComponent(
            "Franchise portal password reset",
          )}`}
          className="font-semibold text-primary hover:text-primary/80 transition-colors break-words"
          data-testid="link-reset-email"
        >
          {MBP_NOTICES.email}
        </a>
        , and a person will issue the link by hand.
      </p>
    </>
  );
}

/** The self-service half. Asks for one thing, and reports what happened to it. */
function ResetForm({ onSent }: { onSent: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    setNotice(null);
    const result = await requestFranchisePasswordReset(values.email);
    if (!result.ok) {
      setNotice(result.error.message);
      return;
    }
    onSent();
  }

  const sending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {notice && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
            data-testid="reset-notice"
            role="alert"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 mb-0.5">Couldn&apos;t send the link</p>
              <p className="text-xs text-red-600 leading-relaxed">{notice}</p>
            </div>
          </div>
        )}

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
                  autoFocus
                  {...field}
                  className="bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                  data-testid="input-email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className="w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm hover:bg-primary-fill/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 disabled:opacity-70"
          data-testid="button-send-reset"
        >
          {sending ? "Sending..." : "Send reset link"}
        </Button>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Can&apos;t reach that inbox any more? Write to{" "}
          <a
            href={`mailto:${MBP_NOTICES.email}?subject=${encodeURIComponent(
              "Franchise portal password reset",
            )}`}
            className="font-semibold text-primary hover:text-primary/80 transition-colors break-words"
            data-testid="link-reset-email"
          >
            {MBP_NOTICES.email}
          </a>{" "}
          and a person will help.
        </p>
      </form>
    </Form>
  );
}
