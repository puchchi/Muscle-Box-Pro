"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatInr, SHOP_ORDER_STATUSES } from "@shared/shop/shopSchema";
import type { ShopAdminOrder, ShopOrderFilters } from "@shared/admin/shopAdminSchema";
import type { AdminSession } from "@/lib/adminSession";
import { fetchShopOrders, shopAdminConfigured } from "@/lib/shopAdminApi";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import {
  Cell,
  Col,
  DataTable,
  FilterBar,
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
import { istToday } from "./machines/statsRules";
import { SHOP_STATUS_LABEL } from "./machines/shopOrderRules";
import { CustomerCell, ShopNotConfigured, shopOrderHref, ShopStatusPill } from "./machines/shopBits";

export default function AdminShopOrders() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <ShopOrders session={guard.session} />;
}

type Draft = { month: string; status: string; sn: string; customerId: string };

function toFilters(d: Draft): ShopOrderFilters {
  return {
    month: d.month || undefined,
    status: (d.status || undefined) as ShopOrderFilters["status"],
    sn: d.sn.trim() || undefined,
    customerId: d.customerId.trim() || undefined,
  };
}

const STATUS_OPTIONS = [{ value: "", label: "All" }, ...SHOP_ORDER_STATUSES.map((value) => ({ value, label: SHOP_STATUS_LABEL[value].text }))];

function ShopOrders({ session }: { session: AdminSession }) {
  const search = useSearchParams();
  const thisMonth = istToday(Date.now()).slice(0, 7);
  const empty: Draft = { month: thisMonth, status: "", sn: "", customerId: "" };
  const [draft, setDraft] = useState<Draft>(() => ({
    ...empty,
    sn: search?.get("sn") ?? "",
    customerId: search?.get("customerId") ?? "",
  }));
  const [filters, setFilters] = useState<ShopOrderFilters>(() => toFilters(draft));
  const [rows, setRows] = useState<ShopAdminOrder[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const configured = shopAdminConfigured();

  const page = useCallback(
    async (from: string | null) => {
      if (!configured) return;
      setLoading(true);
      const result = await fetchShopOrders(filters, from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows((r) => (from ? [...r, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
    },
    [filters, configured],
  );

  useEffect(() => {
    void page(null);
  }, [page]);

  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <MachinesShell session={session} section="shopOrders">
      <MachinesHeader title="Shop orders" subtitle="Drinks bought on the website, newest first. Times are IST." />
      {!configured ? (
        <ShopNotConfigured />
      ) : (
        <>
          <ProblemPanel problem={problem} testId="shop-orders-error" />
          <FilterBar
            onSearch={() => setFilters(toFilters(draft))}
            onReset={() => {
              setDraft(empty);
              setFilters(toFilters(empty));
            }}
          >
            <TextFilter label="Month" type="month" value={draft.month} onChange={set("month")} testId="filter-shop-month" />
            <SelectFilter label="Status" value={draft.status} onChange={set("status")} options={STATUS_OPTIONS} testId="filter-shop-status" />
            <TextFilter label="Machine ID" value={draft.sn} onChange={set("sn")} testId="filter-shop-sn" />
            <TextFilter label="Customer ID" value={draft.customerId} onChange={set("customerId")} testId="filter-shop-customer" />
          </FilterBar>

          <DataTable testId="shop-orders-table">
            <Head>
              <Col>Time</Col>
              <Col>Order</Col>
              <Col>Machine</Col>
              <Col>Drink</Col>
              <Col align="right">Paid</Col>
              <Col>Code</Col>
              <Col>Customer</Col>
              <Col>Status</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {rows.length === 0 ? (
                <NoData colSpan={8} loading={loading} />
              ) : (
                rows.map((order) => (
                  <tr key={order.shopOrderId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-shop-order-${order.shopOrderId}`}>
                    <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(order.createdAt)}</Cell>
                    <Cell className="whitespace-nowrap font-mono text-xs">
                      <Link href={shopOrderHref(order.shopOrderId)} className="text-primary hover:underline">
                        {order.shopOrderId}
                      </Link>
                    </Cell>
                    <Cell className="whitespace-nowrap">
                      <span className="block font-semibold text-foreground">{order.machineName || order.sn}</span>
                      {order.machineName && <span className="block font-mono text-xs text-muted-foreground">{order.sn}</span>}
                    </Cell>
                    <Cell className="min-w-[10rem]">{order.drinkName || <span className="font-mono text-xs text-muted-foreground">{order.goodsId}</span>}</Cell>
                    <Cell align="right" className="whitespace-nowrap tabular-nums">{formatInr(order.pricePaise)}</Cell>
                    <Cell className="whitespace-nowrap font-mono text-xs">
                      {order.code ?? <span className="text-muted-foreground">—</span>}
                      {order.reissues > 0 && <span className="block font-sans text-[11px] text-muted-foreground">Reissued</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap">
                      <CustomerCell customerId={order.customerId} />
                    </Cell>
                    <Cell className="whitespace-nowrap">
                      <ShopStatusPill status={order.status} testId={`shop-status-${order.shopOrderId}`} />
                    </Cell>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
          {cursor && <LoadMore onClick={() => page(cursor)} loading={loading} />}
        </>
      )}
    </MachinesShell>
  );
}
