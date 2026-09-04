/**
 * The measures and the type tokens this wizard is laid out on. See `OnboardingFlow` for why one file
 * owns them.
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

/**
 * The explanatory prose: field descriptions, the notes under a card, the line above the Continue
 * button.
 *
 * These are the part of these screens doing the work. They are what says a district is how the
 * territory gets written into the agreement, and what a figure will be checked against. They were
 * `text-xs text-muted-foreground`, which measured as the smallest type on the page at 4.95:1 on
 * white, and twelve of the eighteen sentences on step 2 were set in it. One step up in size and to
 * 7.6:1: still quieter than a label, no longer a footnote.
 *
 * Here rather than in `formKit` because the shell and four steps write these sentences outside any
 * field, and two sizes of hint on one screen reads as an accident.
 */
export const HINT_TEXT = "text-[13px] text-gray-600 leading-relaxed";

/**
 * The same grey one size up: the blurb under a step heading, and the paragraphs on the steps that
 * are reading rather than filling in.
 *
 * It shares `HINT_TEXT`'s colour deliberately. Left at `muted-foreground` while the hints moved,
 * the subtitle of a step came out fainter than the small print under the fields below it, which
 * reads as the page having got its own emphasis backwards.
 */
export const BODY_TEXT = "text-sm text-gray-600 leading-relaxed";
