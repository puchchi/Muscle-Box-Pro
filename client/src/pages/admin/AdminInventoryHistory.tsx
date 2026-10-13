"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchItems, fetchMovements } from "@/lib/inventoryApi";
import { MOVEMENT_TYPES, type InventoryItem, type Movement, type MovementFilters, type MovementType } from "@shared/admin/inventorySchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  formatIstStamp,
  formatRupees,
  Head,
  LoadMore,
  MachinesHeader,
  NoData,
  ProblemPanel,
  SelectFilter,
  type Problem,
} from "./machines/MachinesUi";
import { INVENTORY_SUBTITLE, InventoryTabs, inventoryProblem } from "./machines/inventoryBits";
import { formatQty, MOVEMENT_LABEL, placeLabel } from "./machines/inventoryRules";

export default function AdminInventoryHistory() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <History session={guard.session} />;
}

const WASTE: ReadonlySet<MovementType> = new Set(["unload", "write_off"]);

const signedRupees = (inr: number) => (inr < 0 ? `-${formatRupees(-inr)}` : formatRupees(inr));

export function movementDetail(m: Movement): string {
  const parts = [m.reason, m.note, m.ref?.invoiceNo && `Invoice ${m.ref.invoiceNo}`, m.ref?.supplier, m.ref?.orderId && `Order ${m.ref.orderId}`];
  return parts.filter(Boolean).join(". ");
}

function History({ session }: { session: MachineViewer }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [draft, setDraft] = useState<{ itemId: string; type: string }>({ itemId: "", type: "" });
  const [filters, setFilters] = useState<MovementFilters>({});
  const [rows, setRows] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    void fetchItems().then((result) => result.ok && setItems(result.data.items));
  }, []);

  const load = useCallback(async (next: MovementFilters, after: string | null) => {
    setLoading(true);
    const result = await fetchMovements(next, after);
    setLoading(false);
    if (!result.ok) {
      setProblem(inventoryProblem(result));
      return;
    }
    setProblem(null);
    setRows((all) => (after ? [...all, ...result.data.items] : result.data.items));
    setCursor(result.data.nextCursor);
  }, []);

  useEffect(() => {
    void load(filters, null);
  }, [filters, load]);

  return (
    <MachinesShell session={session} section="inventory">
      <MachinesHeader title="Stock" subtitle={INVENTORY_SUBTITLE} />
      <InventoryTabs current="history" />
      <FilterBar
        onSearch={() => setFilters({ itemId: draft.itemId || undefined, type: (draft.type || undefined) as MovementType | undefined })}
        onReset={() => {
          setDraft({ itemId: "", type: "" });
          setFilters({});
        }}
      >
        <SelectFilter
          label="Item"
          value={draft.itemId}
          onChange={(itemId) => setDraft((d) => ({ ...d, itemId }))}
          options={[{ value: "", label: "All items" }, ...items.map((i) => ({ value: i.itemId, label: i.name }))]}
          testId="filter-item"
        />
        <SelectFilter
          label="What happened"
          value={draft.type}
          onChange={(type) => setDraft((d) => ({ ...d, type }))}
          options={[{ value: "", label: "Everything" }, ...MOVEMENT_TYPES.map((t) => ({ value: t, label: MOVEMENT_LABEL[t] }))]}
          testId="filter-type"
        />
      </FilterBar>
      <ProblemPanel problem={problem} testId="history-error" />

      <DataTable testId="history-table">
        <Head>
          <Col>When</Col>
          <Col>What</Col>
          <Col>Item</Col>
          <Col align="right">Amount</Col>
          <Col>From</Col>
          <Col>To</Col>
          <Col align="right">Cost</Col>
          <Col>By</Col>
          <Col>Details</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={9} loading={loading} />
          ) : (
            rows.map((m) => (
              <tr key={m.movementId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-movement-${m.movementId}`}>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(m.at)}</Cell>
                <Cell className={`whitespace-nowrap ${WASTE.has(m.type) ? "text-amber-300" : ""}`}>{MOVEMENT_LABEL[m.type]}</Cell>
                <Cell className="min-w-40 font-semibold">{m.itemName}</Cell>
                <Cell align="right" className="whitespace-nowrap tabular-nums">{formatQty(m.qty, m.unit)}</Cell>
                <Cell className="whitespace-nowrap text-muted-foreground">{placeLabel(m.from, m.type)}</Cell>
                <Cell className="whitespace-nowrap text-muted-foreground">{placeLabel(m.to, m.type)}</Cell>
                <Cell align="right" className="tabular-nums">{signedRupees(m.qty * m.unitCostInr)}</Cell>
                <Cell className="whitespace-nowrap text-xs text-muted-foreground">{m.by ?? "Machine"}</Cell>
                <Cell className="min-w-48 text-xs text-muted-foreground">{movementDetail(m) || "—"}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {cursor && <LoadMore onClick={() => void load(filters, cursor)} loading={loading} />}
    </MachinesShell>
  );
}
