"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSignature } from "lucide-react";
import { IS_MOCK_ONBOARDING, PREVIEW_OTP } from "@/lib/onboardingApi";
import { AGREEMENT_V2_2 } from "@shared/agreement/v2_2";
import { PLAIN_LANGUAGE_V2_2 } from "@shared/agreement/plainLanguage";
import { canIssue, collectBlockers, renderPlainText, sha256Hex } from "@shared/agreement/render";
import { toAgreementFields, formatAgreementDate } from "@shared/onboarding/agreementFields";
import type { Blocker } from "@shared/agreement/types";
import AgreementReader, {
  AGREEMENT_RENDER_OPTIONS,
  sectionAnchor,
} from "../AgreementReader";
import SignPanel from "../SignPanel";
import type { StepViewProps } from "../types";

/**
 * The version this flow issues, and its matching summary panel.
 *
 * Aliased once at the top of the file so that switching version is a two-line change
 * and cannot half-happen. The pairing matters more than either constant: rendering
 * v2.2 above a panel written for v2.1 would put a summary on screen that describes
 * clauses the reader below does not contain, which is precisely the failure the panel
 * exists to avoid. The test file asserts every `section` in the panel resolves to a
 * real section of this agreement.
 */
const AGREEMENT = AGREEMENT_V2_2;
const PLAIN_LANGUAGE = PLAIN_LANGUAGE_V2_2;

/**
 * Step 3 — Review & sign.
 *
 * The step that carries the legal weight, and the one deliberately over-engineered.
 * It composes four things and owns none of their internals:
 *
 *   - the plain-language panel — `PLAIN_LANGUAGE`, one line per clause
 *   - the reader             — `AgreementReader`, which also reports the scroll gate
 *   - the content hash       — SHA-256 of the same rendered text, computed in the browser
 *   - the sign panel         — `SignPanel`, two assertions plus an emailed code
 *
 * The hash is the load-bearing part of the whole design. It is computed here from
 * `renderPlainText` with the same options the reader renders with, so the stored
 * signature is evidence of *this* text and a later edit to the version module cannot
 * retroactively change what was signed. See docs/gym-onboarding.md §12.
 *
 * **Signing is refused in production while the document has unresolved clauses.**
 * `canIssue()` decides, and that is not a warning to click past: an agreement with a
 * hole in it is worse than no agreement. Preview builds override the refusal —
 * otherwise the flow could not be walked at all — and say so on screen. v2.2 clears
 * all of v2.1's blocking markers, so this path is currently dormant rather than dead:
 * it is what stops a future v2_3 being issued half-drafted.
 */
export default function StepReviewSign({ state, readOnly, isSubmitting, actions }: StepViewProps) {
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [hasReadToEnd, setHasReadToEnd] = useState(false);

  /**
   * Fixed at mount rather than read on every render, so the rendered text — and
   * therefore the hash — cannot change underneath a gym that is part-way through
   * signing. Once signed, the server's timestamp governs.
   */
  const [openedAt] = useState(() => new Date().toISOString());
  const fields = useMemo(
    () => toAgreementFields(state, state.timestamps.signedAt ?? openedAt),
    [state, openedAt],
  );

  const issuable = canIssue(AGREEMENT, fields);
  const blockers = collectBlockers(AGREEMENT).filter((b) => b.severity === "blocks-send");

  useEffect(() => {
    // Fire-and-forget audit write; it must never gate the reader from rendering.
    void actions.markAgreementViewed();
    // Intentionally once per mount. The server call is idempotent, and `actions` is
    // rebuilt on every render, so depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Hashed from the same renderer and the same options the reader uses, so the
    // document on screen and the document on the record cannot disagree.
    void sha256Hex(renderPlainText(AGREEMENT, fields, AGREEMENT_RENDER_OPTIONS)).then(
      (hash) => {
        if (!cancelled) setContentHash(hash);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fields]);

  const onReachedEnd = useCallback(() => setHasReadToEnd(true), []);

  async function handleSign(input: {
    fullName: string;
    designation: string;
    otpCode: string;
  }): Promise<boolean> {
    if (!contentHash) return false;
    return actions.signAgreement({
      ...input,
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash,
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

      <HashLine contentHash={contentHash} />

      {readOnly ? (
        <SignedSummary
          signedAt={state.timestamps.signedAt}
          signatoryName={state.details.signatoryName}
          version={state.agreement?.version ?? AGREEMENT.version}
        />
      ) : (
        <SignPanel
          legalEntityName={state.details.legalEntityName}
          defaultName={state.details.signatoryName}
          defaultDesignation={state.details.signatoryDesignation}
          contentHash={contentHash}
          hasReadToEnd={hasReadToEnd}
          blockedReason={
            issuable.ok || IS_MOCK_ONBOARDING
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
 * The fingerprint, on screen.
 *
 * Shown rather than kept internal because it is the gym's evidence too: the same value
 * appears in the emailed PDF, so a document that has been altered afterwards can be
 * detected by anyone who kept the email.
 */
function HashLine({ contentHash }: { contentHash: string | null }) {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
      <FileSignature className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>
        Document fingerprint (SHA-256), stored with your signature and printed on your copy:{" "}
        {contentHash ? (
          <code className="break-all font-mono text-foreground" data-testid="content-hash">
            {contentHash}
          </code>
        ) : (
          "computing..."
        )}
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
