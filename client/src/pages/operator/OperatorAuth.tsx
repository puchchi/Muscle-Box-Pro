"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestMachineConsolePasswordReset, signInToMachineConsole, signOutOfMachineConsole } from "@/lib/machineConsoleSignIn";
import { OPERATOR_ID_PATTERN } from "@shared/admin/operatorsSchema";
import { forgetVerifiedViewer, resolveViewer } from "../admin/machines/viewer";
import { homeFor } from "../admin/machines/MachinesShell";
import { FormNotice } from "@/components/auth/FormNotice";

const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const looksLikeSignIn = (v: string) => (v.includes("@") ? looksLikeEmail(v) : OPERATOR_ID_PATTERN.test(v.toLowerCase()));
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
    <FormNotice title={title} testId={testId}>
      {body}
    </FormNotice>
  );
}

export function MachinesSignIn() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveViewer().then((viewer) => {
      if (viewer && !cancelled) router.replace(homeFor(viewer.role));
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = {
      ...(looksLikeSignIn(login.trim()) ? {} : { login: "Enter your email, or an operator ID like op_mbp_01." }),
      ...(password ? {} : { password: "Enter your password." }),
    };
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await signInToMachineConsole(login.trim(), password);
    if (!result.ok) {
      setBusy(false);
      setNotice({ title: "Sign in failed", body: result.error.message });
      return;
    }
    forgetVerifiedViewer();
    const viewer = await resolveViewer();
    if (viewer || result.role === "franchise") {
      router.push(homeFor(viewer?.role ?? result.role));
      return;
    }
    await signOutOfMachineConsole(result.role);
    setBusy(false);
    setNotice({
      title: "Machine access isn't on for this account yet",
      body: "Your sign-in details are right. Sign in to your own dashboard for now.",
    });
  }

  return (
    <Frame title="Sign in" subtitle="You'll see the machines your account looks after.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="console-login">Email or operator ID</Label>
          <Input
            id="console-login"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            aria-invalid={Boolean(errors.login)}
            aria-describedby={errors.login ? "console-login-error" : undefined}
            className={fieldClass}
            data-testid="input-login"
          />
          <FieldMessage id="console-login-error" message={errors.login ?? null} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="console-password" className="text-gray-700 text-sm font-semibold">
              Password
            </label>
            <Link href="/machines/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium">
              Forgot password?
            </Link>
          </div>
          <Input
            id="console-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "console-password-error" : undefined}
            className={fieldClass}
            data-testid="input-password"
          />
          <FieldMessage id="console-password-error" message={errors.password ?? null} />
        </div>
        {notice && <Alert title={notice.title} body={notice.body} testId="login-notice" />}
        <Button type="submit" disabled={busy} className={primaryClass} data-testid="button-login">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Frame>
  );
}

export function MachinesForgotPassword() {
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
    const result = await requestMachineConsolePasswordReset(email.trim());
    setBusy(false);
    if (!result.ok) return setNotice("We couldn't reach the server. Check your connection and try again.");
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
              If that address has an account, a link is on its way.
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
      <p className="text-muted-foreground text-sm leading-relaxed mt-6" data-testid="operator-reset-note">
        Sign in with an operator ID? Ask the person who added you to set a new password.
      </p>
      <p className="text-muted-foreground text-sm text-center mt-6">
        <Link href="/machines/sign-in" className="text-primary hover:text-primary/80 font-semibold">
          Back to sign in
        </Link>
      </p>
    </Frame>
  );
}
