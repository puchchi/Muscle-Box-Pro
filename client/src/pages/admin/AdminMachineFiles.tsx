"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBackup, fetchBackups, fetchCrashFiles, fetchLogFiles, fetchMachine, fetchMachineFile, type MachineCall } from "@/lib/adminMachineApi";
import type { MachineFileKind } from "@shared/admin/machines";
import type { BackupPair, BackupRow, CrashFile, LogFile, Machine, MachineFile } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card } from "./AdminUi";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  Head,
  MachineDialog,
  MachinesHeader,
  NoData,
  Pager,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";
import { formatBytes } from "./machines/mediaBits";
import { saveFile, saveUrl } from "./machines/csv";
import { diffBackups, groupBackup } from "./machines/backupRules";
import { WarningPanel } from "./machines/WarningPanel";

const TABS = [
  { id: "logs", label: "Log files" },
  { id: "crashes", label: "Crash reports" },
  { id: "backups", label: "Config backups" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const tabOf = (raw: string | null): TabId => (TABS.some((t) => t.id === raw) ? (raw as TabId) : "logs");

const linkClass = "text-sm font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline";

export default function AdminMachineFiles({ sn }: { sn: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <MachineFiles session={guard.session} sn={sn} />;
}

function MachineFiles({ session, sn }: { session: AdminSession; sn: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const tab = tabOf(search?.get("tab") ?? null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    fetchMachine(sn).then((result) => {
      if (result.ok) setMachine(result.data.machine);
      else setProblem(problemOf(result));
    });
  }, [sn]);

  return (
    <MachinesShell session={session} section="machines">
      <MachinesHeader
        title={machine ? `Files · ${machine.deviceExtNo || machine.sn}` : "Files"}
        subtitle="Files the machine sent: log files, crash reports and settings backups. Times are IST."
        back={{ href: `/machines/${encodeURIComponent(sn)}`, label: machine ? `${machine.deviceExtNo || sn} · ${machine.name}` : sn }}
      />
      <ProblemPanel problem={problem} testId="files-error" />

      <div className="mb-5 flex flex-wrap gap-1" role="tablist" aria-label="Files">
        {TABS.map((entry) => {
          const active = entry.id === tab;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => router.replace(`${pathname}?tab=${entry.id}`)}
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

      {tab === "logs" && <LogFiles sn={sn} />}
      {tab === "crashes" && <CrashReports sn={sn} />}
      {tab === "backups" && <Backups sn={sn} />}
    </MachinesShell>
  );
}

function usePaged<T>(fetchPage: (page: number, pageSize: number) => Promise<MachineCall<{ items: T[]; total: number }>>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void fetchPage(page, pageSize).then((result) => {
      if (!live) return;
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows(result.data.items);
      setTotal(result.data.total);
    });
    return () => {
      live = false;
    };
  }, [fetchPage, page, pageSize]);

  const pager = (
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
  );
  return { rows, loading, problem, setProblem, pager };
}

function useDownload(sn: string, kind: MachineFileKind, setProblem: (p: Problem | null) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (name: string) => {
    setBusy(name);
    const result = await fetchMachineFile(sn, kind, name);
    setBusy(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    saveUrl(result.data.file.url);
  };
  return { busy, download };
}

function LogFiles({ sn }: { sn: string }) {
  const fetchPage = useCallback((page: number, size: number) => fetchLogFiles(sn, page, size), [sn]);
  const { rows, loading, problem, setProblem, pager } = usePaged<LogFile>(fetchPage);
  const { busy, download } = useDownload(sn, "logs", setProblem);

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        The operator sends a log file by tapping Upload Log on the machine. Files are kept for a limited time.
      </p>
      <ProblemPanel problem={problem} testId="logs-error" />
      <DataTable testId="log-files-table">
        <Head>
          <Col>File name</Col>
          <Col align="right">Size</Col>
          <Col>Uploaded</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={4} loading={loading} />
          ) : (
            rows.map((f) => (
              <tr key={f.name} className="hover:bg-secondary/40 transition-colors" data-testid={`row-log-${f.name}`}>
                <Cell className="font-mono text-xs">{f.name}</Cell>
                <Cell align="right" className="whitespace-nowrap tabular-nums">{formatBytes(f.size)}</Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(f.uploadedAt)}</Cell>
                <Cell>
                  <button type="button" className={linkClass} disabled={busy === f.name} onClick={() => void download(f.name)}>
                    {busy === f.name ? "Preparing…" : "Download"}
                  </button>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {pager}
    </>
  );
}

function CrashReports({ sn }: { sn: string }) {
  const fetchPage = useCallback((page: number, size: number) => fetchCrashFiles(sn, page, size), [sn]);
  const { rows, loading, problem, setProblem, pager } = usePaged<CrashFile>(fetchPage);
  const { busy, download } = useDownload(sn, "crashes", setProblem);
  const [viewing, setViewing] = useState<string | null>(null);
  const [file, setFile] = useState<MachineFile | null>(null);
  const [viewProblem, setViewProblem] = useState<Problem | null>(null);

  async function view(name: string) {
    setViewing(name);
    setFile(null);
    setViewProblem(null);
    const result = await fetchMachineFile(sn, "crashes", name, true);
    if (!result.ok) setViewProblem(problemOf(result));
    else setFile(result.data.file);
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        After a crash, the machine sends a report the next time the app starts.
      </p>
      <ProblemPanel problem={problem} testId="crashes-error" />
      <DataTable testId="crash-files-table">
        <Head>
          <Col>File name</Col>
          <Col>App version</Col>
          <Col>Crashed at</Col>
          <Col>Uploaded</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={5} loading={loading} />
          ) : (
            rows.map((f) => (
              <tr key={f.name} className="hover:bg-secondary/40 transition-colors" data-testid={`row-crash-${f.name}`}>
                <Cell className="font-mono text-xs">{f.name}</Cell>
                <Cell>{f.appVersion ?? "—"}</Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums">{formatIstStamp(f.crashedAt)}</Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(f.uploadedAt)}</Cell>
                <Cell>
                  <span className="flex gap-3">
                    <button type="button" className={linkClass} onClick={() => void view(f.name)} data-testid={`button-view-${f.name}`}>
                      View
                    </button>
                    <button type="button" className={linkClass} disabled={busy === f.name} onClick={() => void download(f.name)}>
                      {busy === f.name ? "Preparing…" : "Download"}
                    </button>
                  </span>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {pager}

      <MachineDialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="Crash report"
        description={<span className="font-mono text-xs">{viewing}</span>}
        wide
        testId="crash-dialog"
        footer={
          file && (
            <Button type="button" variant="outline" onClick={() => saveUrl(file.url)} className="rounded-xl cursor-pointer">
              <Download className="h-4 w-4" aria-hidden />
              Download
            </Button>
          )
        }
      >
        <ProblemPanel problem={viewProblem} testId="crash-dialog-error" />
        {!file && !viewProblem && <p className="text-sm text-muted-foreground">Loading…</p>}
        {file && (
          <>
            {file.truncated && (
              <div className="mb-3">
                <WarningPanel testId="crash-truncated">This report is long, so only the start is shown. Download it to see all of it.</WarningPanel>
              </div>
            )}
            <pre
              className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground"
              data-testid="crash-text"
            >
              {file.text}
            </pre>
          </>
        )}
      </MachineDialog>
    </>
  );
}

function Backups({ sn }: { sn: string }) {
  const fetchPage = useCallback((page: number, size: number) => fetchBackups(sn, page, size), [sn]);
  const { rows, loading, problem, setProblem, pager } = usePaged<BackupRow>(fetchPage);
  const [open, setOpen] = useState<{ id: string; mode: "view" | "compare" } | null>(null);
  const [pair, setPair] = useState<BackupPair | null>(null);
  const [dialogProblem, setDialogProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(id: string) {
    const result = await fetchBackup(sn, id);
    if (!result.ok) return { problem: problemOf(result) };
    return { pair: result.data };
  }

  async function show(id: string, mode: "view" | "compare") {
    setOpen({ id, mode });
    setPair(null);
    setDialogProblem(null);
    const r = await load(id);
    if (r.pair) setPair(r.pair);
    else setDialogProblem(r.problem ?? null);
  }

  async function downloadJson(id: string) {
    setBusy(id);
    const r = await load(id);
    setBusy(null);
    if (!r.pair) {
      setProblem(r.problem ?? null);
      return;
    }
    saveFile(`mbp-config-${sn}-${id}.json`, JSON.stringify(r.pair.backup.config, null, 2), "application/json");
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        The operator saves a backup by tapping Backup local configuration on the machine. These settings are changed on the machine only.
      </p>
      <ProblemPanel problem={problem} testId="backups-error" />
      <DataTable testId="backups-table">
        <Head>
          <Col>Backed up at</Col>
          <Col align="right">Size</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={3} loading={loading} />
          ) : (
            rows.map((b) => (
              <tr key={b.id} className="hover:bg-secondary/40 transition-colors" data-testid={`row-backup-${b.id}`}>
                <Cell className="whitespace-nowrap tabular-nums">{formatIstStamp(b.at)}</Cell>
                <Cell align="right" className="whitespace-nowrap tabular-nums">{formatBytes(b.size)}</Cell>
                <Cell>
                  <span className="flex flex-wrap gap-3">
                    <button type="button" className={linkClass} onClick={() => void show(b.id, "view")} data-testid={`button-view-${b.id}`}>
                      View
                    </button>
                    <button type="button" className={linkClass} disabled={busy === b.id} onClick={() => void downloadJson(b.id)}>
                      {busy === b.id ? "Preparing…" : "Download JSON"}
                    </button>
                    <button type="button" className={linkClass} onClick={() => void show(b.id, "compare")} data-testid={`button-compare-${b.id}`}>
                      Compare with previous
                    </button>
                  </span>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {pager}

      <MachineDialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.mode === "compare" ? "Changes since the previous backup" : "Machine settings"}
        description={pair ? `As backed up on ${formatIstStamp(pair.backup.at)}` : undefined}
        wide
        testId="backup-dialog"
      >
        <ProblemPanel problem={dialogProblem} testId="backup-dialog-error" />
        {!pair && !dialogProblem && <p className="text-sm text-muted-foreground">Loading…</p>}
        {pair && open?.mode === "view" && <BackupView pair={pair} />}
        {pair && open?.mode === "compare" && <BackupCompare pair={pair} />}
      </MachineDialog>
    </>
  );
}

function BackupView({ pair }: { pair: BackupPair }) {
  const groups = groupBackup(pair.backup.config);
  return (
    <div className="space-y-4" data-testid="backup-view">
      {groups.map((g) => (
        <Card key={g.id} title={g.title} testId={`backup-group-${g.id}`}>
          <div className="space-y-4 px-4 py-3 sm:px-5">
            {g.sections.map((s, i) => (
              <div key={s.title ?? i}>
                {s.title && <h3 className="mb-2 text-sm font-semibold text-foreground">{s.title}</h3>}
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {s.entries.map((e) => (
                    <div key={e.key} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5 text-sm">
                      <dt className="text-muted-foreground" title={e.key}>
                        {e.label}
                      </dt>
                      <dd className="min-w-0 break-all text-right font-medium tabular-nums text-foreground">{e.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function BackupCompare({ pair }: { pair: BackupPair }) {
  if (!pair.previous) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="backup-no-previous">
        This is the first backup from this machine, so there is nothing to compare it with.
      </p>
    );
  }
  const changes = diffBackups(pair.backup.config, pair.previous.config);
  return (
    <div data-testid="backup-compare">
      <p className="mb-3 text-sm text-muted-foreground">Compared with the backup from {formatIstStamp(pair.previous.at)}.</p>
      {changes.length === 0 ? (
        <p className="text-sm text-foreground" data-testid="backup-no-changes">
          No settings changed between these two backups.
        </p>
      ) : (
        <DataTable testId="backup-changes">
          <Head>
            <Col>Setting</Col>
            <Col>Before</Col>
            <Col>After</Col>
          </Head>
          <tbody className="divide-y divide-border/70">
            {changes.map((c, i) => (
              <tr key={i}>
                <Cell>
                  {c.label}
                  <span className="block text-[11px] text-muted-foreground">{c.section ? `${c.group} · ${c.section}` : c.group}</span>
                </Cell>
                <Cell className="break-all text-muted-foreground">{c.before}</Cell>
                <Cell className="break-all font-semibold text-foreground">{c.after}</Cell>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
