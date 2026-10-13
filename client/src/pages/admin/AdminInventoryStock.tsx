"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, PackagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchExpiringBatches, fetchItems, fetchStockBalances, fetchWarehouses } from "@/lib/inventoryApi";
import type { Batch, InventoryItem, StockBalance, Warehouse } from "@shared/admin/inventorySchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { StatCard, SuccessPanel } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { Cell, Col, DataTable, formatRupees, Head, MachinesHeader, NoData, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { INVENTORY_SUBTITLE, InventoryTabs, inventoryProblem } from "./machines/inventoryBits";
import { formatQty, formatUnitCost, KIND_LABEL, stockState } from "./machines/inventoryRules";
import { CountDialog, ReceiveDialog, WriteOffDialog } from "./machines/StockDialogs";

export const EXPIRY_WINDOW_DAYS = 30;

export default function AdminInventoryStock() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Stock session={guard.session} />;
}

type Data = { items: InventoryItem[]; warehouses: Warehouse[]; balances: StockBalance[]; expiring: Batch[] };

type Open = "receive" | "writeoff" | "count" | null;

const sumValue = (balances: StockBalance[], kind: "warehouse" | "machine") =>
  balances.filter((b) => b.place.kind === kind).reduce((sum, b) => sum + b.valueInr, 0);

function Stock({ session }: { session: MachineViewer }) {
  const [data, setData] = useState<Data | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const canEdit = session.can.has("inventory.edit");

  const load = useCallback(async () => {
    const [items, warehouses, balances, expiring] = await Promise.all([
      fetchItems(),
      fetchWarehouses(),
      fetchStockBalances(),
      fetchExpiringBatches(EXPIRY_WINDOW_DAYS),
    ]);
    const failed = [items, warehouses, balances, expiring].find((r) => !r.ok);
    if (failed) {
      setProblem(inventoryProblem(failed));
      return;
    }
    setProblem(null);
    if (items.ok && warehouses.ok && balances.ok && expiring.ok) {
      setData({ items: items.data.items, warehouses: warehouses.data.items, balances: balances.data.items, expiring: expiring.data.items });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];
  const warehouses = data?.warehouses ?? [];
  const balances = data?.balances ?? [];
  const ready = items.some((i) => i.active) && warehouses.some((w) => w.active);
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const warehouseName = new Map(warehouses.map((w) => [w.warehouseId, w.name]));
  const valueOf = (itemId: string) => balances.filter((b) => b.itemId === itemId).reduce((sum, b) => sum + b.valueInr, 0);

  const start = (which: Open) => {
    setNotice(null);
    setOpen(which);
  };
  const done = async (message: string) => {
    setOpen(null);
    setNotice(message);
    await load();
  };

  return (
    <MachinesShell session={session} section="inventory">
      <MachinesHeader
        title="Stock"
        subtitle={INVENTORY_SUBTITLE}
        action={
          canEdit &&
          ready && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => start("receive")} className="rounded-xl cursor-pointer" data-testid="button-receive">
                <PackagePlus className="h-4 w-4" aria-hidden />
                Receive stock
              </Button>
              <Button type="button" variant="outline" onClick={() => start("count")} className="rounded-xl cursor-pointer" data-testid="button-count">
                <ClipboardCheck className="h-4 w-4" aria-hidden />
                Count
              </Button>
              <Button type="button" variant="outline" onClick={() => start("writeoff")} className="rounded-xl cursor-pointer" data-testid="button-writeoff">
                <Trash2 className="h-4 w-4" aria-hidden />
                Write off
              </Button>
            </div>
          )
        }
      />
      <InventoryTabs current="stock" />
      <ProblemPanel problem={problem} testId="stock-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="stock-notice">{notice}</SuccessPanel>
        </div>
      )}

      {data && !ready && (
        <div className="mb-5 rounded-2xl border border-border bg-card px-5 py-5 text-sm" data-testid="stock-setup">
          <p className="font-semibold text-foreground">Set up what you stock first.</p>
          <p className="mt-1 text-muted-foreground">
            Add a <Link href="/machines/inventory/warehouses" className="text-primary hover:underline">warehouse</Link> and the{" "}
            <Link href="/machines/inventory/items" className="text-primary hover:underline">items</Link> you buy, linked to the machine
            materials they fill. Then you can receive your first invoice here.
          </p>
        </div>
      )}

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="In warehouses" value={formatRupees(sumValue(balances, "warehouse"))} hint="At average cost, before GST" testId="stat-warehouse-value" />
          <StatCard label="In machines" value={formatRupees(sumValue(balances, "machine"))} hint="Loaded into canisters" testId="stat-machine-value" />
          <StatCard
            label="Running low"
            value={String(items.filter((i) => i.active && stockState(i) !== "ok").length)}
            hint="Below the reorder level, or needing a count"
            tone={items.some((i) => i.active && stockState(i) !== "ok") ? "warn" : "plain"}
            testId="stat-low"
          />
          <StatCard
            label="Expiring soon"
            value={String(data.expiring.length)}
            hint={`Batches within ${EXPIRY_WINDOW_DAYS} days`}
            tone={data.expiring.length > 0 ? "warn" : "plain"}
            testId="stat-expiring"
          />
        </div>
      )}

      <DataTable testId="stock-table">
        <Head>
          <Col>Item</Col>
          <Col align="right">In warehouses</Col>
          <Col align="right">In machines</Col>
          <Col align="right">Average cost</Col>
          <Col align="right">Value</Col>
          <Col>Status</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {items.filter((i) => i.active).length === 0 ? (
            <NoData colSpan={6} loading={!data && !problem} />
          ) : (
            items
              .filter((i) => i.active)
              .map((item) => {
                const state = stockState(item);
                return (
                  <tr key={item.itemId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-stock-${item.itemId}`}>
                    <Cell>
                      <span className="font-semibold">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
                    </Cell>
                    <Cell align="right" className={`tabular-nums ${item.onHand < 0 ? "text-amber-300" : ""}`}>
                      {formatQty(item.onHand, item.unit)}
                    </Cell>
                    <Cell align="right" className="tabular-nums">{formatQty(item.inMachines, item.unit)}</Cell>
                    <Cell align="right" className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatUnitCost(item.avgCostInr, item.unit)}
                    </Cell>
                    <Cell align="right" className="tabular-nums">{formatRupees(valueOf(item.itemId))}</Cell>
                    <Cell>
                      <span
                        className={state === "ok" ? "text-muted-foreground" : "font-semibold text-amber-300"}
                        data-testid={`state-${item.itemId}`}
                      >
                        {state === "count" ? "Count needed" : state === "low" ? "Reorder" : "OK"}
                      </span>
                    </Cell>
                  </tr>
                );
              })
          )}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        Every refill takes stock out of the machine&apos;s home warehouse. A warehouse below zero means refills went out that were never
        received here, so count it.
      </p>

      {data && data.expiring.length > 0 && (
        <section className="mt-8" data-testid="expiring">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Expiring within {EXPIRY_WINDOW_DAYS} days</h2>
          <DataTable testId="expiring-table">
            <Head>
              <Col>Item</Col>
              <Col>Batch</Col>
              <Col>Warehouse</Col>
              <Col align="right">Left</Col>
              <Col>Expires</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {data.expiring.map((batch) => {
                const item = byId.get(batch.itemId);
                return (
                  <tr key={batch.batchId} data-testid={`row-batch-${batch.batchId}`}>
                    <Cell className="font-semibold">{item?.name ?? batch.itemId}</Cell>
                    <Cell className="whitespace-nowrap font-mono text-xs">{batch.batchCode || "—"}</Cell>
                    <Cell className="text-muted-foreground">{warehouseName.get(batch.warehouseId) ?? batch.warehouseId}</Cell>
                    <Cell align="right" className="whitespace-nowrap tabular-nums">{item ? formatQty(batch.qtyLeft, item.unit) : batch.qtyLeft}</Cell>
                    <Cell className="whitespace-nowrap tabular-nums text-amber-300">{batch.expiresOn ?? "—"}</Cell>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </section>
      )}

      {open === "receive" && <ReceiveDialog items={items} warehouses={warehouses} onClose={() => setOpen(null)} onDone={done} />}
      {open === "writeoff" && <WriteOffDialog items={items} warehouses={warehouses} onClose={() => setOpen(null)} onDone={done} />}
      {open === "count" && <CountDialog items={items} warehouses={warehouses} balances={balances} onClose={() => setOpen(null)} onDone={done} />}
    </MachinesShell>
  );
}
