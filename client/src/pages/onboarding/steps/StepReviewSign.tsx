"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSignature } from "lucide-react";
import { ISSUED_AGREEMENT } from "@shared/agreement/issued";
import { canIssue } from "@shared/agreement/render";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { issuedAgreementFields } from "@shared/onboarding/issuedAgreement";
import AgreementReader from "../AgreementReader";
import SignPanel from "../SignPanel";
import type { StepViewProps } from "../types";

/**
 * Step 3 — Review & sign.
 *
 * The step that carries the legal weight. It composes two things and owns neither's
 * internals: `AgreementReader`, which also reports the scroll gate, and `SignPanel`,
 * which collects the two assertions.
 *
 * **The hash comes from the server, and this component only displays it.** It used to be
 * computed here and sent up as truth, which made the signature evidence only that some
 * browser had done some arithmetic. Then it was computed here *as well* and compared, and
 * that was worse than either — see docs/gym-onboarding.md §22. The server renders and
 * hashes once, at issuance; the record it writes is what §47.2 promises the gym. Keeping
 * the document the gym reads in step with that fingerprint is the server's job, on the
 * write side, where the re-issue lives.
 *
 * **Signing is refused while the document has unresolved clauses.** `canIssue()` decides,
 * and that is not a warning to click past: an agreement with a hole in it is worse than no
 * agreement. There is no override, and the blockers themselves are never rendered — a gym
 * must not read our drafting notes about its own contract. v2.3 has no blocking markers, so
 * this path is dormant rather than dead: it is what stops the next version being issued
 * half-drafted.
 */
export default function StepReviewSign({
  state,
  readOnly,
  isSubmitting,
  goToStep,
  actions,
}: StepViewProps) {
  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  /** Whole percent of the document scrolled, so the locked sign panel can say how far. */
  const [readPercent, setReadPercent] = useState(0);

  /**
   * §4.1's Effective Date comes from the server, and this component renders nothing
   * until it has one.
   *
   * It used to come from `new Date()` at mount. That is a hash bug rather than a
   * cosmetic one: the date is rendered *into* the agreement text, so the browser's
   * clock decided what got hashed. A gym opening the reader at 23:58 IST and signing
   * four minutes later hashed a document dated the previous day; a device with a skewed
   * clock, or simply a different timezone, hashed a different document again from the
   * identical agreement. None of those could be reproduced by re-rendering server-side,
   * which is the only thing that makes a stored hash evidence rather than decoration.
   *
   * Being server-owned also fixes the quieter half of it: `state.timestamps.signedAt`
   * arriving after signing used to change `fields`, which recomputed the hash to a value
   * different from the one just signed. The date is now fixed once, before the text is
   * ever rendered, and signing does not move it.
   */
  const issued = state.agreement;
  const fields = useMemo(
    () => (issued ? issuedAgreementFields(state, issued.effectiveDate) : null),
    [state, issued],
  );

  // `{}` while the document is still being issued: `canIssue` takes partial fields, and
  // an un-issued agreement is not issuable, which is the right answer anyway.
  const issuable = canIssue(ISSUED_AGREEMENT, fields ?? {}).ok;

  useEffect(() => {
    // Fire-and-forget audit write; it must never gate the reader from rendering.
    void actions.markAgreementViewed();
    // Intentionally once per mount. The server call is idempotent, and `actions` is
    // rebuilt on every render, so depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onReachedEnd = useCallback(() => setHasReadToEnd(true), []);
  // Stable, because the reader calls it from an effect keyed on its own progress.
  const onProgress = useCallback((percent: number) => setReadPercent(percent), []);

  // After every hook, so the hook order is identical on both paths. The normal route
  // here never sees this: step 2's acknowledgement issues the document, so it is
  // already in state by the time step 3 first paints. It shows for the single frame of
  // a resume that lands directly on step 3, where `markAgreementViewed` above is what
  // issues it.
  if (!fields || !issued) return <PreparingNotice />;

  // The record's own hash, echoed back. It names the document being signed; the server
  // compares it to what it pinned, so a payload assembled against a different record is
  // refused. It is not this browser's independent word for the text.
  const contentHash = issued.contentHash;
  const handleSign = (input: {
    fullName: string;
    designation: string;
    otpCode?: string;
  }): Promise<boolean> =>
    actions.signAgreement({
      ...input,
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash,
    });

  return (
    <div className="space-y-6">
      <AgreementReader
        agreement={ISSUED_AGREEMENT}
        fields={fields}
        onReachedEnd={onReachedEnd}
        onProgress={onProgress}
      />

      <HashLine contentHash={contentHash} />

      {readOnly ? (
        <SignedSummary
          signedAt={state.timestamps.signedAt}
          signatoryName={state.details.signatoryName}
          version={issued.version}
        />
      ) : (
        <SignPanel
          signatoryName={state.details.signatoryName}
          signatoryDesignation={state.details.signatoryDesignation}
          contentHash={contentHash}
          hasReadToEnd={hasReadToEnd}
          readPercent={readPercent}
          blockedReason={
            issuable
              ? null
              : "There are unresolved items in the document we need to close before you sign it. We're on it, and we'll email you as soon as your copy is ready, and nothing you've entered is lost."
          }
          isSubmitting={isSubmitting}
          onReviewDetails={() => goToStep(1)}
          onRequestOtp={actions.requestSigningOtp}
          onSign={handleSign}
        />
      )}
    </div>
  );
}

// ── Small pieces ────────────────────────────────────────────────────────────

/**
 * Shown while the server is still issuing the document.
 *
 * Deliberately not a spinner over a rendered agreement: without the server's effective
 * date there is no document to render, and showing the text with a guessed date — even
 * for one frame — is how a gym ends up reading a version of the agreement that differs
 * from the one it signs.
 */
function PreparingNotice() {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-6 text-center"
      role="status"
      data-testid="agreement-preparing"
    >
      <h2 className="text-base font-bold text-foreground">Preparing your copy</h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        One moment. We're issuing your agreement. Nothing you've entered is lost.
      </p>
    </section>
  );
}

/**
 * The fingerprint, on screen.
 *
 * Shown rather than kept internal because it is the gym's evidence too: §47.2 promises it,
 * and the same value appears in the emailed PDF, so a document altered afterwards can be
 * detected by anyone who kept the email.
 *
 * The value is the server's, and it exists from the first paint, so there is no pending
 * state to render around it.
 */
function HashLine({ contentHash }: { contentHash: string }) {
  return (
    <p className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
      <FileSignature className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Document fingerprint (SHA-256), stored with your signature and printed on your copy:{" "}
        <code className="break-all font-mono text-foreground" data-testid="content-hash">
          {contentHash}
        </code>
      </span>
    </p>
  );
}

/** Step 3 revisited after signing. The panel is gone; the record replaces it. */
function SignedSummary({
  signedAt,
  signatoryName,
  version,
}: {
  signedAt: string | null;
  signatoryName: string;
  version: string;
}) {
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3"
      data-testid="already-signed"
    >
      <CheckCircle2 className="w-5 h-5 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-base font-bold text-foreground">Signed</h2>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Version {version}
          {signedAt ? `, signed on ${formatAgreementDate(signedAt)}` : ""}
          {signatoryName ? ` by ${signatoryName}` : ""}. This copy is read-only. Email us if
          anything in it needs to change and we'll issue an amendment rather than edit a signed
          document.
        </p>
      </div>
    </section>
  );
}
