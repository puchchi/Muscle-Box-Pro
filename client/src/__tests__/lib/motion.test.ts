import { describe, it, expect, afterEach, vi } from "vitest";
import { prefersReducedMotion, scrollIntoViewGently } from "@/lib/motion";

/**
 * Why this file exists at all, for one nine-line module.
 *
 * The bug it guards is invisible: `index.css` sets `scroll-behavior: auto !important`
 * under `prefers-reduced-motion`, which reads like it covers everything, and it does not
 * cover `scrollIntoView({behavior: "smooth"})` — CSSOM View only consults the computed
 * `scroll-behavior` when the option is `"auto"`. So a hand-written `"smooth"` silently
 * beats the stylesheet, and the one animation that moves the entire viewport is the one
 * the OS setting cannot switch off. Nothing about that is apparent from reading either
 * file, which is exactly the kind of thing that gets "tidied" back.
 */

/** jsdom has neither `matchMedia` nor layout; both are installed per test. */
function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduce, media: query })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prefersReducedMotion", () => {
  it("reports what the OS setting says", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);

    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("answers no rather than throwing where matchMedia is absent", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("scrollIntoViewGently", () => {
  it("animates by default and jumps when less motion is asked for", () => {
    const scrollIntoView = vi.fn();
    const element = { scrollIntoView } as unknown as Element;

    stubMatchMedia(false);
    scrollIntoViewGently(element, { block: "center" });
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center", behavior: "smooth" });

    stubMatchMedia(true);
    scrollIntoViewGently(element, { block: "center" });
    // The whole point: an explicit "smooth" here would have outranked the stylesheet.
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "center", behavior: "auto" });
  });

  it("does nothing for a ref that has not attached, or a jsdom node with no layout", () => {
    stubMatchMedia(false);
    expect(() => scrollIntoViewGently(null)).not.toThrow();
    expect(() => scrollIntoViewGently({} as unknown as Element)).not.toThrow();
  });
});
