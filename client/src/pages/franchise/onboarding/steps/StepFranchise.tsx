"use client";

import { useState } from "react";
import { Building2, Coins, Info, Megaphone, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MACHINE_RIGHTS, formatInr, franchiseTier } from "@shared/franchise/program";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 5 — Your franchise.
 *
 * The commercial terms, read once and acknowledged, before there is a term sheet to sign. The
 * gym flow's step 2 does the same job and this follows it: the numbers are shown in their own
 * words with the mechanism explained, not as a table to skim past.
 *
 * **Every figure comes from `state.terms`, never from `program.ts`.** The published programme
 * leaves the City Franchise's recovery threshold and payment schedule to the definitive
 * agreement, so a screen rendering the published numbers would show a Territory figure to a City
 * franchisee. `program.ts` is where a new record's defaults come from and nothing else. The one
 * exception on this screen is the ownership list, which is the same for both tiers and is not a
 * number.
 *
 * **The 100% share is a recovery mechanism, not a margin.** That is the single most misread term
 * in the programme, so it is stated on the split itself rather than in prose below it, and
 * advertising says on its own row that it never counts toward recovery.
 *
 * A missing payment schedule or recovery threshold is not hidden here. It is exactly what stops
 * a term sheet being issued at step 7, so this screen names it as something we still have to set
 * rather than printing a blank.
 */
/**
 * A sentence-leading trigger, continuing a sentence that started with the amount.
 *
 * First character only. `toLowerCase()` on the whole string turned "When machines are ready at
 * the OEM" into "at the oem".
 */
function continuing(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export default function StepFranchise({
  state,
  isSubmitting,
  actions,
}: FranchiseStepViewProps) {
  const { terms } = state;
  const tier = franchiseTier(terms.tier);
  const [acknowledged, setAcknowledged] = useState(state.timestamps.franchiseAckAt !== null);
  const alreadyAcked = state.timestamps.franchiseAckAt !== null;

  const investmentInr = terms.investmentPaise / 100;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" data-testid="franchise-headline">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
          {tier.shortName}
        </p>
        <p className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight">
          {formatInr(investmentInr)}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
          For {terms.machineAllocation} machines and the right to develop{" "}
          {state.approval?.outcome === "approved" ? state.approval.territory : tier.marketRights.toLowerCase()}.
        </p>
      </section>

      <Block
        icon={<Coins className="w-4 h-4 text-primary-ink" aria-hidden="true" />}
        title="How you pay"
        testId="franchise-schedule"
      >
        {terms.paymentSchedule ? (
          <ol role="list" className="space-y-2.5">
            {terms.paymentSchedule.map((instalment, index) => (
              <li key={instalment.trigger} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-ink text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground leading-relaxed">
                  <strong className="tabular-nums">
                    {formatInr((investmentInr * instalment.pct) / 100)}
                  </strong>{" "}
                  ({instalment.pct}%) {continuing(instalment.trigger)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Pending what="the instalment schedule" />
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          The first instalment is a bank transfer, at step 8, after you have signed. We verify it
          against our statement rather than taking a card payment.
        </p>
      </Block>

      <Block
        icon={<TrendingUp className="w-4 h-4 text-primary-ink" aria-hidden="true" />}
        title="How you earn"
        testId="franchise-splits"
      >
        <Split
          heading={`${terms.proteinSharePctDuringRecovery}% of protein profit, until you have recovered your capital`}
          body={
            terms.capitalRecoveryPaise !== null ? (
              <>
                That runs until {formatInr(terms.capitalRecoveryPaise / 100)} has reached you. It
                is how the investment comes back, not a permanent margin, and it stops when the
                threshold is met.
              </>
            ) : (
              <Pending what="your recovery threshold" inline />
            )
          }
        />
        <Split
          heading={`${terms.proteinSharePctAfterRecovery}% of protein profit after that`}
          body="The ongoing share, for as long as the franchise runs."
        />
      </Block>

      <Block
        icon={<Megaphone className="w-4 h-4 text-primary-ink" aria-hidden="true" />}
        title="Advertising"
        testId="franchise-advertising"
      >
        <Split
          heading={`${terms.advertisingFranchiseeSharePct}% of advertising revenue from your machines`}
          body={`We keep ${terms.advertisingMbpSharePct}%. This is separate money from the protein business, it starts as soon as the machines are live, and it never counts toward your capital recovery.`}
        />
      </Block>

      <Block
        icon={<Building2 className="w-4 h-4 text-primary-ink" aria-hidden="true" />}
        title="What you're buying"
        testId="franchise-rights"
      >
        {/* Two lists rather than one with ticks and crosses, for the reason `MACHINE_RIGHTS`
            gives: a tick beside "cannot sell a machine" reads as a benefit. A franchise buys an
            operating right rather than the machines, and that has to be unambiguous before
            anybody transfers ₹12,50,000. */}
        <p className="text-sm text-foreground font-semibold">You may</p>
        <ul role="list" className="space-y-1.5">
          {MACHINE_RIGHTS.may.map((item) => (
            <li key={item} className="text-sm text-muted-foreground flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-sm text-foreground font-semibold pt-1">You may not</p>
        <ul role="list" className="space-y-1.5">
          {MACHINE_RIGHTS.mayNot.map((item) => (
            <li key={item} className="text-sm text-muted-foreground flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The machines stay ours. What you hold is the right to operate them in your territory,
          and that is what the term sheet grants.
        </p>
      </Block>

      {!alreadyAcked && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
          <label
            htmlFor="franchise-ack"
            className="flex items-start gap-2.5 cursor-pointer py-2.5"
          >
            <input
              id="franchise-ack"
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="w-4 h-4 mt-0.5 flex-shrink-0 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="checkbox-franchise-ack"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I've read these terms and they match what we discussed.
            </span>
          </label>
          {/* Not a signature, and it says so. The tick records that this screen was read
              before the term sheet was issued, which is what makes "you were shown the splits"
              a fact on the record rather than an assumption. */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
              This is not the signature. That is step 7.
            </p>
            <Button
              type="button"
              disabled={!acknowledged || isSubmitting}
              onClick={() => void actions.ackFranchise()}
              className="min-h-11 px-6 rounded-xl font-bold text-sm cursor-pointer flex-shrink-0"
              data-testid="button-continue"
            >
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({
  icon,
  title,
  testId,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" data-testid={testId}>
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Split({ heading, body }: { heading: string; body: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
      <p className="text-sm font-semibold text-foreground">{heading}</p>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{body}</p>
    </div>
  );
}

/**
 * A number an admin has not set yet.
 *
 * Named rather than blanked, because this is the mechanism that stops a term sheet being issued
 * for a franchise whose commercials are incomplete. A franchisee who reaches step 7 and cannot
 * sign should already have seen why on this screen.
 */
function Pending({ what, inline }: { what: string; inline?: boolean }) {
  const text = `We still have to agree ${what} with you. It goes on your term sheet, and until it is set there is nothing to sign.`;
  if (inline) return <>{text}</>;
  return (
    <p className="text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed">
      {text}
    </p>
  );
}
