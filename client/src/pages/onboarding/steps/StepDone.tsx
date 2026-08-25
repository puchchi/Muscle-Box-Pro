"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalPasswordSchema } from "@shared/onboarding/schema";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { formatInr } from "@shared/partnership/summary";
import type { StepViewProps } from "../types";

/**
 * Step 5 — You're set up.
 *
 * Three jobs, in this order: confirm what was just signed, say what the deposit is
 * doing, and turn the token into a real login. The password is set here rather than
 * in a separate "activate your account" email because a second email is a second
 * chance to lose someone, and the token in the URL has already proved the same thing
 * a magic link would.
 *
 * The "what happens next" list at the bottom is not filler. Signing is where a gym
 * owner's expectations are least anchored — the honest answer is that a survey and an
 * installation visit come before a single cup is sold, and that there is a *second*
 * signature at installation (Schedule A, §6). Saying so here costs one paragraph;
 * not saying it costs a support call per gym.
 *
 * **Creating the password no longer redirects to the dashboard.** It used to push
 * `/gym/dashboard`, which was the end of the flow when step 5 was the last step. Step 6
 * is now where installation is tracked, and a redirect fired the moment the account
 * exists meant the one screen a gym has any reason to come back to was the one screen
 * they were never shown. The button sets the password and the wizard advances; step 6
 * carries the dashboard link.
 */
export default function StepDone({ state, readOnly, isSubmitting, actions }: StepViewProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isActive = state.status === "active";
  const email = state.details.noticesEmail || "your email";
  const signedAt = state.timestamps.signedAt;

  async function createAccount() {
    // Validated here as well as server-side so a short password costs no round
    // trip. The server check is the real one; this is only courtesy.
    const parsed = portalPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Choose a longer password");
      return;
    }
    setError(null);
    await actions.createAccount(parsed.data);
  }

  return (
    <div className="space-y-6">
      {/* ── What just happened ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
        data-testid="signed-confirmation"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              Signed. {state.gymDisplayName} is on board.
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mt-1">
              {signedAt ? `Signed on ${formatAgreementDate(signedAt)} by ` : "Signed by "}
              {state.details.signatoryName || "your signatory"}
              {state.details.signatoryDesignation ? `, ${state.details.signatoryDesignation}` : ""}.
              A copy is on its way to <strong className="text-foreground">{email}</strong>. Keep it,
              because that is the address the agreement has us serve formal notices to.
            </p>
          </div>
        </div>

        {/*
          Gated on the agreement, which is all that is needed now that the server pins the
          hash at issuance rather than accepting one at signing — there is no longer a
          state where a version exists without a fingerprint.

          This block only renders on step 5, which is unreachable unsigned, so the
          fingerprint shown here is always the fingerprint of a signed document. If a
          future step ever renders it earlier, it needs `state.isSigned` too: a
          "Document fingerprint" beside the word "Signed" for a document nobody has signed
          is worse than no row.
        */}
        {state.agreement && (
          <dl
            className="mt-4 pt-3 border-t border-primary/25 grid grid-cols-2 gap-3"
            data-testid="agreement-record"
          >
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
                Version
              </dt>
              <dd className="text-sm text-foreground font-semibold mt-0.5">
                {state.agreement.version}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
                Document fingerprint
              </dt>
              {/*
                The first twelve characters, not all sixty-four. Enough to match
                against the record in the emailed copy, short enough to read out on
                a phone call, and the full hash is in the PDF for anyone who wants
                to verify the whole thing.
              */}
              <dd
                className="text-sm text-foreground font-mono mt-0.5 truncate"
                data-testid="agreement-hash-short"
                title={state.agreement.contentHash}
              >
                {state.agreement.contentHash.slice(0, 12)}…
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/*
        Honest about what does not exist yet. The signature and its hash are real and
        stored; the countersigned PDF and its permanent home are build items 9 and 8.
        A "Download" button that 404s would be worse than this sentence.
      */}
      <p
        className="text-sm text-gray-700 leading-relaxed flex items-start gap-2"
        data-testid="agreement-copy-note"
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Your countersigned PDF is generated and emailed once we counter-sign, usually the same
          working day. It will also live permanently in your dashboard under Agreement, so you never
          have to search your inbox for it.
        </span>
      </p>

      {/* ── The deposit ────────────────────────────────────────────────────── */}
      <DepositCard state={state} />

      {/* ── The account ────────────────────────────────────────────────────── */}
      {isActive ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-bold text-foreground">Your dashboard is ready</h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            Sign in at <strong className="text-foreground">{email}</strong> with the password you
            chose.
          </p>
          <Button
            asChild
            className="h-11 px-6 rounded-xl font-bold text-sm mt-4 w-full sm:w-auto cursor-pointer"
          >
            <Link href="/gym/dashboard" data-testid="link-dashboard">
              Open my dashboard
            </Link>
          </Button>
        </div>
      ) : (
        !readOnly && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
            <div>
              <label
                htmlFor="portal-password"
                // `font-semibold`: an input label is a labelled thing, not a card title, and
                // 16px bold is what card titles read at on this step.
                className="text-sm font-semibold text-foreground block mb-1"
              >
                Choose a password for your dashboard
              </label>
              <p id="portal-password-hint" className="text-sm text-gray-700 leading-relaxed">
                It shows cups sold, revenue, your share and every payout statement. You'll sign in
                with <strong className="text-foreground">{email}</strong>.
              </p>
            </div>
            <input
              id="portal-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              /*
                The hint above is part of the field's description, and the error joins it
                when there is one — without `aria-describedby` a screen reader got the
                label and nothing else, on the field that decides whether this gym can
                ever log in. `role="alert"` because the message appears in response to
                pressing the button.
              */
              aria-invalid={error ? true : undefined}
              aria-describedby={
                error ? "portal-password-hint error-portal-password" : "portal-password-hint"
              }
              className={`w-full h-11 rounded-xl border bg-gray-50 px-3 text-base sm:text-sm text-foreground focus:border-primary focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors ${
                error ? "border-red-400 bg-red-50" : "border-gray-200"
              }`}
              data-testid="input-portal-password"
            />
            {error && (
              <p
                id="error-portal-password"
                className="text-xs font-medium text-red-700"
                role="alert"
                data-testid="error-portal-password"
              >
                {error}
              </p>
            )}
            <Button
              type="button"
              onClick={createAccount}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
              data-testid="button-continue"
            >
              {isSubmitting ? "Creating..." : "Create my password"}
            </Button>
          </div>
        )
      )}

      {/* ── What happens next ──────────────────────────────────────────────── */}
      <section
        className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
        data-testid="what-happens-next"
      >
        {/* The level every other card title on this step reads at, for the same reason as
            step 2's panels: this one heads the list a gym reads before it closes the tab.
            `mb-4` so the heading clears the list by more than the list's own `space-y-3`. */}
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          What happens next
        </h2>
        <ol role="list" className="space-y-3">
          {nextSteps(state.details.installationAddress, state.terms.termMonths).map(
            (item, index) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="w-6 h-6 rounded-full bg-primary/10 text-primary-ink text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
                </div>
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

/**
 * The deposit, in whichever of its three end-states this gym is in.
 *
 * `deferred` gets the most words on purpose: a gym whose deposit we deferred has an
 * open obligation, and the point of this card is that nobody can honestly say they
 * did not know it was outstanding.
 */
function DepositCard({ state }: { state: StepViewProps["state"] }) {
  const amount = formatInr(state.terms.securityDepositInr);
  const paidAt = state.timestamps.depositPaidAt;

  if (state.depositStatus === "paid") {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
        data-testid="deposit-outcome"
      >
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          Deposit received: {amount}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          {paidAt ? `Paid on ${formatAgreementDate(paidAt)}. ` : ""}
          Your receipt is in your email and in your dashboard. It is refundable at the end of the
          term, less anything owing under the agreement.
        </p>
        {/*
          The reference, here as well as on step 4, because paying advances the wizard
          straight to this screen — so for most gyms this is the only place they will
          see it before the email arrives.
        */}
        {state.depositReceipt && (
          <p className="text-xs text-gray-700 mt-2" data-testid="deposit-receipt-no">
            Receipt <span className="font-mono text-foreground">{state.depositReceipt.receiptNo}</span>
            {state.depositReceipt.method ? ` · paid by ${state.depositReceipt.method}` : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="deposit-outcome"
    >
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        Deposit still to pay: {amount}
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        {state.depositStatus === "pending"
          ? "We can see a payment in progress. Once it clears we'll email the receipt, and there is nothing more for you to do."
          : `We'll email you a payment link, and it stays in your dashboard under Deposit. The site survey can go ahead in the meantime, but installation waits for the ${amount}.`}
      </p>
    </div>
  );
}

/** Survey → installation → Schedule A → first shake, the middle of it tracked on step 6. */
function nextSteps(installationAddress: string, termMonths: number) {
  const where = installationAddress.trim() ? " at your installation address" : "";
  return [
    {
      title: "We call you within two working days",
      body: `To book the site survey${where}: where the machine stands, the power point, and water access.`,
    },
    {
      title: "We confirm an installation date",
      body: "Usually within two weeks of the survey, once a unit is allocated to you. Which unit, and when it goes in, show up on the next step — come back to this same link any time to check.",
    },
    {
      title: "Schedule A is signed on site",
      body: `A short second signature at installation: you and our technician confirm the machine's serial number, its condition and the installation date. Your ${termMonths}-month term runs from that date, not from today.`,
    },
    {
      title: "Your first shake, and your first statement",
      body: "Sales appear in your dashboard the same day they happen. The first payout follows the first month-end.",
    },
  ];
}
