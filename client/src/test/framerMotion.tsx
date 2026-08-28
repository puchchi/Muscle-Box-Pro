/**
 * The one framer-motion test double.
 *
 * Seven test files used to each hand-maintain their own `vi.mock("framer-motion", ...)`
 * listing the tags that file's components happened to use. Every one of them was a
 * different subset, and the failure mode is brutal: an unlisted tag resolves to
 * `undefined` and React throws "Element type is invalid", so adding `<motion.ul>` to a
 * page breaks a test file that never mentioned it — with an error pointing at React,
 * not at the mock. `ContactUs` had eleven tests failing for months because its stub
 * omitted `AnimatePresence`.
 *
 * So: no list. `motion` is a Proxy that manufactures a passthrough component for any
 * tag asked of it, and every framer export the app touches is stubbed here rather than
 * per file. Use it as:
 *
 *     vi.mock("framer-motion", () => import("@/test/framerMotion"));
 *
 * Animation props are stripped rather than spread onto the DOM node, because
 * `<div initial={{ opacity: 0 }}>` makes React warn about an unknown attribute holding
 * an object, and a suite that prints warnings during a normal run is a suite where
 * nobody reads the warnings.
 *
 * Deliberately no `vi.fn()` in here. `setup.ts` calls `vi.clearAllMocks()` before every
 * test, which wipes a `vi.fn(() => true)` down to returning `undefined` — the same trap
 * that made the observers in `setup.ts` classes instead of mocks. Nothing asserts on
 * these hooks anyway; they only need to return something plausible.
 */

import React from "react";

/**
 * Props framer consumes itself and never forwards to the DOM. Anything not on this
 * list is passed through, so `className`, `style`, `data-testid`, `onClick` and the
 * ARIA attributes all survive — those are what tests query on.
 */
const MOTION_ONLY_PROPS = new Set([
  "animate",
  "custom",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragSnapToOrigin",
  "dragTransition",
  "exit",
  "initial",
  "inherit",
  "layout",
  "layoutDependency",
  "layoutId",
  "layoutScroll",
  "onAnimationComplete",
  "onAnimationStart",
  "onDrag",
  "onDragEnd",
  "onDragStart",
  "onHoverEnd",
  "onHoverStart",
  "onPan",
  "onPanEnd",
  "onPanStart",
  "onTap",
  "onTapCancel",
  "onTapStart",
  "onUpdate",
  "onViewportEnter",
  "onViewportLeave",
  "transformTemplate",
  "transition",
  "variants",
  "viewport",
  "whileDrag",
  "whileFocus",
  "whileHover",
  "whileInView",
  "whileTap",
]);

function stripMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) kept[key] = props[key];
  }
  return kept;
}

/**
 * Cached so repeated `motion.div` reads give the same component identity. Without
 * this every render produces a fresh type and React remounts the subtree, which turns
 * a controlled input into one that loses focus mid-`userEvent.type()`.
 */
const cache = new Map<string, React.FC<Record<string, unknown>>>();

function passthrough(type: React.ElementType, label: string) {
  const cached = cache.get(label);
  if (cached) return cached;

  const Component: React.FC<Record<string, unknown>> = ({ children, ...rest }) =>
    React.createElement(type, stripMotionProps(rest), children as React.ReactNode);
  Component.displayName = label;

  cache.set(label, Component);
  return Component;
}

const motionProxy = new Proxy(
  {} as Record<string, React.FC<Record<string, unknown>>>,
  {
    get(_target, prop) {
      // Symbols reach here when vitest or React probes the namespace ($$typeof,
      // Symbol.toStringTag). Manufacturing a component for those breaks the probe.
      if (typeof prop !== "string") return undefined;

      // `motion.create(Button)` / the legacy `motion(Button)` call form.
      if (prop === "create") {
        return (type: React.ElementType) =>
          passthrough(type, `motion.create(${String(type)})`);
      }

      // Cast because any string is a valid tag here by construction — the whole point
      // is that the mock does not keep a list of which ones are allowed.
      return passthrough(prop as React.ElementType, `motion.${prop}`);
    },
  },
);

/** `motion` and `m` are the same thing here — `m` is only framer's smaller build. */
export const motion = motionProxy;
export const m = motionProxy;

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

/** Renders children immediately; the real one defers until `features` resolves. */
export const LazyMotion = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export const MotionConfig = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export const domAnimation = {};
export const domMax = {};

// `true` rather than `false`: a test wants to see the content, and every real caller
// uses this to reveal something on scroll.
export const useInView = () => true;
export const useReducedMotion = () => false;
export const useAnimation = () => ({
  start: async () => {},
  stop: () => {},
  set: () => {},
});
export const useMotionValue = (initial: number) => ({
  get: () => initial,
  set: () => {},
  on: () => () => {},
});
export const useScroll = () => ({
  scrollY: useMotionValue(0),
  scrollYProgress: useMotionValue(0),
});
export const useTransform = () => useMotionValue(0);
export const useSpring = (initial: number) => useMotionValue(initial);
