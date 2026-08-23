"use client";

import { useState } from "react";
import { KeyRound, Lock, MailCheck, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signatureSchema, toFieldErrors } from "@shared/onboarding/schema";
import { SIGNING_REQUIRES_OTP } from "@shared/onboarding/types";

/**
 * The signing panel.
 *
 * Two checkboxes rather than one because §32 is a separate representation about
 * authority to bind the entity. Bundling it into a general "I agree" is exactly the
 * kind of shortcut that gets a signature disputed by the person who clicked it.
 *
 * The panel stays locked until the document has been scrolled through. That gate
 * evidences delivery and opportunity to read, not reading — nothing in a browser can
 * evidence reading — and it is a UX honesty measure rather than the legal load-bearer,
 * which is the server-computed content hash plus the server timestamps.
 *
 * ## The second phase, and why it is switched off
 *
 * There is a two-phase version of this panel behind `SIGNING_REQUIRES_OTP`: identity and
 * assent first, then a code emailed to the §41 notices address. The link in the email
 * proves control of that address right up until someone forwards it; a code requested at
 * the moment of signing proves it again, at that moment — a materially stronger audit
 * trail on a 24-month agreement for one extra screen (docs/gym-onboarding.md §3, step 3).
 *
 * It is off because SES is not live, and the signing endpoint rejects an `otpCode` rather
 * than ignoring one. Showing the phase anyway would be the worst of the three options: it
 * tells the gym in so many words that we emailed and checked a code, while no email was
 * sent and nothing was checked. So the phase renders only when the flag is set, and until
 * then the assent button signs directly. Nothing about the code path is deleted — see the
 * flag's docstring for why.
 */
export default function SignPanel({
  legalEntityName,
  defaultName,
  defaultDesignation,
  contentHash,
  hasReadToEnd,
  blockedReason,
  previewOtp,
  isSubmitting,
  onRequestOtp,
  onSign,
}: {
  legalEntityName: string;
  defaultName: string;
  defaultDesignation: string;
  /**
   * Null until this client has rendered the agreement and confirmed it hashes to the
   * value the server pinned. Not "still computing" — "not yet vouched for".
   */
  contentHash: string | null;
  hasReadToEnd: boolean;
  /** Set when the agreement may not be issued or cannot be verified. Overrides all below. */
  blockedReason: string | null;
  /** Preview builds show the fixed code, so the flow can be walked without an inbox. */
  previewOtp?: string | null;
  isSubmitting: boolean;
  onRequestOtp(): Promise<string | null>;
  onSign(input: {
    fullName: string;
    designation: string;
    /** Omitted entirely while `SIGNING_REQUIRES_OTP` is false — the server rejects it. */
    otpCode?: string;
  }): Promise<boolean>;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [designation, setDesignation] = useState(defaultDesignation);
  const [agreed, setAgreed] = useState(false);
  const [authorised, setAuthorised] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);

  if (blockedReason) {
    return (
      <Locked
        title="This agreement isn't ready to sign"
        body={blockedReason}
        testId="sign-blocked"
      />
    );
  }

  if (!hasReadToEnd) {
    return (
      <Locked
        title="Read to the end to sign"
        body="Scroll through the agreement above — including the schedules — and the signing panel will open here. Nothing about this step is a formality; if something in it looks wrong, reply to our email instead of signing."
        testId="sign-locked"
      />
    );
  }

  /** Everything except the code, checked before we spend an email on it. */
  function validateAssent(): boolean {
    const result = signatureSchema.omit({ otpCode: true }).safeParse({
      fullName,
      designation,
      agreedToAgreement: agreed,
      authorisedToBind: authorised,
      contentHash: contentHash ?? "",
    });
    setErrors(result.success ? {} : toFieldErrors(result.error));
    return result.success;
  }

  async function requestCode() {
    setFailed(false);
    if (!validateAssent()) return;
    const to = await onRequestOtp();
    if (to) setSentTo(to);
  }

  async function sign() {
    setFailed(false);
    // The field is omitted rather than sent empty when OTP is off: the server rejects a
    // payload that carries it at all, and `""` is a value that carries it.
    const result = signatureSchema.safeParse({
      fullName,
      designation,
      agreedToAgreement: agreed,
      authorisedToBind: authorised,
      contentHash: contentHash ?? "",
      ...(SIGNING_REQUIRES_OTP ? { otpCode } : {}),
    });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    // The panel passes back only what it collected. The hash it was handed was verified
    // against the server's by the caller, so this component never computes one.
    const submitted = await onSign({
      fullName,
      designation,
      ...(SIGNING_REQUIRES_OTP ? { otpCode } : {}),
    });
    if (!submitted) setFailed(true);
  }

  return (
    <section
      className="rounded-2xl border-2 border-primary/30 bg-white p-4 sm:p-6"
      data-testid="sign-panel"
    >
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <PenLine className="w-4 h-4 text-primary flex-shrink-0" />
        Sign the agreement
      </p>

      <div className="mt-4 space-y-4">
        <Field
          id="sign-name"
          label="Your full name"
          value={fullName}
          onChange={setFullName}
          error={errors.fullName}
          autoComplete="name"
          disabled={!!sentTo}
        />
        <Field
          id="sign-designation"
          label="Your designation"
          value={designation}
          onChange={setDesignation}
          error={errors.designation}
          autoComplete="organization-title"
          disabled={!!sentTo}
        />

        <div className="space-y-3 pt-1">
          <Check
            id="agreed"
            checked={agreed}
            onChange={setAgreed}
            error={errors.agreedToAgreement}
            disabled={!!sentTo}
          >
            I have read and agree to this Agreement.
          </Check>
          <Check
            id="authorised"
            checked={authorised}
            onChange={setAuthorised}
            error={errors.authorisedToBind}
            disabled={!!sentTo}
          >
            I am authorised to bind{" "}
            <strong className="text-foreground">{legalEntityName || "this entity"}</strong> to it
            (§32).
          </Check>
        </div>

        {errors.contentHash && (
          <p className="text-xs text-red-600" data-testid="error-contentHash">
            {errors.contentHash} — wait a moment for the document to finish loading, then try again.
          </p>
        )}

        {/* ── Signing, without the code ──────────────────────────────────
            The live path. One button, and the copy says plainly that pressing it signs —
            a panel that has already collected two assertions must not then also have a
            step that looks preparatory. */}
        {!SIGNING_REQUIRES_OTP && (
          <div className="space-y-2 pt-1">
            {failed && (
              <p className="text-xs text-red-600 leading-relaxed" data-testid="sign-error">
                That didn't go through, and nothing has been signed. There is more detail at the
                top of this page.
              </p>
            )}
            <Button
              type="button"
              onClick={sign}
              disabled={isSubmitting || !contentHash}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto"
              data-testid="button-sign"
            >
              {isSubmitting ? "Signing..." : "Sign the agreement"}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              This signs the agreement. We'll email you a copy, with the fingerprint above
              printed on it, as soon as you do.
            </p>
          </div>
        )}

        {/* ── Phase 2: the emailed code ─────────────────────────────────── */}
        {SIGNING_REQUIRES_OTP &&
          (sentTo ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
            <p className="text-xs text-foreground leading-relaxed flex items-start gap-2">
              <MailCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span data-testid="otp-sent-to">
                We emailed a six-digit code to <strong>{sentTo}</strong>. Enter it to complete your
                signature.
              </span>
            </p>

            {previewOtp && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Preview mode — no email was sent. The code is <strong>{previewOtp}</strong>.
              </p>
            )}

            <div>
              <label htmlFor="otp" className="text-xs font-semibold text-foreground block mb-1">
                Six-digit code
              </label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                className="w-32 h-11 rounded-xl border border-gray-200 bg-white px-3 text-base tracking-[0.3em] font-mono focus:border-primary focus:outline-none transition-colors"
                data-testid="input-otp"
              />
              {errors.otpCode && (
                <p className="text-xs text-red-600 mt-1" data-testid="error-otpCode">
                  {errors.otpCode}
                </p>
              )}
            </div>

            {failed && (
              <p className="text-xs text-red-600 leading-relaxed" data-testid="sign-error">
                That didn't go through. Check the code, or ask for a new one — there is more detail
                at the top of this page.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                type="button"
                onClick={sign}
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl font-bold text-sm"
                data-testid="button-sign"
              >
                {isSubmitting ? "Signing..." : "Sign the agreement"}
              </Button>
              <button
                type="button"
                onClick={requestCode}
                disabled={isSubmitting}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 text-left"
                data-testid="button-resend-otp"
              >
                Send a new code
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              onClick={requestCode}
              disabled={isSubmitting || !contentHash}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto"
              data-testid="button-request-otp"
            >
              {isSubmitting ? "Sending..." : "Email me a signing code"}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              We'll email a six-digit code to your notices address. Entering it is what completes
              the signature — this button on its own does not sign anything.
            </p>
          </div>
          ))}
      </div>
    </section>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

function Locked({ title, body, testId }: { title: string; body: string; testId: string }) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 flex items-start gap-3"
      data-testid={testId}
    >
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{body}</p>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-foreground block mb-1">
        {label}
      </label>
      <input
        id={id}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm focus:border-primary focus:bg-white focus:outline-none transition-colors disabled:opacity-60"
        data-testid={`input-${id}`}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1" data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}

function Check({
  id,
  checked,
  onChange,
  error,
  disabled,
  children,
}: {
  id: string;
  checked: boolean;
  onChange(checked: boolean): void;
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="w-4 h-4 mt-0.5 flex-shrink-0 accent-primary"
          data-testid={`checkbox-${id}`}
        />
        <span className="text-xs text-muted-foreground leading-relaxed">{children}</span>
      </label>
      {error && (
        <p className="text-xs text-red-600 mt-1 pl-6" data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}
