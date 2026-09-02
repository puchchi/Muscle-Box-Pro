"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSignature,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { rememberSigningAttempt, takeReturnedFromEsign } from "@/lib/esignReturn";
import { canIssueTermSheet } from "@shared/franchise/termsheet/issued";
import type { EsignSignType } from "@shared/franchise/onboarding/types";
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
 * button being pressed is refused (§6.1). What changes is that the signature is affixed by Leegality
 * in the signatory's own identity, so this screen ends at a handoff rather than at a form.
 *
 * **There are no "I agree" checkboxes, deliberately.** The gym panel collects two assertions
 * because the server stores them against the signature. Here nothing on the API accepts them:
 * `requestEsign` takes a sign type and the pinned hash, and the assertion that carries weight is
 * the one the signatory makes to Leegality against their Aadhaar. A tickbox whose value is never
 * recorded anywhere is theatre on the one screen that must not have any. What this screen does
 * instead is gate on having reached the end of the document, and name exactly who is about to be
 * asked to sign.
 *
 * **The signing URL is used once and never stored.** It authorises an eSign in a named person's
 * identity, so unlike a deposit link it is not forwardable and this screen never offers it as a
 * link to copy. Coming back to an unsigned term sheet asks the server again: `requestEsign` is
 * idempotent in the document and returns a fresh URL for the same Leegality request (§6.4).
 *
 * **Nothing here can mark the term sheet signed.** The waiting state polls our own record, which
 * only the webhook writes. That covers the paths a redirect handler would miss: a franchisee who
 * signs and closes the tab, or signs on a phone while this tab sits open on a laptop.
 *
 * **One sign type is offered, so there is no choice to make.** `EsignSignType` keeps `dsc` and
 * `electronic` because the provider seam has them and a historical record may carry either, but this
 * screen asks for Aadhaar eSign and nothing else. Every option costs a decision on the screen where
 * a ₹25 lakh commitment is signed, and a franchisee whose signatory cannot use Aadhaar is a
 * conversation rather than a second radio button. One sign type is also one Leegality workflow to
 * configure and one `profileId` to hold, which is where the mistakes live.
 *
 * If `electronic` is ever offered it maps to Leegality's **Virtual Sign**, which verifies the
 * signatory by an OTP to their email or phone. It must never be wired to Quick Sign, which is three
 * clicks with no OTP at all: that would reproduce the weakness the gym flow's typed-name signature
 * already has, while looking on this screen like the provider-backed signature it is not.
 */

/**
 * Two cadences, for the gym deposit flow's reason: straight back from a signing session somebody
 * is watching the screen and the webhook is seconds away, while an open tab nobody is reading can
 * be checked at a walk. Running out of `CONFIRM` moves to `WATCH` rather than stopping.
 */
const CONFIRM = { intervalMs: 1500, maxPolls: 20 };
const WATCH = { intervalMs: 5000, maxPolls: 60 };

type PollPhase = "confirm" | "watch" | "stopped";

const SIGN_TYPE: EsignSignType = "aadhaar";

/** Still a map: a request made before this screen narrowed to one type renders from its own record. */
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
    const handoff = await actions.requestEsign(SIGN_TYPE);
    if (!handoff) {
      setHandoffProblem(
        "We couldn't open the signing session. Nothing has been signed. Reload this page and try again, and tell us if it happens twice.",
      );
      return;
    }
    rememberSigningAttempt(window.location.pathname);
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
      <ValidityLine effectiveDate={issued.effectiveDate} validUntil={issued.validUntil} />

      <TermSheetReader
        state={state}
        effectiveDate={issued.effectiveDate}
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
          signType={esign.request?.signType ?? SIGN_TYPE}
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
          hasReadToEnd={hasReadToEnd}
          readPercent={readPercent}
          previousAttempt={esign.status === "expired" || esign.status === "declined" ? esign.status : null}
          blockedReason={
            blockers.length === 0
              ? null
              : "There are unresolved items in this document that we have to close before anyone signs it. We'll email you the moment your copy is ready."
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
      className="rounded-xl border border-gray-200 bg-white p-6 text-center"
      role="status"
      data-testid="termsheet-preparing"
    >
      <h3 className="text-base font-semibold text-foreground">Preparing your term sheet</h3>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        One moment. We're issuing your copy.
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
        Dated {formatIstDate(effectiveDate)}. Open until{" "}
        <strong>{formatIstDate(validUntil)}</strong>, after which we would issue a fresh one that
        may not be on these terms.
      </span>
    </p>
  );
}

/**
 * The fingerprint, on screen.
 *
 * The franchisee's evidence as much as ours, and the reason it is worth showing: the same value
 * goes on the PDF Leegality signs, so a document altered afterwards can be caught by anyone who kept
 * the email. `pdfHash` is deliberately not shown — it is ours for verifying the file we handed
 * over, and a second hash on screen invites the question of which one to check.
 */
function HashLine({ contentHash }: { contentHash: string }) {
  return (
    <p className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
      <FileSignature className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Document fingerprint (SHA-256), printed on your copy:{" "}
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
  hasReadToEnd: boolean;
  readPercent: number;
  previousAttempt: "expired" | "declined" | null;
  blockedReason: string | null;
  problem: string | null;
  isSubmitting: boolean;
  onCheckSignatory(): void;
  onSign(): void;
}) {
  const signatoryFor = [legalEntityName, aadhaarLast4 ? `Aadhaar ending ${aadhaarLast4}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-5"
      data-testid="sign-panel"
    >
      <div>
        <h3 className="text-base font-semibold text-foreground">Sign the term sheet</h3>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Signing happens at Leegality, not here. The signature is taken in your signatory's own
          identity, which is what makes it evidence.
        </p>
      </div>

      {previousAttempt && <PreviousAttemptNote attempt={previousAttempt} />}

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3" data-testid="signatory-summary">
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          Who will be asked to sign
        </p>
        <p className="text-sm font-semibold text-foreground">
          {signatoryName || "Nobody named yet"}
          {signatoryDesignation ? `, ${signatoryDesignation}` : ""}
        </p>
        {signatoryFor && (
          <p className="text-xs text-muted-foreground mt-1">{signatoryFor}</p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCheckSignatory}
          className="min-h-11 rounded-lg text-xs font-semibold mt-3 cursor-pointer"
          data-testid="button-check-signatory"
        >
          Not the right person? Change it
        </Button>
      </div>

      <div data-testid="sign-method">
        <h4 className="text-sm font-semibold text-foreground">How they'll sign</h4>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Aadhaar eSign. Leegality opens this same term sheet, sends an OTP to the mobile registered
          with Aadhaar, and signs the document once it is entered. There is nothing to install.
        </p>
      </div>

      {blockedReason ? (
        <p
          className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
          data-testid="sign-blocked"
        >
          {blockedReason}
        </p>
      ) : (
        <>
          {!hasReadToEnd && (
            <p className="text-xs text-muted-foreground leading-relaxed" data-testid="read-gate">
              You've read {readPercent}% of the term sheet. Scroll to the end before signing.
            </p>
          )}
          {problem && (
            <p className="text-sm text-red-700 font-medium leading-relaxed" role="alert" data-testid="sign-problem">
              {problem}
            </p>
          )}
          <Button
            type="button"
            disabled={!hasReadToEnd || isSubmitting}
            onClick={onSign}
            className="min-h-11 px-6 rounded-lg font-semibold text-sm cursor-pointer w-full sm:w-auto"
            data-testid="button-sign"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span className="ml-1.5">Opening Leegality...</span>
              </>
            ) : (
              <>
                Sign with {SIGN_TYPE_LABELS[SIGN_TYPE]}
                <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden="true" />
              </>
            )}
          </Button>
        </>
      )}
    </section>
  );
}

/**
 * A signing session that ended without a signature.
 *
 * Named rather than silently offering the button again, because the two cases have different
 * fixes: an expiry needs nothing but another attempt, and a declined signature at Leegality usually
 * means the signatory was not who we said it was.
 */
function PreviousAttemptNote({ attempt }: { attempt: "expired" | "declined" }) {
  return (
    <p
      className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
      data-testid={`esign-${attempt}`}
    >
      {attempt === "expired"
        ? "Your last signing session expired before it was completed. Nothing was signed and nothing is lost. Start it again below."
        : "The last signing attempt was declined at Leegality. If that was a mistake, start it again below. If the details it showed weren't right, fix them first and talk to us."}
    </p>
  );
}

/**
 * Sent to Leegality, and waiting.
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
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-6 space-y-4"
      data-testid="esign-waiting"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-amber-900">
            {confirming ? "Checking for your signature" : "Waiting for your signature"}
          </h3>
          <p className="text-sm text-amber-900 leading-relaxed mt-1" role="status">
            {confirming
              ? "This usually takes a few seconds."
              : `The ${SIGN_TYPE_LABELS[signType]} session is open. This page moves on by itself when the signature reaches us, so you don't have to keep it open.`}
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
          className="min-h-11 rounded-lg font-semibold text-sm bg-white cursor-pointer sm:self-start"
          data-testid="button-resume-signing"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="ml-1.5">Opening Leegality...</span>
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
          your signatory, so it is not something to forward.
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
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3"
      data-testid="termsheet-signed"
    >
      <CheckCircle2 className="w-5 h-5 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">Signed</h3>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Version {version}, signed on {formatIstDateTime(signedAt)} by {signerName} using{" "}
          {SIGN_TYPE_LABELS[signType]}. This copy is read-only. Email us if anything in it needs to
          change and we'll issue an amendment.
        </p>
        {auditTrailStored && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            Leegality's audit trail for the signature is stored with the signed document.
          </p>
        )}
      </div>
    </section>
  );
}
