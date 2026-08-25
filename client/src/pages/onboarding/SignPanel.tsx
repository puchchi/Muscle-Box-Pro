"use client";

import { useState } from "react";
import { KeyRound, Lock, MailCheck, PenLine, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signatureSchema, toFieldErrors } from "@shared/onboarding/schema";
import { SIGNING_REQUIRES_OTP } from "@shared/onboarding/types";

/**
 * The signing panel.
 *
 * One checkbox, stating both representations: assent to the agreement and §32 authority
 * to bind the entity. It was two, on the reasoning that authority bundled into a general
 * "I agree" is weaker. The record still carries them as two fields, and the sentence the
 * gym ticks still says both in terms — what went is a second click on the same screen for
 * a person who has just been shown, by name and designation, that they are the signatory.
 *
 * The panel stays locked until the document has been scrolled through. That gate
 * evidences delivery and opportunity to read, not reading — nothing in a browser can
 * evidence reading — and it is a UX honesty measure rather than the legal load-bearer,
 * which is the server-computed content hash plus the server timestamps.
 *
 * ## Who is signing is shown, not asked
 *
 * This panel used to open with two text inputs for the signatory's name and designation,
 * seeded from step 1's answers. They collected nothing: the same two values are already on
 * the record, they are what §47 of the agreement now prints, and — because the signature
 * block is rendered *into* the hashed text — a name retyped here to something else would
 * describe a document this gym is not being shown. Worse, the pair read as the gym's half
 * of a form the other party was filling in beside it, which is the impression the whole
 * step is meant not to give. So they are displayed, with a way back to the step that owns
 * them and a plain statement of what to do if either is wrong.
 *
 * The checkbox stays. That is a representation being made now, not data already held.
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
  signatoryName,
  signatoryDesignation,
  contentHash,
  hasReadToEnd,
  readPercent,
  blockedReason,
  previewOtp,
  isSubmitting,
  onReviewDetails,
  onRequestOtp,
  onSign,
}: {
  legalEntityName: string;
  /** From step 1, and what §47 prints. Shown here, never re-collected. */
  signatoryName: string;
  signatoryDesignation: string;
  /** The fingerprint on the record, as issued. Step 3 renders nothing without one. */
  contentHash: string;
  hasReadToEnd: boolean;
  /** How far through the document the reader has scrolled, so the gate can say. */
  readPercent?: number;
  /** Set when the agreement may not be issued as it stands. Overrides all below. */
  blockedReason: string | null;
  /** Preview builds show the fixed code, so the flow can be walked without an inbox. */
  previewOtp?: string | null;
  isSubmitting: boolean;
  /** Takes the gym back to step 1 to read what it submitted. */
  onReviewDetails(): void;
  onRequestOtp(): Promise<string | null>;
  onSign(input: {
    fullName: string;
    designation: string;
    /** Omitted entirely while `SIGNING_REQUIRES_OTP` is false — the server rejects it. */
    otpCode?: string;
  }): Promise<boolean>;
}) {
  const [agreed, setAgreed] = useState(false);
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
        body="Scroll through the agreement above, including the schedules, and the signing panel will open here. Nothing about this step is a formality; if something in it looks wrong, reply to our email instead of signing."
        // A gate with no gauge reads as broken: "read to the end" gives no way to tell
        // whether the end is one schedule away or twelve.
        progress={readPercent}
        testId="sign-locked"
      />
    );
  }

  /**
   * The two fields the record keeps, from the one sentence that was ticked.
   *
   * They stay separate on the wire because the signature record and the admin view read
   * them separately, and a stored `authorisedToBind` is only true if the label the gym
   * ticked said so — which is why the copy below states both representations.
   */
  const assent = () => ({ agreedToAgreement: agreed, authorisedToBind: agreed });

  /** Everything except the code, checked before we spend an email on it. */
  function validateAssent(): boolean {
    const result = signatureSchema.omit({ otpCode: true }).safeParse({
      fullName: signatoryName,
      designation: signatoryDesignation,
      ...assent(),
      contentHash,
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
      fullName: signatoryName,
      designation: signatoryDesignation,
      ...assent(),
      contentHash,
      ...(SIGNING_REQUIRES_OTP ? { otpCode } : {}),
    });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    // The panel passes back only what it was given. The hash belongs to the record the
    // caller is holding, so this component never computes one.
    const submitted = await onSign({
      fullName: signatoryName,
      designation: signatoryDesignation,
      ...(SIGNING_REQUIRES_OTP ? { otpCode } : {}),
    });
    if (!submitted) setFailed(true);
  }

  return (
    <section
      className="rounded-2xl border-2 border-primary/30 bg-white p-4 sm:p-6"
      data-testid="sign-panel"
    >
      {/* An `h2`, like the other card titles on this step, under the shell's `h1`. */}
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <PenLine className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        Sign the agreement
      </h2>

      <div className="mt-4 space-y-4">
        <SigningAs
          name={signatoryName}
          designation={signatoryDesignation}
          error={errors.fullName ?? errors.designation}
          onReviewDetails={onReviewDetails}
        />

        <div className="pt-1">
          <Check
            id="agreed"
            checked={agreed}
            onChange={setAgreed}
            error={errors.agreedToAgreement ?? errors.authorisedToBind}
            disabled={!!sentTo}
          >
            I have read and agree to this Agreement.
          </Check>
        </div>

        {errors.contentHash && (
          <p className="text-xs font-medium text-red-700" role="alert" data-testid="error-contentHash">
            {errors.contentHash}. Reload this page to fetch a fresh copy, then try again. Nothing
            you've entered is lost, and nothing has been signed.
          </p>
        )}

        {/* ── Signing, without the code ──────────────────────────────────
            The live path. One button, and the copy says plainly that pressing it signs —
            a panel that has already collected the gym's assent must not then also have a
            step that looks preparatory. */}
        {!SIGNING_REQUIRES_OTP && (
          <div className="space-y-2 pt-1">
            {failed && (
              <p
                className="text-sm font-medium text-red-700 leading-relaxed"
                role="alert"
                data-testid="sign-error"
              >
                That didn't go through, and nothing has been signed. There is more detail at the
                top of this page.
              </p>
            )}
            <Button
              type="button"
              onClick={sign}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
              data-testid="button-sign"
            >
              {isSubmitting ? "Signing..." : "Sign the agreement"}
            </Button>
            <p className="text-xs text-gray-700 leading-relaxed flex items-start gap-1.5">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              This signs the agreement. We'll email you a copy, with the fingerprint above
              printed on it, as soon as you do.
            </p>
          </div>
        )}

        {/* ── Phase 2: the emailed code ─────────────────────────────────── */}
        {SIGNING_REQUIRES_OTP &&
          (sentTo ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
            <p className="text-sm text-foreground leading-relaxed flex items-start gap-2">
              <MailCheck className="w-4 h-4 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span data-testid="otp-sent-to">
                We emailed a six-digit code to <strong>{sentTo}</strong>. Enter it to complete your
                signature.
              </span>
            </p>

            {previewOtp && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Preview mode: no email was sent. The code is <strong>{previewOtp}</strong>.
              </p>
            )}

            <div>
              <label htmlFor="otp" className="text-sm font-semibold text-foreground block mb-1">
                Six-digit code
              </label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                aria-invalid={errors.otpCode ? true : undefined}
                aria-describedby={errors.otpCode ? "error-otpCode" : undefined}
                className={`w-32 h-11 rounded-xl border bg-white px-3 text-base tracking-[0.3em] font-mono focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors ${
                  errors.otpCode ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                data-testid="input-otp"
              />
              {errors.otpCode && (
                <p id="error-otpCode" className={ERROR_TEXT} data-testid="error-otpCode">
                  {errors.otpCode}
                </p>
              )}
            </div>

            {failed && (
              <p
                className="text-sm font-medium text-red-700 leading-relaxed"
                role="alert"
                data-testid="sign-error"
              >
                That didn't go through. Check the code, or ask for a new one. There is more detail
                at the top of this page.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                type="button"
                onClick={sign}
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
                data-testid="button-sign"
              >
                {isSubmitting ? "Signing..." : "Sign the agreement"}
              </Button>
              <button
                type="button"
                onClick={requestCode}
                disabled={isSubmitting}
                className="text-xs font-semibold text-primary-ink hover:underline disabled:opacity-50 text-left min-h-11 px-1 -mx-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
              data-testid="button-request-otp"
            >
              {isSubmitting ? "Sending..." : "Email me a signing code"}
            </Button>
            <p className="text-xs text-gray-700 leading-relaxed flex items-start gap-1.5">
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              We'll email a six-digit code to your notices address. Entering it is what completes
              the signature, and this button on its own does not sign anything.
            </p>
          </div>
          ))}
      </div>
    </section>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

/** `red-600` is 4.0:1 on white and was every error in this panel. `red-700` is 6.3:1. */
const ERROR_TEXT = "text-xs font-medium text-red-700 mt-1";

function Locked({
  title,
  body,
  progress,
  testId,
}: {
  title: string;
  body: string;
  progress?: number;
  testId: string;
}) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 flex items-start gap-3"
      data-testid={testId}
    >
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        {/* This heads its own card, so it reads at the card-title level the rest of the flow
            uses — 16px bold. See the scale documented on `Panel` in `StepPartnership`. */}
        <p className="text-base font-bold text-foreground">{title}</p>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">{body}</p>
        {typeof progress === "number" && (
          <p className="text-xs font-semibold text-gray-700 mt-2 tabular-nums" data-testid="sign-locked-progress">
            {progress}% of the document scrolled so far.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Who is signing, as a statement rather than a form.
 *
 * The error branch is not dead code for a case step 1 already validates: it is what shows if
 * a record ever reaches this panel without a signatory on it, and the alternative is a
 * submit that fails with nothing on screen to explain why.
 */
function SigningAs({
  name,
  designation,
  error,
  onReviewDetails,
}: {
  name: string;
  designation: string;
  error?: string;
  onReviewDetails(): void;
}) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5"
      data-testid="signing-as"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Signing as
      </p>
      <p className="text-sm text-foreground leading-relaxed mt-1 flex items-start gap-2">
        <UserCheck className="w-4 h-4 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="font-bold" data-testid="signing-as-name">
            {name || "—"}
          </strong>
          {designation && (
            <span data-testid="signing-as-designation">, {designation}</span>
          )}
        </span>
      </p>
      <p className="text-xs text-gray-700 leading-relaxed mt-2">
        From the details you gave us in step 1, and printed in the signature block above. If either
        is wrong, email us before you sign — they are part of the document, so changing them means a
        fresh copy rather than an edit.{" "}
        <button
          type="button"
          onClick={onReviewDetails}
          className="font-semibold text-primary-ink hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="button-review-details"
        >
          See your details
        </button>
      </p>
      {error && (
        <p className={ERROR_TEXT} role="alert" data-testid="error-signing-as">
          {error}. Go back to step 1 and add it before signing.
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
      <label
        htmlFor={id}
        // `py-2.5 -my-2.5` brings the pressable row to 44px without drawing a 44px
        // checkbox, and without adding a gap around it.
        className={`flex items-start gap-2.5 py-2.5 -my-2.5 ${disabled ? "cursor-default" : "cursor-pointer"}`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `error-${id}` : undefined}
          className="w-4 h-4 mt-0.5 flex-shrink-0 accent-primary cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid={`checkbox-${id}`}
        />
        {/*
          Full contrast, body size. This sentence is the representation the signature is
          made on, and it was set in 12px muted grey — lighter and smaller than the
          marketing copy elsewhere in the flow.
        */}
        <span className="text-sm text-foreground leading-relaxed">{children}</span>
      </label>
      {error && (
        <p id={`error-${id}`} className={`${ERROR_TEXT} pl-6`} data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}
