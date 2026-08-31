"use client";

import { useCallback, useEffect, useState } from "react";

import { franchiseOnboardingApi } from "@/lib/franchiseOnboardingApi";
import { franchiseeCommits, freezeReason } from "@shared/franchise/onboarding/status";
import type {
  DocumentUploadInput,
  EsignHandoff,
  EsignSignType,
  FranchiseDetails,
  FranchiseOnboardingError,
  FranchiseOnboardingState,
  FranchiseOnboardingStep,
  OperationsReadiness,
  PaymentClaimInput,
  PaymentInstructions,
  TerritoryProposal,
} from "@shared/franchise/onboarding/types";

/**
 * Owns all franchise onboarding server state for one handle.
 *
 * `useOnboarding.ts` is the model and its central rule is unchanged: **the step is whatever the
 * server last said it was.** No local step counter, no `setStep`.
 *
 * Two things it does differently, both because three of the nine steps are ours rather than the
 * franchisee's.
 *
 * *Read-only is asked, not listed.* The gym hook keeps `DETAILS_EDITABLE_FROM`, a hand-maintained
 * set of statuses that has to be kept in step with the backend's ladder, and its own docstring
 * says preview mode would not catch it going stale. Here the client calls the same
 * `freezeReason` the server calls, so a field is read-only exactly when a submit would be
 * refused, and there is one rule rather than two copies of one.
 *
 * *Refreshes are not actions.* `refreshEsignStatus` and `refreshPaymentStatus` fold in state and
 * do nothing else: no spinner, no error banner, no clearing of the view override. A franchisee
 * re-reading their term sheet while a signature lands must not be yanked forward by a timer, and
 * a failed poll is not something to put in front of anyone.
 */

export type FranchiseOnboardingActions = {
  submitDetails(details: FranchiseDetails): Promise<boolean>;
  submitTerritory(territory: TerritoryProposal): Promise<boolean>;
  uploadDocument(input: DocumentUploadInput): Promise<boolean>;
  removeDocument(docId: string): Promise<boolean>;
  submitKyc(): Promise<boolean>;
  ackFranchise(): Promise<boolean>;
  submitOperations(operations: OperationsReadiness): Promise<boolean>;
  /** Fire-and-forget audit write. Never blocks the reader, and a failure is not shown. */
  markTermSheetViewed(): Promise<void>;
  /**
   * Returns the handoff so the caller can hand the browser to Digio. It is returned rather
   * than stored, and there is nowhere on the state to put it (§6.4).
   */
  requestEsign(signType: EsignSignType): Promise<EsignHandoff | null>;
  refreshEsignStatus(): Promise<void>;
  loadPaymentInstructions(): Promise<PaymentInstructions | null>;
  claimPayment(input: PaymentClaimInput): Promise<boolean>;
  refreshPaymentStatus(): Promise<void>;
  createAccount(password: string): Promise<boolean>;
};

export type UseFranchiseOnboarding = {
  state: FranchiseOnboardingState | null;
  /** Fatal: a bad, expired or revoked handle. The wizard cannot render at all. */
  fatalError: FranchiseOnboardingError | null;
  /** Recoverable: a rejected submit. Shown in place. */
  actionError: FranchiseOnboardingError | null;
  fieldErrors: Record<string, string> | null;
  isLoading: boolean;
  isSubmitting: boolean;
  currentStep: FranchiseOnboardingStep;
  /** The step on screen. Equals `currentStep` unless the franchisee went back. */
  viewStep: FranchiseOnboardingStep;
  canView(step: FranchiseOnboardingStep): boolean;
  goToStep(step: FranchiseOnboardingStep): void;
  /** True when the server would refuse a submission for the step on screen. */
  isReadOnly: boolean;
  /** Why, in the franchisee's own terms, or null. The message the server would have sent. */
  frozenReason: string | null;
  clearActionError(): void;
  /**
   * Re-reads the record, silently.
   *
   * Needed because three steps move without the franchisee doing anything: an approval, a
   * signature that arrives by webhook, a payment an admin verified. The return trip from Digio
   * and the preview hatches both land here.
   */
  reload(): Promise<void>;
  actions: FranchiseOnboardingActions;
};

export function useFranchiseOnboarding(handle: string): UseFranchiseOnboarding {
  const [state, setState] = useState<FranchiseOnboardingState | null>(null);
  const [fatalError, setFatalError] = useState<FranchiseOnboardingError | null>(null);
  const [actionError, setActionError] = useState<FranchiseOnboardingError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Null means "follow the server". Cleared by any successful action. */
  const [viewOverride, setViewOverride] = useState<FranchiseOnboardingStep | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    franchiseOnboardingApi.getState(handle).then((result) => {
      if (cancelled) return;
      if (result.ok) setState(result.data);
      else setFatalError(result.error);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  /**
   * Runs one mutating call and folds the result into state.
   *
   * `wrong_step` and `frozen` re-read rather than just reporting: the server has told us it is
   * somewhere else, so the honest response is to render where it actually is. `declined` does
   * not, because the state it would re-read is the same state, and the message is the screen.
   */
  const run = useCallback(
    async <T>(
      call: () => Promise<
        { ok: true; data: T } | { ok: false; error: FranchiseOnboardingError }
      >,
      extract: (data: T) => FranchiseOnboardingState | null,
    ): Promise<T | null> => {
      setActionError(null);
      setIsSubmitting(true);
      try {
        const result = await call();
        if (!result.ok) {
          setActionError(result.error);
          if (result.error.code === "wrong_step" || result.error.code === "frozen") {
            const fresh = await franchiseOnboardingApi.getState(handle);
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
    [handle],
  );

  /** Folds in fresh state and does nothing else. See this module's header. */
  const refresh = useCallback(
    async (call: () => ReturnType<typeof franchiseOnboardingApi.getState>) => {
      const result = await call();
      if (result.ok) setState(result.data);
    },
    [],
  );

  const actions: FranchiseOnboardingActions = {
    async submitDetails(details) {
      return (
        (await run(() => franchiseOnboardingApi.submitDetails(handle, details), (s) => s)) !== null
      );
    },
    async submitTerritory(territory) {
      return (
        (await run(
          () => franchiseOnboardingApi.submitTerritory(handle, territory),
          (s) => s,
        )) !== null
      );
    },
    async uploadDocument(input) {
      return (
        (await run(() => franchiseOnboardingApi.uploadDocument(handle, input), (s) => s)) !== null
      );
    },
    async removeDocument(docId) {
      return (
        (await run(() => franchiseOnboardingApi.removeDocument(handle, docId), (s) => s)) !== null
      );
    },
    async submitKyc() {
      return (await run(() => franchiseOnboardingApi.submitKyc(handle), (s) => s)) !== null;
    },
    async ackFranchise() {
      return (await run(() => franchiseOnboardingApi.ackFranchise(handle), (s) => s)) !== null;
    },
    async submitOperations(operations) {
      return (
        (await run(
          () => franchiseOnboardingApi.submitOperations(handle, operations),
          (s) => s,
        )) !== null
      );
    },
    async markTermSheetViewed() {
      const result = await franchiseOnboardingApi.markTermSheetViewed(handle);
      if (result.ok) setState(result.data);
      // `not_issuable` is the one failure worth surfacing here: it means our own record is
      // incomplete, so the reader has nothing to render and the step needs to say why.
      else if (result.error.code === "not_issuable") setActionError(result.error);
    },
    async requestEsign(signType) {
      const contentHash = state?.termSheet?.contentHash;
      if (!contentHash) return null;
      const data = await run(
        () => franchiseOnboardingApi.requestEsign(handle, { signType, contentHash }),
        (d) => d.state,
      );
      return data?.handoff ?? null;
    },
    async refreshEsignStatus() {
      await refresh(() => franchiseOnboardingApi.refreshEsignStatus(handle));
    },
    async loadPaymentInstructions() {
      const result = await franchiseOnboardingApi.getPaymentInstructions(handle);
      if (result.ok) return result.data;
      setActionError(result.error);
      return null;
    },
    async claimPayment(input) {
      return (
        (await run(() => franchiseOnboardingApi.claimPayment(handle, input), (s) => s)) !== null
      );
    },
    async refreshPaymentStatus() {
      await refresh(() => franchiseOnboardingApi.refreshPaymentStatus(handle));
    },
    async createAccount(password) {
      // The server's own `details.noticesEmail`, read off the state this hook already holds.
      // Step 9 does not ask for it and must not: it is the notices address the term sheet was
      // signed against, and the portal login is created under it.
      const email = state?.details.noticesEmail ?? "";
      return (
        (await run(
          () => franchiseOnboardingApi.createAccount(handle, password, email),
          (s) => s,
        )) !== null
      );
    },
  };

  const currentStep: FranchiseOnboardingStep = state?.currentStep ?? 1;

  const canView = useCallback(
    (step: FranchiseOnboardingStep) =>
      !!state && (step === currentStep || state.completedSteps.includes(step)),
    [state, currentStep],
  );

  // Clamped rather than trusted: if `completedSteps` and an override disagree, the server wins.
  const viewStep = viewOverride !== null && canView(viewOverride) ? viewOverride : currentStep;

  /**
   * Navigating clears the last action's error, for the gym hook's reason: an error about the
   * step that produced it does not belong at the top of a different step.
   */
  const goToStep = useCallback(
    (step: FranchiseOnboardingStep) => {
      if (!canView(step)) return;
      setActionError(null);
      setViewOverride(step === currentStep ? null : step);
    },
    [canView, currentStep],
  );

  const frozenReason = state ? freezeReason(state, viewStep) : null;

  return {
    state,
    fatalError,
    actionError,
    fieldErrors: actionError?.fieldErrors ?? null,
    isLoading,
    isSubmitting,
    currentStep,
    viewStep,
    canView,
    goToStep,
    // Steps 4, 7 and 8 have no form to make editable: their content is our record, and the
    // franchisee's own actions on 7 and 8 are guarded by the term sheet and the signature
    // rather than by this flag.
    isReadOnly: !state || !franchiseeCommits(viewStep) || frozenReason !== null,
    frozenReason,
    clearActionError: useCallback(() => setActionError(null), []),
    reload: useCallback(async () => {
      await refresh(() => franchiseOnboardingApi.getState(handle));
    }, [handle, refresh]),
    actions,
  };
}
