"use client";

/**
 * Layout chrome for the site's two long reference pages — /gym-partnership and
 * /franchise.
 *
 * Both are documents rather than landing pages: someone scans them, jumps around in
 * them and comes back. That shape brings four pieces with it, and the reasons each is
 * built the way it is are the reasons not to "simplify" them later.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * First thing in the tab order, invisible until focused.
 *
 * The footer carries roughly forty links, so without this a keyboard user arriving from
 * another page tabs through the whole nav before reaching the content. `z-[60]` rather
 * than the site's `z-50` scale on purpose: it has to sit over the fixed navbar, which is
 * the one thing it would otherwise appear behind.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
    >
      Skip to content
    </a>
  );
}

/**
 * Jump nav for a page that is many sections of reference material.
 *
 * Desktop only. The mobile equivalent of "let me get to the bit I care about" is a
 * horizontally scrolling strip, which is the one thing a phone layout should not
 * introduce; phones get the sticky CTA instead. No active-section highlighting — that
 * needs a scroll observer running on every marketing page view to move a colour, and
 * the anchors are already the useful part.
 */
export function SectionNav({ sections }: { sections: readonly { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      className="hidden lg:block sticky top-16 z-40 border-b border-border bg-white/90 backdrop-blur-md"
    >
      <ul className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 h-12">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block px-3 py-2 rounded-lg text-[13px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The mobile CTA.
 *
 * Fixed rather than revealed on scroll: a scroll listener to hide it over the hero buys
 * one visual nicety and costs a listener on every phone visit, and the bar is the only
 * CTA in reach while someone is four sections deep in the terms.
 *
 * The page that renders this owes it `pb-24 lg:pb-0` on its own root — the bar is fixed
 * and would otherwise sit on top of the last rows of the footer. 24 rather than 20: at
 * 320px the label wraps and the bar grows to 90px, which overran an 80px reserve.
 */
export function StickyCta({
  title,
  subtitle,
  href,
  label,
  testId,
}: {
  title: string;
  subtitle: string;
  href: string;
  label: string;
  testId?: string;
}) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight">{title}</p>
        <p className="text-muted-foreground text-xs leading-tight mt-0.5">{subtitle}</p>
      </div>
      <Button
        asChild
        className="ml-auto min-h-11 rounded-full px-5 font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer flex-shrink-0"
      >
        {href.startsWith("#") ? (
          <a href={href} data-testid={testId}>
            {label}
          </a>
        ) : (
          <Link href={href} data-testid={testId}>
            {label}
          </Link>
        )}
      </Button>
    </div>
  );
}

/**
 * One section wrapper so padding, container width and the `scroll-mt` that keeps an
 * anchored heading clear of the two stacked sticky bars are defined once. Get
 * `scroll-mt` wrong and every jump-nav link lands with its heading under the nav.
 */
export function Section({
  id,
  tone,
  children,
}: {
  id: string;
  /** `dark` inverts the section; anything inside it must set its own light text colours. */
  tone?: "tinted" | "dark";
  children: React.ReactNode;
}) {
  const surface =
    tone === "dark"
      ? "bg-gray-950 border-y border-gray-900"
      : tone === "tinted"
        ? "bg-muted/40 border-y border-border"
        : "";
  return (
    <section
      id={id}
      // `scroll-mt` clears the navbar alone on mobile and the navbar plus the jump nav
      // on desktop, where both are pinned.
      className={`scroll-mt-20 lg:scroll-mt-32 px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20 ${surface}`}
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

/**
 * A section's eyebrow, title and standfirst.
 *
 * `split` puts the standfirst in a second column on desktop. Stacked, a 2xl-capped
 * paragraph under a 3xl heading leaves the right half of a 5xl container empty for the
 * length of the header, which on a page of eight sections reads as an unfinished layout
 * rather than as whitespace.
 */
export function SectionHeading({
  eyebrow,
  title,
  blurb,
  split,
  tone,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  split?: boolean;
  tone?: "dark";
}) {
  const dark = tone === "dark";
  const heading = (
    <div>
      {/*
        `--primary-ink` on light, `--primary` on dark. The eyebrow is 12px bold, so 4.5:1
        applies to it, and `--primary` is 3.25:1 on white — the reason index.css keeps a
        second step of the hue for brand-coloured text. On gray-950 it is 5.9:1 and the
        darker step is the one that fails.
      */}
      <span
        className={`inline-block text-xs font-bold tracking-[0.2em] uppercase mb-2.5 ${
          dark ? "text-primary" : "text-primary-ink"
        }`}
      >
        {eyebrow}
      </span>
      <h2
        className={`font-display font-black uppercase text-2xl sm:text-3xl tracking-tight leading-[1.05] text-balance ${
          dark ? "text-white" : ""
        }`}
      >
        {title}
      </h2>
    </div>
  );
  const standfirst = blurb && (
    <p className={`text-[15px] leading-relaxed ${dark ? "text-gray-300" : "text-muted-foreground"}`}>
      {blurb}
    </p>
  );

  if (split) {
    return (
      <div className="grid lg:grid-cols-2 gap-x-12 gap-y-4 lg:items-end">
        {heading}
        {standfirst}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {heading}
      {standfirst}
    </div>
  );
}
