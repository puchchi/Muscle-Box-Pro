"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAllOrders, fetchOrders } from "@/lib/adminMachineApi";
import type { OrderFilters } from "@shared/admin/machines";
import type { Order } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
  FilterRange,
  formatIstStamp,
  formatRupees,
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
import { PAY_METHOD_LABEL, STATUS_CLASS, STATUS_LABEL, UNKNOWN_HINT } from "./machines/orderLabels";
import { saveCsv } from "./machines/csv";
import { istToday, ORDERS_EXPORT_MAX, ordersCsv } from "./machines/statsRules";
import { WarningPanel } from "./machines/WarningPanel";

export default function AdminMachineOrders() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Orders session={guard.session} />;
}

type Draft = { orderId: string; machine: string; goodsName: string; payMethod: string; status: string; from: string; to: string };

const EMPTY: Draft = { orderId: "", machine: "", goodsName: "", payMethod: "", status: "", from: "", to: "" };

function toFilters(d: Draft): OrderFilters {
  return {
    orderId: d.orderId.trim() || undefined,
    machine: d.machine.trim() || undefined,
    goodsName: d.goodsName.trim() || undefined,
    payMethod: (d.payMethod || undefined) as OrderFilters["payMethod"],
    status: (d.status || undefined) as OrderFilters["status"],
    from: d.from || undefined,
    to: d.to || undefined,
  };
}

function Orders({ session }: { session: AdminSession }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [rows, setRows] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  async function exportCsv() {
    setExporting(true);
    setExportNote(null);
    const result = await fetchAllOrders(filters, ORDERS_EXPORT_MAX);
    setExporting(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    saveCsv(`mbp-orders-${istToday(Date.now())}.csv`, ordersCsv(result.data.items));
    if (!result.data.complete) {
      setExportNote(`The file has the newest ${ORDERS_EXPORT_MAX.toLocaleString("en-IN")} orders. Narrow the filters to export the rest.`);
    }
  }

  const page = useCallback(
    async (from: string | null) => {
      setLoading(true);
      const result = await fetchOrders(filters, from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows((r) => (from ? [...r, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
    },
    [filters],
  );

  useEffect(() => {
    void page(null);
  }, [page]);

  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <MachinesShell session={session} section="orders">
      <MachinesHeader
        title="Orders"
        subtitle="Every drink ordered on a machine, newest first. Times are IST."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportCsv()}
            disabled={exporting || (rows.length === 0 && !loading)}
            className="rounded-xl cursor-pointer"
            data-testid="button-export-orders"
          >
            <Download className="h-4 w-4" aria-hidden />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />
      <ProblemPanel problem={problem} testId="orders-error" />
      {exportNote && (
        <div className="mb-4">
          <WarningPanel testId="orders-export-note">{exportNote}</WarningPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => setFilters(toFilters(draft))}
        onReset={() => {
          setDraft(EMPTY);
          setFilters({});
        }}
      >
        <TextFilter label="Order Number" value={draft.orderId} onChange={set("orderId")} testId="filter-order" />
        <TextFilter label="Machine" value={draft.machine} onChange={set("machine")} testId="filter-machine" />
        <TextFilter label="Goods Name" value={draft.goodsName} onChange={set("goodsName")} testId="filter-goods" />
        <SelectFilter
          label="Payment Method"
          value={draft.payMethod}
          onChange={set("payMethod")}
          options={[{ value: "", label: "All" }, ...Object.entries(PAY_METHOD_LABEL).map(([value, label]) => ({ value, label }))]}
          testId="filter-pay"
        />
        <SelectFilter
          label="Order Status"
          value={draft.status}
          onChange={set("status")}
          options={[{ value: "", label: "All" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
          testId="filter-status"
        />
        <FilterRange>
          <TextFilter label="From" type="datetime-local" value={draft.from} onChange={set("from")} testId="filter-from" />
          <TextFilter label="To" type="datetime-local" value={draft.to} onChange={set("to")} testId="filter-to" />
        </FilterRange>
      </FilterBar>

      <DataTable testId="orders-table">
        <Head>
          <Col>Order Number</Col>
          <Col>Machine Number</Col>
          <Col>Machine Name</Col>
          <Col>Goods Name</Col>
          <Col align="right">Amount</Col>
          <Col>Payment Method</Col>
          <Col>Order Status</Col>
          <Col>Dispensed</Col>
          <Col>Failure reason</Col>
          <Col>Order Time</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={10} loading={loading} />
          ) : (
            rows.map((order) => (
              <tr key={order.orderId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-order-${order.orderId}`}>
                <Cell className="font-mono text-xs">
                  <Link href={`/machines/orders/${encodeURIComponent(order.orderId)}`} className="text-primary hover:underline">
                    {order.orderId}
                  </Link>
                </Cell>
                <Cell className="whitespace-nowrap">{order.deviceExtNo || "—"}</Cell>
                <Cell>{order.machineName || "—"}</Cell>
                <Cell>{order.goodsName}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(order.amountInr)}</Cell>
                <Cell className="whitespace-nowrap">
                  {PAY_METHOD_LABEL[order.payMethod]}
                  {order.redeemCode && <span className="block font-mono text-[11px] text-muted-foreground">{order.redeemCode}</span>}
                </Cell>
                <Cell>
                  <span
                    className={`font-semibold ${STATUS_CLASS[order.status]}`}
                    title={order.status === "unknown" ? UNKNOWN_HINT : undefined}
                    data-testid={`status-${order.orderId}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </Cell>
                <Cell>{order.dispensed ? "Yes" : "No"}</Cell>
                <Cell className="max-w-[14rem]">
                  <span className="block truncate text-xs text-muted-foreground" title={order.failReason ?? undefined}>
                    {order.failReason || "—"}
                  </span>
                </Cell>
                <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(order.createdAt)}</Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {cursor && <LoadMore onClick={() => page(cursor)} loading={loading} />}
    </MachinesShell>
  );
}
