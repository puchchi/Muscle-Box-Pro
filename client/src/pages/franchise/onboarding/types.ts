import type {
  FranchiseOnboardingState,
  FranchiseOnboardingStep,
} from "@shared/franchise/onboarding/types";
import type { FranchiseOnboardingActions } from "./useFranchiseOnboarding";

/**
 * What the shell hands every step. `pages/onboarding/types.ts` and its reasoning: steps get
 * `actions`, not the API, so no step can call `getState` and start keeping its own copy of the
 * truth or invent a transition the server did not authorise.
 */
export type FranchiseStepViewProps = {
  handle: string;
  state: FranchiseOnboardingState;
  /** The server would refuse a submission for this step. Mirrors `freezeReason`. */
  readOnly: boolean;
  /** Why, in the franchisee's own terms, or null. */
  frozenReason: string | null;
  isSubmitting: boolean;
  fieldErrors: Record<string, string> | null;
  goToStep(step: FranchiseOnboardingStep): void;
  actions: FranchiseOnboardingActions;
};
