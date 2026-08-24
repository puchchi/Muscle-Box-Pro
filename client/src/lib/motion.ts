/**
 * Scrolling that honours `prefers-reduced-motion`.
 *
 * The base layer in `index.css` already sets `scroll-behavior: auto !important` under
 * the reduced-motion query, which covers anchors and every CSS-driven scroll. It does
 * not cover this one. Per CSSOM View, `scrollIntoView` consults the computed
 * `scroll-behavior` *only* when the `behavior` option is `"auto"`; passing `"smooth"`
 * explicitly wins over the stylesheet. So the animation that moves the whole viewport —
 * the one most likely to make a vestibular reader ill — was the only animation in the
 * app that the OS setting could not switch off.
 */

/** True when the reader has asked their OS for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  // Optional both ways: jsdom does not implement `matchMedia`, and a test that cannot
  // scroll is not a test that should throw.
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

/**
 * `scrollIntoView`, smooth unless the reader has asked for less motion.
 *
 * Takes a possibly-null element so call sites can hand it a ref without a guard, and
 * optional-calls the method itself because jsdom has no layout and so no
 * `scrollIntoView` — an unscrolled banner is not worth a thrown render in the suite.
 */
export function scrollIntoViewGently(
  element: Element | null | undefined,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {},
): void {
  element?.scrollIntoView?.({
    ...options,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}
