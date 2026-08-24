"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ListTree, Wrench } from "lucide-react";
import { renderText } from "@shared/agreement/render";
import { ISSUED_RENDER_OPTIONS } from "@shared/agreement/issued";
import type {
  Agreement,
  AgreementFields,
  Block,
  Section,
} from "@shared/agreement/types";

/**
 * The agreement, on screen, for signing.
 *
 * Design constraints, in the order they mattered:
 *
 * **The screen is a phone.** Forty-seven sections and eight schedules on a 390px
 * display is the actual problem here, not the desktop layout. So: page-level scroll
 * rather than a nested scroller (a scroll trap inside a phone page is unusable),
 * native `<details>` per section so a gym can fold away what it has read, and a
 * sticky contents strip that is one tap from any clause.
 *
 * **What is on screen must equal what is hashed.** This component, and whatever renders
 * the text that gets hashed, both go through `renderText` with `ISSUED_RENDER_OPTIONS`.
 * If those two ever diverge — a different placeholder, a different missing-token
 * policy — the stored hash stops being evidence of what the gym read, which is the
 * one thing it exists to be. Import the constant; do not retype the options. It lives in
 * `@shared/agreement/issued` rather than here, because the server computes the hash now
 * and cannot import from a `"use client"` component.
 *
 * **`todo` markers are ours, not the gym's.** They are drafting notes about holes in
 * the source document. They render only when `showInternalMarkers` is set, which is
 * preview mode; a gym must never read our notes about its own contract.
 */

/** `"6"` → `"agreement-6"`, `"Schedule A"` → `"agreement-schedule-a"`. */
export function sectionAnchor(number: string): string {
  return `agreement-${number.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Progress at which the sign panel unlocks, as a whole percent.
 *
 * 100 rather than "all of it" as a fraction: the measurement is rounded to integers
 * before it reaches state (see `useReadingPercent`), which absorbs the sub-pixel
 * remainder that a fractional threshold had to be fudged past.
 */
const READ_COMPLETE_PERCENT = 100;

/** Ring for the two `<summary>` elements, which are focusable and were showing nothing. */
const SUMMARY_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export default function AgreementReader({
  agreement,
  fields,
  showInternalMarkers = false,
  onReachedEnd,
  onProgress,
}: {
  agreement: Agreement;
  fields: Partial<AgreementFields>;
  showInternalMarkers?: boolean;
  onReachedEnd?: () => void;
  /** Whole percent scrolled, so the locked sign panel can say how far off it is. */
  onProgress?: (percent: number) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const percent = useReadingPercent(bodyRef);

  useEffect(() => {
    onProgress?.(percent);
    if (percent >= READ_COMPLETE_PERCENT) onReachedEnd?.();
    // Called on every render past the threshold rather than once: the parent latches
    // it, and a one-shot ref here would swallow the event if the parent remounted.
  }, [percent, onReachedEnd, onProgress]);

  const index = useMemo(
    () => [...agreement.sections, ...agreement.schedules],
    [agreement.sections, agreement.schedules],
  );

  /*
    The document is memoised away from the progress state.

    Scrolling this component updates `percent`, and `percent` lives in the same
    component as forty-seven sections whose every block runs `renderText` over its
    source string. Re-rendering all of that on scroll is what made the page feel heavy
    on a phone; holding the same element reference lets React skip the entire subtree.
  */
  const documentBody = useMemo(
    () => (
      <div ref={bodyRef} className="px-4 sm:px-6 py-5" data-testid="agreement-body">
        <header className="pb-4 mb-4 border-b border-gray-200">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-ink">
            {agreement.subtitle}
          </p>
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-foreground mt-1">
            {agreement.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Version {agreement.version}</p>
        </header>

        <div className="space-y-3">
          {agreement.cover.map((block, i) => (
            <BlockView
              key={i}
              block={block}
              fields={fields}
              showInternalMarkers={showInternalMarkers}
            />
          ))}
        </div>

        {index.map((section) => (
          <SectionView
            key={section.number}
            section={section}
            fields={fields}
            showInternalMarkers={showInternalMarkers}
          />
        ))}

        <p className="text-xs text-muted-foreground mt-8 pt-4 border-t border-gray-200">
          {agreement.runningFooter} — end of document.
        </p>
      </div>
    ),
    [agreement, fields, index, showInternalMarkers],
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/*
        Below the wizard's own sticky rail rather than at `top-0`, where the two
        overlapped and the contents strip disappeared behind the step indicator.
        The offset is published by the shell as a measured value.
      */}
      <div className="sticky top-[var(--onboarding-chrome,0px)] z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <details className="group">
          <summary
            className={`flex items-center gap-2 px-4 py-3 cursor-pointer list-none min-h-11 ${SUMMARY_FOCUS}`}
          >
            <ListTree className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wide text-foreground">
              Contents
            </span>
            <span
              className="text-xs text-muted-foreground ml-auto tabular-nums"
              data-testid="reading-progress"
            >
              {percent}% read
            </span>
            <ChevronDown
              className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <nav className="px-4 pb-3 max-h-64 overflow-y-auto" data-testid="agreement-index" aria-label="Agreement contents">
            <ul role="list" className="grid sm:grid-cols-2 gap-x-4">
              {index.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#${sectionAnchor(section.number)}`}
                    className="text-xs text-gray-700 hover:text-primary-ink py-1.5 flex gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-semibold text-foreground flex-shrink-0 tabular-nums">
                      {section.number}
                    </span>
                    <span className="truncate">{section.heading}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
        {/* The number beside "Contents" is the accessible version of this. */}
        <div className="h-0.5 bg-gray-200" aria-hidden="true">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {documentBody}
    </div>
  );
}

// ── Sections and blocks ─────────────────────────────────────────────────────

function SectionView({
  section,
  fields,
  showInternalMarkers,
}: {
  section: Section;
  fields: Partial<AgreementFields>;
  showInternalMarkers: boolean;
}) {
  return (
    // Open by default and collapsible, not the other way round. A gym should have to
    // fold the contract away rather than unfold it — and the hashed text is what is
    // delivered to the browser either way.
    <details
      open
      id={sectionAnchor(section.number)}
      /*
        `scroll-mt` clears two sticky things, not one: the wizard's rail and this
        reader's own contents strip (3.5rem). At `scroll-mt-20` a tapped clause landed
        underneath both, so following a cross-reference showed the heading of whatever
        came before it.
      */
      className="border-t border-gray-200 py-3 scroll-mt-[calc(var(--onboarding-chrome,0px)_+_3.5rem)] group"
      data-testid={`section-${section.number}`}
    >
      <summary
        className={`flex items-baseline gap-2 cursor-pointer list-none -mx-1 px-1 py-2 rounded hover:bg-gray-50 ${SUMMARY_FOCUS}`}
      >
        <span className="text-xs font-bold text-primary-ink tabular-nums flex-shrink-0">
          {section.number}
        </span>
        <h3 className="text-sm font-bold text-foreground flex-1 min-w-0">{section.heading}</h3>
        <ChevronDown
          className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-2.5 mt-2.5 pl-0 sm:pl-6">
        {section.blocks.map((block, i) => (
          <BlockView
            key={i}
            block={block}
            fields={fields}
            showInternalMarkers={showInternalMarkers}
          />
        ))}
      </div>
    </details>
  );
}

/**
 * Body type for the contract.
 *
 * It was `text-xs` — 12px, a caption size — for forty-seven sections of prose the gym
 * is about to be bound by, in `text-muted-foreground`. `text-sm` in `gray-700` is
 * readable, and the measure is capped near 68 characters because at the card's full
 * width the lines ran to about 130, which is roughly double the length at which the eye
 * starts losing its place on the way back to the left margin.
 */
const PROSE = "text-sm text-gray-700 leading-relaxed max-w-[68ch]";

function BlockView({
  block,
  fields,
  showInternalMarkers,
}: {
  block: Block;
  fields: Partial<AgreementFields>;
  showInternalMarkers: boolean;
}) {
  const r = (text: string) => renderText(text, fields, ISSUED_RENDER_OPTIONS);

  switch (block.kind) {
    case "paragraph":
      return <p className={PROSE}>{r(block.text)}</p>;

    case "clause":
      return (
        <p className={`${PROSE} flex gap-2`}>
          <span className="font-semibold text-foreground tabular-nums flex-shrink-0">
            {block.number}
          </span>
          <span>{r(block.text)}</span>
        </p>
      );

    case "bullets":
      return (
        <div>
          {block.lead && <p className={`${PROSE} mb-1`}>{r(block.lead)}</p>}
          <ul role="list" className="space-y-1 pl-4">
            {block.items.map((item, i) => (
              <li key={i} className={`${PROSE} list-disc`}>
                {r(item)}
              </li>
            ))}
          </ul>
        </div>
      );

    case "checklist":
      return (
        <div>
          {block.lead && <p className={`${PROSE} mb-1`}>{r(block.lead)}</p>}
          <ul role="list" className="space-y-1">
            {block.items.map((item, i) => (
              <li key={i} className={`${PROSE} flex gap-2`}>
                {/* A drawn box, not an <input>: this is a checklist to be completed on
                    paper at installation, and a real checkbox would invite clicking. */}
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 border border-gray-400 rounded-sm flex-shrink-0 mt-0.5"
                />
                {r(item)}
              </li>
            ))}
          </ul>
        </div>
      );

    case "table":
      return (
        // Tables keep the denser size on purpose: a fee schedule is read cell by cell,
        // and widening the type is what forces a phone into horizontal scrolling.
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-foreground border-b border-gray-300 py-1.5 pr-3 align-bottom"
                  >
                    {r(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="text-gray-700 border-b border-gray-200 py-1.5 pr-3 align-top leading-relaxed"
                    >
                      {r(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout":
      return (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
          {block.lines.map((line, i) => (
            <p key={i} className="text-sm font-semibold text-foreground leading-relaxed">
              {r(line)}
            </p>
          ))}
        </div>
      );

    case "blanks":
      return (
        <dl className="space-y-1.5">
          {block.items.map((blank, i) => (
            <div key={i} className="flex items-baseline gap-2 text-sm">
              <dt className="text-gray-700 flex-shrink-0">{r(blank.label)}</dt>
              <dd
                className={`border-b border-dashed border-gray-400 flex-1 ${
                  blank.width === "short" ? "max-w-24" : ""
                }`}
              />
            </div>
          ))}
        </dl>
      );

    case "signatures":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          {block.parties.map((party, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-bold text-foreground mb-2">{r(party.heading)}</p>
              <dl className="space-y-1.5">
                {party.fields.map((field, j) => (
                  <div key={j} className="flex items-baseline gap-2 text-sm">
                    <dt className="text-gray-700 flex-shrink-0">{r(field)}</dt>
                    <dd className="border-b border-dashed border-gray-400 flex-1" />
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      );

    case "todo":
      // Internal only — see the header note. Excluded from the hash by
      // `renderPlainText`, so showing or hiding it cannot move the signature.
      if (!showInternalMarkers) return null;
      return (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
            <Wrench className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            Internal — {block.severity}
          </p>
          <p className="text-[11px] text-amber-900 leading-relaxed mt-1">{block.problem}</p>
          <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
            <strong>To clear:</strong> {block.resolution}
          </p>
        </div>
      );
  }
}

// ── Reading progress ────────────────────────────────────────────────────────

/**
 * How far through the document the bottom of the viewport has travelled, 0 to 100.
 *
 * Measured from the document element's own box on scroll, rather than with an
 * `IntersectionObserver` on a sentinel, for two reasons: it yields a *percentage* to
 * show the reader rather than a single boolean, and it stays correct when sections
 * are collapsed and the document's height changes underneath it.
 *
 * Two things keep it off the critical path. The measurement is taken in a frame
 * callback, so a burst of scroll events costs one layout read rather than one per
 * event; and it is rounded to a whole percent and compared before being stored, so a
 * full read re-renders the reader about a hundred times instead of once per pixel.
 * `1%` is also the smallest change the UI can express — the label and the bar are both
 * quantised to it — so nothing is lost.
 *
 * What this is honestly worth: it evidences that the whole document was delivered and
 * scrolled past, not that anyone read it. Nothing in a browser can evidence reading.
 * The load-bearing evidence is elsewhere — the content hash, the OTP, and the
 * server-side timestamps (§3, step 3).
 */
function useReadingPercent(ref: React.RefObject<HTMLElement | null>): number {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      // No layout engine at all — a test environment, or an element that has not been
      // laid out yet. An unmeasurable document must not soft-lock the sign panel, so
      // it counts as scrolled rather than as unread.
      if (rect.height === 0) {
        setPercent(READ_COMPLETE_PERCENT);
        return;
      }
      const scrolledPast = window.innerHeight - rect.top;
      const fraction = Math.min(1, Math.max(0, scrolledPast / rect.height));
      const next = Math.round(fraction * 100);
      setPercent((current) => (current === next ? current : next));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);

  return percent;
}
