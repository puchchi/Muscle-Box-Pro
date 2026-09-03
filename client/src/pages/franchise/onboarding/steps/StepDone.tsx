"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Eye, EyeOff, KeyRound, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { franchisePasswordSchema } from "@shared/franchise/onboarding/schema";
import { formatInr, franchiseTier } from "@shared/franchise/program";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";
import { formatIstDate } from "../../../gym/istDates";
import { HINT_TEXT } from "../shell";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 9 — You're set up.
 *
 * The gym flow's step 5 with a longer horizon. Three jobs in the same order: confirm what was
 * signed, say where the money stands, and turn a handle into a login.
 *
 * **The "what happens next" list runs for months, not a fortnight, and that is the whole reason
 * it says when.** A gym signs and gets a survey in two working days. A franchisee signs and waits
 * on OEM procurement, machine build, a second instalment, delivery and deployment. Gym doc §33's
 * rule applies with more force at this length: a list of five things with no dates against them
 * is where somebody's expectation of the next quarter gets set wrong, and the correction comes
 * three months later in a phone call nobody enjoys.
 *
 * **The second instalment is on the list and is not a step in this wizard.** It is invoiced
 * against machine readiness, which is months out, and a franchisee who first hears about it in an
 * invoice heard about it too late (§7.6).
 *
 * **No dashboard link.** The franchise portal is not built yet, so there is nowhere to send
 * anyone. The password is still set here rather than in a later email, for the gym flow's reason:
 * a second email is a second chance to lose somebody, and the handle in this URL has already
 * proved what a magic link would. Saying "we'll email you when it opens" is the honest version,
 * and the same discipline as not offering a PDF nothing generates yet.
 */
export default function StepDone({
  state,
  isSubmitting,
  fieldErrors,
  goToStep,
  actions,
}: FranchiseStepViewProps) {
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasAccount = state.timestamps.accountCreatedAt !== null;
  const email = state.details.noticesEmail || "your email";
  const executed = state.esign.executed;

  // Local first: it is the fresher of the two, since typing does not clear a server error.
  const error = localError ?? fieldErrors?.password ?? null;

  async function createAccount() {
    // Checked here as well so a short password costs no round trip. The server's check is the
    // real one, and it screens things this schema cannot.
    const parsed = franchisePasswordSchema.safeParse(password);
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Choose a longer password");
      return;
    }
    setLocalError(null);
    await actions.createAccount(parsed.data);
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
        data-testid="franchise-signed-confirmation"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              Signed. {state.franchiseDisplayName} is on board.
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mt-1">
              {executed
                ? `Signed on ${formatIstDate(executed.signedAt)} by ${executed.signerName}`
                : "Signed by your signatory"}
              {state.approval?.outcome === "approved"
                ? `, for ${state.approval.territory}.`
                : "."}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-2" data-testid="termsheet-copy-note">
              We'll email your copy, with our signature on it too, to{" "}
              <strong className="text-foreground">{email}</strong>, usually the same working day.
              Keep it: your full franchise agreement is drawn up from it.
            </p>
          </div>
        </div>

        {state.termSheet && (
          <dl
            className="mt-4 pt-3 border-t border-primary/25 flex flex-wrap gap-x-10 gap-y-3"
            data-testid="termsheet-record"
          >
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">
                Version
              </dt>
              <dd className="text-sm text-foreground font-semibold mt-0.5">
                {state.termSheet.version}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">
                Open until
              </dt>
              <dd className="text-sm text-foreground font-semibold mt-0.5">
                {formatIstDate(state.termSheet.validUntil)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-muted-foreground">
                Reference
              </dt>
              {/* The first twelve characters: enough to match against the emailed copy, short
                  enough to read out on a phone call, and the full hash is on the PDF. */}
              <dd
                className="text-sm text-foreground font-mono mt-0.5"
                data-testid="termsheet-hash-short"
                title={state.termSheet.contentHash}
              >
                {state.termSheet.contentHash.slice(0, 12)}…
              </dd>
            </div>
          </dl>
        )}
      </section>

      <InstalmentCard state={state} onGoToInstalment={() => goToStep(8)} />

      {hasAccount ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5" data-testid="account-ready">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            Your login is set
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            It is <strong className="text-foreground">{email}</strong> with the password you just
            chose. We'll email you the moment the franchise portal opens.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
          <div>
            <label
              htmlFor="franchise-password"
              className="text-sm font-semibold text-foreground block mb-1"
            >
              Choose a password for your portal
            </label>
            <p id="franchise-password-hint" className="text-sm text-gray-700 leading-relaxed">
              You'll sign in with <strong className="text-foreground">{email}</strong>.
            </p>
          </div>
          {/* Revealable, and typed once with no confirm box, so seeing it is the only check
              available. Same reasoning as the gym portal password. */}
          <div className="relative">
            <input
              id="franchise-password"
              type={revealed ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              aria-invalid={error ? true : undefined}
              aria-describedby={
                error
                  ? "franchise-password-hint error-franchise-password"
                  : "franchise-password-hint"
              }
              className={`w-full h-11 rounded-lg border bg-gray-50 pl-3 pr-12 text-base sm:text-sm text-foreground focus:border-primary focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors ${
                error ? "border-red-400 bg-red-50" : "border-gray-200"
              }`}
              data-testid="input-franchise-password"
            />
            <button
              type="button"
              onClick={() => setRevealed((shown) => !shown)}
              aria-pressed={revealed}
              className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
              data-testid="button-reveal-password"
            >
              <span className="sr-only">{revealed ? "Hide password" : "Show password"}</span>
              {revealed ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {error && (
            <p
              id="error-franchise-password"
              className="text-xs font-medium text-red-700"
              role="alert"
              data-testid="error-franchise-password"
            >
              {error}
            </p>
          )}
          <Button
            type="button"
            onClick={() => void createAccount()}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-lg font-semibold text-sm w-full sm:w-auto cursor-pointer"
            data-testid="button-continue"
          >
            {isSubmitting ? "Creating..." : "Create my password"}
          </Button>
        </section>
      )}

      <section
        className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
        data-testid="what-happens-next"
      >
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          What happens next
        </h3>
        <ol role="list">
          {nextSteps(state).map((item, index, all) => {
            const isLast = index === all.length - 1;
            return (
              <li key={item.title} className="flex gap-3">
                <div className="flex flex-col items-center pt-1" aria-hidden="true">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  {!isLast && <span className="w-px flex-1 bg-gray-200 my-1" />}
                </div>
                <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
                  <p className="text-xs font-semibold text-primary-ink">
                    {item.when}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className={`${HINT_TEXT} mt-4 pt-3 border-t border-gray-100`}>
          This link stays live. Come back any time to see where things stand.
        </p>
      </section>
    </div>
  );
}

/**
 * Where the first instalment stands, from this screen's point of view.
 *
 * Step 9 is reachable unpaid, because signing is the gate on the account rather than the money:
 * somebody who executed a term sheet and has ₹12,50,000 in flight should not be locked out of
 * their own portal while an admin reads a bank statement. So this card has to handle all three
 * cases, and the unpaid one gets a way back to step 8 rather than a sentence about it.
 */
function InstalmentCard({
  state,
  onGoToInstalment,
}: {
  state: FranchiseOnboardingState;
  onGoToInstalment(): void;
}) {
  const payment = state.payments.find((p) => p.instalment === 1) ?? null;
  const verified = payment?.verifiedAt != null;
  const claimed = payment?.claim != null && !verified;
  // Repeated from step 8 rather than left there. This is the last screen anybody reads, and a
  // few hundred rupees of bank charges left unsaid here is found at the second instalment.
  const shortfall =
    verified && payment?.receivedPaise != null ? payment.expectedPaise - payment.receivedPaise : 0;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="instalment-outcome"
    >
      {/* `items-start`, not `items-center`: this heading wraps to two lines on a phone, and a
          centred icon then floats beside the gap between them. */}
      <h3 className="text-base font-semibold text-foreground flex items-start gap-2">
        <Wallet
          className={`w-4 h-4 flex-shrink-0 mt-1 ${verified ? "text-emerald-600" : "text-muted-foreground"}`}
          aria-hidden="true"
        />
        {verified && payment?.receivedPaise !== null && payment?.receivedPaise !== undefined
          ? `First instalment received: ${formatInr(payment.receivedPaise / 100)}`
          : claimed
            ? "We're checking your first instalment"
            : "First instalment still to send"}
      </h3>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        {verified
          ? `Confirmed on ${payment?.verifiedAt ? formatIstDate(payment.verifiedAt) : "our record"}. The next instalment falls due when your machines are ready.`
          : claimed
            ? "We're checking your transfer against our statement, usually within a working day. We'll email you when it is confirmed."
            : "We order your machines once the first instalment reaches us. Everything else is done."}
      </p>
      {shortfall > 0 && (
        <p
          className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed mt-3"
          data-testid="instalment-shortfall"
        >
          {formatInr(shortfall / 100)} of the {formatInr((payment?.expectedPaise ?? 0) / 100)} is
          still outstanding, usually because your bank deducted charges. We'll raise it with you
          before the second instalment.
        </p>
      )}
      {!verified && !claimed && (
        <Button
          type="button"
          variant="outline"
          onClick={onGoToInstalment}
          className="min-h-11 rounded-lg text-sm font-semibold mt-4 cursor-pointer"
          data-testid="button-to-instalment"
        >
          Transfer details
        </Button>
      )}
    </section>
  );
}

/**
 * Months, not weeks, and every entry says when.
 *
 * The horizon is what makes this list load-bearing rather than decorative: nothing physical
 * happens for weeks after signing, and a franchisee with ₹12,50,000 committed and no visible
 * activity assumes something has gone wrong. The second instalment is on it deliberately.
 */
function nextSteps(state: FranchiseOnboardingState) {
  const machines = state.terms.machineAllocation;
  const paid = state.payments.some((p) => p.instalment === 1 && p.verifiedAt !== null);
  // The granted territory, not the tier's description of one. Anybody on this step has an
  // approval, and a signed term sheet names the place.
  const territory =
    state.approval?.outcome === "approved"
      ? state.approval.territory
      : franchiseTier(state.terms.tier).marketRights.toLowerCase();

  return [
    {
      when: "Within 3 working days",
      title: "Your full franchise agreement",
      body: "Drawn up from what you just signed. It is the longer document, signed the same way, and any stamp duty is handled there.",
    },
    {
      when: paid ? "Under way now" : "As soon as the first instalment clears",
      title: "Your machines go on order",
      body: `We place the order for your ${machines} machines. This is the long part of the programme, measured in months rather than weeks.`,
    },
    {
      when: "When your machines are ready",
      title: "The second instalment falls due",
      body: "We invoice it when your machines are ready rather than on a fixed date. The readiness report comes with it, and delivery follows.",
    },
    {
      when: "After delivery",
      title: "The machines go into your gyms",
      body: `We install them, stock your warehouse with protein, and the machines go live across ${territory}, in the order you set out in your deployment plan.`,
    },
    {
      when: "From the first sale",
      title: "Your share, and your statements",
      body: `${state.terms.proteinSharePctDuringRecovery}% of protein profit until your capital is recovered, then ${state.terms.proteinSharePctAfterRecovery}%, plus ${state.terms.advertisingFranchiseeSharePct}% of advertising revenue from your machines. Both show in your portal as they happen.`,
    },
  ];
}
