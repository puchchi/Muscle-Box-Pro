"use client";

import { useCallback, useEffect, useState } from "react";
import { onboardingApi } from "@/lib/onboardingApi";
import type {
  DepositChoice,
  DepositLink,
  GymDetails,
  OnboardingError,
  OnboardingState,
  OnboardingStep,
  SignatureInput,
} from "@shared/onboarding/types";

/**
 * Owns all onboarding server state for one token.
 *
 * The rule this hook exists to enforce: **the step is whatever the server last
 * said it was.** There is no local step counter to fall out of sync, and no
 * `setStep` for a component to call. Every action returns fresh state and the
 * rendered step follows it.
 *
 * `viewStep` is the one concession — a gym reviewing an earlier completed step —
 * and it is a *view* only. Submitting is still validated server-side against
 * `currentStep`, because the UI is not a security boundary (docs/gym-onboarding.md §4).
 */

export type ActionStatus = "idle" | "running";

export type OnboardingActions = {
  submitDetails(details: GymDetails): Promise<boolean>;
  ackPartnership(): Promise<boolean>;
  markAgreementViewed(): Promise<void>;
  requestSigningOtp(): Promise<string | null>;
  signAgreement(input: SignatureInput): Promise<boolean>;
  chooseDeposit(choice: DepositChoice): Promise<DepositLink | null>;
  refreshDepositStatus(): Promise<boolean>;
  /**
   * The same read, without the UI side effects. Used by step 4's background poll —
   * a timer must not put the whole wizard into its submitting state or wipe an
   * error the gym is still reading.
   */
  pollDepositStatus(): Promise<void>;
  createAccount(password: string): Promise<boolean>;
};

export type UseOnboarding = {
  state: OnboardingState | null;
  /** Fatal: a bad, expired or revoked token. The wizard cannot render at all. */
  fatalError: OnboardingError | null;
  /** Recoverable: a rejected submit. Shown in-place, does not replace the wizard. */
  actionError: OnboardingError | null;
  fieldErrors: Record<string, string> | null;
  isLoading: boolean;
  isSubmitting: boolean;
  /** The step on screen. Equals `state.currentStep` unless the gym went back. */
  viewStep: OnboardingStep;
  /** Steps a gym may look at again: completed ones, and the current one. */
  canView(step: OnboardingStep): boolean;
  goToStep(step: OnboardingStep): void;
  /** True when viewing an earlier step, or any frozen step after signing. */
  isReadOnly: boolean;
  actions: OnboardingActions;
};

export function useOnboarding(token: string): UseOnboarding {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [fatalError, setFatalError] = useState<OnboardingError | null>(null);
  const [actionError, setActionError] = useState<OnboardingError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Null means "follow the server". Set only when the gym deliberately navigates
   * back, and cleared by any successful action — so finishing a step always lands
   * them on whatever the server decided comes next.
   */
  const [viewOverride, setViewOverride] = useState<OnboardingStep | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    onboardingApi.getState(token).then((result) => {
      if (cancelled) return;
      if (result.ok) setState(result.data);
      else setFatalError(result.error);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  /**
   * Runs one mutating call and folds the result into state.
   *
   * `wrong_step` is handled specially: the server has told us where it actually
   * is, so the honest response is to re-read and re-render there rather than to
   * show an error about a step the gym cannot see.
   */
  const run = useCallback(
    async <T>(
      call: () => Promise<
        { ok: true; data: T } | { ok: false; error: OnboardingError }
      >,
      extract: (data: T) => OnboardingState | null,
    ): Promise<T | null> => {
      setActionError(null);
      setIsSubmitting(true);
      try {
        const result = await call();
        if (!result.ok) {
          setActionError(result.error);
          if (result.error.code === "wrong_step" || result.error.code === "frozen") {
            const fresh = await onboardingApi.getState(token);
            if (fresh.ok) {
              setState(fresh.data);
              setViewOverride(null);
            }
          }
          return null;
        }
        const next = extract(result.data);
        if (next) {
          setState(next);
          setViewOverride(null);
        }
        return result.data;
      } finally {
        setIsSubmitting(false);
      }
    },
    [token],
  );

  const actions: OnboardingActions = {
    async submitDetails(details) {
      return (await run(() => onboardingApi.submitDetails(token, details), (s) => s)) !== null;
    },
    async ackPartnership() {
      return (await run(() => onboardingApi.ackPartnership(token), (s) => s)) !== null;
    },
    async markAgreementViewed() {
      // Fire-and-forget audit write. It must never block the reader from
      // rendering, and a failure here is not something to show a gym.
      const result = await onboardingApi.markAgreementViewed(token);
      if (result.ok) setState(result.data);
    },
    async requestSigningOtp() {
      const data = await run(
        () => onboardingApi.requestSigningOtp(token),
        () => null,
      );
      return data?.sentTo ?? null;
    },
    async signAgreement(input) {
      return (await run(() => onboardingApi.signAgreement(token, input), (s) => s)) !== null;
    },
    async chooseDeposit(choice) {
      const data = await run(
        () => onboardingApi.chooseDeposit(token, choice),
        (d) => d.state,
      );
      return data?.link ?? null;
    },
    async refreshDepositStatus() {
      return (await run(() => onboardingApi.refreshDepositStatus(token), (s) => s)) !== null;
    },
    async pollDepositStatus() {
      // Deliberately not through `run`: no spinner, no error banner, and no clearing
      // of `viewOverride` — a gym reading step 3 again while a payment settles must
      // not be yanked back to step 4 by a timer. Folding in fresh state is all it does.
      const result = await onboardingApi.refreshDepositStatus(token);
      if (result.ok) setState(result.data);
    },
    async createAccount(password) {
      return (await run(() => onboardingApi.createAccount(token, password), (s) => s)) !== null;
    },
  };

  const currentStep = state?.currentStep ?? 1;
  const canView = useCallback(
    (step: OnboardingStep) =>
      !!state && (step === state.currentStep || state.completedSteps.includes(step)),
    [state],
  );

  // Clamped rather than trusted: if `completedSteps` and an override ever
  // disagree, render the server's step.
  const viewStep = viewOverride !== null && canView(viewOverride) ? viewOverride : currentStep;

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      if (canView(step)) setViewOverride(step === currentStep ? null : step);
    },
    [canView, currentStep],
  );

  const isFrozenStep = !!state?.isSigned && (viewStep === 1 || viewStep === 2);

  return {
    state,
    fatalError,
    actionError,
    fieldErrors: actionError?.fieldErrors ?? null,
    isLoading,
    isSubmitting,
    viewStep,
    canView,
    goToStep,
    isReadOnly: viewStep < currentStep || isFrozenStep,
    actions,
  };
}
