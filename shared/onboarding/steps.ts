/**
 * Step metadata — one definition for the progress rail, the page heading, and the
 * "what the five steps are" list in the invitation email.
 *
 * Order here is the order in `docs/gym-onboarding.md` §3: details before the
 * partnership explainer, and the deposit after signing rather than before.
 */

import type { OnboardingStep } from "./types";

export type StepMeta = {
  step: OnboardingStep;
  /** Full heading, used as the page title for that step. */
  title: string;
  /** Two or three words for the progress rail, where horizontal space is scarce. */
  shortTitle: string;
  /** One line under the heading. */
  blurb: string;
  /** Roughly how long this step takes, for the step 1 hero. */
  estimate: string;
};

export const STEP_META: readonly StepMeta[] = [
  {
    step: 1,
    title: "Confirm your details",
    shortTitle: "Your details",
    blurb: "The legal and contact details that go into your agreement.",
    estimate: "3 minutes",
  },
  {
    step: 2,
    title: "Your partnership",
    shortTitle: "Partnership",
    blurb: "What you get, what we cover, and what we need from you.",
    estimate: "2 minutes",
  },
  {
    step: 3,
    title: "Review & sign",
    shortTitle: "Review & sign",
    blurb: "The full agreement, in plain English first.",
    estimate: "10 minutes",
  },
  {
    step: 4,
    title: "Security deposit",
    shortTitle: "Deposit",
    blurb: "Refundable, and you can pay it later.",
    estimate: "2 minutes",
  },
  {
    step: 5,
    title: "You're set up",
    shortTitle: "Done",
    blurb: "Your signed copy, your portal password, and what happens next.",
    estimate: "1 minute",
  },
] as const;

export function stepMeta(step: OnboardingStep): StepMeta {
  const meta = STEP_META.find((m) => m.step === step);
  // Unreachable through the type system; a runtime guard because STEP_META and
  // OnboardingStep are two declarations that could fall out of step.
  if (!meta) throw new Error(`No metadata for onboarding step ${step}`);
  return meta;
}

/** "about 18 minutes" — for the hero. Summed rather than hardcoded. */
export function totalEstimateMinutes(): number {
  return STEP_META.reduce((total, m) => total + Number.parseInt(m.estimate, 10), 0);
}
