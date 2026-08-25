"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, Loader2 } from "lucide-react";
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
import { formatPaymentMethod } from "@shared/onboarding/receipt";
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
 * That is the whole reason for Razorpay Payment Links (§5). The screen used to explain
 * that in a paragraph of its own; since 2026-08-25 it does not, and the one clause left
 * of it is that we'll spot the payment "including from the copy in your email".
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

  /**
   * The money is ours and step 4 is still open, so the server has not finished with the
   * payment yet — the receipt is real, the step it completes has not landed.
   *
   * Rendered as a wait rather than an end state, and *polled*, because otherwise this is
   * the one paid screen with no way off it: the wizard advances when `currentStep` moves,
   * the rail cannot select a step the server has not opened, and there is no button here
   * that could help. Left unpolled it was a dead end on a screen where the gym has
   * already paid.
   */
  const settling = status === "paid" && state.currentStep === 4;

  const polling = (isPending || settling) && (phase === "confirm" || phase === "watch");

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
    return (
      <PaidPanel
        receipt={state.depositReceipt}
        amount={amount}
        email={state.details.noticesEmail}
        paidAt={state.timestamps.depositPaidAt}
        settling={settling}
        // `phase` rather than `polling`: it is null for the first render, and a live region
        // that opens on "it hasn't opened yet" and corrects itself a tick later announces
        // the pessimistic reading first.
        watching={phase !== "stopped"}
      />
    );
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
            {/* "Security deposit" and "refundable" are both already in the page heading
                and its blurb, a few centimetres above this. */}
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Amount to pay
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
          One payment. Not a fee or rent, and not part-payment for the machine.
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
                : `We'll spot it whenever it lands, including from the copy in your email${
                    phase === "stopped"
                      ? ". Reload this page to see where it stands."
                      : ", and this page moves on by itself. You can close the tab."
                  }`}
          </p>

          {canAct && !confirming && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
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
                {unconfirmed ? "Try the payment again" : "Pay deposit now"}
              </Button>
            </div>
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
 * Two ways here. Mostly a gym revisiting a completed step 4 — on the live path,
 * confirmation advances the wizard straight to step 5, which says the same thing at the
 * top. Kept because a gym looking for its deposit reference will look here, and the
 * record is the only reason to come back to this step at all. The other is `settling`:
 * paid, step 4 still open, waiting for the server to finish (see above).
 *
 * **The reference is the point of the screen, so it is built like it.** It used to be one
 * of four equal cells in a 2×2 grid — an 11px label and a truncated value, tied for
 * prominence with the word "card" — which put the one value a gym will come back for two
 * years from now in the least prominent shape available, and put it there twice over on a
 * phone by cutting it off. It is now a surface of its own with a copy button, and the
 * amount, method and date are one sentence instead of three cells.
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
  paidAt,
  settling,
  watching,
}: {
  receipt: DepositReceipt | null;
  amount: string;
  email: string;
  paidAt: string | null;
  settling: boolean;
  /** Still polling. False once the poll has run out, which changes what we can promise. */
  watching: boolean;
}) {
  const when = receipt?.paidAt ?? paidAt;
  const paidLine = [
    receipt ? formatInr(receipt.amountPaise / 100) : amount,
    receipt?.method ? `paid by ${formatPaymentMethod(receipt.method)}` : "paid",
    when ? `on ${formatAgreementDate(when)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    /*
      A white card like every other card in the wizard, with the green confined to the tick.
      A tinted panel was tried both ways and neither works at this size: the brand tint is
      the same orange as every unpaid state on the screen, and a green field is a second hue
      competing with an orange rail and an orange logo directly above it. One green glyph is
      enough to say "received" — the heading says it in words anyway.
    */
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="deposit-paid"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">Deposit received</h2>
          <p
            className="text-lg sm:text-xl font-black text-foreground tracking-tight mt-0.5"
            data-testid="deposit-paid-summary"
          >
            {paidLine}
          </p>
        </div>
      </div>

      {receipt && (
        <div
          className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4"
          data-testid="deposit-receipt"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Receipt reference
          </p>
          <div className="flex items-start gap-2 mt-1">
            {/*
              `break-all`, not `truncate`. A reference is 18 characters of mono in about
              150px of phone, and the old cell cut it off behind a `title` attribute that a
              touch screen has no way to open — on the one value that has to be readable in
              full, because it is what the gym quotes back to us at refund time. `pt-3`
              centres one line against the 44px button, and survives a wrap.
            */}
            <code className="flex-1 min-w-0 text-sm font-mono text-foreground break-all pt-3">
              {receipt.receiptNo}
            </code>
            <CopyButton value={receipt.receiptNo} />
          </div>
          <p className="text-xs text-gray-700 leading-relaxed mt-2">
            Quote this when you ask us about the payment, and when the deposit is refunded at the
            end of the term.
          </p>
        </div>
      )}

      <p className="text-sm text-gray-700 leading-relaxed mt-4">
        We've emailed the receipt to <strong className="text-foreground">{email}</strong>, and it
        stays in your dashboard under Deposit.
      </p>

      {settling && (
        <p
          className="text-sm text-gray-700 leading-relaxed mt-4 pt-4 border-t border-gray-200 flex items-start gap-2"
          role="status"
          aria-live="polite"
          data-testid="deposit-settling"
        >
          {watching ? (
            /* Brand, not green: this one is progress, and the tick above is the outcome. */
            <Loader2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5 animate-spin" aria-hidden="true" />
          ) : (
            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>
            {watching
              ? "We're opening your next step. Nothing more is needed from you, and this page moves on by itself."
              : "Your next step hasn't opened yet. Your payment is safe — reload this page to pick up from here."}
          </span>
        </p>
      )}
    </section>
  );
}

/**
 * A labelled button rather than `size="icon"`: that variant is 36px, and this one is
 * pressed on a phone by somebody copying a reference into an email to their accountant.
 */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // No clipboard permission or no secure context. The reference is selectable text on
      // screen, so this button is a convenience rather than the only way to get it out.
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={copy}
        className="min-h-11 px-3 rounded-xl text-xs font-bold flex-shrink-0 cursor-pointer"
        data-testid="button-copy-receipt-no"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
      {/* The label change is not announced on its own, and a copy that says nothing reads
          as a button that did nothing. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Receipt reference copied" : ""}
      </span>
    </>
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
