"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, EyeOff, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalPasswordSchema } from "@shared/onboarding/schema";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { formatPaymentMethod } from "@shared/onboarding/receipt";
import { formatInr } from "@shared/partnership/summary";
import type { OnboardingTerms } from "@shared/onboarding/types";
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
 * **That list is a schedule, so it says when.** It was four numbered circles in brand
 * orange, sitting a few hundred pixels under a rail of numbered circles in brand orange,
 * repeating an order that vertical position and the `ol` already carry. The numerals are
 * now the one thing a gym reading this actually wants: the timing, which used to be
 * buried mid-sentence ("usually within two weeks of the survey") or missing. Same amount
 * of orange on the screen, spent on words instead of counters. `StepPartnership` keeps
 * its numbers: that panel previews a sequence of things the gym has not done yet, this
 * one is a calendar of things about to happen to them.
 *
 * **Creating the password no longer redirects to the dashboard.** It used to push
 * `/gym/dashboard`, which was the end of the flow when step 5 was the last step. Step 6
 * is now where installation is tracked, and a redirect fired the moment the account
 * exists meant the one screen a gym has any reason to come back to was the one screen
 * they were never shown. The button sets the password and the wizard advances; step 6
 * carries the dashboard link.
 */
export default function StepDone({
  state,
  readOnly,
  isSubmitting,
  fieldErrors,
  actions,
}: StepViewProps) {
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /*
    The account existing, not the gym being activated. `status` reaches `active` only through
    `POST /admin/gyms/{id}/activate` — `statusForStepCommit(5)` returns null server-side, and
    says why — so this read `false` for every gym that had just created its password, and put
    the form back on screen for an account that already existed. Pressing it again is a 409:
    `createGymUser` is conditional on `attribute_not_exists`.

    `accountCreatedAt` is also the honest test of what the sentence claims. `POST /gym/account`
    mints the session cookie itself and `gymLogin` gates on the user row rather than on the
    onboarding status, so the dashboard is reachable the moment this timestamp exists.
  */
  const hasAccount = !!state.timestamps.accountCreatedAt;
  const email = state.details.noticesEmail || "your email";
  const signedAt = state.timestamps.signedAt;

  /*
    The server's rejection belongs on the field, not in the shell's banner. It screens a
    denylist and a distinct-character count that `portalPasswordSchema` cannot mirror, so a
    password this form accepted can still come back refused — and until this read
    `fieldErrors`, that arrived as "Please check the highlighted fields." above a screen
    where nothing was highlighted. `OnboardingFlow`'s `stepMarksField` drops the banner for
    a `password` key on the strength of this line.

    Local first: it is the fresher of the two, since typing does not clear a server error.
  */
  const error = localError ?? fieldErrors?.password ?? null;

  async function createAccount() {
    // Validated here as well as server-side so a short password costs no round
    // trip. The server check is the real one; this is only courtesy.
    const parsed = portalPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Choose a longer password");
      return;
    }
    setLocalError(null);
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
            </p>
            {/*
              "We'll", not "we have". Nothing has been sent: no PDF is generated anywhere in the
              backend and `sign.ts` sends no mail — the countersigned copy and its permanent home
              are build items 9 and 8. The same reason there is no download button here, and the
              same mistake `GymForgotPassword` was rewritten to stop making.
            */}
            <p className="text-sm text-gray-700 leading-relaxed mt-2" data-testid="agreement-copy-note">
              We'll email the countersigned PDF to{" "}
              <strong className="text-foreground">{email}</strong>, usually the same working day. It
              also stays in your dashboard under Agreement.
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
          /* Flowed, not a two-column grid: in a `max-w-3xl` card that put "2.3" some 400px
             from the label of the value beside it, with nothing in between. */
          <dl
            className="mt-4 pt-3 border-t border-primary/25 flex flex-wrap gap-x-10 gap-y-3"
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
                className="text-sm text-foreground font-mono mt-0.5"
                data-testid="agreement-hash-short"
                title={state.agreement.contentHash}
              >
                {state.agreement.contentHash.slice(0, 12)}…
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* ── The deposit ────────────────────────────────────────────────────── */}
      <DepositCard state={state} />

      {/* ── The account ────────────────────────────────────────────────────── */}
      {hasAccount ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          {/* The one card on either this step or step 6 whose title had no glyph beside it,
              while its five neighbours did. */}
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard
              className="w-4 h-4 text-muted-foreground flex-shrink-0"
              aria-hidden="true"
            />
            Your dashboard is ready
          </h2>
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
            {/*
              Revealable, and this field more than most. It is typed once with no confirm box,
              and there is no self-service reset behind it: a mistyped password means a person
              at our end mints a set-password link and someone relays it by hand, which
              [GymForgotPassword](../../gym/GymForgotPassword.tsx) exists to explain. The
              recovery screen has two password boxes; this one has one, so seeing it is the
              only check available.
            */}
            <div className="relative">
              <input
                id="portal-password"
                type={revealed ? "text" : "password"}
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
                className={`w-full h-11 rounded-xl border bg-gray-50 pl-3 pr-12 text-base sm:text-sm text-foreground focus:border-primary focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors ${
                  error ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                data-testid="input-portal-password"
              />
              {/* 44px square, which is the input's own height — the icon is 16px but the
                  thing being pressed is the whole end of the field. */}
              <button
                type="button"
                onClick={() => setRevealed((shown) => !shown)}
                aria-pressed={revealed}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                data-testid="button-reveal-password"
              >
                <span className="sr-only">
                  {revealed ? "Hide password" : "Show password"}
                </span>
                {revealed ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
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
            step 2's panels: this one heads the list a gym reads before it closes the tab. */}
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          What happens next
        </h2>
        <ol role="list">
          {nextSteps(state.details.installationAddress, state.terms).map((item, index, all) => {
            const isLast = index === all.length - 1;
            return (
              <li key={item.title} className="flex gap-3">
                {/* A dot and a rule, not a numeral: see the note at the top of the file
                    before putting the counting back. The line is `flex-1` inside a column
                    that stretches to the row, so it reaches the next dot whether the item
                    below it runs to one line or three. */}
                <div className="flex flex-col items-center pt-1" aria-hidden="true">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  {!isLast && <span className="w-px flex-1 bg-gray-200 my-1" />}
                </div>
                <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-ink">
                    {item.when}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        {/* Said once, under all four, rather than inside the second one where it was a
            fact about this page dressed as a milestone. */}
        <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-gray-100">
          This link stays live. Come back to it any time to see where things stand.
        </p>
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
          {/* Green here too, so money received is not one colour on step 4 and another here. */}
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
          Deposit received: {amount}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          {paidAt ? `Paid on ${formatAgreementDate(paidAt)}. ` : ""}
          Receipt in your email and your dashboard. Refunded within 30 days of the machine being
          collected, less anything owing under the agreement.
        </p>
        {/*
          The reference, here as well as on step 4, because paying advances the wizard
          straight to this screen — so for most gyms this is the only place they will
          see it before the email arrives.
        */}
        {state.depositReceipt && (
          <p className="text-xs text-gray-700 mt-2" data-testid="deposit-receipt-no">
            Receipt <span className="font-mono text-foreground">{state.depositReceipt.receiptNo}</span>
            {state.depositReceipt.method
              ? ` · paid by ${formatPaymentMethod(state.depositReceipt.method)}`
              : ""}
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

/**
 * Survey → installation → Schedule A → first shake, the middle of it tracked on step 6.
 *
 * `when` is the timing, in the same prepositional shape four times over so the column
 * reads down. It used to be inside the titles and bodies, which is where a reader
 * looking only for "when do I hear from you" could not find it.
 */
function nextSteps(installationAddress: string, terms: OnboardingTerms) {
  const where = installationAddress.trim() ? " at your installation address" : "";
  return [
    {
      when: "Within 2 working days",
      title: "We call to book the site survey",
      body: `A short visit${where} to check where the machine stands, the power point and the water access.`,
    },
    {
      when: "Within 2 weeks of the survey",
      title: "We confirm your installation date",
      body: "Once a unit is allocated to you. Which unit, and the day it goes in, appear on the next step.",
    },
    {
      when: "On installation day",
      title: "You sign Schedule A on site",
      body: `A second, shorter signature: you and our technician confirm the machine's serial number, its condition and the date. Your ${terms.termMonths}-month term runs from that day, not from today.`,
    },
    {
      when: "In your first month",
      title: "Your first shake, and your first statement",
      body: `Sales appear in your dashboard the same day they happen. Your first payout follows within ${terms.settlementDaysAfterMonthEnd} days of that month's end, with the statement showing how your share was worked out.`,
    },
  ];
}
