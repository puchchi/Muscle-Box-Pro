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
import { useBackgroundPoll } from "../useBackgroundPoll";
import { HINT_TEXT } from "../shell";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 7 — Review and sign.
 *
 * The gym flow's step 3 with the signature taken out of our hands. The hash discipline carries over
 * — the server renders, hashes and pins, and the pinned hash is echoed back so a term sheet
 * re-priced between this screen loading and the button being pressed is refused (§6.1) — but the
 * hash is no longer printed here. It is evidence about a copy you hold, and nobody holds one until
 * they have signed, which is where step 9 shows it. What changes is that Leegality affixes the
 * signature in the signatory's own identity, so this screen ends at a handoff rather than a form.
 *
 * **The document is not rendered here, and that is the decision this screen is built around.**
 * Decided 2026-09-03. Every Leegality signer flow previews the document before it will take a
 * signature — Aadhaar eSign's own step is "preview the document and click Proceed" — so a reader on
 * this screen made the franchisee read the same term sheet twice and put the *second* reading, the
 * one that is actually attached to the signature, second. Reading it in the place that signs it is
 * the reading that counts. So this screen names who will sign, says where the document opens, and
 * hands over.
 *
 * A consequence worth knowing before somebody puts the reader back: **there is no read gate any
 * more**, because a gate here would be gating on the wrong reading. `markTermSheetViewed` still runs
 * on mount and still pins the document, since the pin is what `contentHash` is echoed from.
 *
 * **There are no "I agree" checkboxes, deliberately.** The gym panel collects two assertions
 * because the server stores them against the signature. Here nothing on the API accepts them:
 * `requestEsign` takes a sign type and the pinned hash, and the assertion that carries weight is
 * the one the signatory makes to Leegality against their Aadhaar. A tickbox whose value is never
 * recorded anywhere is theatre on the one screen that must not have any. What this screen does
 * instead is name exactly who is about to be asked to sign.
 *
 * **The signing URL is used once and never stored.** It authorises an eSign in a named person's
 * identity, so unlike a deposit link it is not forwardable and this screen never offers it as a
 * link to copy. Coming back to an unsigned term sheet asks the server again: `requestEsign` is
 * idempotent in the document and returns a fresh URL for the same Leegality request (§6.4).
 *
 * **Three attempts, and the third failure ends in a person rather than in this button.** Leegality's
 * workflow is configured "Reject if failed", so one fumbled Aadhaar OTP is terminal at the provider
 * and the retry is ours to own. The server holds the count; this screen keeps offering the button and
 * renders whatever it is told, because the refusal past the third attempt is a sentence promising a
 * human and a disabled button with no explanation is worse than a button that answers.
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

/**
 * The one refusal the server never sees, so the one sentence this screen has to write itself:
 * `requestEsign` declined to ask because no term sheet is pinned yet, which is the same condition
 * `PreparingNotice` renders and should therefore be unreachable from a rendered button.
 */
const PREPARING_PROBLEM =
  "Your agreement is still being prepared, so there is nothing to sign yet. Give it a moment and reload this page.";

/** Still a map: a request made before this screen narrowed to one type renders from its own record. */
const SIGN_TYPE_LABELS: Record<EsignSignType, string> = {
  aadhaar: "Aadhaar eSign",
  electronic: "Electronic signature",
  dsc: "Digital Signature Certificate",
};

export default function StepReviewSign({
  state,
  isSubmitting,
  actions,
}: FranchiseStepViewProps) {
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

  // After every hook, so the hook order is the same on both paths. Normally invisible: the
  // mount effect above pins the document, and until it answers there is no validity date, and a
  // signing session opened before the pin exists has nothing to echo.
  if (!issued) return <PreparingNotice />;

  const issuable = canIssueTermSheet(state, issued.effectiveDate);
  const blockers = issuable.ok ? [] : issuable.blockers;

  async function goToSigning() {
    setHandoffProblem(null);
    const outcome = await actions.requestEsign(SIGN_TYPE);
    if (!outcome.ok) {
      // The server's own sentence, verbatim, and this screen shows it rather than the shell's banner
      // because the button is at the bottom of a long document. Four of these matter and none of them
      // is "try again": three failed attempts promises a person, `content_mismatch` says reload,
      // `already_signed` means another tab won, `declined` names what Leegality reported. Substituting
      // our own copy here is how a franchisee gets sent back round a loop that cannot complete.
      setHandoffProblem(outcome.error?.message ?? PREPARING_PROBLEM);
      return;
    }
    const { handoff } = outcome;
    rememberSigningAttempt(window.location.pathname);
    // `https://` because this value is handed straight to a navigation from a page mid-flow,
    // where another scheme would be script execution.
    if (!handoff.signingUrl.startsWith("https://")) {
      setHandoffProblem(
        "We couldn't open the signing page safely, so we stopped. Nothing has been signed, and we can see what went wrong from our side.",
      );
      return;
    }
    window.location.assign(handoff.signingUrl);
  }

  return (
    <>
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
          validUntil={issued.validUntil}
          previousAttempt={esign.status === "expired" || esign.status === "declined" ? esign.status : null}
          blockedReason={
            blockers.length === 0
              ? null
              : "A few things in your agreement still need finishing at our end, so it can't be signed yet. We'll email you the moment your copy is ready."
          }
          problem={handoffProblem}
          isSubmitting={isSubmitting}
          onSign={() => void goToSigning()}
        />
      )}
    </>
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
      <h3 className="text-base font-semibold text-foreground">Preparing your agreement</h3>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        One moment. We're issuing your copy.
      </p>
    </section>
  );
}

/**
 * How long the offer stands.
 *
 * In the panel's action bar rather than above the panel, and only in the panel that can act on it:
 * it is a deadline for signing, so it belongs beside the button that signs. Rendered over the whole
 * step it also outlived its point, telling somebody who had already signed when their offer lapses.
 */
function ValidityLine({ validUntil }: { validUntil: string }) {
  return (
    <p
      className="text-[13px] text-gray-700 leading-relaxed flex items-start gap-2 sm:max-w-md"
      data-testid="termsheet-validity"
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Open until <strong>{formatIstDate(validUntil)}</strong>. After that we'd have to issue a new
        one, and the terms could change.
      </span>
    </p>
  );
}

function SignPanel({
  signatoryName,
  signatoryDesignation,
  aadhaarLast4,
  legalEntityName,
  validUntil,
  previousAttempt,
  blockedReason,
  problem,
  isSubmitting,
  onSign,
}: {
  signatoryName: string;
  signatoryDesignation: string;
  aadhaarLast4: string;
  legalEntityName: string;
  validUntil: string;
  previousAttempt: "expired" | "declined" | null;
  blockedReason: string | null;
  problem: string | null;
  isSubmitting: boolean;
  onSign(): void;
}) {
  const signatoryFor = [legalEntityName, aadhaarLast4 ? `Aadhaar ending ${aadhaarLast4}` : null]
    .filter(Boolean)
    .join(" · ");
  const who = signatoryName || "The person named below";

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-5"
      data-testid="sign-panel"
    >
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileSignature className="w-4 h-4 text-primary-ink" aria-hidden="true" />
          </span>
          Sign the agreement
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mt-2">
          Your full agreement opens on Leegality, the service we use for e-signatures. {who} signs
          it there with their own Aadhaar.
        </p>
      </div>

      {previousAttempt && <PreviousAttemptNote attempt={previousAttempt} />}

      {/* A summary with no "Change" beside it, on purpose. Nobody reaches this screen without
          `kycSubmittedAt`, so `freezeReason` has already locked step 1 and the button led to a form
          that could only be read. A wrong name here is a conversation, and the lock on step 1 is
          where that sentence lives. */}
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3"
        data-testid="signatory-summary"
      >
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          Who will be asked to sign
        </p>
        <p className="text-sm font-semibold text-foreground">
          {signatoryName || "Nobody named yet"}
          {signatoryDesignation ? `, ${signatoryDesignation}` : ""}
        </p>
        {signatoryFor && <p className={`${HINT_TEXT} mt-1`}>{signatoryFor}</p>}
      </div>

      {blockedReason && (
        <p
          className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
          data-testid="sign-blocked"
        >
          {blockedReason}
        </p>
      )}

      {/* An action bar to the card's edges, with the deadline on the left and the signature on the
          right, because that is where every other step of this wizard puts its Continue. */}
      <div className="-mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50/70 rounded-b-xl space-y-3">
        {problem && (
          <p className="text-sm text-red-700 font-medium leading-relaxed" role="alert" data-testid="sign-problem">
            {problem}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ValidityLine validUntil={validUntil} />
          {!blockedReason && (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={onSign}
              className="min-h-11 px-6 rounded-lg font-semibold text-sm cursor-pointer w-full sm:w-auto flex-shrink-0"
              data-testid="button-sign"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="ml-1.5">Opening the signing page...</span>
                </>
              ) : (
                <>
                  Sign with {SIGN_TYPE_LABELS[SIGN_TYPE]}
                  <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden="true" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
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
        ? "The last signing page ran out of time before it was finished. Nothing was signed. You can start again below."
        : "The last attempt was turned down at the signing page. If that was a mistake, start again below. If the details it showed were wrong, fix them first and talk to us."}
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
              : `Your ${SIGN_TYPE_LABELS[signType]} page is open and waiting. This page moves on by itself once the signature reaches us.`}
          </p>
        </div>
      </div>

      {expiresAt && (
        <p className="text-[13px] text-amber-900 leading-relaxed">
          Signing stays open until {formatIstDateTime(expiresAt)}.
        </p>
      )}

      {!watching && (
        <p className="text-[13px] text-amber-900 leading-relaxed" data-testid="esign-poll-stopped">
          We've stopped checking on this page to save your battery. Reload it to check again, or
          just leave it. We'll email you as soon as it is signed.
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
              <span className="ml-1.5">Opening the signing page...</span>
            </>
          ) : (
            <>
              Open the signing page again
              <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="text-[13px] text-amber-900 leading-relaxed">
          This reopens the same request. The page is for the person signing, so please don't
          forward it.
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
          Signed on {formatIstDateTime(signedAt)} by {signerName} with{" "}
          {SIGN_TYPE_LABELS[signType]}, version {version}. Nothing in it can change now. If
          something needs to, email us and we'll issue an amendment.
        </p>
        {auditTrailStored && (
          <p className={`${HINT_TEXT} mt-2`}>
            We keep the signing record, showing who signed and when, with your document.
          </p>
        )}
      </div>
    </section>
  );
}
