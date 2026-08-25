"use client";

import { useCallback, useEffect, useState } from "react";
import { onboardingApi } from "@/lib/onboardingApi";
import type {
  DepositChoice,
  DepositLink,
  GymDetails,
  OnboardingError,
  OnboardingState,
  OnboardingStatus,
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
 * `viewStep` is the one concession — a gym reviewing an earlier completed step. It does not
 * move the server's step, and re-submitting from it is still validated server-side against
 * `currentStep`, because the UI is not a security boundary (docs/gym-onboarding.md §4). Mostly
 * it is a *view*; step 1 is the exception, and `isEditableRevisit` is where that is decided.
 */

export type ActionStatus = "idle" | "running";

/**
 * The statuses a step 1 re-submit still lands from.
 *
 * Going back to fix a typo is the ordinary reason to go back at all, and the server supports it:
 * `isStepReachable` in the backend's `domain/onboardingStatus.ts` allows re-submitting an
 * already-completed step in so many words. But it is allowed *within a window*, and this set is
 * that window rather than a plain `!isSigned`.
 *
 * The window is the forward-only ladder. A step 1 commit writes `details_submitted`, and
 * `forwardOnlyCondition` only permits writing onto a status at or behind the one being written —
 * so the moment step 2 is acknowledged and the row reaches `partnership_ack`, the condition
 * fires. `classifyCommitRefusal` then finds the step reachable and the gym unsigned, and answers
 * `wrong_step`.
 *
 * Which is why the window is here and not just on the server. Rendering step 1 with live inputs
 * at `partnership_ack` would give a gym a form that fills in, validates, submits, and comes back
 * as "Please complete the earlier steps first" — the client promising an edit the server refuses.
 * Read-only is the honest rendering of a step the server will not take.
 *
 * Kept in step with `LADDER` and `statusForStepCommit(1)` in the backend. Note that the mock in
 * `shared/onboarding/mockApi.ts` is *looser* — `assertSubmittable` allows a re-submit any time
 * before signing — so preview mode is not what would catch this list going stale.
 */
const DETAILS_EDITABLE_FROM: ReadonlySet<OnboardingStatus> = new Set([
  "invited",
  "opened",
  "details_submitted",
]);

export type OnboardingActions = {
  submitDetails(details: GymDetails): Promise<boolean>;
  ackPartnership(): Promise<boolean>;
  markAgreementViewed(): Promise<void>;
  requestSigningOtp(): Promise<string | null>;
  signAgreement(input: SignatureInput): Promise<boolean>;
  chooseDeposit(choice: DepositChoice): Promise<DepositLink | null>;
  /**
   * Reads the deposit record with no UI side effects at all. It is the *only* way step 4
   * learns that money arrived, and there is deliberately no spinner-wrapped variant: a
   * timer must not put the whole wizard into its submitting state or wipe an error the
   * gym is still reading, and since §26 there is no button for a gym to press either.
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
  /**
   * True when viewing an earlier step, or any frozen step after signing — except step 1 while
   * the server would still take a correction to it. See `isEditableRevisit` below.
   */
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

  /**
   * Navigating clears the last action's error.
   *
   * An `actionError` is about the step whose action produced it, and it used to survive
   * until the *next* action ran — so a rejected step 1 ("Please check the highlighted
   * fields.") followed by a click on the rail put that banner at the top of step 2, a
   * screen with no fields on it at all. Whatever the gym does next on the new step clears
   * it anyway, which is why this was invisible until someone went back to correct a detail
   * and came forward again.
   *
   * Cleared here rather than in an effect on `viewStep`: the `wrong_step` and `frozen`
   * paths in `run` deliberately re-read state and move the view, and their message is the
   * explanation for the jump. An effect would erase it on arrival.
   */
  const goToStep = useCallback(
    (step: OnboardingStep) => {
      if (!canView(step)) return;
      setActionError(null);
      setViewOverride(step === currentStep ? null : step);
    },
    [canView, currentStep],
  );

  const isFrozenStep = !!state?.isSigned && (viewStep === 1 || viewStep === 2);

  /**
   * Step 1, revisited while the server would still accept it — editable rather than read-only.
   *
   * The one exception to "an earlier step is a view of the past". Every other step behind the
   * current one is a record of something concluded: step 2 is an acknowledgement that cannot be
   * un-acknowledged, steps 3 and 4 are a signature and a payment. Step 1 is eleven fields a gym
   * typed, and a wrong legal entity name in it is the most expensive typo in the flow, because
   * the signature hash covers the rendered agreement — free to fix here, an amendment to fix
   * after step 3.
   *
   * Deliberately not generalised to "any step behind the current one": each step's re-submit
   * window is its own question about the ladder, and step 1 is the only one with a form to
   * correct. See `DETAILS_EDITABLE_FROM` for why the window and not just `isSigned`.
   */
  const isEditableRevisit =
    viewStep === 1 &&
    !!state &&
    !state.isSigned &&
    DETAILS_EDITABLE_FROM.has(state.status);

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
    isReadOnly: (viewStep < currentStep && !isEditableRevisit) || isFrozenStep,
    actions,
  };
}
