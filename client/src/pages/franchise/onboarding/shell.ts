/**
 * The two measures this wizard is laid out on. See `OnboardingFlow` for why one file owns them.
 *
 * `PAGE` is the outer band: the header, the footer and the grid that holds the nav beside the
 * content. `COLUMN` is the reading measure of the content itself, and it is deliberately narrower
 * than the band it sits in — a form field stretched to 900px is a field nobody can scan, and the
 * body copy on these screens runs to full sentences.
 *
 * They live in their own module because the nav and the flow both need them and both are imported
 * by the shell, so reading them off `FranchiseOnboardingFlow` would be a cycle. Anything that draws
 * a full-width band across this flow uses `PAGE`, or it lands misaligned with the step heading.
 */
export const PAGE = "mx-auto w-full max-w-5xl px-5 sm:px-8";

export const COLUMN = "max-w-2xl";
