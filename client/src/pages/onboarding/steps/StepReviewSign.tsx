"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSignature } from "lucide-react";
import { IS_MOCK_ONBOARDING, PREVIEW_OTP } from "@/lib/onboardingApi";
import { ISSUED_AGREEMENT, ISSUED_PLAIN_LANGUAGE } from "@shared/agreement/issued";
import { canIssue, collectBlockers } from "@shared/agreement/render";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import {
  checkIssuedAgreement,
  issuedAgreementFields,
  type IssuedAgreementCheck,
} from "@shared/onboarding/issuedAgreement";
import type { Blocker } from "@shared/agreement/types";
import AgreementReader, { sectionAnchor } from "../AgreementReader";
import SignPanel from "../SignPanel";
import type { StepViewProps } from "../types";

/**
 * The version this flow issues, and its matching summary panel — both from
 * `@shared/agreement/issued`, which is the one place that decides.
 *
 * This file used to name `AGREEMENT_V2_2` directly, and the record written at signing
 * named "2.1" independently. Reading both from one module is what makes that particular
 * disagreement unrepresentable. The test file asserts every `section` in the panel
 * resolves to a real section of this agreement.
 */
const AGREEMENT = ISSUED_AGREEMENT;
const PLAIN_LANGUAGE = ISSUED_PLAIN_LANGUAGE;

/**
 * Step 3 — Review & sign.
 *
 * The step that carries the legal weight, and the one deliberately over-engineered.
 * It composes four things and owns none of their internals:
 *
 *   - the plain-language panel — `PLAIN_LANGUAGE`, one line per clause
 *   - the reader             — `AgreementReader`, which also reports the scroll gate
 *   - the hash check         — this client's own rendering, compared to the server's
 *   - the sign panel         — `SignPanel`, two assertions
 *
 * **The hash comes from the server now, and this component checks it.** It used to be
 * computed here and sent up as truth, which made the signature evidence only that some
 * browser had done some arithmetic — the server could not verify a signature against a
 * number it never computed, and a tab running yesterday's JavaScript would have signed a
 * different document from the one on the record. The server renders and hashes at
 * issuance; this component renders the same text, compares, and refuses to open the sign
 * panel if the two disagree. A mismatch in development is a disabled button; a mismatch
 * in production means the record moved under a gym mid-read and it is told to reload. See
 * docs/gym-onboarding.md §12 and `@shared/onboarding/issuedAgreement`.
 *
 * **Signing is refused in production while the document has unresolved clauses.**
 * `canIssue()` decides, and that is not a warning to click past: an agreement with a
 * hole in it is worse than no agreement. Preview builds override the refusal —
 * otherwise the flow could not be walked at all — and say so on screen. v2.2 clears
 * all of v2.1's blocking markers, so this path is currently dormant rather than dead:
 * it is what stops a future v2_3 being issued half-drafted.
 */
export default function StepReviewSign({ state, readOnly, isSubmitting, actions }: StepViewProps) {
  /** Null until this client has rendered the text and hashed it for itself. */
  const [check, setCheck] = useState<IssuedAgreementCheck | null>(null);
  const [hasReadToEnd, setHasReadToEnd] = useState(false);

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
  const issuable = canIssue(AGREEMENT, fields ?? {});
  const blockers = collectBlockers(AGREEMENT).filter((b) => b.severity === "blocks-send");

  useEffect(() => {
    // Fire-and-forget audit write; it must never gate the reader from rendering.
    void actions.markAgreementViewed();
    // Intentionally once per mount. The server call is idempotent, and `actions` is
    // rebuilt on every render, so depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!issued) return;
    let cancelled = false;
    // Renders the document with the same version module, options and field bridge the
    // server used, and compares. This is the only check that catches a drifted *field
    // bridge* — the golden vector pins `AgreementFields` directly, so it cannot see a
    // `formatInr` or a notices-address change that moves the text built from state.
    void checkIssuedAgreement(state, issued).then((result) => {
      if (cancelled) return;
      setCheck(result);
      if (!result.ok) {
        // Logged, never rendered: the detail is about our code, and a gym reading
        // "rendered hash abc…, the record pins def…" learns nothing it can act on.
        console.error("[onboarding] issued agreement mismatch:", result.problems.join("; "));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state, issued]);

  const onReachedEnd = useCallback(() => setHasReadToEnd(true), []);

  // After every hook, so the hook order is identical on both paths. The normal route
  // here never sees this: step 2's acknowledgement issues the document, so it is
  // already in state by the time step 3 first paints. It shows for the single frame of
  // a resume that lands directly on step 3, where `markAgreementViewed` above is what
  // issues it.
  if (!fields || !issued) return <PreparingNotice />;

  async function handleSign(input: {
    fullName: string;
    designation: string;
    otpCode?: string;
  }): Promise<boolean> {
    // Unreachable from the UI — the panel is not rendered until the check passes — and
    // checked anyway, because "the button was disabled" is not a guarantee about what
    // gets submitted.
    if (!check?.ok) return false;
    return actions.signAgreement({
      ...input,
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: check.contentHash,
    });
  }

  return (
    <div className="space-y-5">
      <InShort />

      {/*
        Internal blocker list, shown only in preview. In production this must stay
        hidden and the gym sees the "isn't ready to sign" panel instead, with the
        detail going to an internal alert — a gym must never read our drafting notes
        about its own contract.
      */}
      {IS_MOCK_ONBOARDING && !issuable.ok && <NotReadyNotice blockers={blockers} />}

      <AgreementReader
        agreement={AGREEMENT}
        fields={fields}
        showInternalMarkers={IS_MOCK_ONBOARDING}
        onReachedEnd={onReachedEnd}
      />

      <HashLine contentHash={issued.contentHash} verified={check?.ok ?? null} />

      {readOnly ? (
        <SignedSummary
          signedAt={state.timestamps.signedAt}
          signatoryName={state.details.signatoryName}
          version={issued.version}
        />
      ) : (
        <SignPanel
          legalEntityName={state.details.legalEntityName}
          defaultName={state.details.signatoryName}
          defaultDesignation={state.details.signatoryDesignation}
          contentHash={check?.ok ? check.contentHash : null}
          hasReadToEnd={hasReadToEnd}
          /*
            Two reasons the panel can be shut, and the mismatch outranks the drafting
            one — a document whose bytes we cannot account for is not something to let a
            preview build click past, which is exactly what `IS_MOCK_ONBOARDING`
            deliberately does for unresolved clauses.
          */
          blockedReason={
            check && !check.ok
              ? "We can't confirm this is the current version of your agreement. Reload this page to fetch a fresh copy — nothing you've entered is lost, and nothing has been signed."
              : issuable.ok || IS_MOCK_ONBOARDING
                ? null
                : "There are unresolved items in the document we need to close before you sign it. We're on it — we'll email you as soon as your copy is ready, and nothing you've entered is lost."
          }
          previewOtp={IS_MOCK_ONBOARDING ? PREVIEW_OTP : null}
          isSubmitting={isSubmitting}
          onRequestOtp={actions.requestSigningOtp}
          onSign={handleSign}
        />
      )}
    </div>
  );
}

// ── The plain-language panel ────────────────────────────────────────────────

/**
 * The clauses that decide how this works, one line each, above the contract.
 *
 * Above, because a summary underneath forty-seven sections is a summary nobody reads.
 * Each row links to the section it comes from, which is what keeps it a summary rather
 * than a substitute: anyone can check it in one tap, including a lawyer looking for
 * the sentence we glossed.
 *
 * The count comes from the list rather than being written into the sentence. It said
 * "eight" while the list held eight, which is exactly the kind of copy that goes stale
 * silently — and a summary that miscounts itself is a summary a gym can point at.
 */
function InShort() {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="in-short"
    >
      <p className="text-sm font-bold text-foreground">In short</p>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1 mb-4">
        The {PLAIN_LANGUAGE.length} clauses that decide how this works in practice, in plain words.
        This is a summary and the agreement below is what binds — tap a clause number to read the
        real thing.
      </p>
      <ul className="space-y-3">
        {PLAIN_LANGUAGE.map((item) => (
          <li key={item.clause} className="flex items-start gap-3">
            <a
              href={`#${sectionAnchor(item.section)}`}
              className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 mt-0.5 flex-shrink-0 tabular-nums transition-colors"
              data-testid={`in-short-link-${item.clause}`}
            >
              §{item.clause}
            </a>
            <span className="text-xs text-foreground leading-relaxed">{item.short}</span>
          </li>
        ))}
      </ul>
    </section>
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
      data-testid="agreement-preparing"
    >
      <p className="text-sm font-bold text-foreground">Preparing your copy</p>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
        One moment — we're issuing your agreement. Nothing you've entered is lost.
      </p>
    </section>
  );
}

/**
 * The fingerprint, on screen.
 *
 * Shown rather than kept internal because it is the gym's evidence too: the same value
 * appears in the emailed PDF, so a document that has been altered afterwards can be
 * detected by anyone who kept the email.
 *
 * The value rendered is the server's — it exists from the first paint, so there is no
 * "computing..." state any more. What is still pending is the *check*, and that gets its
 * own line rather than being folded into the hash: a fingerprint shown with no indication
 * that this browser reproduced it is the fingerprint of a document nobody verified, which
 * is worse than not showing one, because it looks like a verification.
 */
function HashLine({
  contentHash,
  verified,
}: {
  contentHash: string;
  /** Null while this client is still rendering and hashing the document itself. */
  verified: boolean | null;
}) {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
      <FileSignature className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>
        Document fingerprint (SHA-256), stored with your signature and printed on your copy:{" "}
        <code className="break-all font-mono text-foreground" data-testid="content-hash">
          {contentHash}
        </code>
        {verified === true && (
          <span className="text-foreground" data-testid="hash-verified">
            {" "}
            — this page matches it.
          </span>
        )}
        {verified === null && <span data-testid="hash-checking"> — checking this page…</span>}
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
      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Signed</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          Version {version}
          {signedAt ? `, signed on ${formatAgreementDate(signedAt)}` : ""}
          {signatoryName ? ` by ${signatoryName}` : ""}. This copy is read-only — email us if
          anything in it needs to change and we'll issue an amendment rather than edit a signed
          document.
        </p>
      </div>
    </section>
  );
}

/**
 * The internal blocker list.
 *
 * Visible only while the wizard runs in preview, because the whole point of the `todo`
 * markers is that somebody sees them. In production the gym gets the "isn't ready to
 * sign" panel and this detail goes to an internal alert instead.
 */
function NotReadyNotice({ blockers }: { blockers: Blocker[] }) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
      data-testid="agreement-not-issuable"
    >
      <p className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        This agreement can't be issued yet
      </p>
      <p className="text-xs text-amber-800 leading-relaxed mb-3">
        {blockers.length} unresolved item{blockers.length === 1 ? "" : "s"} in the source document.
        Internal view — a gym must never see this list. Signing is enabled here only because this is
        a preview build.
      </p>
      <ul className="space-y-1.5">
        {blockers.map((blocker) => (
          <li key={blocker.id} className="text-[11px] text-amber-800 leading-relaxed">
            <a
              href={`#${sectionAnchor(blocker.location)}`}
              className="font-bold underline decoration-amber-400"
            >
              {blocker.location}
            </a>{" "}
            — {blocker.problem}
          </li>
        ))}
      </ul>
    </div>
  );
}
