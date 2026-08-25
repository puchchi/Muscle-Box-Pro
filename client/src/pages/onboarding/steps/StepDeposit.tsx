"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Forward,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_MOCK_ONBOARDING } from "@/lib/onboardingApi";
import { formatInr } from "@shared/partnership/summary";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import type { DepositLink, DepositReceipt } from "@shared/onboarding/types";
import type { StepViewProps } from "../types";

/**
 * Step 4 — Security deposit.
 *
 * After signing, because §5.1 makes the deposit an obligation *of* the agreement, so
 * asking for money before there is one is both bad law and bad manners.
 *
 * **Paying is how this step is finished.** It had a "I'll pay this later" button until
 * 2026-08-25 and no longer does (docs/gym-onboarding.md §24). `deferred` is still a
 * state the record can be in — we defer or waive one for a gym that asks — so the
 * panels for it stay; nothing in the wizard puts a record there.
 *
 * **A forwardable link, not an in-page checkout.** The person authorised to sign a
 * placement agreement frequently has no access to the account that releases ₹50,000.
 * That is the whole reason for Razorpay Payment Links (§5), so the screen *says* the
 * link can be forwarded — a feature nobody uses is a feature nobody was told about.
 *
 * **This screen never decides that money arrived.** It asks our own server, which
 * reads the record the webhook wrote. Nothing here trusts the redirect back from the
 * gateway, and there is no client callback that could mark a deposit paid.
 *
 * **The waiting state is real and is designed for.** Settlement is usually seconds
 * behind the payment and occasionally minutes. So: a background poll, an explicit "we
 * haven't seen it yet" line rather than a silent spinner, and permission to close the
 * tab — because a gym that closes it and comes back must be fine, and is.
 *
 * §5.3–5.8 used to be restated here clause by clause, and then cited by number. Neither
 * is on the screen now: the clauses are one step back in the agreement the gym has just
 * read and signed, so this screen offers that document rather than a précis of it or a
 * reference nobody can follow from here (§24).
 *
 * See docs/gym-onboarding.md §3 step 4 and §5.
 */

/** Background poll cadence while a payment is settling. */
const POLL_INTERVAL_MS = 5000;
/**
 * Roughly five minutes, then the poll stops and the manual button carries it. An
 * abandoned tab must not sit on our function forever, and a payment that has not
 * landed in five minutes has a problem a spinner will not solve.
 */
const MAX_POLLS = 60;
/** After this many silent polls, the copy stops promising and starts explaining. */
const SLOW_AFTER_POLLS = 3;

export default function StepDeposit({
  state,
  readOnly,
  isSubmitting,
  goToStep,
  actions,
}: StepViewProps) {
  const [link, setLink] = useState<DepositLink | null>(null);
  const [checkedAndNotFound, setCheckedAndNotFound] = useState(false);

  const amount = formatInr(state.terms.securityDepositInr);
  const status = state.depositStatus;
  const isPending = status === "pending";

  /**
   * Read-only means the gym came back to a completed step — except when it deferred,
   * where the outstanding ₹50,000 is exactly what it came back to pay. Money we are
   * owed must never be hard to hand over.
   */
  const canAct = !readOnly || status === "deferred";

  useBackgroundPoll(isPending, actions.pollDepositStatus, () => setCheckedAndNotFound(true));

  async function payNow() {
    setCheckedAndNotFound(false);
    const issued = await actions.chooseDeposit("pay_now");
    if (issued) setLink(issued);
  }

  async function checkNow() {
    // The button reports honestly on its own result: a "check" that silently changes
    // nothing reads as a broken button, and the gym clicks it six more times.
    const before = state.depositStatus;
    await actions.refreshDepositStatus();
    if (before === "pending") setCheckedAndNotFound(true);
  }

  if (status === "paid") {
    return <PaidPanel receipt={state.depositReceipt} amount={amount} email={state.details.noticesEmail} />;
  }

  return (
    <div className="space-y-6">
      {/* Only we can put a record here, so this says what is outstanding rather than
          reminding the gym of a choice it was never offered. */}
      {status === "deferred" && !isPending && (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
          data-testid="deposit-deferred"
        >
          <h2 className="text-base font-bold text-amber-900">Still outstanding</h2>
          <p className="text-sm text-amber-900 leading-relaxed mt-1">
            Your agreement stands and the site survey can go ahead. Installation is what waits for
            the {amount}.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6" data-testid="deposit-amount">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Refundable security deposit
            </h2>
            <p className="text-3xl font-black text-foreground mt-1 tracking-tight">{amount}</p>
          </div>
          <span
            className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 flex-shrink-0"
            data-testid="deposit-status"
          >
            <span className="sr-only">Deposit status: </span>
            {STATUS_LABEL[status]}
          </span>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed mt-3">
          One payment, held for the whole term. Not a fee or rent, and not part-payment for the
          machine.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-1">
          Refunded within 30 days of the machine being collected, less anything owing under the
          agreement.
        </p>

        {canAct && !isPending && (
          <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* The clauses on what the deposit can be adjusted against were restated on this
                screen until 2026-08-25. This is the document itself instead. */}
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(3)}
              className="min-h-11 rounded-xl text-sm font-semibold w-full sm:w-auto cursor-pointer"
              data-testid="button-read-agreement"
            >
              Read the agreement
            </Button>
            <Button
              type="button"
              onClick={payNow}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
              data-testid="button-continue"
            >
              {isSubmitting ? "Creating your link..." : `Pay ${amount} now`}
            </Button>
          </div>
        )}
      </section>

      {/* ── The link, once issued ─────────────────────────────────────────── */}
      {link && isPending && <LinkPanel link={link} amount={amount} />}

      {/* ── Waiting on the webhook ────────────────────────────────────────── */}
      {isPending && (
        <section
          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
          data-testid="deposit-waiting"
        >
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            Waiting for the payment to clear
          </h2>
          {/*
            A live region, because this sentence rewrites itself about fifteen seconds in
            and the step advances on its own when the webhook lands. Someone not watching
            the screen otherwise gets no indication that either happened.
          */}
          <p className="text-sm text-gray-700 leading-relaxed mt-1" role="status" aria-live="polite">
            {checkedAndNotFound
              ? "We still can't see it. UPI and transfers usually land in seconds, sometimes minutes. This page keeps checking and you can close the tab. If it hasn't cleared in an hour, reply to our email and we'll trace it."
              : "This page checks by itself every few seconds. You can close the tab: we confirm the payment from our own records, not from this browser."}
          </p>
          {canAct && (
            <Button
              type="button"
              variant="outline"
              onClick={checkNow}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl text-sm font-semibold mt-3 w-full sm:w-auto cursor-pointer"
              data-testid="button-refresh-deposit"
            >
              {isSubmitting ? "Checking..." : "I've paid, check now"}
            </Button>
          )}
        </section>
      )}

    </div>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not paid yet",
  pending: "Awaiting payment",
  paid: "Received",
  deferred: "Still to pay",
};

/**
 * The payment link, with the two things about it a gym needs told.
 *
 * That it can be forwarded — the reason we use links rather than a checkout — and
 * that leaving this page is expected rather than a mistake. An unexplained jump to a
 * `rzp.io` domain while paying ₹50,000 is exactly when people abandon.
 */
function LinkPanel({ link, amount }: { link: DepositLink; amount: string }) {
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-white p-4 sm:p-5" data-testid="deposit-link-panel">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <Wallet className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        Your payment link is ready
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        {amount} to MuscleBoxPro on Razorpay: UPI, netbanking, card or NEFT. We've emailed the same
        link, so this is not your only chance at it.
      </p>

      <a
        href={link.paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        // `bg-primary-fill`, matching `Button`: white on `--primary` is 3.25:1, and this
        // is a 14px bold label. The token is the same hue dark enough to carry it.
        className="mt-4 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary-fill text-primary-foreground font-bold text-sm w-full sm:w-auto hover:bg-primary-fill/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        data-testid="link-payment"
      >
        Open the payment page
        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        {/* It leaves the site for a payment gateway; that is worth saying rather than
            leaving as a surprise to anyone who cannot see the new tab open. */}
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      <p className="text-sm text-gray-700 leading-relaxed mt-3 flex items-start gap-2">
        <Forward className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-foreground">You don't have to be the one who pays.</strong> Forward
          this link to whoever releases payments. It works from their inbox, and we match it to your
          gym either way.
        </span>
      </p>

      {IS_MOCK_ONBOARDING && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3">
          Preview mode: this link is a placeholder and takes no money. Use "check now" twice to walk
          the settled path.
        </p>
      )}
    </section>
  );
}

/**
 * The receipt.
 *
 * Reached by revisiting a completed step 4 — on the live path, confirmation advances
 * the wizard straight to step 5, which says the same thing at the top. Kept because a
 * gym looking for its deposit reference will look here, and the record is the only
 * reason to come back to this step at all.
 *
 * It says a receipt is emailed and stops there. That word is now the settled position
 * rather than a hedge: a refundable deposit is not consideration for a supply under
 * CGST Act §2(31), so no GST is charged at collection and the document is a receipt,
 * not a tax invoice (agreement §5.9). The tax wording lives on the emailed document,
 * which is one place, rather than on every screen that mentions the money.
 */
function PaidPanel({
  receipt,
  amount,
  email,
}: {
  receipt: DepositReceipt | null;
  amount: string;
  email: string;
}) {
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      data-testid="deposit-paid"
    >
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        Deposit received: {amount}
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        A receipt is on its way to <strong className="text-foreground">{email}</strong> and stays in
        your dashboard under Deposit. Refundable within 30 days of the machine being collected, less
        anything owing.
      </p>

      {receipt && (
        <dl className="mt-4 pt-3 border-t border-primary/25 grid grid-cols-2 gap-3" data-testid="deposit-receipt">
          <Fact label="Receipt" value={receipt.receiptNo} mono />
          <Fact label="Paid" value={formatAgreementDate(receipt.paidAt)} />
          <Fact label="Amount" value={formatInr(receipt.amountPaise / 100)} />
          <Fact label="Method" value={receipt.method} />
        </dl>
      )}

      <p className="text-xs text-gray-700 leading-relaxed mt-3 flex items-start gap-2">
        <Receipt className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Keep the reference. It is what we both quote when the deposit is refunded at the end of the
          term, two years and a change of front-desk staff from now.
        </span>
      </p>
    </section>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">{label}</dt>
      {/*
        `title` alongside the `truncate`. Two columns of this at 375px is about 150px a
        cell, and a receipt number is the one value on the screen that has to be readable
        in full — it is what the gym quotes back to us when the deposit is refunded two
        years from now. Truncation with no way to recover the rest is a dead end on
        exactly that value, and the same fix step 5 already gives the fingerprint.
      */}
      <dd
        title={value}
        className={`text-sm text-foreground mt-0.5 truncate ${mono ? "font-mono" : "font-semibold"}`}
      >
        {value}
      </dd>
    </div>
  );
}

// ── The poll ────────────────────────────────────────────────────────────────

/**
 * Asks our own server, on a timer, while a payment is settling.
 *
 * A poll rather than a redirect handler because the redirect is not trustworthy and
 * not guaranteed: a gym that pays and closes the tab, or pays from a *forwarded* link
 * on somebody else's phone, never returns to this page at all. Polling our own record
 * covers every one of those paths with one mechanism, which is also why the return
 * trip from Razorpay needs no special handling here.
 *
 * It stops on its own (`MAX_POLLS`) and on unmount, and it never touches the wizard's
 * submitting state — see `pollDepositStatus` in `useOnboarding`.
 */
function useBackgroundPoll(active: boolean, poll: () => Promise<void>, onSlow: () => void) {
  const pollRef = useRef(poll);
  const slowRef = useRef(onSlow);
  pollRef.current = poll;
  slowRef.current = onSlow;

  useEffect(() => {
    if (!active) return;
    let polls = 0;

    const timer = setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) {
        clearInterval(timer);
        return;
      }
      // Not awaited and its result not inspected: the answer arrives as new state
      // through the hook, which is the only place the truth lives.
      void pollRef.current();
      // Around fifteen seconds in, stop saying "checking" and say what is actually
      // happening. A spinner that has been spinning for a while is a lie of omission.
      if (polls === SLOW_AFTER_POLLS) slowRef.current();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [active]);
}
