"use client";

import { Check, Lock } from "lucide-react";
import { STEP_META } from "@shared/onboarding/steps";
import type { OnboardingStep } from "@shared/onboarding/types";

/**
 * The step indicator.
 *
 * Two renderings rather than one responsive one: six labelled steps do not fit a
 * 390px screen at a readable size, and shrinking them to fit produces a rail
 * nobody can read. Mobile gets "Step 3 of 6" with the title, a bar, and a row of
 * numbered targets — which is the information that actually matters on a phone.
 *
 * The mobile row is not decoration. Until it existed, going back to check what you
 * typed in step 1 was a desktop-only feature: the phone layout drew a progress bar and
 * nothing you could press. These links arrive by email, and email is read on a phone.
 *
 * A completed step is a button; a future step is not. Nothing here can move the
 * gym forward — the rail reflects server state, it does not drive it.
 */

type Props = {
  currentStep: OnboardingStep;
  viewStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  /** Signed: steps 1 and 2 are viewable but locked. */
  isSigned: boolean;
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
  isSigned,
  canView,
  onSelect,
}: Props) {
  const active = STEP_META.find((m) => m.step === viewStep);

  /**
   * The mobile bar, filled by the same rule the desktop rail's bars use.
   *
   * It was `completedSteps.length / 5`, which is a different measurement from the one
   * beside it at every width: on step 2 with step 1 done, the desktop rail draws two
   * filled bars and the phone drew a bar at 20%. Same state, same product,
   * two answers — and the phone's was the pessimistic one, on the layout where the bar
   * is the *only* sense of progress there is room for.
   *
   * "Done" and "on screen" are the same predicate as `isDone || isViewing` below, so a
   * gym looking back at step 1 sees the bar retreat to match the rail rather than stay
   * ahead of it. The "N done" count next to it is the other, stricter fact, and stays.
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
      {/* ── Mobile ── */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Step {viewStep} of {STEP_META.length}
          </p>
          <p className="text-xs text-gray-600">{completedSteps.length} done</p>
        </div>
        <p className="text-sm font-semibold text-foreground mb-2" data-testid="mobile-step-title">
          {active?.title}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          {/*
            `scaleX` on a full-width bar rather than an animated `width`: width is a
            layout property, so the old `transition-all duration-500` put a relayout in
            every frame of the animation and ran 200ms past the range a progress tick
            should take. Transform stays on the compositor.
          */}
          <div
            className="h-full w-full rounded-full bg-primary origin-left transition-transform duration-300"
            style={{ transform: `scaleX(${filledSteps / STEP_META.length})` }}
            data-testid="mobile-progress-bar"
          />
        </div>

        {/*
          The numbered targets. 44px squares with a 24px dot inside them, so the tap
          area clears the minimum without the rail growing a row of oversized circles.
        */}
        <ol role="list" className="flex justify-between -mx-1.5 mt-1" aria-label="Onboarding steps">
          {STEP_META.map((meta) => {
            const isDone = completedSteps.includes(meta.step);
            const isViewing = meta.step === viewStep;
            const locked = isSigned && (meta.step === 1 || meta.step === 2);
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
                    {locked ? ", locked after signing" : ""}
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
          const locked = isSigned && (meta.step === 1 || meta.step === 2);
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
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={[
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors",
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
                  {locked && <Lock className="w-3 h-3 text-gray-600 flex-shrink-0" aria-hidden="true" />}
                </div>
                <p
                  className={[
                    "text-xs font-semibold truncate",
                    isViewing
                      ? "text-foreground"
                      : isDone
                        ? "text-muted-foreground group-hover:text-foreground transition-colors"
                        : "text-gray-500",
                  ].join(" ")}
                >
                  {meta.shortTitle}
                </p>
                <span className="sr-only">
                  {", "}
                  {stateLabel(meta.step)}
                  {locked ? ", locked after signing" : ""}
                </span>
                <div
                  className={[
                    "h-1 rounded-full mt-2 transition-colors",
                    isDone || isViewing ? "bg-primary" : "bg-gray-200",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
