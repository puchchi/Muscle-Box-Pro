import type { OnboardingState, OnboardingStep } from "@shared/onboarding/types";
import type { OnboardingActions } from "./useOnboarding";

/**
 * What the shell hands every step.
 *
 * Steps get `actions`, not the API — so a step cannot call `getState` and start
 * keeping its own copy of the truth, and cannot invent a step transition the
 * server did not authorise.
 */
export type StepViewProps = {
  token: string;
  state: OnboardingState;
  /** Viewing an earlier completed step, or a step frozen by signing. */
  readOnly: boolean;
  isSubmitting: boolean;
  /** From the last rejected submit, keyed by field name. */
  fieldErrors: Record<string, string> | null;
  /**
   * Move the *view* to another step the gym is allowed to look at.
   *
   * Not the step transition the docstring above rules out: `useOnboarding` clamps this with
   * `canView`, the server still owns `currentStep`, and any successful action clears the
   * override. It is here so a step can offer its own way back — the rail is the other way, and
   * it is at the top of a page that scrolls for several screens.
   */
  goToStep(step: OnboardingStep): void;
  actions: OnboardingActions;
};
