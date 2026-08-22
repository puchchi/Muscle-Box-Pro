"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { STEP_META, totalEstimateMinutes } from "@shared/onboarding/steps";

/**
 * The cold open, above the step 1 form.
 *
 * Step 1 is a form, and a form with no frame around it — arriving from an email,
 * asking for a GSTIN and a signatory — reads like a phishing page. This says who
 * sent it, what the five steps are, and that stopping halfway is safe.
 *
 * It stays short on purpose. The link arrives off the back of a sales call, so the
 * deal has already been explained once; re-selling it here delays the thing we
 * actually want, which is the details. Anyone who does want the deal restated gets
 * `/gym-partnership` in one click.
 *
 * Shown only on the first pass through step 1 — a gym coming back to check what it
 * typed does not need to be introduced to the process again.
 */
export default function OnboardingIntro({
  invitedByName,
  gymDisplayName,
}: {
  invitedByName: string;
  gymDisplayName: string;
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 mb-6"
      data-testid="onboarding-intro"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">
        {invitedByName} sent you this link
      </p>
      <h2 className="text-lg sm:text-xl font-display font-black uppercase tracking-tight text-foreground mb-2">
        Let's get {gymDisplayName} set up
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Five short steps: your details, your terms, the agreement, the refundable deposit, and your
        dashboard password. Nothing is committed until you sign in step 3, and the deposit can wait
        until after that.
      </p>

      <ol className="flex flex-wrap gap-x-2 gap-y-1.5 mt-4" data-testid="intro-steps">
        {STEP_META.map((meta, index) => (
          <li key={meta.step} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{meta.shortTitle}</span>
            {index < STEP_META.length - 1 && <span aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>

      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {/*
            An estimate, not a promise, and it is the sum of the per-step estimates
            in STEP_META rather than a number typed here — so it moves when a step's
            scope does. Step 3 is most of it: reading a contract takes as long as it
            takes.
          */}
          About {totalEstimateMinutes()} minutes in total. You can stop anywhere and come back to
          this same link.
        </p>
        <Link
          href="/gym-partnership"
          target="_blank"
          rel="noopener"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          data-testid="link-partnership"
        >
          The deal, restated
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
