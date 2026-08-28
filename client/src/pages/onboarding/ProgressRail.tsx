"use client";

import { Check } from "lucide-react";
import { STEP_META } from "@shared/onboarding/steps";
import type { OnboardingStep } from "@shared/onboarding/types";

/**
 * The step indicator.
 *
 * Two renderings rather than one responsive one: six labelled steps do not fit a
 * 390px screen at a readable size, and shrinking them to fit produces a rail
 * nobody can read. Mobile gets "Step 3 of 6" with the title and a row of numbered
 * targets — which is the information that actually matters on a phone.
 *
 * **One bar, above both of them.** Overall progress used to be drawn three times over:
 * a bar on the phone, six bars under the desktop labels, and the circles that already
 * say which steps are done. The six were a progress bar cut into pieces and spaced
 * apart, which is the one shape that reads as less complete than it is. The bar now
 * runs edge to edge above the rail, and because the rail is sticky it ends up at the
 * top of the viewport as soon as the page scrolls.
 *
 * The mobile row is not decoration. Until it existed, going back to check what you
 * typed in step 1 was a desktop-only feature: the phone layout drew a progress bar and
 * nothing you could press. These links arrive by email, and email is read on a phone.
 *
 * A completed step is a button; a future step is not. Nothing here can move the
 * gym forward — the rail reflects server state, it does not drive it.
 *
 * **Three states, and no fourth.** Done, on screen, not open yet. A padlock used to sit
 * beside steps 1 and 2 once the agreement was signed, which put a fourth mark on two of
 * six columns for a fact the rail cannot act on: those steps are still viewable, the lock
 * is about editing, and a gym reading the rail is asking where it is rather than what it
 * may type. It also made two columns taller than the other four. `ReviewingBanner` says
 * "Locked after signing" in a sentence, with what to do about it, on arrival at the step
 * it applies to — which is where the answer is worth having.
 */

type Props = {
  currentStep: OnboardingStep;
  viewStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  canView(step: OnboardingStep): boolean;
  onSelect(step: OnboardingStep): void;
};

/** Ring, hover and cursor for anything in here that can be pressed. */
const FOCUS =
  "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function ProgressRail({
  currentStep,
  viewStep,
  completedSteps,
  canView,
  onSelect,
}: Props) {
  const active = STEP_META.find((m) => m.step === viewStep);

  /**
   * How far the bar is filled.
   *
   * "Done or on screen", which is the same predicate as `isDone || isViewing` below, so a
   * gym looking back at step 1 sees the bar retreat to match the circles rather than stay
   * ahead of them. The "N done" count on the phone is the other, stricter fact, and stays.
   *
   * Not `completedSteps.length`, which is what this was and which is a different
   * measurement from the circles beside it: on step 2 with step 1 done the rail marks two
   * steps and the bar drew 20%, the pessimistic answer of the two.
   */
  const filledSteps = STEP_META.filter(
    (meta) => completedSteps.includes(meta.step) || meta.step === viewStep,
  ).length;

  /**
   * What a screen reader hears instead of a coloured circle.
   *
   * Keyed off `currentStep`, not `viewStep`. `canView` also allows the step the server
   * is on — which is by definition *not* in `completedSteps` — so testing against the
   * step being viewed announced "not available yet" on an enabled button the moment a
   * gym went back to check an earlier answer. Which one is on screen is already
   * carried by `aria-current`; this says what state each one is in.
   */
  function stateLabel(step: OnboardingStep): string {
    if (completedSteps.includes(step)) return "completed";
    if (step === currentStep) return "in progress";
    return "not available yet";
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      {/*
        Full bleed and unrounded: this is an edge of the chrome, not an object sitting in
        it. `aria-hidden`, because the list below carries every state it draws and a third
        announcement of "67%" next to "Step 4 of 6" and six labelled steps is noise.
      */}
      <div className="h-1 bg-gray-100" aria-hidden="true">
        {/*
          `scaleX` on a full-width bar rather than an animated `width`: width is a layout
          property, so `transition-all` put a relayout in every frame of the animation and
          ran 200ms past the range a progress tick should take. Transform stays on the
          compositor.
        */}
        <div
          className="h-full bg-primary origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${filledSteps / STEP_META.length})` }}
          data-testid="onboarding-progress-bar"
        />
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Step {viewStep} of {STEP_META.length}
          </p>
          <p className="text-xs text-gray-600">{completedSteps.length} done</p>
        </div>
        <p className="text-sm font-semibold text-foreground" data-testid="mobile-step-title">
          {active?.title}
        </p>

        {/*
          The numbered targets. 44px squares with a 24px dot inside them, so the tap
          area clears the minimum without the rail growing a row of oversized circles.
        */}
        <ol role="list" className="flex justify-between -mx-1.5 mt-1" aria-label="Onboarding steps">
          {STEP_META.map((meta) => {
            const isDone = completedSteps.includes(meta.step);
            const isViewing = meta.step === viewStep;
            const selectable = canView(meta.step) && !isViewing;

            return (
              <li key={meta.step}>
                <button
                  type="button"
                  disabled={!selectable}
                  onClick={() => onSelect(meta.step)}
                  aria-current={isViewing ? "step" : undefined}
                  data-testid={`rail-mobile-step-${meta.step}`}
                  className={`w-11 h-11 flex items-center justify-center ${FOCUS} ${
                    selectable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span
                    className={[
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                      isDone
                        ? "bg-primary text-white"
                        : isViewing
                          ? "bg-primary/10 text-primary-ink ring-2 ring-primary"
                          : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : meta.step}
                  </span>
                  <span className="sr-only">
                    {meta.shortTitle}, {stateLabel(meta.step)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Desktop ── */}
      <ol
        /*
          `role="list"` restores what Tailwind's preflight takes away: it sets
          `list-style: none` on every `ol`, and Safari drops the list role with the
          marker — which left an `aria-label` of "Onboarding steps" attached to a generic
          container, so VoiceOver announced neither the name nor the item count. These
          links are opened from email, and on iOS that means Safari.
        */
        role="list"
        className="hidden sm:flex max-w-3xl mx-auto px-6 py-4 gap-2"
        aria-label="Onboarding steps"
        data-testid="progress-rail"
      >
        {STEP_META.map((meta) => {
          const isDone = completedSteps.includes(meta.step);
          const isViewing = meta.step === viewStep;
          const selectable = canView(meta.step) && !isViewing;

          return (
            <li key={meta.step} className="flex-1 min-w-0">
              <button
                type="button"
                disabled={!selectable}
                onClick={() => onSelect(meta.step)}
                aria-current={isViewing ? "step" : undefined}
                data-testid={`rail-step-${meta.step}`}
                className={[
                  "w-full text-left group px-1 py-1 -mx-1",
                  FOCUS,
                  selectable ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-6 h-6 mb-2 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors",
                    isDone
                      ? "bg-primary text-white"
                      : isViewing
                        ? "bg-primary/10 text-primary-ink ring-2 ring-primary"
                        : // gray-400 on gray-100 is 2.2:1 — a number nobody with
                          // average eyesight in average light can read.
                          "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : meta.step}
                </span>
                {/*
                  Three weights for three states. Done was `text-muted-foreground`, which
                  this theme resolves to 44% grey against `gray-500`'s 46% — the same colour
                  as a step that cannot be opened, so the label tier said nothing and the
                  circle carried the whole rail on its own.
                */}
                <p
                  className={[
                    "text-xs truncate",
                    isViewing
                      ? "text-foreground font-bold"
                      : isDone
                        ? "text-gray-700 font-semibold group-hover:text-foreground transition-colors"
                        : "text-gray-500 font-medium",
                  ].join(" ")}
                >
                  {meta.shortTitle}
                </p>
                <span className="sr-only">
                  {", "}
                  {stateLabel(meta.step)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
