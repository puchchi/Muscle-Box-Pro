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

/** Progress at which the sign panel unlocks. Not 1, because sub-pixel rounding never lands exactly. */
const READ_THRESHOLD = 0.995;

export default function AgreementReader({
  agreement,
  fields,
  showInternalMarkers = false,
  onReachedEnd,
}: {
  agreement: Agreement;
  fields: Partial<AgreementFields>;
  showInternalMarkers?: boolean;
  onReachedEnd?: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const progress = useReadingProgress(bodyRef);
  const percent = Math.round(progress * 100);

  useEffect(() => {
    if (progress >= READ_THRESHOLD) onReachedEnd?.();
    // Called on every render past the threshold rather than once: the parent latches
    // it, and a one-shot ref here would swallow the event if the parent remounted.
  }, [progress, onReachedEnd]);

  const index = useMemo(
    () => [...agreement.sections, ...agreement.schedules],
    [agreement.sections, agreement.schedules],
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* ── Sticky contents + progress ───────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
        <details className="group">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none">
            <ListTree className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide text-foreground">
              Contents
            </span>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums" data-testid="reading-progress">
              {percent}% read
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <nav className="px-4 pb-3 max-h-64 overflow-y-auto" data-testid="agreement-index">
            <ul className="grid sm:grid-cols-2 gap-x-4">
              {index.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#${sectionAnchor(section.number)}`}
                    className="text-xs text-muted-foreground hover:text-primary py-1 flex gap-2"
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
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* ── The document ─────────────────────────────────────────────────── */}
      <div ref={bodyRef} className="px-4 sm:px-6 py-5" data-testid="agreement-body">
        <header className="pb-4 mb-4 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
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

        {[...agreement.sections, ...agreement.schedules].map((section) => (
          <SectionView
            key={section.number}
            section={section}
            fields={fields}
            showInternalMarkers={showInternalMarkers}
          />
        ))}

        <p className="text-[11px] text-muted-foreground mt-8 pt-4 border-t border-gray-100">
          {agreement.runningFooter} — end of document.
        </p>
      </div>
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
      className="border-t border-gray-100 py-3 scroll-mt-20 group"
      data-testid={`section-${section.number}`}
    >
      <summary className="flex items-baseline gap-2 cursor-pointer list-none -mx-1 px-1 py-1 rounded hover:bg-gray-50">
        <span className="text-xs font-bold text-primary tabular-nums flex-shrink-0">
          {section.number}
        </span>
        <h3 className="text-sm font-bold text-foreground flex-1 min-w-0">{section.heading}</h3>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
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
      return <p className="text-xs text-muted-foreground leading-relaxed">{r(block.text)}</p>;

    case "clause":
      return (
        <p className="text-xs leading-relaxed flex gap-2">
          <span className="font-semibold text-foreground tabular-nums flex-shrink-0">
            {block.number}
          </span>
          <span className="text-muted-foreground">{r(block.text)}</span>
        </p>
      );

    case "bullets":
      return (
        <div>
          {block.lead && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-1">{r(block.lead)}</p>
          )}
          <ul className="space-y-1 pl-4">
            {block.items.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed list-disc">
                {r(item)}
              </li>
            ))}
          </ul>
        </div>
      );

    case "checklist":
      return (
        <div>
          {block.lead && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-1">{r(block.lead)}</p>
          )}
          <ul className="space-y-1">
            {block.items.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                {/* A drawn box, not an <input>: this is a checklist to be completed on
                    paper at installation, and a real checkbox would invite clicking. */}
                <span
                  aria-hidden="true"
                  className="w-3 h-3 border border-gray-300 rounded-sm flex-shrink-0 mt-0.5"
                />
                {r(item)}
              </li>
            ))}
          </ul>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-foreground border-b border-gray-200 py-1.5 pr-3 align-bottom"
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
                      className="text-muted-foreground border-b border-gray-100 py-1.5 pr-3 align-top leading-relaxed"
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
            <p key={i} className="text-xs font-semibold text-foreground leading-relaxed">
              {r(line)}
            </p>
          ))}
        </div>
      );

    case "blanks":
      return (
        <dl className="space-y-1.5">
          {block.items.map((blank, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <dt className="text-muted-foreground flex-shrink-0">{r(blank.label)}</dt>
              <dd
                className={`border-b border-dashed border-gray-300 flex-1 ${
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
              <p className="text-xs font-bold text-foreground mb-2">{r(party.heading)}</p>
              <dl className="space-y-1.5">
                {party.fields.map((field, j) => (
                  <div key={j} className="flex items-baseline gap-2 text-xs">
                    <dt className="text-muted-foreground flex-shrink-0">{r(field)}</dt>
                    <dd className="border-b border-dashed border-gray-300 flex-1" />
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
            <Wrench className="w-3 h-3 flex-shrink-0" />
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
 * How far through the document the bottom of the viewport has travelled, 0 to 1.
 *
 * Measured from the document element's own box on scroll, rather than with an
 * `IntersectionObserver` on a sentinel, for two reasons: it yields a *percentage* to
 * show the reader rather than a single boolean, and it stays correct when sections
 * are collapsed and the document's height changes underneath it.
 *
 * What this is honestly worth: it evidences that the whole document was delivered and
 * scrolled past, not that anyone read it. Nothing in a browser can evidence reading.
 * The load-bearing evidence is elsewhere — the content hash, the OTP, and the
 * server-side timestamps (§3, step 3).
 */
function useReadingProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      // No layout engine at all — a test environment, or an element that has not been
      // laid out yet. An unmeasurable document must not soft-lock the sign panel, so
      // it counts as scrolled rather than as unread.
      if (rect.height === 0) {
        setProgress(1);
        return;
      }
      const scrolledPast = window.innerHeight - rect.top;
      setProgress(Math.min(1, Math.max(0, scrolledPast / rect.height)));
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return progress;
}
