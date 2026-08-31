"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import {
  franchiseRoughTotalMinutes,
  franchiseTimedSteps,
} from "@shared/franchise/onboarding/steps";

/**
 * The cold open, and on the first pass through step 1 the page's own header.
 *
 * `OnboardingIntro` makes the case for all of that and it is not re-argued here: a form
 * arriving from an email asking for a PAN and a registered address reads like a phishing page
 * unless something above it says who sent it, and the card that says so has to carry the `h1`
 * or the document opens on an `h2`.
 *
 * Two things this one has to do that the gym's does not.
 *
 * *Name the two waits.* Nine steps is a long list, and two of them are not the franchisee's:
 * approval at step 4 and our verification of the transfer at step 8. Someone who reaches step
 * 3, submits, and then finds a screen with no button needs to have been told that was coming.
 *
 * *Say what signing means.* This flow ends in a binding term sheet over a ₹25 lakh commitment,
 * so the sentence that matters most is the one about where the commitment starts. It is step 7,
 * and everything before it is an application.
 */
export default function FranchiseOnboardingIntro({
  invitedByName,
  franchiseDisplayName,
  headingRef,
}: {
  invitedByName: string;
  franchiseDisplayName: string;
  /** The shell's step-focus ref. On this one pass the step's heading is in here. */
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 mb-6"
      data-testid="franchise-onboarding-intro"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-primary-ink mb-2">
        {invitedByName} sent you this link
      </p>
      {/* Sentence case and `font-bold` rather than the flow's uppercase display black, for the
          reason `OnboardingIntro` gives: this is the one headline that interpolates a name of
          unknown length, and a long entity name in uppercase is three lines of shouting. */}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground mb-2 outline-none"
      >
        Let's get {franchiseDisplayName} started
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Nine steps in four stages. You apply with your details, your territory and your
        documents. We review the market and confirm the territory with you. Then you read the
        term sheet and sign it, and the first instalment follows. Nothing is committed until you
        sign at step 7, so everything before that is an application you can leave and come back
        to.
      </p>
      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
        Two of the nine are ours rather than yours. Approval takes us a few working days, and
        verifying your transfer takes us one. Both of those steps tell you where they stand
        whenever you open this link.
      </p>

      {/* The steps that cost the franchisee time, with what each one costs. Step 4 is not in
          this list because it is not their work, and "Approval, 0 minutes" reads worse than an
          absence. See `franchiseTimedSteps`.

          `role="list"` because Tailwind's preflight removes it and Safari drops the role with
          the marker. These links are opened from email, which on iOS means Safari. */}
      <ol
        role="list"
        className="mt-4 flex flex-wrap gap-x-6 gap-y-2"
        data-testid="franchise-intro-steps"
      >
        {franchiseTimedSteps().map((meta) => (
          <li key={meta.step} className="text-xs whitespace-nowrap">
            <span className="font-semibold text-foreground">{meta.shortTitle}</span>{" "}
            <span className="text-muted-foreground tabular-nums">{meta.estimate}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-5">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {/* Rounded to the nearest five, and still derived from the step list rather than
              typed here. "Your time" is the load-bearing word: the calendar length of this
              flow is set by our approval, which is not a duration we can promise. */}
          About {franchiseRoughTotalMinutes()} minutes of your time in total. You can stop
          anywhere and come back to this same link.
        </p>
        <Link
          href="/franchise"
          target="_blank"
          rel="noopener"
          className="text-xs font-semibold text-primary-ink hover:underline flex items-center gap-1 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="link-franchise-program"
        >
          The programme, restated
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      </div>
    </div>
  );
}
