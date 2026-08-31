"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSignature,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { IS_MOCK_FRANCHISE_ONBOARDING } from "@/lib/franchiseOnboardingApi";
import { rememberSigningAttempt, takeReturnedFromEsign } from "@/lib/esignReturn";
import { ISSUED_TERM_SHEET, canIssueTermSheet } from "@shared/franchise/termsheet/issued";
import type { Blocker } from "@shared/agreement/types";
import type { EsignSignType } from "@shared/franchise/onboarding/types";
import { sectionAnchor } from "../../../onboarding/AgreementReader";
import { formatIstDate, formatIstDateTime } from "../../../gym/istDates";
import TermSheetReader from "../TermSheetReader";
import { useBackgroundPoll } from "../useBackgroundPoll";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 7 — Review and sign.
 *
 * The gym flow's step 3 with the signature taken out of our hands. Everything about the hash
 * discipline carries over — the server renders, hashes and pins; this component displays that
 * fingerprint and echoes it back so a term sheet re-priced between the reader loading and the
 * button being pressed is refused (§6.1). What changes is that the signature is affixed by Digio
 * in the signatory's own identity, so this screen ends at a handoff rather than at a form.
 *
 * **There are no "I agree" checkboxes, deliberately.** The gym panel collects two assertions
 * because the server stores them against the signature. Here nothing on the API accepts them:
 * `requestEsign` takes a sign type and the pinned hash, and the assertion that carries weight is
 * the one the signatory makes to Digio against their Aadhaar. A tickbox whose value is never
 * recorded anywhere is theatre on the one screen that must not have any. What this screen does
 * instead is gate on having reached the end of the document, and name exactly who is about to be
 * asked to sign.
 *
 * **The signing URL is used once and never stored.** It authorises an eSign in a named person's
 * identity, so unlike a deposit link it is not forwardable and this screen never offers it as a
 * link to copy. Coming back to an unsigned term sheet asks the server again: `requestEsign` is
 * idempotent in the document and returns a fresh URL for the same Digio request (§6.4).
 *
 * **Nothing here can mark the term sheet signed.** The waiting state polls our own record, which
 * only the webhook writes. That covers the paths a redirect handler would miss: a franchisee who
 * signs and closes the tab, or signs on a phone while this tab sits open on a laptop.
 *
 * Two sign types are offered, not three. `electronic` exists in the provider seam because Digio
 * has it, and it is weaker evidence than either of these for a document that binds a ₹25 lakh
 * commitment; a franchisee who cannot use Aadhaar or a DSC is a conversation, not a third radio
 * button.
 */

/**
 * Two cadences, for the gym deposit flow's reason: straight back from a signing session somebody
 * is watching the screen and the webhook is seconds away, while an open tab nobody is reading can
 * be checked at a walk. Running out of `CONFIRM` moves to `WATCH` rather than stopping.
 */
const CONFIRM = { intervalMs: 1500, maxPolls: 20 };
const WATCH = { intervalMs: 5000, maxPolls: 60 };

type PollPhase = "confirm" | "watch" | "stopped";

const SIGN_TYPES: { value: EsignSignType; label: string; description: string }[] = [
  {
    value: "aadhaar",
    label: "Aadhaar eSign",
    description: "An OTP to the mobile registered with Aadhaar. Nothing to install.",
  },
  {
    value: "dsc",
    label: "Digital Signature Certificate",
    description: "If your signatory already signs with a DSC token.",
  },
];

const SIGN_TYPE_LABELS: Record<EsignSignType, string> = {
  aadhaar: "Aadhaar eSign",
  electronic: "Electronic signature",
  dsc: "Digital Signature Certificate",
};

export default function StepReviewSign({
  state,
  isSubmitting,
  goToStep,
  actions,
}: FranchiseStepViewProps) {
  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  const [readPercent, setReadPercent] = useState(0);
  const [signType, setSignType] = useState<EsignSignType>("aadhaar");
  const [handoffProblem, setHandoffProblem] = useState<string | null>(null);
  const [cameBack, setCameBack] = useState(false);
  /**
   * Null until the mount effect has read whether a signing session sent this tab back, because
   * that answer picks the cadence and no read is worth making at the wrong one.
   */
  const [phase, setPhase] = useState<PollPhase | null>(null);

  const issued = state.termSheet;
  const esign = state.esign;
  const awaitingSignature = esign.status === "requested" && !state.isSigned;

  useEffect(() => {
    // Idempotent on the server, and it is what pins the document, so it runs before there is
    // anything to render. Once per mount: `actions` is rebuilt on every render.
    void actions.markTermSheetViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const returned = takeReturnedFromEsign();
    setCameBack(returned);
    setPhase(returned ? "confirm" : "watch");
  }, []);

  const onExhausted = useCallback(
    () => setPhase((p) => (p === "confirm" ? "watch" : "stopped")),
    [],
  );

  useBackgroundPoll(
    awaitingSignature && (phase === "confirm" || phase === "watch"),
    actions.refreshEsignStatus,
    { ...(phase === "confirm" ? CONFIRM : WATCH), onExhausted },
  );

  const onReachedEnd = useCallback(() => setHasReadToEnd(true), []);
  const onProgress = useCallback((percent: number) => setReadPercent(percent), []);

  // After every hook, so the hook order is the same on both paths. Normally invisible: the
  // mount effect above pins the document, and until it answers there is no effective date and
  // therefore nothing to render. Rendering the text against a guessed date, even for a frame,
  // is how somebody reads a version of the document they did not sign.
  if (!issued) return <PreparingNotice />;

  const issuable = canIssueTermSheet(state, issued.effectiveDate);
  const blockers = issuable.ok ? [] : issuable.blockers;

  async function goToSigning() {
    setHandoffProblem(null);
    const handoff = await actions.requestEsign(signType);
    if (!handoff) {
      setHandoffProblem(
        "We couldn't open the signing session. Nothing has been signed. Reload this page and try again, and tell us if it happens twice.",
      );
      return;
    }
    rememberSigningAttempt(window.location.pathname);
    if (IS_MOCK_FRANCHISE_ONBOARDING) {
      // No Digio to leave for, so the round trip happens here: preview lands directly in the
      // state the tab really comes back in, and the mock's own poll confirms the signature.
      setCameBack(true);
      return;
    }
    // `https://` because this value is handed straight to a navigation from a page mid-flow,
    // where another scheme would be script execution.
    if (!handoff.signingUrl.startsWith("https://")) {
      setHandoffProblem(
        "The signing session came back in a form we won't open. Nothing has been signed, and we've got enough to look into it.",
      );
      return;
    }
    window.location.assign(handoff.signingUrl);
  }

  return (
    <div className="space-y-6">
      {IS_MOCK_FRANCHISE_ONBOARDING && blockers.length > 0 && (
        <NotReadyNotice blockers={blockers} />
      )}

      <ValidityLine effectiveDate={issued.effectiveDate} validUntil={issued.validUntil} />

      <TermSheetReader
        state={state}
        effectiveDate={issued.effectiveDate}
        showInternalMarkers={IS_MOCK_FRANCHISE_ONBOARDING}
        onReachedEnd={onReachedEnd}
        onProgress={onProgress}
      />

      <HashLine contentHash={issued.contentHash} />

      {state.isSigned && esign.executed ? (
        <SignedSummary
          signedAt={esign.executed.signedAt}
          signerName={esign.executed.signerName}
          signType={esign.executed.signType}
          auditTrailStored={esign.executed.auditTrailStored}
          version={issued.version}
        />
      ) : awaitingSignature ? (
        <WaitingPanel
          expiresAt={esign.request?.expiresAt ?? null}
          signType={esign.request?.signType ?? signType}
          confirming={cameBack && phase === "confirm"}
          watching={phase !== "stopped"}
          isSubmitting={isSubmitting}
          problem={handoffProblem}
          onResume={() => void goToSigning()}
        />
      ) : (
        <SignPanel
          signatoryName={state.details.signatoryName}
          signatoryDesignation={state.details.signatoryDesignation}
          aadhaarLast4={state.details.signatoryAadhaarLast4}
          legalEntityName={state.details.legalEntityName}
          signType={signType}
          onSignTypeChange={setSignType}
          hasReadToEnd={hasReadToEnd}
          readPercent={readPercent}
          previousAttempt={esign.status === "expired" || esign.status === "declined" ? esign.status : null}
          blockedReason={
            blockers.length === 0 || IS_MOCK_FRANCHISE_ONBOARDING
              ? null
              : "There are unresolved items in this document that we have to close before anyone signs it. We're on it, we'll email you the moment your copy is ready, and nothing you've given us is lost."
          }
          problem={handoffProblem}
          isSubmitting={isSubmitting}
          onCheckSignatory={() => goToStep(1)}
          onSign={() => void goToSigning()}
        />
      )}
    </div>
  );
}

/** Shown while the server is still pinning the document. See the guard above. */
function PreparingNotice() {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-6 text-center"
      role="status"
      data-testid="termsheet-preparing"
    >
      <h2 className="text-base font-bold text-foreground">Preparing your term sheet</h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        One moment. We're issuing your copy. Nothing you've given us is lost.
      </p>
    </section>
  );
}

/**
 * How long the offer stands.
 *
 * Above the document rather than below it: it is the one fact about the term sheet that is not
 * in the term sheet's own words, and somebody deciding whether to send it to a lawyer first
 * needs it before they start reading rather than after.
 */
function ValidityLine({ effectiveDate, validUntil }: { effectiveDate: string; validUntil: string }) {
  return (
    <p
      className="text-xs text-gray-700 leading-relaxed flex items-start gap-2"
      data-testid="termsheet-validity"
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Dated {formatIstDate(effectiveDate)}. This term sheet is open until{" "}
        <strong>{formatIstDate(validUntil)}</strong>. After that it lapses and we would issue a
        fresh one, which may not be on these terms if the territory has moved on.
      </span>
    </p>
  );
}

/**
 * The fingerprint, on screen.
 *
 * The franchisee's evidence as much as ours, and the reason it is worth showing: the same value
 * goes on the PDF Digio signs, so a document altered afterwards can be caught by anyone who kept
 * the email. `pdfHash` is deliberately not shown — it is ours for verifying the file we handed
 * over, and a second hash on screen invites the question of which one to check.
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

function SignPanel({
  signatoryName,
  signatoryDesignation,
  aadhaarLast4,
  legalEntityName,
  signType,
  onSignTypeChange,
  hasReadToEnd,
  readPercent,
  previousAttempt,
  blockedReason,
  problem,
  isSubmitting,
  onCheckSignatory,
  onSign,
}: {
  signatoryName: string;
  signatoryDesignation: string;
  aadhaarLast4: string;
  legalEntityName: string;
  signType: EsignSignType;
  onSignTypeChange(value: EsignSignType): void;
  hasReadToEnd: boolean;
  readPercent: number;
  previousAttempt: "expired" | "declined" | null;
  blockedReason: string | null;
  problem: string | null;
  isSubmitting: boolean;
  onCheckSignatory(): void;
  onSign(): void;
}) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 space-y-5"
      data-testid="sign-panel"
    >
      <div>
        <h2 className="text-base font-display font-bold text-foreground">Sign the term sheet</h2>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Signing happens at Digio, not here. We hand them this document and they take the
          signature in your signatory's own identity, which is what makes it evidence.
        </p>
      </div>

      {previousAttempt && <PreviousAttemptNote attempt={previousAttempt} />}

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3" data-testid="signatory-summary">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
          Who will be asked to sign
        </p>
        <p className="text-sm font-semibold text-foreground">
          {signatoryName || "Nobody named yet"}
          {signatoryDesignation ? `, ${signatoryDesignation}` : ""}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          For {legalEntityName}
          {aadhaarLast4 ? `, against the Aadhaar ending ${aadhaarLast4}` : ""}. Digio will ask this
          person and nobody else, so it has to be the person with authority to bind the entity.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onCheckSignatory}
          className="min-h-11 rounded-xl text-xs font-semibold mt-3 cursor-pointer"
          data-testid="button-check-signatory"
        >
          Not the right person? Change it
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground mb-1">How they'll sign</legend>
        {SIGN_TYPES.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer ${
              signType === option.value
                ? "border-primary/40 bg-primary/5"
                : "border-gray-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="franchise-sign-type"
              value={option.value}
              checked={signType === option.value}
              onChange={() => onSignTypeChange(option.value)}
              className="w-4 h-4 mt-0.5 flex-shrink-0 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid={`radio-sign-${option.value}`}
            />
            <span className="min-w-0">
              <span className="text-sm font-semibold text-foreground block">{option.label}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {blockedReason ? (
        <p
          className="text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
          data-testid="sign-blocked"
        >
          {blockedReason}
        </p>
      ) : (
        <>
          {!hasReadToEnd && (
            <p className="text-xs text-muted-foreground leading-relaxed" data-testid="read-gate">
              You've read {readPercent}% of the term sheet. Scroll to the end before signing. It is
              not long, and it is the whole of what you are agreeing to.
            </p>
          )}
          {problem && (
            <p className="text-sm text-red-700 font-medium leading-relaxed" role="alert" data-testid="sign-problem">
              {problem}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
              This tab goes to Digio and comes back here on its own.
            </p>
            <Button
              type="button"
              disabled={!hasReadToEnd || isSubmitting}
              onClick={onSign}
              className="min-h-11 px-6 rounded-xl font-bold text-sm cursor-pointer flex-shrink-0"
              data-testid="button-sign"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="ml-1.5">Opening Digio...</span>
                </>
              ) : (
                <>
                  Sign with {SIGN_TYPE_LABELS[signType]}
                  <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * A signing session that ended without a signature.
 *
 * Named rather than silently offering the button again, because the two cases have different
 * fixes: an expiry needs nothing but another attempt, and a declined signature at Digio usually
 * means the signatory was not who we said it was.
 */
function PreviousAttemptNote({ attempt }: { attempt: "expired" | "declined" }) {
  return (
    <p
      className="text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
      data-testid={`esign-${attempt}`}
    >
      {attempt === "expired"
        ? "Your last signing session expired before it was completed. Nothing was signed and nothing is lost. Start it again below."
        : "The last signing attempt was declined at Digio. If that was a mistake, start it again below. If the details it showed weren't right, fix them first and talk to us."}
    </p>
  );
}

/**
 * Sent to Digio, and waiting.
 *
 * Polled rather than left as an end state, for the deposit screen's reason: the wizard moves when
 * our record moves, and only the webhook writes a signature, so a franchisee who has signed and
 * come back to a static page has no button that could help them.
 *
 * The resume button asks the server for a new session rather than reopening a URL we kept, and
 * says nothing about forwarding a link, because there is no forwardable link here by design.
 */
function WaitingPanel({
  expiresAt,
  signType,
  confirming,
  watching,
  isSubmitting,
  problem,
  onResume,
}: {
  expiresAt: string | null;
  signType: EsignSignType;
  confirming: boolean;
  watching: boolean;
  isSubmitting: boolean;
  problem: string | null;
  onResume(): void;
}) {
  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6 space-y-4"
      data-testid="esign-waiting"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-display font-bold text-amber-900">
            {confirming ? "Checking for your signature" : "Waiting for your signature"}
          </h2>
          <p className="text-sm text-amber-900 leading-relaxed mt-1" role="status">
            {confirming
              ? "We're asking our own record whether the signature has landed. It usually takes a few seconds."
              : `The ${SIGN_TYPE_LABELS[signType]} session is open. This page moves on by itself the moment the signature reaches us, and you don't have to keep it open.`}
          </p>
        </div>
      </div>

      {expiresAt && (
        <p className="text-xs text-amber-900 leading-relaxed">
          The session is open until {formatIstDateTime(expiresAt)}.
        </p>
      )}

      {!watching && (
        <p className="text-xs text-amber-900 leading-relaxed" data-testid="esign-poll-stopped">
          We've stopped checking on this page to save your battery. Reload it to check again, or
          just leave it: we'll email you when the signature lands.
        </p>
      )}

      {problem && (
        <p className="text-sm text-red-700 font-medium leading-relaxed" role="alert">
          {problem}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onResume}
          className="min-h-11 rounded-xl font-semibold text-sm bg-white cursor-pointer sm:self-start"
          data-testid="button-resume-signing"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="ml-1.5">Opening Digio...</span>
            </>
          ) : (
            <>
              Open the signing page again
              <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="text-xs text-amber-900 leading-relaxed">
          It reopens the same request rather than starting a second one. The page is personal to
          your signatory and expires, so it is not something to forward.
        </p>
      </div>
    </section>
  );
}

/** Step 7 revisited after signing. The panel is gone; the record replaces it. */
function SignedSummary({
  signedAt,
  signerName,
  signType,
  auditTrailStored,
  version,
}: {
  signedAt: string;
  signerName: string;
  signType: EsignSignType;
  auditTrailStored: boolean;
  version: string;
}) {
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3"
      data-testid="termsheet-signed"
    >
      <CheckCircle2 className="w-5 h-5 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-base font-bold text-foreground">Signed</h2>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Version {version}, signed on {formatIstDateTime(signedAt)} by {signerName} using{" "}
          {SIGN_TYPE_LABELS[signType]}. This copy is read-only. Email us if anything in it needs to
          change and we'll issue an amendment rather than edit a signed document.
        </p>
        {auditTrailStored && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            Digio's audit trail for the signature is stored with the signed document.
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * The internal blocker list.
 *
 * Preview only, because the whole point of a `todo` marker is that somebody sees it. In
 * production a franchisee gets the "can't be signed yet" panel and this detail belongs in an
 * internal alert. A franchisee must never read our drafting notes about their own term sheet.
 */
function NotReadyNotice({ blockers }: { blockers: Blocker[] }) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
      data-testid="termsheet-not-issuable"
    >
      <p className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        This term sheet can't be issued yet
      </p>
      <p className="text-xs text-amber-800 leading-relaxed mb-3">
        {blockers.length} unresolved item{blockers.length === 1 ? "" : "s"} in{" "}
        {ISSUED_TERM_SHEET.version}. Internal view: a franchisee must never see this list. Signing
        is enabled here only because this is a preview build.
      </p>
      <ul role="list" className="space-y-1.5">
        {blockers.map((blocker) => (
          <li key={blocker.id} className="text-[11px] text-amber-800 leading-relaxed">
            <a
              href={`#${sectionAnchor(blocker.location)}`}
              className="font-bold underline decoration-amber-400"
            >
              {blocker.location}
            </a>{" "}
            : {blocker.problem}
          </li>
        ))}
      </ul>
    </div>
  );
}
