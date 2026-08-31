"use client";

import { Check } from "lucide-react";

import {
  FRANCHISE_PHASES,
  FRANCHISE_STEP_META,
  franchisePhaseOf,
  franchiseStepMeta,
  franchiseStepsInPhase,
} from "@shared/franchise/onboarding/steps";
import type { FranchisePhaseId } from "@shared/franchise/onboarding/steps";
import type { FranchiseOnboardingStep } from "@shared/franchise/onboarding/types";

/**
 * The step indicator, grouped into four phases.
 *
 * `ProgressRail` in the gym flow draws six labelled columns, and nine of them do not fit a
 * readable rail on any screen. Nine equally-weighted steps also read as a long ladder, which is
 * the reason the phases exist at all (docs/franchise-onboarding.md §3). So the phase is the
 * heading and the steps sit under it.
 *
 * Everything else is the gym rail's reasoning, unchanged and not re-argued here: one progress
 * bar rather than a bar per step, `scaleX` rather than an animated width, a completed step is a
 * button and a future one is not, three states and no fourth, and `role="list"` restored because
 * Tailwind's preflight takes it away and Safari drops the role with the marker.
 *
 * What the phone gets is different, and deliberately. Nine 44px targets do not fit 390px, so
 * shrinking them below the tap minimum would be the only way — and these links arrive by email,
 * which is read on a phone. Instead the phone gets four phase pills, which navigate, and the
 * steps of the phase on screen underneath them, which is the choice actually in front of someone
 * on that step.
 */

type Props = {
  currentStep: FranchiseOnboardingStep;
  viewStep: FranchiseOnboardingStep;
  completedSteps: FranchiseOnboardingStep[];
  canView(step: FranchiseOnboardingStep): boolean;
  onSelect(step: FranchiseOnboardingStep): void;
};

const FOCUS =
  "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function PhaseRail({
  currentStep,
  viewStep,
  completedSteps,
  canView,
  onSelect,
}: Props) {
  const activePhase = franchisePhaseOf(viewStep);
  const activeMeta = franchiseStepMeta(viewStep);

  const filledSteps = FRANCHISE_STEP_META.filter(
    (meta) => completedSteps.includes(meta.step) || meta.step === viewStep,
  ).length;

  function stateLabel(step: FranchiseOnboardingStep): string {
    if (completedSteps.includes(step)) return "completed";
    if (step === currentStep) return "in progress";
    return "not available yet";
  }

  /**
   * Where a phase pill goes.
   *
   * The first step in the phase the franchisee may open, so a pill is never a dead target that
   * looks pressable and does nothing. Null when none of them are open yet.
   */
  function firstViewableIn(phaseId: FranchisePhaseId): FranchiseOnboardingStep | null {
    const step = franchiseStepsInPhase(phaseId).find((m) => canView(m.step));
    return step ? step.step : null;
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="h-1 bg-gray-100" aria-hidden="true">
        <div
          className="h-full bg-primary origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${filledSteps / FRANCHISE_STEP_META.length})` }}
          data-testid="franchise-progress-bar"
        />
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
            {activePhase.title} · Step {viewStep} of {FRANCHISE_STEP_META.length}
          </p>
          <p className="text-xs text-gray-600">{completedSteps.length} done</p>
        </div>

        <ol
          role="list"
          className="flex gap-1.5 mb-3"
          aria-label="Franchise onboarding stages"
        >
          {FRANCHISE_PHASES.map((phase) => {
            const steps = franchiseStepsInPhase(phase.id);
            const isDone = steps.every((m) => completedSteps.includes(m.step));
            const isActive = phase.id === activePhase.id;
            const target = firstViewableIn(phase.id);

            return (
              <li key={phase.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  disabled={target === null || isActive}
                  onClick={() => target !== null && onSelect(target)}
                  aria-current={isActive ? "step" : undefined}
                  data-testid={`rail-phase-${phase.id}`}
                  className={[
                    "w-full px-2 py-1.5 text-[11px] font-bold truncate transition-colors",
                    FOCUS,
                    isActive
                      ? "bg-primary/10 text-primary-ink ring-2 ring-primary"
                      : isDone
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {phase.title}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="text-sm font-semibold text-foreground" data-testid="mobile-step-title">
          {activeMeta.title}
        </p>

        {/* The steps of the phase on screen: at most three, so they fit at a readable size. */}
        <ol role="list" className="flex gap-1 -mx-1.5 mt-1" aria-label={`${activePhase.title} steps`}>
          {franchiseStepsInPhase(activePhase.id).map((meta) => {
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
                  className={`h-11 px-1.5 flex items-center gap-1.5 ${FOCUS} ${
                    selectable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span
                    className={[
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors",
                      isDone
                        ? "bg-primary text-white"
                        : isViewing
                          ? "bg-primary/10 text-primary-ink ring-2 ring-primary"
                          : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : meta.step}
                  </span>
                  <span
                    className={`text-[11px] truncate ${
                      isViewing ? "text-foreground font-bold" : "text-gray-600 font-medium"
                    }`}
                  >
                    {meta.shortTitle}
                  </span>
                  <span className="sr-only">, {stateLabel(meta.step)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Desktop ── */}
      <div
        className="hidden sm:grid max-w-4xl mx-auto px-6 py-4 gap-x-4 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${FRANCHISE_PHASES.length}, minmax(0, 1fr))` }}
        data-testid="phase-rail"
      >
        {FRANCHISE_PHASES.map((phase) => {
          const isActive = phase.id === activePhase.id;
          return (
            <p
              key={phase.id}
              className={`text-[11px] font-bold uppercase tracking-wide ${
                isActive ? "text-primary-ink" : "text-gray-500"
              }`}
            >
              {phase.title}
            </p>
          );
        })}

        {FRANCHISE_PHASES.map((phase) => (
          <ol
            role="list"
            key={phase.id}
            className="space-y-0.5"
            aria-label={`${phase.title} steps`}
          >
            {franchiseStepsInPhase(phase.id).map((meta) => {
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
                    data-testid={`rail-step-${meta.step}`}
                    className={[
                      "w-full text-left group flex items-center gap-2 px-1 py-1 -mx-1",
                      FOCUS,
                      selectable ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors",
                        isDone
                          ? "bg-primary text-white"
                          : isViewing
                            ? "bg-primary/10 text-primary-ink ring-2 ring-primary"
                            : "bg-gray-100 text-gray-500",
                      ].join(" ")}
                    >
                      {isDone ? <Check className="w-3 h-3" aria-hidden="true" /> : meta.step}
                    </span>
                    <span
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
                    </span>
                    <span className="sr-only">, {stateLabel(meta.step)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ))}
      </div>
    </div>
  );
}
