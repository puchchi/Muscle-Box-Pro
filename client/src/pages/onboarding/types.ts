import type { OnboardingState } from "@shared/onboarding/types";
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
  actions: OnboardingActions;
};
