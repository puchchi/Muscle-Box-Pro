/**
 * Step metadata — one definition for the phase rail, the page heading and the "what the
 * steps are" list in the invitation email. Same job as `shared/onboarding/steps.ts`.
 *
 * ## Why the wizard has its own phases
 *
 * docs/franchise-onboarding.md §3 says the rail should use `JOURNEY_PHASES` from
 * `shared/franchise/program.ts`, so a franchisee onboarding sees the same words as the
 * journey they read on the public page. Applied literally that fails: all nine steps here
 * fall inside the first two of those four phases — everything up to signing is
 * `approve`, and steps 8 and 9 are `fund` — so the rail would read seven-then-two, which is
 * exactly the long-ladder reading the grouping exists to prevent.
 *
 * So the four phases below are the wizard's own, and each one names the journey phase it sits
 * inside. The vocabulary is kept and the grouping is useful, which is what §3 was after.
 */

import type { FranchiseJourneyPhaseId } from "../program";
import type { FranchiseOnboardingStep } from "./types";

export type FranchisePhaseId = "apply" | "approval" | "agree" | "fund";

export type FranchisePhase = {
  id: FranchisePhaseId;
  /** Two words at most: this renders in a rail beside eight other things. */
  title: string;
  /** Which stage of the public journey (§52) this phase sits inside. */
  journeyPhase: FranchiseJourneyPhaseId;
};

export const FRANCHISE_PHASES: readonly FranchisePhase[] = [
  { id: "apply", title: "Apply", journeyPhase: "approve" },
  { id: "approval", title: "Approval", journeyPhase: "approve" },
  { id: "agree", title: "Agree", journeyPhase: "approve" },
  { id: "fund", title: "Fund", journeyPhase: "fund" },
];

export type FranchiseStepMeta = {
  step: FranchiseOnboardingStep;
  phase: FranchisePhaseId;
  /** Full heading, used as the page title for that step. */
  title: string;
  /** Two or three words for the rail, where horizontal space is scarce. */
  shortTitle: string;
  /** One line under the heading. */
  blurb: string;
  /**
   * Roughly how long this step takes the franchisee.
   *
   * Null where it is not their work. Step 4 is us evaluating a market, and "Approval, 0
   * minutes" in a list of times is worse than an absence — it keeps out of the total rather
   * than contributing a zero nobody can read. Step 8 has one: the transfer and the claim
   * form are theirs, and the wait for our verification is not a duration we can promise.
   */
  estimate: string | null;
};

export const FRANCHISE_STEP_META: readonly FranchiseStepMeta[] = [
  {
    step: 1,
    phase: "apply",
    title: "Your details",
    shortTitle: "Your details",
    blurb: "Your business and contact details, as they will appear in the agreement.",
    estimate: "5 minutes",
  },
  {
    step: 2,
    phase: "apply",
    title: "Your territory",
    shortTitle: "Territory",
    blurb: "The districts you want to develop, and the size of franchise you want.",
    estimate: "3 minutes",
  },
  {
    step: 3,
    phase: "apply",
    title: "KYC and documents",
    shortTitle: "Documents",
    blurb: "Proof of your business, your address and the person signing.",
    estimate: "10 minutes",
  },
  {
    step: 4,
    phase: "approval",
    title: "Approval",
    shortTitle: "Approval",
    blurb: "We evaluate the market and confirm the territory with you.",
    estimate: null,
  },
  {
    step: 5,
    phase: "agree",
    title: "Your franchise",
    shortTitle: "Your franchise",
    blurb: "What you put in, what you earn, and how you get your capital back.",
    estimate: "5 minutes",
  },
  {
    step: 6,
    phase: "agree",
    title: "Operations readiness",
    shortTitle: "Operations",
    blurb: "Where you'll store stock, who runs the machines, and how you'll roll them out.",
    estimate: "5 minutes",
  },
  {
    step: 7,
    phase: "agree",
    title: "Review and sign",
    shortTitle: "Review & sign",
    blurb: "Who signs, and how.",
    estimate: "15 minutes",
  },
  {
    step: 8,
    phase: "fund",
    title: "First instalment",
    shortTitle: "First instalment",
    blurb: "How to make the transfer, and the reference to put on it.",
    estimate: "10 minutes",
  },
  {
    step: 9,
    phase: "fund",
    title: "You're set up",
    shortTitle: "Done",
    blurb: "Your signed agreement, your portal login, and what happens over the next months.",
    estimate: "2 minutes",
  },
] as const;

export function franchiseStepMeta(step: FranchiseOnboardingStep): FranchiseStepMeta {
  const meta = FRANCHISE_STEP_META.find((m) => m.step === step);
  // Unreachable through the type system; a runtime guard because these are two
  // declarations that could fall out of step.
  if (!meta) throw new Error(`No metadata for franchise onboarding step ${step}`);
  return meta;
}

/** The steps of one phase, in order — what the rail groups under a heading. */
export function franchiseStepsInPhase(phase: FranchisePhaseId): readonly FranchiseStepMeta[] {
  return FRANCHISE_STEP_META.filter((m) => m.phase === phase);
}

export function franchisePhaseOf(step: FranchiseOnboardingStep): FranchisePhase {
  const id = franchiseStepMeta(step).phase;
  const phase = FRANCHISE_PHASES.find((p) => p.id === id);
  if (!phase) throw new Error(`No phase ${id}`);
  return phase;
}

/** The exact sum of the per-step estimates. Summed rather than hardcoded. */
export function franchiseTotalEstimateMinutes(): number {
  return FRANCHISE_STEP_META.reduce(
    (total, m) => total + (m.estimate === null ? 0 : Number.parseInt(m.estimate, 10)),
    0,
  );
}

/** The steps that cost the franchisee time, in order — what the intro and the email list. */
export function franchiseTimedSteps(): readonly FranchiseStepMeta[] {
  return FRANCHISE_STEP_META.filter((m) => m.estimate !== null);
}

/**
 * The same total, rounded to the nearest five — which is what "about" means. `roughTotalMinutes`
 * in the gym flow's steps module makes the argument; it applies unchanged.
 */
export function franchiseRoughTotalMinutes(): number {
  return Math.round(franchiseTotalEstimateMinutes() / 5) * 5;
}
