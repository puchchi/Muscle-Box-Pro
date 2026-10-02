"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ShopCustomer } from "@shared/shop/shopSchema";
import { requestSigninCode, verifySignin } from "@/lib/shopApi";
import { SIGNIN_COPY } from "./shopCopy";

const FIELD =
  "h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-900 placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-rose-400";
export const PRIMARY_BUTTON =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-fill px-6 text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary-fill/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600 disabled:shadow-none";
const LINK_BUTTON = "cursor-pointer text-sm font-semibold text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SignInForm({
  sn,
  claimToken,
  submitLabel,
  onSignedIn,
}: {
  sn: string | null;
  claimToken?: string | null;
  submitLabel: string;
  onSignedIn: (customer: ShopCustomer) => void;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "email" | "code" | null; message: string } | null>(null);

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const address = (sentTo ?? email).trim();
    if (address === "") {
      setError({ field: "email", message: SIGNIN_COPY.emailMissing });
      return;
    }
    setBusy(true);
    setError(null);
    const result = await requestSigninCode(address, sn);
    setBusy(false);
    if (!result.ok) {
      setError({ field: result.error.fieldErrors?.email ? "email" : null, message: result.error.fieldErrors?.email ?? result.error.message });
      return;
    }
    setSentTo(address);
    setCode("");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!sentTo) return;
    if (code.length !== 6) {
      setError({ field: "code", message: SIGNIN_COPY.codeMissing });
      return;
    }
    setBusy(true);
    setError(null);
    const result = await verifySignin(sentTo, code, { sn, claimToken });
    if (!result.ok) {
      setBusy(false);
      setError({ field: "code", message: result.error.fieldErrors?.code ?? result.error.message });
      return;
    }
    onSignedIn(result.data.customer);
  }

  if (sentTo === null) {
    return (
      <form onSubmit={(e) => void send(e)} className="space-y-3" data-testid="signin-email-form" noValidate>
        <label className="block text-sm font-semibold text-gray-900" htmlFor="signin-email">
          {SIGNIN_COPY.emailLabel}
        </label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={SIGNIN_COPY.emailPlaceholder}
          aria-invalid={error?.field === "email"}
          aria-describedby={error ? "signin-error" : undefined}
          className={FIELD}
          data-testid="signin-email"
        />
        <ErrorLine error={error} />
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON} data-testid="signin-send">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? SIGNIN_COPY.sending : SIGNIN_COPY.sendCode}
        </button>
        <p className="text-center text-xs text-muted-foreground">{SIGNIN_COPY.noPassword}</p>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void verify(e)} className="space-y-3" data-testid="signin-code-form" noValidate>
      <p className="text-sm text-gray-700" role="status" data-testid="signin-sent">
        {SIGNIN_COPY.codeSent(sentTo)}
      </p>
      <label className="block text-sm font-semibold text-gray-900" htmlFor="signin-code">
        {SIGNIN_COPY.codeLabel}
      </label>
      <input
        id="signin-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        aria-invalid={error?.field === "code"}
        aria-describedby={error ? "signin-error" : undefined}
        className={`${FIELD} text-center font-mono text-2xl tracking-[0.4em]`}
        data-testid="signin-code"
        autoFocus
      />
      <ErrorLine error={error} />
      <button type="submit" disabled={busy} className={PRIMARY_BUTTON} data-testid="signin-verify">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy ? SIGNIN_COPY.verifying : submitLabel}
      </button>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className={LINK_BUTTON}
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
        >
          {SIGNIN_COPY.changeEmail}
        </button>
        <button type="button" className={LINK_BUTTON} disabled={busy} onClick={() => void send()} data-testid="signin-resend">
          {SIGNIN_COPY.resend}
        </button>
      </div>
    </form>
  );
}

function ErrorLine({ error }: { error: { message: string } | null }) {
  if (!error) return null;
  return (
    <p id="signin-error" className="text-sm font-medium text-rose-700" role="alert">
      {error.message}
    </p>
  );
}
