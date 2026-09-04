"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPortalPassword } from "@/lib/gymSession";
import { portalPasswordSchema } from "@shared/onboarding/schema";
import type { OnboardingErrorCode } from "@shared/onboarding/types";

/**
 * Where a relayed set-password link lands.
 *
 * There is no self-service password reset (§9.2). Someone at MuscleBoxPro mints a single-use
 * handle with `POST /admin/gyms/{gymId}/set-password-link`, confirms by hand that the person
 * asking is the account holder, and sends them the link; this page spends it. Its counterpart
 * is [GymForgotPassword](./GymForgotPassword.tsx), which explains the arrangement to a gym
 * that is locked out and has no link yet.
 *
 * **The handle is in the path, not a query string, and the reason is logging.** A credential
 * in `?handle=` is archived by every access log and analytics beacon it passes through, and
 * `document.referrer` carries the query string to anything this page links out to. The path
 * segment plus `Referrer-Policy: no-referrer` scoped to `/gym/set-password/` in
 * `next.config.mjs` is the same treatment the onboarding link gets, for the same reason.
 *
 * **This page does not sign anyone in.** `POST /gym/account` sets the password and stops; the
 * gym then signs in through the normal form. That is deliberate — a link that both sets a
 * password *and* opens a session would mean the link is itself a session, and a forwarded
 * email would hand someone a logged-in portal. Making them type the new password once more is
 * also the only check that it is the password they think they set.
 */

const COPY: Record<OnboardingErrorCode, { title: string; body: string } | undefined> = {
  expired_token: {
    title: "This link has expired",
    body: "Set-password links are short-lived on purpose. Email us and we'll send a fresh one. It only takes a moment at our end.",
  },
  revoked_token: {
    title: "This link has already been used",
    body: "Each link works once. If you've set a password, sign in with it. If you didn't set one, email us and we'll issue another.",
  },
  invalid_token: {
    title: "We don't recognise this link",
    body: "It may have been broken across two lines by an email client, or copied without its last few characters. Try opening it from the original message, or email us for a new one.",
  },
  network: {
    title: "We couldn't reach us just now",
    body: "Nothing has changed and your link is still good. Check your connection and try again.",
  },
  // The remaining codes belong to the onboarding wizard's step machine and cannot arise on
  // this route, which has one step and no state to be out of sequence with. They are listed
  // so that adding a code to `OnboardingErrorCode` fails the type check here rather than
  // falling through to a screen with no explanation on it.
  frozen: undefined,
  wrong_step: undefined,
  already_signed: undefined,
  content_mismatch: undefined,
  validation: undefined,
  otp_invalid: undefined,
};

const FALLBACK = {
  title: "We couldn't set your password",
  body: "Something went wrong at our end rather than with your link. Email us and we'll sort it out.",
};

export default function GymSetPassword({ handle }: { handle: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);
    setProblem(null);

    // Both checks run before the request. The mismatch one has to: the server sees a single
    // password and cannot tell that the gym typed two different ones.
    const parsed = portalPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "That password can't be used.");
      return;
    }
    if (password !== confirm) {
      setFieldError("Those two passwords don't match. Type the same one in both boxes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setPortalPassword(handle, password);
      if (!result.ok) {
        // A field error from the server belongs on the input, not in the panel — the panel's
        // copy is all about the link, and blaming the link for a rejected password would
        // send a gym owner off to ask for a replacement that changes nothing.
        const serverField = result.error.fieldErrors?.password;
        if (serverField) {
          setFieldError(serverField);
          return;
        }
        setProblem(COPY[result.error.code] ?? FALLBACK);
        return;
      }
      setIsDone(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="theme-console min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
          </Link>
        </div>

        {isDone ? (
          <div data-testid="set-password-done">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                Your password is set
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Sign in with it and you're back in your portal. This link won't work again.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push("/gym/login")}
              className="w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm hover:bg-primary-fill/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20 mt-6"
              data-testid="button-go-to-login"
            >
              Sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
                Set a new password
              </h1>
              <p className="text-muted-foreground text-sm">
                For your MuscleBoxPro partner portal
              </p>
            </div>

            {problem && (
              <div
                className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-5"
                data-testid="set-password-problem"
                role="alert"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{problem.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{problem.body}</p>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-gray-700 text-sm font-semibold">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="bg-gray-50 border-gray-200 pl-10 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-gray-700 text-sm font-semibold">
                  Type it again
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="bg-gray-50 border-gray-200 pl-10 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              {fieldError && (
                <p className="text-sm text-red-600" role="alert" data-testid="password-error">
                  {fieldError}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm hover:bg-primary-fill/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20"
                data-testid="button-set-password"
              >
                {isSubmitting ? "Setting your password..." : "Set password"}
              </Button>
            </form>
          </>
        )}

        <Link href="/gym/login">
          <span className="mt-6 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
