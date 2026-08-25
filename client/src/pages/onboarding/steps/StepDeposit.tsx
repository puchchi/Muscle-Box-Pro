"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Forward,
  Loader2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_MOCK_ONBOARDING } from "@/lib/onboardingApi";
import {
  forgetPaymentAttempt,
  readPaymentUrl,
  rememberPaymentAttempt,
  takeReturnedFromGateway,
} from "@/lib/depositReturn";
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
 * **The link is a journey, not a URL to hand over.** Since 2026-08-25 paying navigates
 * this tab to the payment page and the link's `callback_url` brings the gym back to the
 * wizard (§25). The card that used to sit here offering an `_blank` anchor was a third
 * card on the screen and a dead end for anyone who took it. Coming back is what
 * `lib/depositReturn.ts` is for; the return trip carries no handle.
 *
 * **This screen never decides that money arrived.** It asks our own server, which
 * reads the record the webhook wrote. Nothing here trusts the redirect back from the
 * gateway — coming back only changes what the screen *says* it is doing — and there is
 * no client callback that could mark a deposit paid.
 *
 * **Pay, then an outcome. Nothing to press in between.** There is no "check now" button
 * and no state that asks the gym to assert anything (§26). Coming back from Razorpay puts
 * the screen into a short, fast confirmation — a second or two in practice, because the
 * webhook is already in flight — and it ends either on the receipt or on "we couldn't
 * confirm it", which offers help before it offers a second attempt. Paying twice is the
 * expensive mistake here, not waiting a moment longer.
 *
 * **The slow wait is a revisit, not a dead end.** After the pay button this tab is *gone*,
 * so "waiting for the payment" is what a gym sees when it reopens the link while somebody
 * else pays from the forwarded copy. It watches quietly at a walking pace and advances by
 * itself; there is nothing to press because there is nothing this gym can do.
 *
 * §5.3–5.8 used to be restated here clause by clause, and then cited by number. Neither
 * is on the screen now: the clauses are one step back in the agreement the gym has just
 * read and signed, so this screen offers that document rather than a précis of it or a
 * reference nobody can follow from here (§24).
 *
 * See docs/gym-onboarding.md §3 step 4 and §5.
 */

/**
 * Two cadences, because the two waits are different waits.
 *
 * Straight back from the gateway, somebody is watching the screen and the webhook is
 * seconds away: check hard, and reach an answer inside half a minute. An open tab nobody
 * is reading while an accountant pays: walk, and stop after five minutes rather than hold
 * our own function open all afternoon.
 *
 * Running out of `CONFIRM` moves to `WATCH` rather than stopping. The screen says it
 * couldn't confirm the payment, and keeps watching anyway — a webhook that arrives at
 * ninety seconds still advances the wizard by itself, with nobody having pressed anything.
 */
const CONFIRM = { intervalMs: 1500, maxPolls: 20 };
const WATCH = { intervalMs: 5000, maxPolls: 60 };

type PollPhase = "confirm" | "watch" | "stopped";

export default function StepDeposit({
  state,
  readOnly,
  isSubmitting,
  goToStep,
  actions,
}: StepViewProps) {
  const [link, setLink] = useState<DepositLink | null>(null);
  const [rememberedUrl, setRememberedUrl] = useState<string | null>(null);
  const [cameBack, setCameBack] = useState(false);
  /**
   * Null until the mount effect has read whether a gateway sent this tab back, because the
   * answer picks the cadence — and no read is worth making at the wrong one. Starting at
   * `"watch"` polled once on the way past it, so every return burned two reads on arrival.
   */
  const [phase, setPhase] = useState<PollPhase | null>(null);

  const amount = formatInr(state.terms.securityDepositInr);
  const status = state.depositStatus;
  const isPending = status === "pending";

  /**
   * Read-only means the gym came back to a completed step — except when it deferred,
   * where the outstanding ₹50,000 is exactly what it came back to pay. Money we are
   * owed must never be hard to hand over.
   */
  const canAct = !readOnly || status === "deferred";

  /** Just back from the gateway, and our record has not caught up yet. */
  const confirming = cameBack && phase === "confirm";
  /**
   * Back from the gateway, and half a minute of asking has not produced the money.
   *
   * Deliberately not called "failed". Razorpay only redirects here after a payment it
   * considers successful, so the likely readings of this state are a late webhook and a
   * payment still clearing — not a decline. Saying "failed" would invite a second ₹50,000
   * for one obligation, which is the one mistake on this screen that costs real money to
   * undo. A real decline would have to come from our record, not from this timer (§26).
   */
  const unconfirmed = cameBack && phase !== "confirm";
  const paymentUrl = link?.paymentUrl ?? rememberedUrl;

  useEffect(() => {
    const returned = takeReturnedFromGateway();
    setCameBack(returned);
    setPhase(returned ? "confirm" : "watch");
    setRememberedUrl(readPaymentUrl());
  }, []);

  useEffect(() => {
    // Nothing left to come back to, and a stale payment URL in storage would offer a
    // settled obligation a second way to be paid.
    if (status === "paid") forgetPaymentAttempt();
  }, [status]);

  const polling = isPending && (phase === "confirm" || phase === "watch");

  useBackgroundPoll(polling, actions.pollDepositStatus, {
    ...(phase === "confirm" ? CONFIRM : WATCH),
    onExhausted: () => setPhase((p) => (p === "confirm" ? "watch" : "stopped")),
  });

  async function payNow() {
    const issued = await actions.chooseDeposit("pay_now");
    if (!issued) return;
    setLink(issued);
    goToPayment(issued.paymentUrl);
  }

  /**
   * Leaves for the payment page in this tab, having stashed the way back.
   *
   * Same tab rather than `_blank`: a new tab leaves the page that owns the truth sitting
   * behind the one taking the money, and the gym ends up with two of them and no idea
   * which reports the result. The way back is the link's `callback_url` (§25).
   */
  function goToPayment(url: string) {
    rememberPaymentAttempt({ returnTo: window.location.pathname, paymentUrl: url });
    if (IS_MOCK_ONBOARDING) {
      // No gateway to leave for, so the round trip happens here: preview lands directly in
      // the state the tab really comes back in, which is the state worth previewing.
      setCameBack(true);
      setPhase("confirm");
      return;
    }
    window.location.assign(url);
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

      {/* ── Waiting on the webhook ────────────────────────────────────────── */}
      {isPending && (
        <section
          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
          data-testid="deposit-waiting"
        >
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            {confirming ? (
              <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" aria-hidden="true" />
            ) : unconfirmed ? (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            )}
            {confirming
              ? "Confirming your payment"
              : unconfirmed
                ? "We couldn't confirm your payment"
                : "Waiting for the payment"}
          </h2>
          {/*
            A live region: the step advances on its own when the webhook lands, and this
            sentence is rewritten when it does not. Someone not watching the screen
            otherwise gets no indication that either happened.
          */}
          <p className="text-sm text-gray-700 leading-relaxed mt-1" role="status" aria-live="polite">
            {confirming
              ? "Back from Razorpay. We confirm from our own records rather than from this page, so this takes a moment."
              : unconfirmed
                ? `Razorpay sent you back, but the ${amount} has not reached our record. If your bank shows it as gone, don't pay again — tell us and we'll trace it and send your receipt. ${
                    phase === "stopped"
                      ? "This page has stopped watching; reload it to see where it stands."
                      : "We're still watching, and this page moves on by itself if it lands."
                  }`
                : `${amount} on Razorpay: UPI, netbanking, card or NEFT. We'll spot it whenever it lands, including from the copy in your email${
                    phase === "stopped"
                      ? ". Reload this page to see where it stands."
                      : ", and this page moves on by itself. You can close the tab."
                  }`}
          </p>

          {canAct && !confirming && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {/*
                Help before a second attempt, and in that order on purpose. This state is
                far more often a late webhook than a decline, so the button most likely to
                be right is the one that does not move ₹50,000.
              */}
              {unconfirmed && (
                <Button
                  asChild
                  className="h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
                  data-testid="button-deposit-help"
                >
                  <a href="mailto:contact@muscleboxpro.com?subject=Deposit%20payment">
                    Tell us about this payment
                  </a>
                </Button>
              )}
              {/*
                A tab that has been reopened has no payment URL — `sessionStorage` died with
                the tab that left — so this asks for the link again rather than rendering
                nothing. `POST /gym/deposit` must hand back the *existing* open link for a
                pending deposit; a second link for one ₹50,000 is a second ₹50,000 (§26).
              */}
              <Button
                type="button"
                variant={unconfirmed ? "outline" : "default"}
                onClick={() => (paymentUrl ? goToPayment(paymentUrl) : payNow())}
                disabled={isSubmitting}
                className={
                  unconfirmed
                    ? "min-h-11 rounded-xl text-sm font-semibold w-full sm:w-auto cursor-pointer"
                    : "h-11 px-6 rounded-xl font-bold text-sm w-full sm:w-auto cursor-pointer"
                }
                data-testid="button-open-payment"
              >
                {unconfirmed ? "Try the payment again" : "Open the payment page"}
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/*
            The reason this is a link rather than a checkout, said where the link is. Only
            while nobody has paid yet: after the gateway has sent someone back, telling them
            to forward it invites a second payment.
          */}
          {!cameBack && (
            <p className="text-sm text-gray-700 leading-relaxed mt-4 flex items-start gap-2">
              <Forward className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-foreground">You don't have to be the one who pays.</strong>{" "}
                Forward the emailed link to whoever releases payments. It works from their inbox,
                and we match it to your gym either way.
              </span>
            </p>
          )}

          {IS_MOCK_ONBOARDING && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3">
              Preview mode: there is no gateway, so paying lands straight in the state the tab
              comes back in and the mock confirms on its second read.
            </p>
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
 * It stops on its own (`maxPolls`) and on unmount, and it never touches the wizard's
 * submitting state — see `pollDepositStatus` in `useOnboarding`. Running out calls back,
 * so the screen can say so: a poll that expires quietly leaves a gym reading "this page
 * moves on by itself" next to a page that has not checked for an hour.
 *
 * The first read happens immediately rather than one interval in. On the way back from
 * the gateway the webhook has usually already landed, so the answer is often there before
 * the spinner has turned once — and waiting a beat to ask for it is a beat of nothing.
 */
function useBackgroundPoll(
  active: boolean,
  poll: () => Promise<void>,
  {
    intervalMs,
    maxPolls,
    onExhausted,
  }: { intervalMs: number; maxPolls: number; onExhausted: () => void },
) {
  const pollRef = useRef(poll);
  const exhaustedRef = useRef(onExhausted);
  pollRef.current = poll;
  exhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!active) return;
    let polls = 1;
    // Not awaited and its result not inspected: the answer arrives as new state
    // through the hook, which is the only place the truth lives.
    void pollRef.current();

    const timer = setInterval(() => {
      polls += 1;
      if (polls > maxPolls) {
        clearInterval(timer);
        exhaustedRef.current();
        return;
      }
      void pollRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [active, intervalMs, maxPolls]);
}
