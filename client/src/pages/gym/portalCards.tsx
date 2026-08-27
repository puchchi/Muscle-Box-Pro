import type { Cpu } from "lucide-react";

/**
 * The card shell the portal is built out of, and the two-column rows inside it.
 *
 * Extracted from `GymDashboard` when the payout account became its own component: the
 * alternative was a second copy of `rounded-2xl border border-border bg-card p-5`, which is
 * how one card ends up a hair different from the eight beside it. The figure cards
 * (`MetricCard`, `Figure`) stay in the dashboard, because nothing else renders a numeral at
 * display weight.
 */

export type CardProps = {
  icon: typeof Cpu;
  label: string;
  testId: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * The detail cards: machine, statements, deposit, payout account.
 *
 * Icon and heading on one line, because these are read rather than scanned. The figure
 * cards do the opposite — see `MetricCard`.
 */
export function Card({ icon: Icon, label, testId, className, children }: CardProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      </div>
      {children}
    </div>
  );
}

/** The detail lines under a figure, hairline-separated. */
export function RowGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={`divide-y divide-border/70 ${className ?? ""}`}>{children}</dl>;
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-[13px] first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
