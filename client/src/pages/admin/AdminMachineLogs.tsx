"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchEquipmentLog, fetchOperationsLog, type MachineCall } from "@/lib/adminMachineApi";
import type { EquipmentLogFilters, OperationsLogFilters } from "@shared/admin/machines";
import type { EquipmentLogRow, OperationsLogRow } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Notice } from "./AdminUi";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  FilterRange,
  formatIstStamp,
  Head,
  LoadMore,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";

type Tab = "equipment" | "operations";

const OPERATE_TYPE_LABEL: Record<string, string> = { "1": "Replenishment", "2": "Cleaning", "3": "Repair" };

export default function AdminMachineLogs() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Logs session={guard.session} />;
}

function Logs({ session }: { session: AdminSession }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const tab: Tab = search?.get("tab") === "operations" ? "operations" : "equipment";
  const sn = search?.get("sn")?.trim() || undefined;

  const go = (next: { tab?: Tab; sn?: string | null }) => {
    const params = new URLSearchParams();
    const nextSn = next.sn === undefined ? sn : next.sn;
    if (nextSn) params.set("sn", nextSn);
    params.set("tab", next.tab ?? tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <MachinesShell session={session} section="logs">
      <MachinesHeader title="Logs" subtitle="What the machines reported. Times are IST." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="tablist" aria-label="Log">
          {(["equipment", "operations"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => go({ tab: id })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                tab === id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
              data-testid={`tab-${id}`}
            >
              {id === "equipment" ? "Equipment Log" : "Operations Log"}
            </button>
          ))}
        </div>
        {sn && (
          <RemovableChip label={`Machine ID ${sn}`} onRemove={() => go({ sn: null })} testId="chip-sn" />
        )}
      </div>

      {tab === "equipment" ? <EquipmentLog key={`e-${sn ?? ""}`} sn={sn} /> : <OperationsLog key={`o-${sn ?? ""}`} sn={sn} />}
    </MachinesShell>
  );
}

type CursorFetch<F, R> = (filters: F, cursor: string | null) => Promise<MachineCall<{ items: R[]; nextCursor: string | null }>>;

function useCursorList<F, R>(fetcher: CursorFetch<F, R>, filters: F) {
  const [rows, setRows] = useState<R[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  const page = useCallback(
    async (from: string | null) => {
      setLoading(true);
      const result = await fetcher(filters, from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows((r) => (from ? [...r, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
    },
    [fetcher, filters],
  );

  useEffect(() => {
    void page(null);
  }, [page]);

  return { rows, cursor, loading, problem, more: () => page(cursor) };
}

function EquipmentLog({ sn }: { sn?: string }) {
  const [machine, setMachine] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<EquipmentLogFilters>({ sn });
  const list = useCursorList<EquipmentLogFilters, EquipmentLogRow>(fetchEquipmentLog, filters);

  return (
    <>
      <ProblemPanel problem={list.problem} testId="equipment-error" />
      <FilterBar
        onSearch={() =>
          setFilters((f) => ({
            sn,
            code: f.code,
            machine: machine.trim() || undefined,
            status: (status || undefined) as EquipmentLogFilters["status"],
            from: from || undefined,
            to: to || undefined,
          }))
        }
        onReset={() => {
          setMachine("");
          setStatus("");
          setFrom("");
          setTo("");
          setFilters({ sn });
        }}
      >
        <TextFilter label="Machine" value={machine} onChange={setMachine} testId="filter-machine" />
        <SelectFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All" },
            { value: "normal", label: "Normal" },
            { value: "exception", label: "Exception" },
          ]}
          testId="filter-status"
        />
        <FilterRange>
          <TextFilter label="From" type="datetime-local" value={from} onChange={setFrom} testId="filter-from" />
          <TextFilter label="To" type="datetime-local" value={to} onChange={setTo} testId="filter-to" />
        </FilterRange>
      </FilterBar>

      {filters.code && (
        <div className="mb-3">
          <RemovableChip
            label={`Fault ${filters.code}`}
            onRemove={() => setFilters(({ code: _code, ...rest }) => rest)}
            testId="chip-code"
          />
        </div>
      )}

      <DataTable testId="equipment-table">
        <Head>
          <Col>Machine Number</Col>
          <Col>Machine Name</Col>
          <Col>Machine ID</Col>
          <Col>Status</Col>
          <Col>Faults</Col>
          <Col>Time</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {list.rows.length === 0 ? (
            <NoData colSpan={6} loading={list.loading} />
          ) : (
            list.rows.map((row, i) => (
              <tr key={`${row.sn}-${row.at}-${i}`} data-testid="row-equipment">
                <Cell className="whitespace-nowrap">{row.deviceExtNo || "—"}</Cell>
                <Cell>{row.machineName || "—"}</Cell>
                <Cell className="font-mono text-xs text-muted-foreground">{row.sn}</Cell>
                <Cell>
                  <span className={`font-semibold ${row.status === "exception" ? "text-rose-300" : "text-foreground"}`}>
                    {row.status === "exception" ? "Exception" : "Normal"}
                  </span>
                </Cell>
                <Cell>
                  {row.faults.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {row.faults.map((fault, j) => (
                        <button
                          key={`${fault.code}-${j}`}
                          type="button"
                          onClick={() => setFilters((f) => ({ ...f, code: fault.code }))}
                          title={`Show only ${fault.code}`}
                          className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[11px] text-rose-200 hover:bg-rose-400/20 cursor-pointer"
                          data-testid={`fault-chip-${fault.code}`}
                        >
                          {fault.text ? `${fault.code}: ${fault.text}` : fault.code}
                        </button>
                      ))}
                    </span>
                  )}
                </Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(row.at)}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {list.cursor && <LoadMore onClick={list.more} loading={list.loading} />}
    </>
  );
}

function OperationsLog({ sn }: { sn?: string }) {
  const [machine, setMachine] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<OperationsLogFilters>({ sn });
  const list = useCursorList<OperationsLogFilters, OperationsLogRow>(fetchOperationsLog, filters);

  return (
    <>
      <div className="mb-4">
        <Notice testId="operations-help">
          What operators did on the machine, as the machine reported it. Entries sent while the machine was offline are
          lost. The machine keeps its own copy for 30 days.
        </Notice>
      </div>
      <ProblemPanel problem={list.problem} testId="operations-error" />
      <FilterBar
        onSearch={() =>
          setFilters({
            sn,
            machine: machine.trim() || undefined,
            operateType: (type || undefined) as OperationsLogFilters["operateType"],
            from: from || undefined,
            to: to || undefined,
          })
        }
        onReset={() => {
          setMachine("");
          setType("");
          setFrom("");
          setTo("");
          setFilters({ sn });
        }}
      >
        <TextFilter label="Machine" value={machine} onChange={setMachine} testId="filter-machine" />
        <SelectFilter
          label="Type"
          value={type}
          onChange={setType}
          options={[{ value: "", label: "All" }, ...Object.entries(OPERATE_TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
          testId="filter-type"
        />
        <FilterRange>
          <TextFilter label="From" type="datetime-local" value={from} onChange={setFrom} testId="filter-from" />
          <TextFilter label="To" type="datetime-local" value={to} onChange={setTo} testId="filter-to" />
        </FilterRange>
      </FilterBar>

      <DataTable testId="operations-table">
        <Head>
          <Col>Machine Number</Col>
          <Col>Machine Name</Col>
          <Col>Machine ID</Col>
          <Col>Time</Col>
          <Col>Type</Col>
          <Col>Content</Col>
          <Col>Network (broadcast)</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {list.rows.length === 0 ? (
            <NoData colSpan={7} loading={list.loading} />
          ) : (
            list.rows.map((row, i) => (
              <tr key={`${row.sn}-${row.receivedAt}-${i}`} data-testid="row-operation">
                <Cell className="whitespace-nowrap">{row.deviceExtNo || "—"}</Cell>
                <Cell>{row.machineName || "—"}</Cell>
                <Cell className="font-mono text-xs text-muted-foreground">{row.sn}</Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums">
                  <span title={`Received ${formatIstStamp(row.receivedAt)}`}>{row.operateTimes || formatIstStamp(row.receivedAt)}</span>
                </Cell>
                <Cell>{OPERATE_TYPE_LABEL[String(row.operateType)] ?? "Other"}</Cell>
                <Cell>{row.content || "—"}</Cell>
                <Cell className="font-mono text-xs text-muted-foreground">{row.broadcastAddress || "—"}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {list.cursor && <LoadMore onClick={list.more} loading={list.loading} />}
    </>
  );
}

function RemovableChip({ label, onRemove, testId }: { label: string; onRemove: () => void; testId: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-foreground" data-testid={testId}>
      {label}
      <button type="button" onClick={onRemove} aria-label={`Clear ${label}`} className="rounded-full p-0.5 hover:bg-background cursor-pointer">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}
