"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRedeemCode, fetchRedeemCodes, setRedeemCodeDisabled } from "@/lib/adminMachineApi";
import { CODE_SOURCES, CODE_STATUSES, type CodeStatus, type RedeemCode } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Pill, SuccessPanel } from "./AdminUi";
import { takeFlash } from "./machines/flash";
import { CODE_SOURCE_LABEL, CODE_STATUS_LABEL, isShopCode, validWindow } from "./machines/codeRules";
import {
  Cell,
  Col,
  ConfirmDialog,
  DataTable,
  FilterBar,
  formatIstStamp,
  Head,
  MachinesHeader,
  NoData,
  Pager,
  problemOf,
  ProblemPanel,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";

const STATUS_OPTIONS = [{ value: "", label: "Any status" }, ...CODE_STATUSES.map((s) => ({ value: s, label: CODE_STATUS_LABEL[s].text }))];
const SOURCE_OPTIONS = [{ value: "", label: "Any source" }, ...CODE_SOURCES.map((s) => ({ value: s, label: CODE_SOURCE_LABEL[s].text }))];

export default function AdminMachineRedeemCodes() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <RedeemCodes session={guard.session} />;
}

function RedeemCodes({ session }: { session: AdminSession }) {
  const [draft, setDraft] = useState({ q: "", status: "", source: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<RedeemCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RedeemCode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchRedeemCodes(
      { ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status as CodeStatus } : {}), ...(filters.source ? { source: filters.source } : {}) },
      page,
      pageSize,
    );
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setRows(result.data.items);
    setTotal(result.data.total);
  }, [filters, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const flash = takeFlash();
    if (flash) setNotice(flash.notice);
  }, []);

  async function toggleDisabled(c: RedeemCode) {
    setNotice(null);
    setBusy(c.code);
    const result = await setRedeemCodeDisabled(c.code, !c.disabled, c.version);
    setBusy(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(c.disabled ? `${c.code} enabled.` : `${c.code} disabled. Machines refuse it from now on.`);
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const c = deleting;
    setBusy(c.code);
    const result = await deleteRedeemCode(c.code);
    setBusy(null);
    setDeleting(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(`${c.code} deleted.`);
    await load();
  }

  return (
    <MachinesShell session={session} section="redeemCodes">
      <MachinesHeader
        title="Redeem codes"
        subtitle="Codes customers type on the machine to get a free drink."
        action={
          <Button asChild className="rounded-xl cursor-pointer">
            <Link href="/machines/redeem-codes/new" data-testid="button-add-code">
              <Plus className="h-4 w-4" aria-hidden />
              Add code
            </Link>
          </Button>
        }
      />

      <ProblemPanel problem={problem} testId="codes-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="codes-notice">{notice}</SuccessPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => {
          setPage(1);
          setFilters({ ...draft, q: draft.q.trim() });
        }}
        onReset={() => {
          const cleared = { q: "", status: "", source: "" };
          setDraft(cleared);
          setFilters(cleared);
          setPage(1);
        }}
      >
        <TextFilter label="Code, theme or serial" value={draft.q} onChange={(q) => setDraft((d) => ({ ...d, q }))} testId="filter-code-q" />
        <SelectFilter label="Status" value={draft.status} onChange={(status) => setDraft((d) => ({ ...d, status }))} options={STATUS_OPTIONS} testId="filter-code-status" />
        <SelectFilter label="Source" value={draft.source} onChange={(source) => setDraft((d) => ({ ...d, source }))} options={SOURCE_OPTIONS} testId="filter-code-source" />
      </FilterBar>

      <DataTable testId="codes-table">
        <Head>
          <Col>Serial</Col>
          <Col>Theme</Col>
          <Col>Code</Col>
          <Col>Goods</Col>
          <Col align="right">Uses</Col>
          <Col>Valid</Col>
          <Col>Status</Col>
          <Col>Source</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={9} loading={loading} />
          ) : (
            rows.map((c) => {
              const href = `/machines/redeem-codes/${encodeURIComponent(c.code)}`;
              const status = CODE_STATUS_LABEL[c.status];
              const source = CODE_SOURCE_LABEL[c.source];
              const shop = isShopCode(c);
              return (
                <tr key={c.code} className="hover:bg-secondary/40 transition-colors" data-testid={`row-code-${c.code}`}>
                  <Cell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{c.serialNo}</Cell>
                  <Cell className="min-w-[8rem]">{c.theme}</Cell>
                  <Cell>
                    <Link href={href} className="font-mono font-semibold tracking-wide text-foreground hover:text-primary">
                      {c.code}
                    </Link>
                  </Cell>
                  <Cell className="min-w-[9rem] text-xs text-muted-foreground">
                    {c.goods.slice(0, 2).map((g) => (
                      <span key={g.goodsId} className="block text-foreground">
                        {g.name}
                      </span>
                    ))}
                    {c.goods.length > 2 && <span className="block">and {c.goods.length - 2} more</span>}
                  </Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">
                    <span data-testid={`uses-${c.code}`}>
                      {c.usedCount} of {c.usesAllowed}
                    </span>
                    <span className="block text-xs text-muted-foreground">{c.remaining} left</span>
                  </Cell>
                  <Cell className="min-w-[8rem] max-w-[12rem] text-xs">{validWindow(c, formatIstStamp)}</Cell>
                  <Cell>
                    <Pill className={status.className} testId={`status-${c.code}`}>
                      {status.text}
                    </Pill>
                  </Cell>
                  <Cell>
                    <Pill className={source.className} testId={`source-${c.code}`}>
                      {source.text}
                    </Pill>
                    {c.shopOrderId && <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{c.shopOrderId}</span>}
                  </Cell>
                  <Cell>
                    <span className="flex gap-3 whitespace-nowrap">
                      <Link href={href} className="text-xs font-semibold text-primary hover:underline" data-testid={`edit-code-${c.code}`}>
                        {shop ? "View" : "Edit"}
                      </Link>
                      <Link href={`${href}#usage`} className="text-xs font-semibold text-primary hover:underline" data-testid={`usage-code-${c.code}`}>
                        Usage
                      </Link>
                      {!shop && (
                        <button
                          type="button"
                          onClick={() => void toggleDisabled(c)}
                          disabled={busy === c.code}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-60"
                          data-testid={`disable-code-${c.code}`}
                        >
                          {c.disabled ? "Enable" : "Disable"}
                        </button>
                      )}
                      {c.canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setDeleting(c);
                          }}
                          className="text-xs font-semibold text-rose-300 hover:underline cursor-pointer"
                          data-testid={`delete-code-${c.code}`}
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </Cell>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>
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

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.code}?` : "Delete code"}
        message="It has never been used. Deleting it can't be undone."
        confirmLabel="Delete"
        danger
        busy={busy !== null}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
        testId="delete-code"
      />
    </MachinesShell>
  );
}
