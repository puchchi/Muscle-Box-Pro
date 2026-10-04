"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePromotion, fetchPromotions, setPromotionPaused } from "@/lib/adminMachineApi";
import { PROMOTION_STATUSES, type Promotion, type PromotionKind, type PromotionStatus } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Pill, SuccessPanel } from "./AdminUi";
import { takeFlash } from "./machines/flash";
import { KIND_COPY, PROMOTION_STATUS_LABEL, savedNotice, whereLabel } from "./machines/promotionRules";
import {
  Cell,
  Col,
  ConfirmDialog,
  DataTable,
  FilterBar,
  formatIstStamp,
  formatRupees,
  Head,
  MachinesHeader,
  NoData,
  Pager,
  problemOf,
  ProblemPanel,
  REFRESH_NOTE,
  SelectFilter,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";

const STATUS_OPTIONS = [{ value: "", label: "Any status" }, ...PROMOTION_STATUSES.map((s) => ({ value: s, label: PROMOTION_STATUS_LABEL[s].text }))];

export default function AdminMachinePromotions({ kind }: { kind: PromotionKind }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Promotions session={guard.session} kind={kind} />;
}

function Promotions({ session, kind }: { session: AdminSession; kind: PromotionKind }) {
  const copy = KIND_COPY[kind];
  const [draft, setDraft] = useState({ name: "", status: "", hideEnded: false });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchPromotions(
      kind,
      {
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.status ? { status: filters.status as PromotionStatus } : {}),
        ...(filters.hideEnded ? { hideEnded: true } : {}),
      },
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
  }, [kind, filters, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const flash = takeFlash();
    if (flash) setNotice(flash.notice);
  }, []);

  async function togglePaused(p: Promotion) {
    setNotice(null);
    setBusy(p.promoId);
    const result = await setPromotionPaused(p.promoId, !p.paused, p.version);
    setBusy(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    const lead = `${p.name} ${p.paused ? "resumed" : "paused"}.`;
    setNotice(savedNotice(result.data.promotion, lead, p.status === "active"));
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const p = deleting;
    setBusy(p.promoId);
    const result = await deletePromotion(p.promoId);
    setBusy(null);
    setDeleting(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(p.status === "active" ? `${p.name} deleted. ${REFRESH_NOTE}` : `${p.name} deleted.`);
    await load();
  }

  return (
    <MachinesShell session={session} section={copy.section}>
      <MachinesHeader
        title={copy.title}
        subtitle={
          kind === "discount"
            ? "Lower prices for a set time. Machines show the discount price on the menu while it is active."
            : "Put the New badge on goods for a set time."
        }
        action={
          <Button asChild className="rounded-xl cursor-pointer">
            <Link href={`${copy.href}/new`} data-testid="button-add-promotion">
              <Plus className="h-4 w-4" aria-hidden />
              Add {copy.one}
            </Link>
          </Button>
        }
      />

      <ProblemPanel problem={problem} testId="promotions-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="promotions-notice">{notice}</SuccessPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => {
          setPage(1);
          setFilters({ ...draft, name: draft.name.trim() });
        }}
        onReset={() => {
          const cleared = { name: "", status: "", hideEnded: false };
          setDraft(cleared);
          setFilters(cleared);
          setPage(1);
        }}
      >
        <TextFilter label="Name or number" value={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} testId="filter-promotion-name" />
        <SelectFilter label="Status" value={draft.status} onChange={(status) => setDraft((d) => ({ ...d, status }))} options={STATUS_OPTIONS} testId="filter-promotion-status" />
        <label className="flex h-10 items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={draft.hideEnded}
            onChange={(event) => setDraft((d) => ({ ...d, hideEnded: event.target.checked }))}
            className="h-4 w-4 accent-primary"
            data-testid="filter-hide-ended"
          />
          Hide ended
        </label>
      </FilterBar>

      <DataTable testId="promotions-table">
        <Head>
          <Col>Number</Col>
          <Col>Name</Col>
          <Col>Goods</Col>
          <Col>When</Col>
          <Col>Where</Col>
          <Col>Status</Col>
          <Col>Updated</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={8} loading={loading} />
          ) : (
            rows.map((p) => {
              const href = `${copy.href}/${encodeURIComponent(p.promoId)}`;
              const status = PROMOTION_STATUS_LABEL[p.status];
              return (
                <tr key={p.promoId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-promotion-${p.promoId}`}>
                  <Cell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{p.no}</Cell>
                  <Cell className="min-w-[9rem]">
                    <Link href={href} className="font-semibold text-foreground hover:text-primary">
                      {p.name}
                    </Link>
                  </Cell>
                  <Cell className="min-w-[10rem] text-xs text-muted-foreground">
                    <GoodsSummary promotion={p} />
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs tabular-nums">
                    {formatIstStamp(p.startAt)}
                    <span className="block text-muted-foreground">to {formatIstStamp(p.endAt)}</span>
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs">{whereLabel(p)}</Cell>
                  <Cell>
                    <Pill className={status.className} testId={`status-${p.promoId}`}>
                      {status.text}
                    </Pill>
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatIstStamp(p.updatedAt)}
                    {p.updatedBy && <span className="block">{p.updatedBy}</span>}
                  </Cell>
                  <Cell>
                    <span className="flex gap-3 whitespace-nowrap">
                      <Link href={href} className="text-xs font-semibold text-primary hover:underline" data-testid={`edit-promotion-${p.promoId}`}>
                        Edit
                      </Link>
                      {p.status !== "ended" && (
                        <button
                          type="button"
                          onClick={() => void togglePaused(p)}
                          disabled={busy === p.promoId}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-60"
                          data-testid={`pause-promotion-${p.promoId}`}
                        >
                          {p.paused ? "Resume" : "Pause"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setDeleting(p);
                        }}
                        className="text-xs font-semibold text-rose-300 hover:underline cursor-pointer"
                        data-testid={`delete-promotion-${p.promoId}`}
                      >
                        Delete
                      </button>
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
        title={deleting ? `Delete ${deleting.name}?` : `Delete ${copy.one}`}
        message={deleting?.status === "active" ? `It is active now. Deleting it ends it at once. ${REFRESH_NOTE}` : "This can't be undone."}
        confirmLabel="Delete"
        danger
        busy={busy !== null}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
        testId="delete-promotion"
      />
    </MachinesShell>
  );
}

function GoodsSummary({ promotion }: { promotion: Promotion }) {
  const shown = promotion.items.slice(0, 2);
  const more = promotion.items.length - shown.length;
  return (
    <>
      {shown.map((item) => (
        <span key={item.goodsId} className="flex justify-between gap-3">
          <span className="text-foreground">{item.name}</span>
          {item.priceInr !== null && <span className="whitespace-nowrap tabular-nums">{formatRupees(item.priceInr)}</span>}
        </span>
      ))}
      {more > 0 && <span className="block">and {more} more</span>}
    </>
  );
}
