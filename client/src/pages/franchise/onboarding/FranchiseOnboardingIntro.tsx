"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { franchiseRoughTotalMinutes } from "@shared/franchise/onboarding/steps";
import { BODY_TEXT } from "./shell";

/**
 * The cold open, and on the first pass through step 1 the page's own header.
 *
 * `OnboardingIntro` makes the case for all of that and it is not re-argued here: a form
 * arriving from an email asking for a PAN and a registered address reads like a phishing page
 * unless something above it says who sent it, and the card that says so has to carry the `h1`
 * or the document opens on an `h2`.
 *
 * ## Four sentences, because the first screenful is not for reading
 *
 * This card used to be two paragraphs, a list of four stages with a duration each, and a total. It
 * pushed the first input below the fold on a 900px screen: the whole opening view was preamble in
 * front of a form nobody had been given a reason to distrust. Most of it was also already on the
 * screen twice over. **The stage list is `PhaseNav`**, three inches to the left and on every screen
 * after this one. **The per-step durations are `PhaseSteps`**, which the shell now renders under the
 * form on this screen too, so "Your territory, 3 minutes" is a row next to the step it describes
 * rather than a line in a paragraph about the future.
 *
 * What is left is what nothing else says:
 *
 * *Who sent it, and to whom.* The eyebrow and the `h1`.
 *
 * *Where the commitment starts.* This flow ends in a binding term sheet over a ₹25 lakh
 * commitment, so the sentence that matters most is the one saying everything before the signature
 * is an application. It stays in body copy rather than moving to a footnote.
 *
 * *That one stage is not theirs.* Someone who finishes the application, submits, and finds a screen
 * with no button needs to have been told that was coming. Approval is the only wait long enough to
 * read as a broken page, so it is the only one named here; the day we take to verify a transfer is
 * step 8's own screen, four stages and a signature away.
 *
 * The copy says stages, not step numbers. The chrome stopped counting to nine when the nav became
 * four stages, and an intro promising "step 7" would point at a number the franchisee never sees.
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
      className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
      data-testid="franchise-onboarding-intro"
    >
      <p className="text-xs font-semibold text-primary-ink mb-1.5">
        {invitedByName} sent you this link
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-2 outline-none"
      >
        Let's get {franchiseDisplayName} started
      </h1>
      <p className={BODY_TEXT}>
        Four stages, and about {franchiseRoughTotalMinutes()} minutes of your work in total. Nothing
        is committed until you sign the agreement in stage three, so everything before that is an
        application.
      </p>

      <div className="mt-4 pt-3.5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-5">
        <p className="text-xs text-muted-foreground flex items-start sm:items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px sm:mt-0" aria-hidden="true" />
          Stage two is ours. Approval takes us a few working days.
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
