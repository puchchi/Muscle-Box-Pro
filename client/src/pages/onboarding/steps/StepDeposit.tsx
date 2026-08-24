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
 * Deliberately after signing (§5.1 makes the deposit an obligation *of* the agreement,
 * so asking for money before there is one is both bad law and bad manners) and
 * deliberately skippable. "Pay later" is a first-class outcome, not a hidden escape
 * hatch: a gym that has signed is onboarded, and blocking its portal on a ₹50,000
 * transfer that its accountant does on Fridays would strand it.
 *
 * Four decisions this screen encodes:
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
 * **§5.4–5.7 are on the screen.** What the deposit can be adjusted against is the
 * clause most likely to cause an argument in month nine. It is stated at the moment
 * money changes hands, in plain words, with the clause numbers.
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

export default function StepDeposit({ state, readOnly, isSubmitting, actions }: StepViewProps) {
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
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" data-testid="deposit-amount">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Refundable security deposit
            </h2>
            <p className="text-3xl font-black text-foreground mt-1 tracking-tight">{amount}</p>
            <p className="text-sm text-gray-700 mt-1 max-w-[68ch]">
              One payment, held for the whole term. Not a fee, not rent, and not part-payment for the
              machine.
            </p>
          </div>
          <span
            className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 flex-shrink-0"
            data-testid="deposit-status"
          >
            <span className="sr-only">Deposit status: </span>
            {STATUS_LABEL[status]}
          </span>
        </div>

        <dl className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {DEPOSIT_FACTS.map((fact) => (
            <div key={fact.clause} className="flex items-start gap-3">
              <dt className="text-xs font-bold text-primary-ink bg-primary/10 rounded px-2 py-0.5 flex-shrink-0 tabular-nums">
                §{fact.clause}
              </dt>
              <dd className="text-sm text-gray-700 leading-relaxed max-w-[68ch]">{fact.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── The link, once issued ─────────────────────────────────────────── */}
      {link && isPending && <LinkPanel link={link} amount={amount} />}

      {/* ── Waiting on the webhook ────────────────────────────────────────── */}
      {isPending && (
        <section
          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
          data-testid="deposit-waiting"
        >
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            Waiting for the payment to clear
          </h2>
          {/*
            A live region, because this sentence rewrites itself about fifteen seconds in
            and the step advances on its own when the webhook lands. Someone not watching
            the screen otherwise gets no indication that either happened.
          */}
          <p className="text-sm text-gray-700 leading-relaxed mt-1 max-w-[68ch]" role="status" aria-live="polite">
            {checkedAndNotFound
              ? "We still can't see it. Bank transfers and UPI usually land in seconds but can take a few minutes. This page updates itself, and you can close the tab. If it hasn't cleared in an hour, reply to our email and we'll trace it."
              : "This page checks by itself every few seconds. You can safely close the tab, because we confirm the payment from our own records, not from this browser, so nothing depends on you staying here."}
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

      {/* ── Deferred, revisited ───────────────────────────────────────────── */}
      {status === "deferred" && !isPending && (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
          data-testid="deposit-deferred"
        >
          <h2 className="text-sm font-bold text-amber-900">Still outstanding</h2>
          <p className="text-sm text-amber-900 leading-relaxed mt-1 max-w-[68ch]">
            You chose to pay this later, which is fine: your agreement stands and the site survey can
            go ahead. Installation is what waits for the {amount}. The link below is the same one in
            your email.
          </p>
        </section>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {canAct && !isPending && (
        <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center gap-3">
          <Button
            type="button"
            onClick={payNow}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
            data-testid="button-continue"
          >
            {isSubmitting ? "Creating your link..." : `Pay ${amount} now`}
          </Button>
          {status === "not_started" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => actions.chooseDeposit("pay_later")}
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer"
              data-testid="button-pay-later"
            >
              I'll pay this later
            </Button>
          )}
        </div>
      )}

      {status === "not_started" && canAct && (
        <p className="text-xs text-gray-700 leading-relaxed max-w-[68ch]">
          Paying later does not hold anything up except installation, and it does not change your
          agreement. We'll email the same link and it stays in your dashboard under Deposit.
        </p>
      )}
    </div>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

/**
 * §5 in five lines.
 *
 * Written as what happens rather than as what we may do, and it includes the parts
 * that are not in the gym's favour — §5.6's forfeiture and §5.7's liability beyond the
 * deposit. A gym that reads only this screen and later hits §5.6 should recognise it.
 */
const DEPOSIT_FACTS = [
  {
    clause: "5.3",
    text: "It secures your obligations under the agreement. While nothing is owing, it just sits there.",
  },
  {
    clause: "5.4",
    text: "It can be adjusted against damage, missing parts or accessories, unauthorised modification, moving the machine without approval, misuse, repair and recovery costs, and anything else unpaid.",
  },
  {
    clause: "5.5",
    text: "For ordinary accidental damage we deduct the actual reasonable repair cost, not a fixed penalty.",
  },
  {
    clause: "5.6–5.7",
    // The two clauses this used to cite by number are the ones about not opening the machine and
    // not moving it. Named in words instead: the number was only useful to someone already holding
    // the agreement, and the label beside this line is where a clause number belongs.
    text: "Deliberate, reckless or severe damage can forfeit the whole deposit, and anything the damage costs beyond it is still owed. This is the harshest clause in the agreement, and the reason to read what you may and may not do with the machine before you sign.",
  },
  {
    clause: "5.8",
    text: "When the term ends and the machine is collected, we settle what is owing and refund the rest within 30 days.",
  },
] as const;

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not paid yet",
  pending: "Awaiting payment",
  paid: "Received",
  deferred: "You chose to pay later",
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
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Wallet className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        Your payment link is ready
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1 max-w-[68ch]">
        {amount} to MuscleBoxPro, on Razorpay. UPI, netbanking, card or NEFT, whatever your
        accounts team prefers. We've emailed the same link, so this is not your only chance at it.
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

      <p className="text-sm text-gray-700 leading-relaxed mt-3 flex items-start gap-2 max-w-[68ch]">
        <Forward className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-foreground">You don't have to be the one who pays.</strong> Forward
          this link to whoever releases payments. It works from their inbox, on their device, and we
          match it to your gym either way.
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
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        Deposit received: {amount}
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1 max-w-[68ch]">
        Thank you. A receipt is on its way to <strong className="text-foreground">{email}</strong>, and
        it stays in your dashboard under Deposit. It is refundable within 30 days of the machine being
        collected, less anything owing.
      </p>

      {receipt && (
        <dl className="mt-4 pt-3 border-t border-primary/25 grid grid-cols-2 gap-3" data-testid="deposit-receipt">
          <Fact label="Receipt" value={receipt.receiptNo} mono />
          <Fact label="Paid" value={formatAgreementDate(receipt.paidAt)} />
          <Fact label="Amount" value={formatInr(receipt.amountPaise / 100)} />
          <Fact label="Method" value={receipt.method} />
        </dl>
      )}

      <p className="text-xs text-gray-700 leading-relaxed mt-3 flex items-start gap-2 max-w-[68ch]">
        <Receipt className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Keep the reference. It is what we both quote when the deposit is refunded at the end of the
          term, which may be two years and a change of front-desk staff from now.
        </span>
      </p>
    </section>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">{label}</dt>
      <dd className={`text-sm text-foreground mt-0.5 truncate ${mono ? "font-mono" : "font-semibold"}`}>
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
