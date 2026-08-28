"use client";

import { AlertCircle, Info, type LucideIcon } from "lucide-react";

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
      className={`rounded-2xl border bg-white overflow-hidden ${
        alert ? "border-red-200" : "border-gray-200"
      }`}
      data-testid={testId}
      // Anchored sections would otherwise land under the sticky header *and* the detail page's
      // sticky section nav, which together are about 6rem.
      style={id ? { scrollMarginTop: "7rem" } : undefined}
    >
      <div
        className={`px-4 sm:px-5 py-3 border-b flex items-start justify-between gap-4 ${
          alert ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"
        }`}
      >
        <div>
          <h2
            className={`text-xs font-semibold uppercase tracking-wide ${
              alert ? "text-red-700" : "text-muted-foreground"
            }`}
          >
            {title}
          </h2>
          {note && (
            <p className={`text-xs mt-0.5 ${alert ? "text-red-600" : "text-muted-foreground"}`}>
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
  return <dl className="divide-y divide-gray-100">{children}</dl>;
}

/**
 * One label/value pair.
 *
 * An empty string renders as an em dash rather than as nothing, because a row with no value is
 * information ("this gym has no FSSAI number") and a row that collapses to whitespace looks like a
 * rendering bug. Optional fields on `GymDetails` arrive as `""`, not as null.
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
    <div className="flex items-baseline justify-between gap-6 px-4 sm:px-5 py-2.5">
      <dt className="text-sm text-muted-foreground flex-shrink-0">
        {label}
        {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      </dt>
      <dd
        className={`text-sm text-foreground text-right break-words ${mono ? "font-mono text-xs" : ""}`}
        data-testid={testId}
      >
        {shown}
      </dd>
    </div>
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
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
      data-testid={testId}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-red-600 leading-relaxed">{message}</p>
        {issues.length > 0 && (
          <ul className="mt-2 space-y-0.5" data-testid={issuesTestId}>
            {issues.map((issue) => (
              <li key={issue} className="text-xs text-red-500 font-mono break-all">
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
      className="rounded-xl border border-green-200 bg-green-50 px-4 py-3"
      data-testid={testId}
      role="status"
    >
      <p className="text-xs text-green-800 leading-relaxed">{children}</p>
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
    tone === "good" ? "border-green-200" : tone === "warn" ? "border-amber-200" : "border-gray-200";
  const ink =
    tone === "good" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-foreground";
  return (
    <div className={`rounded-2xl border bg-white px-4 py-3.5 ${ring}`} data-testid={testId}>
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
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5" data-testid={testId}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gray-400" aria-hidden />
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
          muted ? "text-gray-400" : "text-foreground"
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
      className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground"
      data-testid={testId}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
      <span className="max-w-[80ch]">{children}</span>
    </p>
  );
}

/** A status chip. Colour comes from `adminFormat`, which is where the grouping is justified. */
export function Pill({
  children,
  className = "bg-gray-100 text-gray-700",
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
