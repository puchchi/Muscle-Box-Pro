"use client";

import { Check, Lock } from "lucide-react";
import { STEP_META } from "@shared/onboarding/steps";
import type { OnboardingStep } from "@shared/onboarding/types";

/**
 * The step indicator.
 *
 * Two renderings rather than one responsive one: five labelled steps do not fit a
 * 390px screen at a readable size, and shrinking them to fit produces a rail
 * nobody can read. Mobile gets "Step 3 of 5" with the title and a bar, which is
 * the information that actually matters on a phone.
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

export default function ProgressRail({
  currentStep,
  viewStep,
  completedSteps,
  isSigned,
  canView,
  onSelect,
}: Props) {
  const active = STEP_META.find((m) => m.step === viewStep);

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* ── Mobile ── */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Step {viewStep} of {STEP_META.length}
          </p>
          <p className="text-xs text-muted-foreground">{completedSteps.length} done</p>
        </div>
        <p className="text-sm font-semibold text-foreground mb-2" data-testid="mobile-step-title">
          {active?.title}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedSteps.length / STEP_META.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Desktop ── */}
      <ol className="hidden sm:flex max-w-4xl mx-auto px-6 py-4 gap-2" data-testid="progress-rail">
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
                  "w-full text-left group",
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
                          ? "bg-primary/10 text-primary ring-2 ring-primary"
                          : "bg-gray-100 text-gray-400",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : meta.step}
                  </span>
                  {locked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </div>
                <p
                  className={[
                    "text-xs font-semibold truncate",
                    isViewing
                      ? "text-foreground"
                      : isDone
                        ? "text-muted-foreground group-hover:text-foreground transition-colors"
                        : "text-gray-400",
                  ].join(" ")}
                >
                  {meta.shortTitle}
                </p>
                <div
                  className={[
                    "h-1 rounded-full mt-2 transition-colors",
                    isDone || isViewing ? "bg-primary" : "bg-gray-100",
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
