/**
 * One measure for the header, the rail, the body and the submit bar. See `OnboardingFlow`.
 *
 * It lives in its own module because `PhaseRail` and `formKit` both need it and both are imported
 * by the shell, so reading it off `FranchiseOnboardingFlow` would be a cycle. Anything that draws
 * a full-width band across this flow uses this, or it lands misaligned with the step heading.
 */
export const SHELL = "max-w-3xl mx-auto px-4 sm:px-6";
