"use client";

import { AlertCircle, ArrowDown, ArrowUp, Info, type LucideIcon } from "lucide-react";

/**
 * The pieces every admin page is built from: a card, a label/value row, an empty state, an error.
 *
 * These were local helpers inside `AdminGymDetail.tsx` until the overview and the list needed the
 * same ones. They are here rather than duplicated because the *empty* states are where three copies
 * would drift apart first, and an admin who learns that a dash means "no value" on one page should
 * not have to relearn it on the next.
 *
 * Named `Card` in agreement with the `card-*` test ids these render. Nothing under `admin/` imports
 * shadcn's `@/components/ui/card`, so there is no collision to resolve.
 */

export function Card({
  title,
  note,
  testId,
  id,
  action,
  tone = "plain",
  children,
}: {
  title: string;
  note?: string;
  testId: string;
  /** An anchor target, for the detail page's in-page nav. */
  id?: string;
  /** A button or link in the header. Right-aligned against the title. */
  action?: React.ReactNode;
  /** `alert` for a card describing something ended or owed. Border and header only. */
  tone?: "plain" | "alert";
  children: React.ReactNode;
}) {
  const alert = tone === "alert";
  return (
    <section
      id={id}
      // The scroll margin clears the sticky header, whose height is not one number: the shell's
      // nav wraps, so it is 157px at 390px wide and 57px from `md` up, where the detail page's
      // section nav also becomes sticky and adds its own 42px.
      className={`rounded-2xl border bg-card overflow-hidden ${
        alert ? "border-rose-400/25" : "border-border"
      } ${id ? "scroll-mt-[10.5rem] md:scroll-mt-28" : ""}`}
      data-testid={testId}
    >
      <div
        className={`px-4 sm:px-5 py-3 border-b flex items-start justify-between gap-4 ${
          alert ? "border-rose-400/20 bg-rose-400/10" : "border-border/70 bg-secondary/50"
        }`}
      >
        <div>
          <h2
            className={`text-xs font-semibold uppercase tracking-wide ${
              alert ? "text-rose-200" : "text-muted-foreground"
            }`}
          >
            {title}
          </h2>
          {note && (
            <p className={`text-xs mt-0.5 ${alert ? "text-rose-200/80" : "text-muted-foreground"}`}>
              {note}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border/70">{children}</dl>;
}

/**
 * One label/value pair.
 *
 * An empty string renders as an em dash rather than as nothing, because a row with no value is
 * information ("this gym has no FSSAI number") and a row that collapses to whitespace looks like a
 * rendering bug. Optional fields on `GymDetails` arrive as `""`, not as null.
 *
 * ## Why a fixed label column rather than a label and value pushed apart
 *
 * These cards run to twenty rows, and on a 1100px page a value flushed to the right edge sits
 * roughly 900px from the label it belongs to. Pairing the two is the whole job of the row, so the
 * label gets a column and the value starts immediately after it, left-aligned. The width is fixed
 * rather than fitted to the content so that the values line up down the card, which is what makes a
 * missing one visible.
 */
export function Field({
  label,
  value,
  mono,
  hint,
  testId,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  hint?: string;
  testId?: string;
}) {
  const shown = value === null || value.trim().length === 0 ? "—" : value;
  return (
    <div className="grid items-baseline gap-x-4 px-4 sm:px-5 py-2 sm:grid-cols-[14rem_minmax(0,1fr)]">
      <dt className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="block text-xs leading-snug text-muted-foreground/70">{hint}</span>}
      </dt>
      <dd
        // `min-w-0` is what lets `break-words` do anything: without it a grid item is at least as
        // wide as its longest unbreakable token, so a 64-character hash pushes off the right edge of
        // a phone instead of wrapping. `max-w-[70ch]` is for the other extreme, an internal note
        // that would otherwise set as one 900px line.
        className={`min-w-0 max-w-[70ch] break-words text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}
        data-testid={testId}
      >
        {shown}
      </dd>
    </div>
  );
}

/**
 * A heading for a block of `Field`s inside a card, where the card's own title is not enough.
 *
 * Tinted rather than plain text: the three places this replaces set a bare paragraph above a `dl`,
 * and on a card that is already a stack of rows a bare paragraph reads as another row.
 */
export function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-border/70 bg-secondary/40 px-4 sm:px-5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function Empty({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <p className="px-4 sm:px-5 py-4 text-sm text-muted-foreground" data-testid={testId}>
      {children}
    </p>
  );
}

/**
 * A failed read, with its field paths.
 *
 * The paths are on screen rather than in a console because the audience for this panel is us, and
 * `terms.securityDepositInr: Required` is the whole answer to "what changed on the backend?". See
 * `adminApi.ts` on why a schema failure is its own outcome.
 */
export function ErrorPanel({
  message,
  issues = [],
  testId,
  issuesTestId,
}: {
  message: string;
  issues?: string[];
  testId: string;
  issuesTestId?: string;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3.5"
      data-testid={testId}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-rose-200 leading-relaxed">{message}</p>
        {issues.length > 0 && (
          <ul className="mt-2 space-y-0.5" data-testid={issuesTestId}>
            {issues.map((issue) => (
              <li key={issue} className="text-xs text-rose-300 font-mono break-all">
                {issue}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** A write that landed. Green rather than neutral, so it is not read as another instruction. */
export function SuccessPanel({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3"
      data-testid={testId}
      role="status"
    >
      <p className="text-xs text-emerald-200 leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * One number, with what it counts under it.
 *
 * `hint` is for the caveat rather than the definition. On the overview every figure is counted over
 * rows already fetched, and that is a fact about the number itself, not a footnote.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "plain",
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "good" | "warn";
  testId: string;
}) {
  const ring =
    tone === "good" ? "border-emerald-400/25" : tone === "warn" ? "border-amber-400/25" : "border-border";
  const ink =
    tone === "good" ? "text-emerald-200" : tone === "warn" ? "text-amber-300" : "text-foreground";
  return (
    <div className={`rounded-2xl border bg-card px-4 py-3.5 ${ring}`} data-testid={testId}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-display font-black tabular-nums leading-none ${ink}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

/**
 * A small labelled card, one fact in it. The unit the trading and dashboard grids are made of.
 *
 * Distinct from `StatCard`, which is a headline number. This one keeps the label small and hands the
 * slot to whatever `Figure` or markup the caller wants, because half of these cards are blanks.
 */
export function Metric({
  icon: Icon,
  label,
  testId,
  children,
}: {
  icon: LucideIcon;
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5" data-testid={testId}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function Figure({
  value,
  caption,
  muted,
}: {
  value: string;
  caption: string;
  muted?: boolean;
}) {
  return (
    <>
      <p
        className={`font-display text-xl font-black leading-none tabular-nums ${
          muted ? "text-muted-foreground/70" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground leading-snug">{caption}</p>
    </>
  );
}

/**
 * A figure that does not exist, shown as not existing.
 *
 * The dash is muted for the reason the gym's own `UnavailableCard` gives: at full contrast in the
 * numeral slot it reads as a value that has been struck out. It is in the slot at all so the card
 * keeps the height of its neighbours.
 *
 * `caption` says *which* absence this is, and that is the whole load this component carries. "No
 * ingestion from the machines" and "no data for this gym yet" are opposite conclusions for whoever
 * is reading, which is the distinction `PortalAbsence` exists to keep.
 */
export function Unavailable({
  icon,
  label,
  caption = "pipeline not built",
  testId,
}: {
  icon: LucideIcon;
  label: string;
  caption?: string;
  testId: string;
}) {
  return (
    <Metric icon={icon} label={label} testId={testId}>
      <div data-testid={`${testId}-unavailable`}>
        <Figure value="—" caption={caption} muted />
      </div>
    </Metric>
  );
}

/**
 * A grey explanatory panel under a grid of cards, one per section rather than one per card.
 *
 * Seven copies of the same sentence read as seven faults, which is the mistake this replaces.
 */
export function Notice({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <p
      className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground"
      data-testid={testId}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" aria-hidden />
      <span className="max-w-[80ch]">{children}</span>
    </p>
  );
}

/**
 * A filter chip, with a count where there is an honest one.
 *
 * Shared by the two list pages rather than copied into both, because the count is the part that
 * needs one explanation: it counts *loaded* rows on both pages, and two copies of the component
 * would eventually get two different tooltips saying so.
 *
 * `count` is optional for the case where no such number exists. The enquiry status chips filter
 * server-side, so selecting one is a different read rather than a narrowing of the rows on screen,
 * and the only count available for the unselected ones would be zero.
 */
export function Chip({
  label,
  count,
  selected,
  onClick,
  testId,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      {label}
      {count !== undefined && (
        <span className={`tabular-nums ${selected ? "opacity-80" : "text-muted-foreground/70"}`}>{count}</span>
      )}
    </button>
  );
}

export type TableSort<K extends string> = { key: K; dir: "asc" | "desc" };

/**
 * A column header, sortable when given a key.
 *
 * `aria-sort` on the cell rather than a class on the arrow, because the arrow is the only thing
 * saying which column the table is ordered by and an icon is not something a screen reader reads. A
 * header with no key is a column that cannot be sorted usefully — "Contact" holds two values, and
 * ordering by "whichever of the email and the phone came first in the markup" is an order nobody
 * asked for.
 */
export function Th<K extends string>({
  children,
  sortKey,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  sortKey?: K;
  sort?: TableSort<K> | null;
  onSort?: (key: K) => void;
  align?: "left" | "right";
  /** For a column that is hidden at some widths. The matching `td` needs the same classes. */
  className?: string;
}) {
  const active = sortKey && sort?.key === sortKey ? sort.dir : null;
  const base = `px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
    align === "right" ? "text-right" : "text-left"
  } ${className}`;

  if (!sortKey || !onSort) {
    return <th className={base}>{children}</th>;
  }

  return (
    <th
      className={base}
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        // `uppercase` is repeated here even though the `th` above already has it. Tailwind's
        // Preflight resets `text-transform` on form controls, so the inherited value stops at the
        // button and a sortable heading rendered in title case beside its unsortable neighbours in
        // caps — "Gym" and "Last change" next to "CONTACT" on the gyms table.
        className={`group inline-flex items-center gap-1 uppercase cursor-pointer hover:text-foreground transition-colors ${
          active ? "text-foreground" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
        data-testid={`sort-${sortKey}`}
      >
        {children}
        {active === "asc" ? (
          <ArrowUp className="w-3 h-3" aria-hidden />
        ) : active === "desc" ? (
          <ArrowDown className="w-3 h-3" aria-hidden />
        ) : (
          // An unsorted column gave no sign it could be sorted, so the arrow appears on hover. It
          // is transparent rather than absent so that sorting a column does not change the width of
          // its heading and shift every column beside it.
          <ArrowDown
            className="w-3 h-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

/** A status chip. Colour comes from `adminFormat`, which is where the grouping is justified. */
export function Pill({
  children,
  className = "bg-secondary text-muted-foreground",
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${className}`}
      data-testid={testId}
    >
      {children}
    </span>
  );
}
