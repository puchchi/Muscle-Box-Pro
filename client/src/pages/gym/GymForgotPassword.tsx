"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Mail, ShieldCheck, UserCheck, Clock, AlertCircle, MailCheck, LogIn, RotateCcw } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MBP_NOTICES } from "@shared/onboarding/agreementFields";
import { SELF_SERVE_RESET_ENABLED, requestPortalPasswordReset } from "@/lib/gymSession";

/**
 * What to do about a forgotten portal password, in whichever of two worlds we are in.
 *
 * `SELF_SERVE_RESET_ENABLED` picks. Off, this page is prose: a reset is issued by a person and
 * the page's whole job is to say so and name the way to reach one. On, it is a form that mints
 * a link and mails it. **Both halves are here on purpose** — the alternative is deleting one,
 * and the deleted one is the honest one.
 *
 * **The prose half exists because the form half used to lie.** It took an email address, called
 * a `forgot-password` edge function, and answered "if an account exists for this email, a
 * password reset link has been sent". No link was sent; §9.2 of the backend design records the
 * reset mechanism as built and its *delivery* as not. A gym owner locked out of their portal
 * would enter their address, read a confident confirmation, and then wait for a message that
 * was never coming. Waiting instead of calling us is the worst outcome available, which is why
 * the flag is off until the route answering it is deployed and sending.
 *
 * The old `?token=` branch was broken in a second, quieter way. It rendered two password fields
 * and called `supabase.auth.updateUser({ password })` — which changes the password of whatever
 * session the browser already has and ignores the token entirely. Nothing here sets a password:
 * the link lands on [/gym/set-password/[handle]](../../../../app/gym/set-password/[handle]/page.tsx),
 * which spends the handle and deliberately does not open a session.
 *
 * ## The two rules the form half must keep
 *
 * **The confirmation is neutral.** The message must not differ between an address we know and
 * one we do not, or the page becomes an oracle for which gyms are customers. That is why the
 * success panel below says "if we have an account" rather than "we have emailed you", and why
 * it renders on any accepted request rather than on a found account.
 *
 * **The panel does not put a number on the link.** An earlier version promised links expired
 * after an hour. The TTL is the server's to choose and change, and a page that states it will
 * be wrong silently.
 */

const resetSchema = z.object({
  email: z.string().email("A valid email is required"),
});

/** Facts that hold while a person issues the link by hand. */
const relayFacts = [
  { icon: UserCheck, text: "We check you're the account holder before any link goes out" },
  { icon: ShieldCheck, text: "The link works once, and only for setting a password" },
  { icon: Clock, text: "Same working day, in practice. We'll tell you when it's sent" },
];

/** Facts that hold once the route mints and mails the link itself. */
const selfServeFacts = [
  { icon: Mail, text: "The link goes to the address on your portal account" },
  { icon: ShieldCheck, text: "It works once, and only for setting a password" },
  // True of the route's contract, not just nice to say: minting a link revokes the one before it.
  { icon: RotateCcw, text: "Ask again any time. The newest link is the one that works" },
];

/** What happens after the request, one line each, so the panel isn't a paragraph. */
const afterRequestFacts = [
  { icon: ShieldCheck, text: "The link works once." },
  { icon: LogIn, text: "Setting a password won't sign you in. Sign in with the new one." },
];

export default function GymForgotPassword() {
  // Lives here, not in `ResetForm`, because the subhead has to answer to it: "enter your email"
  // above a screen with no email field is the page telling someone to do something twice.
  const [sent, setSent] = useState(false);
  const facts = SELF_SERVE_RESET_ENABLED ? selfServeFacts : relayFacts;

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
            Locked out?{" "}
            <span className="text-white/80">
              {SELF_SERVE_RESET_ENABLED ? "Let's fix that." : "Talk to us."}
            </span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Your machine keeps trading and every cup keeps counting while you're out of the
            portal. Nothing you're owed depends on you being able to sign in.
          </p>

          <div className="space-y-4">
            {facts.map((fact, i) => (
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
                {SELF_SERVE_RESET_ENABLED
                  ? "Enter your account email. We'll send a link to set a new password."
                  : "Ask us and we'll send you a link to set a new password."}
              </p>
            )}
          </div>

          {!SELF_SERVE_RESET_ENABLED && <ResetByRequest />}
          {SELF_SERVE_RESET_ENABLED &&
            (sent ? (
              <ResetRequested onRetry={() => setSent(false)} />
            ) : (
              <ResetForm onSent={() => setSent(true)} />
            ))}

          <Link
            href="/gym/login"
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
 * The prose half. No email field.
 *
 * An input here would be indistinguishable from a self-service reset, and a gym owner who
 * typed into one would reasonably then wait for an email. Waiting is the failure this half
 * exists to prevent.
 */
function ResetByRequest() {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5" data-testid="reset-by-request">
        <p className="text-sm text-foreground leading-relaxed">
          Portal resets are handled by a person, not automatically. Email us and tell us which
          gym you're with. We'll check you're the account holder, then send a one-time link to
          set a new password.
        </p>
        <a
          href={`mailto:${MBP_NOTICES.email}?subject=${encodeURIComponent(
            "Partner portal password reset",
          )}`}
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors break-words"
          data-testid="link-reset-email"
        >
          <Mail className="h-4 w-4 flex-shrink-0" />
          {MBP_NOTICES.email}
        </a>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed mt-4">
        Already have a link? Open it and set your new password there. No need to come back
        here.
      </p>
    </>
  );
}

/**
 * What we say once the request has been accepted.
 *
 * Accepted, never "found" — the server does not tell this side which it was, and the copy is
 * written so that it could not use the difference if it were handed one. One neutral sentence
 * carries the whole answer; the rest is what happens next, a line at a time, because the
 * paragraph this replaced said all three things at once and landed none of them.
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

        <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          {afterRequestFacts.map((fact, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <fact.icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground leading-relaxed">{fact.text}</span>
            </li>
          ))}
        </ul>
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
            "Partner portal password reset",
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
    const result = await requestPortalPasswordReset(values.email);
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
              <p className="text-sm font-semibold text-red-700 mb-0.5">Couldn't send the link</p>
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
                  placeholder="you@yourgym.com"
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
          Can't reach that inbox any more? Write to{" "}
          <a
            href={`mailto:${MBP_NOTICES.email}?subject=${encodeURIComponent(
              "Partner portal password reset",
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
