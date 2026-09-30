"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CupSoda, KeyRound, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMachines, fetchMachineSummary, fetchModels } from "@/lib/adminMachineApi";
import type { MachineListFilters } from "@shared/admin/machines";
import type { MachineModel, MachineRow, MachineSummary } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { FactoryPinBulkDialog } from "./machines/FactoryPinBulkDialog";
import { Pill } from "./AdminUi";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  Head,
  MachinesHeader,
  NoData,
  Pager,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";

export default function AdminMachines() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <MachinesOverview session={guard.session} />;
}

type Health = "all" | "online" | "offline" | "faulty" | "lowStock" | "restartPending";
type SearchField = "name" | "deviceExtNo" | "sn";

const HEALTH_FILTER: Record<Health, MachineListFilters> = {
  all: {},
  online: { network: "online" },
  offline: { network: "offline" },
  faulty: { fault: "faulty" },
  lowStock: { stock: "lack" },
  restartPending: { restartPending: "yes" },
};

const SEARCH_FIELDS: ReadonlyArray<{ value: SearchField; label: string }> = [
  { value: "name", label: "Name" },
  { value: "deviceExtNo", label: "Machine number" },
  { value: "sn", label: "Machine ID" },
];

type PayFilter = "" | "yes" | "no";

export function machineFilters(
  health: Health,
  field: SearchField,
  text: string,
  modelId: string,
  freeVend: PayFilter = "",
  noFactoryPin = false,
): MachineListFilters {
  return {
    ...HEALTH_FILTER[health],
    [field]: text.trim() || undefined,
    modelId: modelId || undefined,
    freeVend: freeVend || undefined,
    factoryPin: noFactoryPin ? "none" : undefined,
  };
}

const selectClass = "h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground cursor-pointer";

function MachinesOverview({ session }: { session: AdminSession }) {
  const [summary, setSummary] = useState<MachineSummary | null>(null);
  const [models, setModels] = useState<MachineModel[]>([]);
  const [rows, setRows] = useState<MachineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [health, setHealth] = useState<Health>("all");
  const [field, setField] = useState<SearchField>("name");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [modelId, setModelId] = useState("");
  const [freeVend, setFreeVend] = useState<PayFilter>("");
  const [noFactoryPin, setNoFactoryPin] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    fetchMachineSummary().then((result) => {
      if (result.ok) setSummary(result.data);
      else setProblem(problemOf(result));
    });
    fetchModels().then((result) => {
      if (result.ok) setModels(result.data.items);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(text);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchMachines(machineFilters(health, field, query, modelId, freeVend, noFactoryPin), page, pageSize);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setRows(result.data.items);
    setTotal(result.data.total);
  }, [health, field, query, modelId, freeVend, noFactoryPin, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = health !== "all" || query.trim() !== "" || modelId !== "" || freeVend !== "" || noFactoryPin;
  const fleetEmpty = summary?.machines === 0 && !filtered;

  function pickHealth(next: Health) {
    setHealth((current) => (current === next ? "all" : next));
    setPage(1);
  }

  function clearFilters() {
    setHealth("all");
    setText("");
    setQuery("");
    setModelId("");
    setFreeVend("");
    setNoFactoryPin(false);
    setPage(1);
  }

  const addButton = (
    <Button asChild className="rounded-xl" data-testid="button-add-machine">
      <Link href="/machines/new">
        <Plus className="h-4 w-4" aria-hidden />
        Add machine
      </Link>
    </Button>
  );

  return (
    <MachinesShell session={session} section="machines">
      <MachinesHeader
        title="Machines"
        subtitle="Online means the machine checked in within the last 3 minutes."
        action={
          <span className="flex flex-wrap gap-2">
            {!fleetEmpty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkOpen(true)}
                className="rounded-xl cursor-pointer"
                data-testid="button-bulk-factory-pin"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                Set factory PIN
              </Button>
            )}
            {addButton}
          </span>
        }
      />
      <FactoryPinBulkDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={() => void load()} />

      <ProblemPanel problem={problem} testId="machines-error" />

      {fleetEmpty ? (
        <EmptyFleet action={addButton} />
      ) : (
        <>
          <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" aria-label="Fleet health">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <HealthTile id="all" label="All machines" value={summary?.machines} active={health} onPick={pickHealth} />
              <HealthTile id="online" label="Online" value={summary?.online} tone="good" active={health} onPick={pickHealth} />
              <HealthTile id="offline" label="Offline" value={summary?.offline} tone="warn" active={health} onPick={pickHealth} />
              <HealthTile id="faulty" label="Faulty" value={summary?.faulty} tone="bad" active={health} onPick={pickHealth} />
              <HealthTile id="lowStock" label="Low stock" value={summary?.lowStock} tone="warn" active={health} onPick={pickHealth} />
              <HealthTile
                id="restartPending"
                label="Restart pending"
                value={summary?.restartPending}
                tone="warn"
                active={health}
                onPick={pickHealth}
              />
            </div>
            <Link
              href="/machines/orders"
              className="flex items-center gap-6 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-muted-foreground/40"
              data-testid="tile-today"
            >
              <span>
                <span className="block text-xs text-muted-foreground">Orders today</span>
                <span className="block text-xl font-display font-black tabular-nums" data-testid="tile-orders-today">
                  {summary?.ordersToday ?? "—"}
                </span>
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">Sales today</span>
                <span className="block text-xl font-display font-black tabular-nums" data-testid="tile-sales-today">
                  {summary ? wholeRupees(summary.salesTodayInr) : "—"}
                </span>
              </span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          </section>

          <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="machine-filters">
            <div className="flex min-w-0 flex-1 basis-72 items-center rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-ring">
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={`Search by ${SEARCH_FIELDS.find((f) => f.value === field)?.label.toLowerCase()}`}
                aria-label="Search machines"
                className="h-9 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                data-testid="filter-search"
              />
              <select
                value={field}
                onChange={(event) => setField(event.target.value as SearchField)}
                aria-label="Search in"
                className="h-9 shrink-0 border-l border-border bg-transparent px-2 text-sm text-muted-foreground cursor-pointer"
                data-testid="filter-search-field"
              >
                {SEARCH_FIELDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {models.length > 1 && (
              <select
                value={modelId}
                onChange={(event) => {
                  setModelId(event.target.value);
                  setPage(1);
                }}
                aria-label="Model"
                className={selectClass}
                data-testid="filter-model"
              >
                <option value="">All models</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={freeVend}
              onChange={(event) => {
                setFreeVend(event.target.value as PayFilter);
                setPage(1);
              }}
              aria-label="Free vend"
              className={selectClass}
              data-testid="filter-free-vend"
            >
              <option value="">Free vend: Any</option>
              <option value="yes">Free vend: Yes</option>
              <option value="no">Free vend: No</option>
            </select>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={noFactoryPin}
                onChange={(event) => {
                  setNoFactoryPin(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 accent-primary"
                data-testid="filter-no-factory-pin"
              />
              No factory PIN
            </label>
            {filtered && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="rounded-lg cursor-pointer"
                data-testid="button-reset"
              >
                Clear filters
              </Button>
            )}
          </div>

          <DataTable testId="machines-table">
            <Head>
              <Col>Machine</Col>
              <Col>Status</Col>
              <Col>Stock</Col>
              <Col className="hidden md:table-cell">Last seen</Col>
              <Col className="hidden lg:table-cell">Model</Col>
              <Col>
                <span className="sr-only">Open</span>
              </Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {rows.length === 0 ? (
                loading || !filtered ? (
                  <NoData colSpan={6} loading={loading} />
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground" data-testid="no-data">
                      No machines match these filters.{" "}
                      <button type="button" onClick={clearFilters} className="text-primary hover:underline cursor-pointer">
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )
              ) : (
                rows.map((row) => <MachineTableRow key={row.sn} row={row} />)
              )}
            </tbody>
          </DataTable>

          {total > 0 && (
            <Pager
              total={total}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </>
      )}
    </MachinesShell>
  );
}

function wholeRupees(rupees: number): string {
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

function EmptyFleet({ action }: { action: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
      data-testid="machines-empty"
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <CupSoda className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-foreground">No machines yet</h2>
      <p className="mt-1 mb-5 max-w-sm text-sm text-muted-foreground">
        Add the SN shown on the machine&apos;s operator screen. It shows up here once it checks in.
      </p>
      {action}
    </div>
  );
}

const TONE = {
  plain: "text-foreground",
  good: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-rose-300",
} as const;

function HealthTile({
  id,
  label,
  value,
  tone = "plain",
  active,
  onPick,
}: {
  id: Health;
  label: string;
  value: number | undefined;
  tone?: keyof typeof TONE;
  active: Health;
  onPick: (id: Health) => void;
}) {
  const pressed = active === id;
  const ink = value ? TONE[tone] : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={pressed}
      className={`rounded-2xl border px-3.5 py-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        pressed ? "border-primary bg-primary/10" : "border-border bg-card hover:border-muted-foreground/40"
      }`}
      data-testid={`tile-${id}`}
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className={`block text-xl font-display font-black tabular-nums ${ink}`}>{value ?? "—"}</span>
    </button>
  );
}

function MachineTableRow({ row }: { row: MachineRow }) {
  const router = useRouter();
  const href = `/machines/${encodeURIComponent(row.sn)}`;
  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer transition-colors hover:bg-secondary/40"
      data-testid={`row-machine-${row.sn}`}
    >
      <Cell className="min-w-[11rem]">
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="font-semibold text-foreground hover:underline"
        >
          {row.deviceExtNo || row.name || row.sn}
        </Link>
        {row.deviceExtNo && row.name && <span className="block text-sm text-foreground/80">{row.name}</span>}
        <span className="block font-mono text-[11px] text-muted-foreground">{row.sn}</span>
      </Cell>
      <Cell className="min-w-[10rem]">
        <StatusPills row={row} />
      </Cell>
      <Cell className="max-w-[14rem]">
        {row.stockStatus === "lack" ? (
          <>
            <span className="font-semibold text-amber-300" data-testid={`stock-${row.sn}`}>
              Low
            </span>
            {row.stockRemark && (
              <span className="block truncate text-xs text-muted-foreground" title={row.stockRemark}>
                {row.stockRemark}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground" data-testid={`stock-${row.sn}`}>
            OK
          </span>
        )}
      </Cell>
      <Cell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
        <span title={formatIstStamp(row.lastSeenAt)}>{timeAgo(row.lastSeenAt)}</span>
      </Cell>
      <Cell className="hidden text-xs text-muted-foreground lg:table-cell">{row.modelName}</Cell>
      <Cell className="w-8 text-muted-foreground">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Cell>
    </tr>
  );
}

function StatusPills({ row }: { row: MachineRow }) {
  const reason = row.faultStatus === "exception" ? row.faultRemark : "";
  return (
    <div className="max-w-[18rem]">
      <span className="flex flex-wrap gap-1">
        {!row.enabled && (
          <Pill className="bg-rose-400/15 text-rose-200" testId={`disabled-${row.sn}`}>
            Disabled
          </Pill>
        )}
        <Pill
          className={row.online ? "bg-emerald-400/15 text-emerald-200" : "bg-secondary text-muted-foreground"}
          testId={`network-${row.sn}`}
        >
          {row.online ? "Online" : "Offline"}
        </Pill>
        {row.runStatus === 2 ? (
          <Pill className="bg-rose-400/15 text-rose-200" testId={`fault-${row.sn}`}>
            Faulty
          </Pill>
        ) : (
          row.faultStatus === "exception" && (
            <Pill className="bg-rose-400/15 text-rose-200" testId={`fault-${row.sn}`}>
              Error
            </Pill>
          )
        )}
        {row.restartPending && (
          <Pill className="bg-amber-400/15 text-amber-200" testId={`restart-${row.sn}`}>
            Restart pending
          </Pill>
        )}
        {row.freeVend && (
          <Pill className="bg-sky-400/10 text-sky-200" testId={`free-vend-${row.sn}`}>
            Free vend
          </Pill>
        )}
        {!row.hasFactoryPin && (
          <Pill className="bg-secondary text-muted-foreground" testId={`no-factory-pin-${row.sn}`}>
            No factory PIN
          </Pill>
        )}
      </span>
      {reason && (
        <span className="mt-1 block truncate text-xs text-rose-200/80" title={reason}>
          {reason}
        </span>
      )}
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (Number.isNaN(seconds)) return iso;
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatIstStamp(iso).slice(0, 10);
}
