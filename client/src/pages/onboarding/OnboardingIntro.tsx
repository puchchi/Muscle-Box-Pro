"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { roughTotalMinutes, timedSteps } from "@shared/onboarding/steps";

/**
 * The cold open — and, on the first pass through step 1, the page's own header.
 *
 * Step 1 is a form, and a form with no frame around it — arriving from an email,
 * asking for a GSTIN and a signatory — reads like a phishing page. This says who
 * sent it, what the steps are, and that stopping halfway is safe.
 *
 * It stays short on purpose. The link arrives off the back of a sales call, so the
 * deal has already been explained once; re-selling it here delays the thing we
 * actually want, which is the details. Anyone who does want the deal restated gets
 * `/gym-partnership` in one click.
 *
 * **Why this carries the `h1`.** For a while it sat *below* the step heading, so the
 * first thing a gym read was "Confirm your details" and the second was "someone sent
 * you this link" — an introduction after the instruction. Moving the card above the
 * heading fixes the reading order but breaks the document: a page whose first heading
 * is an `h2` sends anyone navigating by heading to the wrong place, and a CSS-only
 * reorder would have put the visual sequence at odds with the DOM, which is the thing
 * SC 1.3.2 exists to prevent.
 *
 * So on the first pass this *is* the header. "Let's get <gym> set up" is the page's
 * topic, and the step title it replaces was the fourth thing on screen saying step 1
 * is about details — the rail says it, the rail's mobile line says it, and the list
 * below says it in bold. `stepMeta(1).title` comes back the moment the gym returns to
 * a completed step 1, where there is no introduction and the step title is the topic.
 *
 * Shown only on that first pass — a gym coming back to check what it typed does not
 * need to be introduced to the process again.
 */
export default function OnboardingIntro({
  invitedByName,
  gymDisplayName,
  headingRef,
}: {
  invitedByName: string;
  gymDisplayName: string;
  /**
   * The shell's step-focus ref. It moves focus to the heading of each new step, and on
   * this one pass the heading of the step is in here rather than in the shell.
   */
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 mb-6"
      data-testid="onboarding-intro"
    >
      {/*
        12px, not 11px, and it is the only eyebrow in the flow that gets the extra
        pixel. The rest label a section; this one is the sentence that stops a page
        asking for a GSTIN from reading as phishing, and the smallest type on the card
        was the wrong home for it. Uppercase at 11px with tracking is decoration —
        legible enough to skip, which is exactly what nobody should do here.
      */}
      <p className="text-xs font-bold uppercase tracking-wide text-primary-ink mb-2">
        {invitedByName} sent you this link
      </p>
      {/*
        Sentence case, where every other `h1` in the flow is uppercase display black —
        the one deliberate departure from the house style, because this is the only
        headline in the product that interpolates a name of unknown length. "LET'S GET
        SNAP FITNESS KORAMANGALA 4TH BLOCK SET UP" is three lines of shouting, and
        uppercase is where long strings lose their word shapes and get slower to read.
        `font-bold` for the same reason: black at this size in sentence case is a slab.

        `tabIndex={-1}` and `outline-none` to match the shell's own heading — this is a
        focus target rather than something a gym should be able to tab to.
      */}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground mb-2 outline-none"
      >
        Let's get {gymDisplayName} set up
      </h1>
      {/*
        Uncapped, like the rest of the flow's screen copy — see the measure note in
        `OnboardingFlow`. This ran at `max-w-[56ch]`, which stopped it two-thirds of the
        way across its own card and left a visible column of white beside it; the card is
        the frame the reader sees, so the paragraph fills it.
      */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        Five short steps: your details, your terms, the agreement, the refundable deposit, and your
        dashboard password. Nothing is committed until you sign the agreement at step 3, and the
        deposit can wait until after that. The sixth step is ours — installing your machine — and
        this same link is where you'll track it.
      </p>

      {/*
        The step names, with what each one costs.
        This used to repeat the titles that the progress rail already shows
        directly above it, which is the kind of duplication that makes a page feel
        longer than it is. The times are the new information — and they are the reason
        somebody decides to start now rather than "later", which in practice means
        never.
      */}
      {/*
        `role="list"` because Tailwind's preflight sets `list-style: none` on every
        `ol`, and Safari drops the list role along with the marker — so VoiceOver
        announced loose fragments instead of "list, five items". Restored here and
        on every list in the flow; these links are opened from email, which on iOS means
        Safari.

        `gap-x-6 gap-y-2`: the horizontal gap was 16px while the space between a step's
        name and its own estimate was a 4px word-space, and 4 versus 16 is not enough
        difference for the eye to group them — "3 minutes Partnership" read as a pair as
        readily as "Partnership 2 minutes" did. The vertical gap was smaller still, so
        the moment this wrapped on a phone the five items lined up as a grid with no
        rows. `whitespace-nowrap` keeps a name and its number on one line at 375px,
        where "Review & sign / 10 minutes" was splitting across the break.
      */}
      <ol
        role="list"
        className="mt-4 flex flex-wrap gap-x-6 gap-y-2"
        data-testid="intro-steps"
      >
        {timedSteps().map((meta) => (
          <li key={meta.step} className="text-xs whitespace-nowrap">
            <span className="font-semibold text-foreground">{meta.shortTitle}</span>{" "}
            <span className="text-muted-foreground tabular-nums">{meta.estimate}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-5">
        {/*
          Not capped to the measure like the paragraph above, on purpose: at 12px inside a flex
          row this line already sits well inside the comfortable measure, and capping it
          would fold a one-line caption onto two for no gain.
        */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {/*
            Rounded to the nearest five rather than printed exactly, because "about 18"
            is a measurement with a hedge in front of it and gets held to the number, not
            the hedge. Still derived from STEP_META rather than typed here, so it moves
            when a step's scope does. Step 3 is most of it: reading a contract takes as
            long as it takes.
          */}
          About {roughTotalMinutes()} minutes in total. You can stop anywhere and come back to this
          same link.
        </p>
        <Link
          href="/gym-partnership"
          target="_blank"
          rel="noopener"
          className="text-xs font-semibold text-primary-ink hover:underline flex items-center gap-1 flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="link-partnership"
        >
          The deal, restated
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </Link>
      </div>
    </div>
  );
}
