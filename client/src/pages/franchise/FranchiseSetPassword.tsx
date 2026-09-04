"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setFranchisePortalPassword } from "@/lib/franchiseSession";
import { franchisePasswordSchema } from "@shared/franchise/onboarding/schema";
import type { FranchiseOnboardingErrorCode } from "@shared/franchise/onboarding/types";

/**
 * Where a franchise set-password link lands.
 *
 * [GymSetPassword](../gym/GymSetPassword.tsx) is the model. Two of its properties are the whole
 * design and are repeated here because they are easy to undo:
 *
 * **The handle is a path segment, not `?handle=`.** A credential in a query string is archived
 * by every access log it passes and travels in `document.referrer` to anything this page links
 * out to. `Referrer-Policy: no-referrer` scoped to `/franchise/set-password/` in
 * `next.config.mjs` closes the second half of that.
 *
 * **This page signs nobody in.** `POST /franchise/password` sets the password and stops. A link
 * that both set a password *and* opened a session would make the link itself a session, so a
 * forwarded email would hand someone a working portal. Typing the new password once more on the
 * sign-in page is also the only check that it is the password they think they set.
 *
 * Unlike the gym's, this link is self-serve: the franchisee asked for it on
 * [FranchiseForgotPassword](./FranchiseForgotPassword.tsx) and can ask again. So every refusal
 * below offers that page rather than an email address, and the mailto is gone.
 */

type Problem = { title: string; body: string; askForNew: boolean };

/**
 * Which screen each refusal gets.
 *
 * All three handle codes arrive as **401** and the status alone cannot tell them apart, because a
 * handle *is* the credential on this route. The code is the only thing that distinguishes "ask
 * for a fresh one" from "this is not a link of ours", and those are different instructions.
 *
 * `already_signed` is on this list and does not mean what its name says. `mbp-backend` maps every
 * `conflict()` to that code, and this route raises three: a token row naming no account, a link
 * spent by another tab between the read and the write, and a password refused for an account that
 * has since been changed. All three are "the link is gone, ask for another".
 */
const COPY: Record<FranchiseOnboardingErrorCode, Problem | undefined> = {
  expired_handle: {
    title: "This link has expired",
    body: "Set-password links are short-lived on purpose. Ask for a fresh one and it will be in your inbox in a moment.",
    askForNew: true,
  },
  revoked_handle: {
    title: "This link has already been used",
    body: "Each link works once. If you have already set a password, sign in with it. If you did not, ask for a new link.",
    askForNew: true,
  },
  invalid_handle: {
    title: "We don't recognise this link",
    body: "It may have been broken across two lines by an email client, or copied without its last few characters. Try opening it from the original message, or ask for a new one.",
    askForNew: true,
  },
  already_signed: {
    title: "This link is no longer usable",
    body: "It may have been opened in another tab, or the account it belongs to has changed since it was sent. Ask for a new link and try again.",
    askForNew: true,
  },
  validation: {
    title: "That password can't be used",
    body: "Choose a different one. Your link is still good, so you can try again on this page.",
    askForNew: false,
  },
  network: {
    title: "We couldn't reach us just now",
    body: "Nothing has changed and your link is still good. Check your connection and try again.",
    askForNew: false,
  },
  // The rest belong to the nine-step application's state machine and cannot arise on a route that
  // has one step and no state to be out of sequence with. Listed so that a code added to
  // `FranchiseOnboardingErrorCode` fails the type check here rather than falling through to a
  // screen with no explanation on it.
  wrong_step: undefined,
  frozen: undefined,
  not_approved: undefined,
  declined: undefined,
  not_issuable: undefined,
  content_mismatch: undefined,
  already_claimed: undefined,
  unsupported_document: undefined,
  document_too_large: undefined,
};

const FALLBACK: Problem = {
  title: "We couldn't set your password",
  body: "Something went wrong at our end rather than with your link. Ask for a new link, and if it happens again write to us.",
  askForNew: true,
};

export default function FranchiseSetPassword({ handle }: { handle: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);
    setProblem(null);

    // Both checks run before the request. The mismatch one has to: the server is sent a single
    // password and cannot tell that two different ones were typed.
    const parsed = franchisePasswordSchema.safeParse(password);
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
      const result = await setFranchisePortalPassword(handle, password);
      if (!result.ok) {
        // A field error from the server belongs on the input, not in the panel. The panel's copy
        // is about the link, and blaming the link for a rejected password sends someone off to
        // ask for a replacement that changes nothing.
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
                Sign in with it and you are back in your franchise portal. This link will not work
                again.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push("/franchise/login")}
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
                For your MuscleBoxPro franchise portal
              </p>
            </div>

            {problem && (
              <div
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-5"
                data-testid="set-password-problem"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">{problem.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{problem.body}</p>
                  </div>
                </div>
                {/* Only where a new link is the way out. On a rejected password or a dropped
                    connection the link in hand is still good, and sending someone to request
                    another would void the one they are holding. */}
                {problem.askForNew && (
                  <Link
                    href="/franchise/forgot-password"
                    className="mt-3 ml-11 inline-flex text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    data-testid="link-ask-for-new"
                  >
                    Send me a new link
                  </Link>
                )}
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

        <Link href="/franchise/login">
          <span className="mt-6 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
