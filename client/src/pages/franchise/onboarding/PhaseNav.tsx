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
import { PAGE } from "./shell";

/**
 * The progress indicator: four stages, and never the nine steps.
 *
 * This replaced a rail that drew all nine, grouped under four headings. Nine entries is a ladder
 * however it is grouped, and the reader's question on arriving is "how far through am I", which
 * four answers and nine does not. The steps inside a stage are on the page itself — `PhaseSteps`
 * draws the ones on either side of the one being worked on — so nothing has been hidden, it has
 * been moved to where the choice actually is.
 *
 * Two shapes for two jobs, and the breakpoint is `lg` rather than `sm` because the vertical form
 * only earns its column once there is a column to spare.
 *
 * *Vertical, beside the content, from `lg` up.* A stepper reading downwards is the shape of a
 * sequence, and it stays on screen while a long form scrolls past it.
 *
 * *A band across the top below that.* These links arrive by email and are opened on a phone, so
 * the four stage buttons are this flow's most-tapped control and they are `min-h-11` rather than
 * padded to whatever the text needs.
 *
 * Everything else is the gym rail's reasoning, unchanged and not re-argued: one progress bar rather
 * than a bar per stage, `scaleX` rather than an animated width, a stage you may open is a button
 * and one you may not is not, and `role="list"` restored because Tailwind's preflight takes it away
 * and Safari drops the role with the marker.
 *
 * **`bg-primary-fill`, not `bg-primary`.** These markers carry white text and a white icon, and
 * white on `--primary` is 3.25:1. The old rail used `bg-primary` for exactly this. See the token
 * block in index.css.
 */

type Props = {
  currentStep: FranchiseOnboardingStep;
  viewStep: FranchiseOnboardingStep;
  completedSteps: FranchiseOnboardingStep[];
  canView(step: FranchiseOnboardingStep): boolean;
  onSelect(step: FranchiseOnboardingStep): void;
};

const FOCUS =
  "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * A stage's own state, which is not the same question as which stage is on screen.
 *
 * Kept apart deliberately. A franchisee who goes back to look at an approved territory is
 * *viewing* stage 2 while stage 3 is the one in progress, and a marker driven by the view would
 * report the stage they are actually up to as not started.
 */
type PhaseState = "done" | "current" | "waiting";

function useStages({ currentStep, viewStep, completedSteps, canView }: Props) {
  const viewedPhase = franchisePhaseOf(viewStep);
  const viewedMeta = franchiseStepMeta(viewStep);
  const currentPhase = franchisePhaseOf(currentStep);

  /**
   * Where a stage button goes: the first step in it the franchisee may open, so a button is never
   * a target that looks pressable and does nothing. Null when none of them are open yet.
   */
  function targetOf(phaseId: FranchisePhaseId): FranchiseOnboardingStep | null {
    return franchiseStepsInPhase(phaseId).find((m) => canView(m.step))?.step ?? null;
  }

  const stages = FRANCHISE_PHASES.map((phase, index) => {
    const steps = franchiseStepsInPhase(phase.id);
    const isViewing = phase.id === viewedPhase.id;
    const state: PhaseState = steps.every((m) => completedSteps.includes(m.step))
      ? "done"
      : phase.id === currentPhase.id
        ? "current"
        : "waiting";
    return {
      phase,
      number: index + 1,
      state,
      isViewing,
      target: targetOf(phase.id),
      // Which step of a multi-step stage is on screen. The full title rather than `shortTitle`,
      // which abbreviates step 9 to "Done" and would read as the stage being finished. Suppressed
      // where it would repeat the stage's own name, which is every single-step stage.
      detail: isViewing && viewedMeta.title !== phase.title ? viewedMeta.title : null,
    };
  });

  const filledSteps = FRANCHISE_STEP_META.filter(
    (meta) => completedSteps.includes(meta.step) || meta.step === viewStep,
  ).length;

  return {
    stages,
    stageNumber: stages.findIndex((s) => s.isViewing) + 1,
    viewedMeta,
    progress: filledSteps / FRANCHISE_STEP_META.length,
  };
}

const MARKER: Record<PhaseState, string> = {
  done: "bg-primary-fill text-white border border-primary-fill",
  current: "bg-white text-primary-ink border-2 border-primary-fill",
  waiting: "bg-white text-gray-500 border border-gray-300",
};

function Marker({ state, number }: { state: PhaseState; number: number }) {
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums flex-shrink-0 transition-colors ${MARKER[state]}`}
      aria-hidden="true"
    >
      {state === "done" ? <Check className="w-3.5 h-3.5" /> : number}
    </span>
  );
}

function stateLabel(state: PhaseState): string {
  if (state === "done") return "completed";
  if (state === "current") return "in progress";
  return "not started";
}

/** The vertical stepper. One column of the shell's grid from `lg` up. */
export function PhaseRail(props: Props) {
  const { stages, stageNumber } = useStages(props);

  return (
    <nav aria-label="Onboarding stages" data-testid="phase-rail">
      <p className="text-xs font-semibold text-muted-foreground">
        Stage {stageNumber} of {stages.length}
      </p>

      <ol role="list" className="mt-4">
        {stages.map((stage, index) => {
          const selectable = stage.target !== null && !stage.isViewing;
          const isLast = index === stages.length - 1;

          return (
            <li key={stage.phase.id} className={`relative ${isLast ? "" : "pb-5"}`}>
              {!isLast && (
                <span
                  className={`absolute left-3 top-7 bottom-1 w-px ${
                    stage.state === "done" ? "bg-primary-fill/40" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}

              <button
                type="button"
                disabled={!selectable}
                onClick={() => stage.target !== null && props.onSelect(stage.target)}
                aria-current={stage.isViewing ? "step" : undefined}
                data-testid={`rail-phase-${stage.phase.id}`}
                className={`flex w-full items-start gap-3 py-0.5 text-left ${FOCUS} ${
                  selectable ? "cursor-pointer group" : "cursor-default"
                }`}
              >
                <Marker state={stage.state} number={stage.number} />
                <span className="min-w-0 pt-0.5">
                  <span
                    className={`block text-sm ${
                      stage.isViewing
                        ? "font-semibold text-foreground"
                        : stage.state === "waiting"
                          ? "font-medium text-gray-500"
                          : "font-medium text-gray-700 group-hover:text-foreground transition-colors"
                    }`}
                  >
                    {stage.phase.title}
                  </span>
                  {stage.detail && (
                    <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                      {stage.detail}
                    </span>
                  )}
                  <span className="sr-only">, {stateLabel(stage.state)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The band across the top, below `lg`. Sticky, and measured by the shell. */
export function PhaseBar(props: Props) {
  const { stages, stageNumber, viewedMeta, progress } = useStages(props);

  return (
    <div className="border-b border-gray-200 bg-white lg:hidden">
      <div className="h-0.5 bg-gray-100" aria-hidden="true">
        <div
          className="h-full bg-primary-fill origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${progress})` }}
          data-testid="franchise-progress-bar"
        />
      </div>

      <div className={`${PAGE} py-3`}>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Stage {stageNumber} of {stages.length}
          </p>
          <p className="min-w-0 text-xs text-muted-foreground truncate" data-testid="bar-step-title">
            {viewedMeta.title}
          </p>
        </div>

        <nav aria-label="Onboarding stages">
          <ol role="list" className="flex gap-1.5">
            {stages.map((stage) => {
              const selectable = stage.target !== null && !stage.isViewing;

              return (
                <li key={stage.phase.id} className="flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={!selectable}
                    onClick={() => stage.target !== null && props.onSelect(stage.target)}
                    aria-current={stage.isViewing ? "step" : undefined}
                    data-testid={`bar-phase-${stage.phase.id}`}
                    className={[
                      // Four of these share 375px. The tick and the longest stage title ("Approval")
                      // only both fit at 11px, and a truncated stage name reads as a bug.
                      "w-full min-h-11 flex items-center justify-center rounded-md border font-semibold transition-colors",
                      "px-1.5 gap-1 text-[11px] sm:px-2 sm:gap-1.5 sm:text-xs",
                      FOCUS,
                      selectable ? "cursor-pointer" : "cursor-default",
                      stage.isViewing
                        ? "border-primary-fill bg-primary/5 text-primary-ink"
                        : stage.state === "waiting"
                          ? "border-gray-200 bg-gray-50 text-gray-500"
                          : "border-gray-200 bg-white text-gray-700",
                    ].join(" ")}
                  >
                    {stage.state === "done" && (
                      <Check
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-primary-ink"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{stage.phase.title}</span>
                    <span className="sr-only">, {stateLabel(stage.state)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
