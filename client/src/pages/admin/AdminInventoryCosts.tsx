"use client";

import { useEffect, useState } from "react";
import { fetchCostReport } from "@/lib/inventoryApi";
import type { CostReport } from "@shared/admin/inventorySchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { StatCard } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { Cell, Col, DataTable, formatRupees, Head, MachinesHeader, NoData, ProblemPanel, SelectFilter, type Problem } from "./machines/MachinesUi";
import { inventoryProblem } from "./machines/inventoryBits";
import { costPerDrink, formatQty, formatShare, marginShare, monthLabel, recentMonths } from "./machines/inventoryRules";

export default function AdminInventoryCosts() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Costs session={guard.session} />;
}

const perDrink = (cogsInr: number, drinks: number) => {
  const cost = costPerDrink(cogsInr, drinks);
  return cost === null ? "—" : formatRupees(cost);
};

function Costs({ session }: { session: MachineViewer }) {
  const [months] = useState(() => recentMonths(Date.now(), 12));
  const [month, setMonth] = useState(months[0]);
  const [report, setReport] = useState<CostReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void fetchCostReport(month).then((result) => {
      if (!live) return;
      setLoading(false);
      if (!result.ok) {
        setReport(null);
        setProblem(inventoryProblem(result));
        return;
      }
      setProblem(null);
      setReport(result.data);
    });
    return () => {
      live = false;
    };
  }, [month]);

  const t = report?.totals;

  return (
    <MachinesShell session={session} section="costs">
      <MachinesHeader
        title="Cost of drinks"
        subtitle="What the protein, powders and cups in each drink cost us, against what the drinks sold for. Before GST."
        action={
          <SelectFilter
            label="Month"
            value={month}
            onChange={setMonth}
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            testId="filter-month"
          />
        }
      />
      <ProblemPanel problem={problem} testId="costs-error" />

      {t && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Sales" value={formatRupees(t.salesInr)} hint={`${t.drinks.toLocaleString("en-IN")} drinks`} testId="stat-sales" />
            <StatCard label="Cost of drinks" value={formatRupees(t.cogsInr)} hint="Protein, powders and cups used" testId="stat-cogs" />
            <StatCard label="Cost per drink" value={perDrink(t.cogsInr, t.drinks)} hint="On average" testId="stat-per-drink" />
            <StatCard
              label="Left after ingredients"
              value={formatShare(marginShare(t.salesInr, t.cogsInr))}
              hint={t.salesInr > 0 ? `${formatRupees(t.salesInr - t.cogsInr)} of sales` : "No sales this month"}
              tone="good"
              testId="stat-margin"
            />
            <StatCard
              label="Wastage"
              value={formatRupees(t.wastageInr)}
              hint="Written off, or taken out of machines"
              tone={t.wastageInr > 0 ? "warn" : "plain"}
              testId="stat-wastage"
            />
          </div>
          {t.unpricedDrinks > 0 && (
            <p className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" data-testid="unpriced-note">
              {t.unpricedDrinks.toLocaleString("en-IN")} drink{t.unpricedDrinks === 1 ? " was" : "s were"} made from stock loaded before we
              had a price for it, so {t.unpricedDrinks === 1 ? "it counts" : "they count"} at no cost. The real cost is higher.
            </p>
          )}
        </>
      )}

      <section className="mt-5" data-testid="costs-by-item">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">By item</h2>
        <DataTable testId="costs-item-table">
          <Head>
            <Col>Item</Col>
            <Col align="right">Used in drinks</Col>
            <Col align="right">Cost</Col>
            <Col align="right">Wasted</Col>
            <Col align="right">Wastage</Col>
          </Head>
          <tbody className="divide-y divide-border/70">
            {!report || report.byItem.length === 0 ? (
              <NoData colSpan={5} loading={loading} />
            ) : (
              report.byItem.map((row) => (
                <tr key={row.itemId} data-testid={`row-cost-item-${row.itemId}`}>
                  <Cell className="font-semibold">{row.name}</Cell>
                  <Cell align="right" className="tabular-nums">{formatQty(row.consumedQty, row.unit)}</Cell>
                  <Cell align="right" className="tabular-nums">{formatRupees(row.cogsInr)}</Cell>
                  <Cell align="right" className="tabular-nums text-muted-foreground">{formatQty(row.wastedQty, row.unit)}</Cell>
                  <Cell align="right" className={`tabular-nums ${row.wastageInr > 0 ? "text-amber-300" : "text-muted-foreground"}`}>
                    {formatRupees(row.wastageInr)}
                  </Cell>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </section>

      <section className="mt-8" data-testid="costs-by-machine">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">By machine</h2>
        <DataTable testId="costs-machine-table">
          <Head>
            <Col>Machine</Col>
            <Col align="right">Drinks</Col>
            <Col align="right">Sales</Col>
            <Col align="right">Cost of drinks</Col>
            <Col align="right">Per drink</Col>
            <Col align="right">Left after ingredients</Col>
            <Col align="right">Wastage</Col>
          </Head>
          <tbody className="divide-y divide-border/70">
            {!report || report.byMachine.length === 0 ? (
              <NoData colSpan={7} loading={loading} />
            ) : (
              report.byMachine.map((row) => (
                <tr key={row.sn} data-testid={`row-cost-machine-${row.sn}`}>
                  <Cell>
                    <span className="font-semibold">{row.machineName || row.sn}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{row.sn}</span>
                  </Cell>
                  <Cell align="right" className="tabular-nums">{row.drinks.toLocaleString("en-IN")}</Cell>
                  <Cell align="right" className="tabular-nums">{formatRupees(row.salesInr)}</Cell>
                  <Cell align="right" className="tabular-nums">{formatRupees(row.cogsInr)}</Cell>
                  <Cell align="right" className="tabular-nums">{perDrink(row.cogsInr, row.drinks)}</Cell>
                  <Cell align="right" className="tabular-nums">{formatShare(marginShare(row.salesInr, row.cogsInr))}</Cell>
                  <Cell align="right" className={`tabular-nums ${row.wastageInr > 0 ? "text-amber-300" : "text-muted-foreground"}`}>
                    {formatRupees(row.wastageInr)}
                  </Cell>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
        <p className="mt-2 text-xs text-muted-foreground">
          This is ingredients only. The gym&apos;s share, payment charges and logistics come off later, in settlement.
        </p>
      </section>
    </MachinesShell>
  );
}
