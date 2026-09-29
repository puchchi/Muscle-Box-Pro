"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteGood, fetchGoods, fetchModels, setGoodListing } from "@/lib/adminMachineApi";
import type { Good, MachineModel } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { SuccessPanel } from "./AdminUi";
import {
  Cell,
  Col,
  ConfirmDialog,
  DataTable,
  FilterBar,
  formatIstStamp,
  formatRupees,
  GoodsPicture,
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

export default function AdminMachineGoods() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <GoodsLibrary session={guard.session} />;
}

type Filters = { name?: string; modelId?: string; listed?: "yes" | "no" };

type Pending =
  | { kind: "listing"; good: Good; listed: boolean; count: number }
  | { kind: "delete"; good: Good };

function GoodsLibrary({ session }: { session: AdminSession }) {
  const [models, setModels] = useState<MachineModel[]>([]);
  const [rows, setRows] = useState<Good[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [listed, setListed] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchModels().then((result) => {
      if (result.ok) setModels(result.data.items);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchGoods(filters, page, pageSize);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setRows(result.data.items);
    setTotal(result.data.total);
  }, [filters, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id;

  async function askListing(good: Good, nextListed: boolean) {
    setNotice(null);
    setBusy(true);
    const result = await setGoodListing(good.goodsId, nextListed, true);
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setPending({ kind: "listing", good, listed: nextListed, count: result.data.machinesChanged });
  }

  async function confirm() {
    if (!pending) return;
    if (pending.kind === "listing" && pending.count === 0) {
      setPending(null);
      return;
    }
    setBusy(true);
    if (pending.kind === "listing") {
      const result = await setGoodListing(pending.good.goodsId, pending.listed, false);
      setBusy(false);
      setPending(null);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      const n = result.data.machinesChanged;
      setNotice(
        `${pending.good.name} ${pending.listed ? "listed on" : "unlisted from"} ${n} machine${n === 1 ? "" : "s"}. ${REFRESH_NOTE}`,
      );
    } else {
      const result = await deleteGood(pending.good.goodsId);
      setBusy(false);
      setPending(null);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setNotice(`${pending.good.name} deleted.`);
    }
    setProblem(null);
    await load();
  }

  return (
    <MachinesShell session={session} section="goods">
      <MachinesHeader
        title="Goods library"
        subtitle="Every drink and its recipe, before it is put on machines."
        action={
          <Button asChild className="rounded-xl" data-testid="button-new-good">
            <Link href="/machines/goods/new">
              <Plus className="h-4 w-4" aria-hidden />
              New goods
            </Link>
          </Button>
        }
      />

      <ProblemPanel problem={problem} testId="goods-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="goods-notice">{notice}</SuccessPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => {
          setFilters({
            name: name.trim() || undefined,
            modelId: modelId || undefined,
            listed: (listed || undefined) as Filters["listed"],
          });
          setPage(1);
        }}
        onReset={() => {
          setName("");
          setModelId("");
          setListed("");
          setFilters({});
          setPage(1);
        }}
      >
        <TextFilter label="Name" value={name} onChange={setName} testId="filter-name" />
        <SelectFilter
          label="Model"
          value={modelId}
          onChange={setModelId}
          options={[{ value: "", label: "All" }, ...models.map((m) => ({ value: m.id, label: m.name }))]}
          testId="filter-model"
        />
        <SelectFilter
          label="Listed anywhere"
          value={listed}
          onChange={setListed}
          options={[
            { value: "", label: "All" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          testId="filter-listed"
        />
      </FilterBar>

      <DataTable testId="goods-table">
        <Head>
          <Col>Sort</Col>
          <Col>Picture</Col>
          <Col>Goods Number</Col>
          <Col>Name</Col>
          <Col>Specification</Col>
          <Col align="right">Price</Col>
          <Col>Model</Col>
          <Col align="right">Machines</Col>
          <Col>Updated</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={10} loading={loading} />
          ) : (
            rows.map((good) => (
              <tr key={good.goodsId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-good-${good.goodsId}`}>
                <Cell className="tabular-nums">{good.sort}</Cell>
                <Cell>
                  <GoodsPicture url={good.image?.url} alt={good.name} />
                </Cell>
                <Cell className="font-mono text-xs">{good.no}</Cell>
                <Cell className="min-w-[8rem]">
                  <Link
                    href={`/machines/goods/${encodeURIComponent(good.goodsId)}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {good.name}
                  </Link>
                  {good.nameEn && <span className="block text-xs text-muted-foreground">{good.nameEn}</span>}
                </Cell>
                <Cell className="text-muted-foreground">{good.spec || "—"}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(good.priceInr)}</Cell>
                <Cell className="whitespace-nowrap">{modelName(good.modelId)}</Cell>
                <Cell align="right" className="tabular-nums">
                  <span data-testid={`listed-count-${good.goodsId}`}>{good.machinesListed}</span>
                </Cell>
                <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatIstStamp(good.updatedAt)}
                  {good.updatedBy && <span className="block">{good.updatedBy}</span>}
                </Cell>
                <Cell className="whitespace-nowrap">
                  <span className="flex gap-2 text-xs font-semibold">
                    <Link
                      href={`/machines/goods/${encodeURIComponent(good.goodsId)}`}
                      className="text-primary hover:underline"
                      data-testid={`edit-${good.goodsId}`}
                    >
                      Edit
                    </Link>
                    <RowAction onClick={() => askListing(good, true)} disabled={busy} testId={`list-all-${good.goodsId}`}>
                      List on all machines
                    </RowAction>
                    <RowAction onClick={() => askListing(good, false)} disabled={busy} testId={`unlist-all-${good.goodsId}`}>
                      Unlist from all machines
                    </RowAction>
                    <RowAction
                      onClick={() => {
                        setNotice(null);
                        if (good.machinesListed > 0) setProblem({ message: listedMessage(good), issues: [] });
                        else setPending({ kind: "delete", good });
                      }}
                      disabled={busy}
                      danger
                      testId={`delete-${good.goodsId}`}
                    >
                      Delete
                    </RowAction>
                  </span>
                </Cell>
              </tr>
            ))
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
        open={pending !== null}
        onClose={() => setPending(null)}
        busy={busy}
        onConfirm={confirm}
        danger={pending?.kind === "delete"}
        testId="goods-confirm"
        {...confirmCopy(pending)}
      />
    </MachinesShell>
  );
}

function listedMessage(good: Good): string {
  const n = good.machinesListed;
  return `${good.name} is listed on ${n} machine${n === 1 ? "" : "s"}, so it can't be deleted. Unlist it first.`;
}

function confirmCopy(pending: Pending | null): { title: string; message: string; confirmLabel: string } {
  if (!pending) return { title: "", message: "", confirmLabel: "" };
  if (pending.kind === "delete") {
    return {
      title: `Delete ${pending.good.name}?`,
      message: "It is removed from the library and from every machine it was added to. This can't be undone.",
      confirmLabel: "Delete",
    };
  }
  const n = pending.count;
  const machines = `${n} machine${n === 1 ? "" : "s"}`;
  if (n === 0) {
    return {
      title: pending.listed ? "List on all machines" : "Unlist from all machines",
      message: pending.listed
        ? `${pending.good.name} is already listed on every machine of its model. Nothing changes.`
        : `${pending.good.name} isn't listed on any machine. Nothing changes.`,
      confirmLabel: "OK",
    };
  }
  return {
    title: pending.listed ? "List on all machines" : "Unlist from all machines",
    message: pending.listed
      ? `${pending.good.name} will be listed on ${machines} of its model.`
      : `${pending.good.name} will be unlisted from ${machines}.`,
    confirmLabel: pending.listed ? `List on ${machines}` : `Unlist from ${machines}`,
  };
}

function RowAction({
  onClick,
  disabled,
  danger,
  testId,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "text-rose-300" : "text-primary"}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
