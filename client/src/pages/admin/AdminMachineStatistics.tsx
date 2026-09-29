"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAdStats, fetchOrderStats, fetchSalesStats } from "@/lib/adminMachineApi";
import type { StatFilters } from "@shared/admin/machines";
import { STAT_PERIODS, type AdStats, type OrderStats, type SalesStats, type StatPeriod } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { StatCard } from "./AdminUi";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  FilterRange,
  formatIstStamp,
  formatRupees,
  Head,
  MachineLabel,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";
import { PAY_METHOD_LABEL } from "./machines/orderLabels";
import { saveCsv } from "./machines/csv";
import {
  adStatsCsv,
  csvName,
  defaultRange,
  istToday,
  notReporting,
  orderStatsCsv,
  PERIOD_LABEL,
  periodLabel,
  rangeErrors,
  salesStatsCsv,
} from "./machines/statsRules";
import { WarningPanel } from "./machines/WarningPanel";

const REPORTS = [
  { id: "orders", label: "Orders" },
  { id: "sales", label: "Sales" },
  { id: "ads", label: "Ads" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

const reportOf = (raw: string | null): ReportId => (REPORTS.some((r) => r.id === raw) ? (raw as ReportId) : "orders");

type Draft = { machine: string; payMethod: string; goodsName: string; ad: string; from: string; to: string };

type Result = { report: "orders"; data: OrderStats } | { report: "sales"; data: SalesStats } | { report: "ads"; data: AdStats };

function toFilters(period: StatPeriod, d: Draft, report: ReportId): StatFilters {
  return {
    period,
    from: d.from,
    to: d.to,
    machine: d.machine.trim() || undefined,
    payMethod: report === "ads" ? undefined : ((d.payMethod || undefined) as StatFilters["payMethod"]),
    goodsName: report === "sales" ? d.goodsName.trim() || undefined : undefined,
    ad: report === "ads" ? d.ad.trim() || undefined : undefined,
  };
}

async function load(report: ReportId, filters: StatFilters) {
  if (report === "orders") {
    const r = await fetchOrderStats(filters);
    return r.ok ? { ok: true as const, result: { report, data: r.data } as Result } : { ok: false as const, problem: problemOf(r) };
  }
  if (report === "sales") {
    const r = await fetchSalesStats(filters);
    return r.ok ? { ok: true as const, result: { report, data: r.data } as Result } : { ok: false as const, problem: problemOf(r) };
  }
  const r = await fetchAdStats(filters);
  return r.ok ? { ok: true as const, result: { report, data: r.data } as Result } : { ok: false as const, problem: problemOf(r) };
}

export default function AdminMachineStatistics() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Statistics session={guard.session} />;
}

function Statistics({ session }: { session: AdminSession }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const report = reportOf(search?.get("report") ?? null);
  const [period, setPeriod] = useState<StatPeriod>("day");
  const blank = (p: StatPeriod): Draft => ({ machine: "", payMethod: "", goodsName: "", ad: "", ...defaultRange(p, istToday(Date.now())) });
  const [draft, setDraft] = useState<Draft>(() => blank("day"));
  const [filters, setFilters] = useState<StatFilters>(() => toFilters("day", blank("day"), report));
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void load(report, filters).then((r) => {
      if (!live) return;
      setLoading(false);
      if (!r.ok) {
        setProblem(r.problem);
        setResult(null);
        return;
      }
      setProblem(null);
      setResult(r.result);
    });
    return () => {
      live = false;
    };
  }, [report, filters]);

  function apply(nextPeriod: StatPeriod, nextDraft: Draft, nextReport: ReportId = report) {
    const errors = rangeErrors(nextPeriod, nextDraft.from, nextDraft.to);
    if (Object.keys(errors).length > 0) {
      setProblem({ message: "Check the dates.", issues: Object.values(errors) });
      return;
    }
    setFilters(toFilters(nextPeriod, nextDraft, nextReport));
  }

  function switchPeriod(next: StatPeriod) {
    const nextDraft = { ...draft, ...defaultRange(next, istToday(Date.now())) };
    setPeriod(next);
    setDraft(nextDraft);
    apply(next, nextDraft);
  }

  function switchReport(next: ReportId) {
    setResult(null);
    router.replace(`${pathname}?report=${next}`);
    apply(period, draft, next);
  }

  function exportCsv() {
    if (!result) return;
    const { from, to } = result.data;
    const csv =
      result.report === "orders" ? orderStatsCsv(result.data) : result.report === "sales" ? salesStatsCsv(result.data) : adStatsCsv(result.data);
    saveCsv(csvName(`${result.report}-${result.data.period}`, from, to), csv);
  }

  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const shown = result?.report === report ? result : null;

  return (
    <MachinesShell session={session} section="statistics">
      <MachinesHeader
        title="Statistics"
        subtitle="Completed orders, drinks sold and ad plays, added up by day, month or year. Dates are IST."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={!shown || shown.data.rows.length === 0}
            className="rounded-xl cursor-pointer"
            data-testid="button-export-stats"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Report">
          {REPORTS.map((entry) => {
            const active = entry.id === report;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchReport(entry.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
                data-testid={`tab-${entry.id}`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Group by">
          {STAT_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === period}
              onClick={() => switchPeriod(p)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${
                p === period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`period-${p}`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        onSearch={() => apply(period, draft)}
        onReset={() => {
          const next = blank(period);
          setDraft(next);
          apply(period, next);
        }}
      >
        <TextFilter label="Machine" value={draft.machine} onChange={set("machine")} testId="filter-machine" />
        {report !== "ads" && (
          <SelectFilter
            label="Payment Method"
            value={draft.payMethod}
            onChange={set("payMethod")}
            options={[{ value: "", label: "All" }, ...Object.entries(PAY_METHOD_LABEL).map(([value, label]) => ({ value, label }))]}
            testId="filter-pay"
          />
        )}
        {report === "sales" && <TextFilter label="Goods" value={draft.goodsName} onChange={set("goodsName")} testId="filter-goods" />}
        {report === "ads" && <TextFilter label="Program" value={draft.ad} onChange={set("ad")} testId="filter-ad" />}
        <FilterRange>
          <TextFilter label="From" type="date" value={draft.from} onChange={set("from")} testId="filter-from" />
          <TextFilter label="To" type="date" value={draft.to} onChange={set("to")} testId="filter-to" />
        </FilterRange>
      </FilterBar>

      <ProblemPanel problem={problem} testId="stats-error" />

      {report === "orders" && <OrderReport stats={shown?.report === "orders" ? shown.data : null} loading={loading} />}
      {report === "sales" && <SalesReport stats={shown?.report === "sales" ? shown.data : null} loading={loading} />}
      {report === "ads" && <AdReport stats={shown?.report === "ads" ? shown.data : null} loading={loading} />}
    </MachinesShell>
  );
}

function Totals({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">{children}</div>;
}

const countText = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-IN"));

function OrderReport({ stats, loading }: { stats: OrderStats | null; loading: boolean }) {
  return (
    <>
      <Totals>
        <StatCard label="Completed orders" value={countText(stats?.totals.orders)} testId="total-orders" />
        <StatCard label="Amount" value={stats ? formatRupees(stats.totals.amountInr) : "—"} testId="total-amount" />
      </Totals>
      <DataTable testId="stats-table">
        <Head>
          <Col>Period</Col>
          <Col>Machine</Col>
          <Col>Machine Name</Col>
          <Col align="right">Completed orders</Col>
          <Col align="right">Amount</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {!stats || stats.rows.length === 0 ? (
            <NoData colSpan={5} loading={loading} />
          ) : (
            stats.rows.map((r) => (
              <tr key={`${r.period}-${r.sn}`} className="hover:bg-secondary/40 transition-colors">
                <Cell className="whitespace-nowrap">{periodLabel(r.period)}</Cell>
                <Cell>
                  <MachineLabel deviceExtNo={r.deviceExtNo} sn={r.sn} />
                </Cell>
                <Cell>{r.machineName || "—"}</Cell>
                <Cell align="right" className="tabular-nums">{countText(r.orders)}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(r.amountInr)}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </>
  );
}

function SalesReport({ stats, loading }: { stats: SalesStats | null; loading: boolean }) {
  return (
    <>
      <Totals>
        <StatCard label="Drinks made" value={countText(stats?.totals.drinks)} testId="total-drinks" />
        <StatCard label="Amount" value={stats ? formatRupees(stats.totals.amountInr) : "—"} testId="total-amount" />
      </Totals>
      <DataTable testId="stats-table">
        <Head>
          <Col>Period</Col>
          <Col>Goods</Col>
          <Col>Machine</Col>
          <Col>Machine Name</Col>
          <Col align="right">Drinks made</Col>
          <Col align="right">Amount</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {!stats || stats.rows.length === 0 ? (
            <NoData colSpan={6} loading={loading} />
          ) : (
            stats.rows.map((r) => (
              <tr key={`${r.period}-${r.sn}-${r.goodsId}`} className="hover:bg-secondary/40 transition-colors">
                <Cell className="whitespace-nowrap">{periodLabel(r.period)}</Cell>
                <Cell>
                  {r.goodsName}
                  <span className="block font-mono text-[11px] text-muted-foreground">{r.goodsId}</span>
                </Cell>
                <Cell>
                  <MachineLabel deviceExtNo={r.deviceExtNo} sn={r.sn} />
                </Cell>
                <Cell>{r.machineName || "—"}</Cell>
                <Cell align="right" className="tabular-nums">{countText(r.drinks)}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(r.amountInr)}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </>
  );
}

function AdReport({ stats, loading }: { stats: AdStats | null; loading: boolean }) {
  const off = stats ? notReporting(stats.machines) : [];
  const unknown = stats ? stats.machines.filter((m) => m.adStats === "unknown") : [];
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground" data-testid="ads-note">
        Machines send plays and clicks only when ad statistics is turned on in their settings. A machine with it off shows as Not reporting.
      </p>
      {off.length > 0 && (
        <div className="mb-4">
          <WarningPanel testId="ads-not-reporting">
            Not reporting: {off.map((m) => m.deviceExtNo || m.sn).join(", ")}. Ad statistics is off in their latest settings backup.
          </WarningPanel>
        </div>
      )}
      <Totals>
        <StatCard label="Plays" value={countText(stats?.totals.plays)} testId="total-plays" />
        <StatCard label="Clicks" value={countText(stats?.totals.clicks)} testId="total-clicks" />
      </Totals>
      <DataTable testId="stats-table">
        <Head>
          <Col>Period</Col>
          <Col>Ad</Col>
          <Col>Machine</Col>
          <Col>Machine Name</Col>
          <Col align="right">Plays</Col>
          <Col align="right">Clicks</Col>
          <Col>Scheduled</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {!stats || stats.rows.length === 0 ? (
            <NoData colSpan={7} loading={loading} />
          ) : (
            stats.rows.map((r) => (
              <tr key={`${r.period}-${r.sn}-${r.adId}`} className="hover:bg-secondary/40 transition-colors">
                <Cell className="whitespace-nowrap">{periodLabel(r.period)}</Cell>
                <Cell>
                  {r.adName ?? <span className="text-muted-foreground">Deleted ad</span>}
                  <span className="block font-mono text-[11px] text-muted-foreground">{r.adId}</span>
                </Cell>
                <Cell>
                  <MachineLabel deviceExtNo={r.deviceExtNo} sn={r.sn} />
                </Cell>
                <Cell>{r.machineName || "—"}</Cell>
                <Cell align="right" className="tabular-nums">{countText(r.plays)}</Cell>
                <Cell align="right" className="tabular-nums">{countText(r.clicks)}</Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {r.window ? `${formatIstStamp(r.window.startAt)} to ${formatIstStamp(r.window.endAt)}` : "—"}
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {stats && stats.machines.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ad statistics by machine</h2>
          <DataTable testId="ads-machines">
            <Head>
              <Col>Machine</Col>
              <Col>Machine Name</Col>
              <Col>Ad statistics</Col>
              <Col>Settings backed up</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {stats.machines.map((m) => (
                <tr key={m.sn} data-testid={`ads-machine-${m.sn}`}>
                  <Cell>
                    <MachineLabel deviceExtNo={m.deviceExtNo} sn={m.sn} />
                  </Cell>
                  <Cell>{m.machineName || "—"}</Cell>
                  <Cell>
                    <span
                      className={`font-semibold ${m.adStats === "on" ? "text-emerald-200" : m.adStats === "off" ? "text-amber-300" : "text-muted-foreground"}`}
                    >
                      {m.adStats === "on" ? "Reporting" : m.adStats === "off" ? "Not reporting" : "No backup yet"}
                    </span>
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(m.backedUpAt)}</Cell>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {unknown.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No backup yet means the machine has not sent its settings, so we cannot tell whether it reports ads.
            </p>
          )}
        </div>
      )}
    </>
  );
}
