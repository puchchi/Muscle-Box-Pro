"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Dumbbell, MailCheck, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchOperatorSession,
  requestOperatorPasswordReset,
  setOperatorPassword,
  signInAsOperator,
} from "@/lib/operatorSession";
import type { OnboardingErrorCode } from "@shared/onboarding/types";
import { forgetVerifiedViewer } from "../admin/machines/viewer";

const EMAIL_HANDOFF = "mbp.operator.email";
const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const fieldClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl";
const primaryClass =
  "w-full h-11 bg-primary-fill text-primary-foreground font-bold text-sm hover:bg-primary-fill/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20";

function Frame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="theme-console min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="hero-rise w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-gray-700 text-sm font-semibold mb-2">
      {children}
    </label>
  );
}

function FieldMessage({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

function Alert({ title, body, testId }: { title: string; body: string; testId: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5" role="alert" data-testid={testId}>
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-red-700 mb-0.5">{title}</p>
        <p className="text-xs text-red-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export function OperatorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handedOver = sessionStorage.getItem(EMAIL_HANDOFF);
    if (handedOver) {
      sessionStorage.removeItem(EMAIL_HANDOFF);
      setEmail(handedOver);
    }
    let cancelled = false;
    fetchOperatorSession().then((session) => {
      if (session && !cancelled) router.replace("/machines");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = {
      ...(looksLikeEmail(email.trim()) ? {} : { email: "Enter the email you were invited with." }),
      ...(password ? {} : { password: "Enter your password." }),
    };
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await signInAsOperator(email.trim(), password);
    if (!result.ok) {
      setBusy(false);
      setNotice(result.error.message);
      return;
    }
    forgetVerifiedViewer();
    router.push("/machines");
  }

  return (
    <Frame title="Operator sign in" subtitle="Restock and test the machines you look after.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="operator-email">Email</Label>
          <Input
            id="operator-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "operator-email-error" : undefined}
            className={fieldClass}
            data-testid="input-email"
          />
          <FieldMessage id="operator-email-error" message={errors.email ?? null} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="operator-password" className="text-gray-700 text-sm font-semibold">
              Password
            </label>
            <Link href="/operator/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium">
              Forgot password?
            </Link>
          </div>
          <Input
            id="operator-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "operator-password-error" : undefined}
            className={fieldClass}
            data-testid="input-password"
          />
          <FieldMessage id="operator-password-error" message={errors.password ?? null} />
        </div>
        {notice && <Alert title="Sign in failed" body={notice} testId="login-notice" />}
        <Button type="submit" disabled={busy} className={primaryClass} data-testid="button-login">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="text-muted-foreground text-sm text-center mt-6">
        Not an operator?{" "}
        <Link href="/machines/sign-in" className="text-primary hover:text-primary/80 font-semibold">
          Other sign-ins
        </Link>
      </p>
    </Frame>
  );
}

type LinkProblem = { title: string; body: string; askForNew: boolean };

const LINK_PROBLEMS: Partial<Record<OnboardingErrorCode, LinkProblem>> = {
  expired_token: {
    title: "This link has expired",
    body: "Ask the person who added you to send the invite again. If you already have a password, use Forgot password.",
    askForNew: true,
  },
  revoked_token: {
    title: "This link no longer works",
    body: "A newer link may have been sent, or your account was turned off. Use the newest email, or ask the person who added you.",
    askForNew: true,
  },
  invalid_token: {
    title: "We don't recognise this link",
    body: "It may have been cut short when it was copied. Open it again from the email, or ask for a new one.",
    askForNew: true,
  },
  network: {
    title: "We couldn't reach the server",
    body: "Nothing has changed and your link is still good. Check your connection and try again.",
    askForNew: false,
  },
};

const LINK_FALLBACK: LinkProblem = {
  title: "We couldn't set your password",
  body: "This link may already have been used. Try signing in, or ask the person who added you for a new link.",
  askForNew: true,
};

export function OperatorSetPassword({ handle }: { handle: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [problem, setProblem] = useState<LinkProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);
    setProblem(null);
    if (password.length < 8) return setFieldError("Use at least 8 characters.");
    if (password.length > 200) return setFieldError("Passwords are limited to 200 characters.");
    if (password !== confirm) return setFieldError("Those two passwords don't match. Type the same one in both boxes.");
    setBusy(true);
    const result = await setOperatorPassword(handle, password);
    setBusy(false);
    if (!result.ok) {
      const serverField = result.error.fieldErrors?.password;
      if (serverField) return setFieldError(serverField);
      return setProblem(LINK_PROBLEMS[result.error.code] ?? LINK_FALLBACK);
    }
    if (result.data.email) sessionStorage.setItem(EMAIL_HANDOFF, result.data.email);
    setDone(true);
  }

  if (done) {
    return (
      <Frame title="Password set" subtitle="You can sign in now.">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5" data-testid="set-password-done">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            Your password is set
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">Sign in with it to see your machines. This link will not work again.</p>
        </div>
        <Button type="button" onClick={() => router.push("/operator/login")} className={`${primaryClass} mt-6`} data-testid="button-go-to-login">
          Sign in
        </Button>
      </Frame>
    );
  }

  return (
    <Frame title="Choose a password" subtitle="For signing in to the MBP machine console.">
      {problem && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-5" role="alert" data-testid="set-password-problem">
          <p className="text-sm font-semibold text-amber-800">{problem.title}</p>
          <p className="text-xs text-amber-700 leading-relaxed mt-1">{problem.body}</p>
          {problem.askForNew && (
            <Link href="/operator/forgot-password" className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary/80">
              Forgot password
            </Link>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="operator-new-password">New password</Label>
          <Input
            id="operator-new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
            data-testid="input-password"
          />
          <p className="mt-2 text-xs text-muted-foreground">At least 8 characters. A short phrase is easier to remember.</p>
        </div>
        <div>
          <Label htmlFor="operator-confirm-password">Type it again</Label>
          <Input
            id="operator-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "operator-password-error" : undefined}
            className={fieldClass}
            data-testid="input-confirm-password"
          />
          <FieldMessage id="operator-password-error" message={fieldError} />
        </div>
        <Button type="submit" disabled={busy} className={primaryClass} data-testid="button-set-password">
          {busy ? "Saving..." : "Set password"}
        </Button>
      </form>
    </Frame>
  );
}

export function OperatorForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (!looksLikeEmail(email.trim())) return setError("Enter the email you sign in with.");
    setError(null);
    setBusy(true);
    const result = await requestOperatorPasswordReset(email.trim());
    setBusy(false);
    if (!result.ok) return setNotice(result.error.message);
    setSent(true);
  }

  return (
    <Frame title="Forgot password" subtitle="We email you a link to choose a new one.">
      {sent ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5" role="status" data-testid="reset-requested">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-primary" />
              Request received
            </p>
            <p className="text-sm text-foreground leading-relaxed mt-3">
              If that address has an operator account, a link is on its way. Never set a password? Ask the person who added you to send the invite again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-sm font-semibold text-primary hover:text-primary/80 cursor-pointer"
            data-testid="button-try-again"
          >
            Try a different address
          </button>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div>
            <Label htmlFor="operator-reset-email">Email</Label>
            <Input
              id="operator-reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "operator-reset-email-error" : undefined}
              className={fieldClass}
              data-testid="input-email"
            />
            <FieldMessage id="operator-reset-email-error" message={error} />
          </div>
          {notice && <Alert title="That didn't go through" body={notice} testId="reset-notice" />}
          <Button type="submit" disabled={busy} className={primaryClass} data-testid="button-send-reset">
            {busy ? "Sending..." : "Send link"}
          </Button>
        </form>
      )}
      <p className="text-muted-foreground text-sm text-center mt-6">
        <Link href="/operator/login" className="text-primary hover:text-primary/80 font-semibold">
          Back to sign in
        </Link>
      </p>
    </Frame>
  );
}

const SIGN_INS = [
  { href: "/operator/login", title: "Operator", body: "You restock or test machines.", icon: Wrench },
  { href: "/franchise/login", title: "Franchise owner", body: "You own MBP machines in your territory.", icon: Building2 },
  { href: "/gym/login", title: "Gym owner", body: "An MBP machine is at your gym.", icon: Dumbbell },
  { href: "/admin/login", title: "MBP team", body: "You work at MuscleBoxPro.", icon: ShieldCheck },
] as const;

export function MachinesSignIn() {
  return (
    <Frame title="Sign in" subtitle="Choose how you use MBP machines.">
      <ul className="space-y-3">
        {SIGN_INS.map(({ href, title, body, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 hover:border-primary/50 hover:bg-gray-50 transition-colors"
              data-testid={`sign-in-${href.split("/")[1]}`}
            >
              <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{title}</span>
                <span className="block text-xs text-muted-foreground">{body}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
