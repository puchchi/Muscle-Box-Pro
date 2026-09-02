"use client";

import { Check, ChevronRight } from "lucide-react";

import { franchiseTerritoryLabel } from "@shared/franchise/onboarding/schema";
import { franchiseeCommits, freezeReason } from "@shared/franchise/onboarding/status";
import { franchiseStepMeta } from "@shared/franchise/onboarding/steps";
import { formatInr } from "@shared/franchise/program";
import type {
  FranchiseOnboardingState,
  FranchiseOnboardingStep,
} from "@shared/franchise/onboarding/types";
import { formatIstDate } from "../../gym/istDates";

/**
 * The other steps of the stage on screen, as a list of one-line rows.
 *
 * This is the half of the regrouping that stops it being a reduction. `PhaseNav` shows four stages
 * where the old rail showed nine steps; these rows are where the missing detail went, and they show
 * it in the place it is useful rather than in the chrome of every screen: what has already been
 * answered, with the answer, and what is still to come in this stage.
 *
 * Two lists rather than one, above and below the step being worked on, so the order on screen is
 * the order of the flow. The one on screen is not in either — it is the page.
 *
 * **Nothing here is a second source of truth.** A row is a rendering of `state`, the affordance is
 * `Edit` or `View` according to the same `freezeReason` the server refuses a submit with, and a row
 * is a button exactly when `canView` says the step may be opened. There is no local idea of
 * progress for the server to disagree with.
 */

type Props = {
  steps: readonly FranchiseOnboardingStep[];
  state: FranchiseOnboardingState;
  canView(step: FranchiseOnboardingStep): boolean;
  onSelect(step: FranchiseOnboardingStep): void;
};

export default function PhaseSteps({ steps, state, canView, onSelect }: Props) {
  if (steps.length === 0) return null;

  return (
    <ul
      role="list"
      className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white"
      data-testid="phase-steps"
    >
      {steps.map((step) => (
        <li key={step}>
          <StepRow
            step={step}
            state={state}
            selectable={canView(step)}
            onSelect={() => onSelect(step)}
          />
        </li>
      ))}
    </ul>
  );
}

function StepRow({
  step,
  state,
  selectable,
  onSelect,
}: {
  step: FranchiseOnboardingStep;
  state: FranchiseOnboardingState;
  selectable: boolean;
  onSelect(): void;
}) {
  const meta = franchiseStepMeta(step);
  const isDone = state.completedSteps.includes(step);
  const summary = isDone ? stepSummary(step, state) : null;
  const editable = franchiseeCommits(step) && freezeReason(state, step) === null;

  const body = (
    <>
      <RowMarker done={isDone} current={step === state.currentStep} />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${isDone ? "text-foreground" : "text-gray-500"}`}
        >
          {meta.title}
        </span>
        <span className="block text-xs text-muted-foreground truncate mt-0.5">
          {summary ?? meta.blurb}
        </span>
      </span>
      {selectable ? (
        <span className="flex items-center gap-0.5 text-xs font-semibold text-primary-ink flex-shrink-0">
          {editable ? "Edit" : "View"}
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      ) : (
        meta.estimate && (
          <span className="text-xs text-muted-foreground flex-shrink-0">{meta.estimate}</span>
        )
      )}
    </>
  );

  if (!selectable) {
    return <div className="flex items-center gap-3 px-4 py-3.5">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`step-row-${step}`}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-gray-50 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {body}
    </button>
  );
}

/** Done, in progress, or neither. No numbers: the count of steps is what the stages replaced. */
function RowMarker({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <span
        className="w-5 h-5 rounded-full bg-primary-fill flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <Check className="w-3 h-3 text-white" />
      </span>
    );
  }
  return (
    <span
      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
        current ? "border-2 border-primary-fill" : "border-gray-300"
      }`}
      aria-hidden="true"
    >
      {current && <span className="w-1.5 h-1.5 rounded-full bg-primary-fill" />}
    </span>
  );
}

/**
 * What a completed step answered, in one line.
 *
 * The value rather than the fact of it. "Your details, done" tells a franchisee nothing they cannot
 * see from the tick, and the reason to collapse a step is that its answer is short enough to read
 * in place. Null where the answer is not a value — an approval that is still with us, an
 * acknowledgement — and the row falls back to the step's own blurb.
 */
function stepSummary(
  step: FranchiseOnboardingStep,
  state: FranchiseOnboardingState,
): string | null {
  switch (step) {
    case 1:
      return state.details.legalEntityName || null;
    case 2:
      return franchiseTerritoryLabel(state.territory);
    case 3: {
      const count = state.documents.filter((doc) => doc.docType !== "payment_proof").length;
      return count === 0 ? null : `${count} ${count === 1 ? "document" : "documents"} with us`;
    }
    case 4: {
      const approval = state.approval;
      if (!approval) return null;
      if (approval.outcome === "approved") return approval.territory;
      if (approval.outcome === "on_hold") return "On hold with us";
      return "Not taken forward";
    }
    case 5:
      return `${formatInr(state.terms.investmentPaise / 100)}, ${state.terms.machineAllocation} machines`;
    case 6:
      return state.operations?.warehouseAddress.split("\n")[0]?.trim() || null;
    case 7:
      return state.esign.executed
        ? `Signed on ${formatIstDate(state.esign.executed.signedAt)}`
        : null;
    case 8: {
      const payment = state.payments.find((p) => p.instalment === 1);
      if (!payment) return null;
      if (payment.verifiedAt) return `Received on ${formatIstDate(payment.verifiedAt)}`;
      return payment.claim ? "Transfer reported, with us to confirm" : null;
    }
    case 9:
      return state.timestamps.accountCreatedAt ? "Your login is ready" : null;
  }
}
