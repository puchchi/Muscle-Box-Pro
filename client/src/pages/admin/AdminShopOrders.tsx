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
import { SHOP_STATUS_LABEL, withFreeCodes, type FreeCode } from "./machines/shopOrderRules";
import { CustomerCell, FREE_LABEL, ShopNotConfigured, shopOrderHref, ShopStatusPill, type CustomerLookup } from "./machines/shopBits";
import { useShopCustomers } from "./machines/useShopCustomers";
import { Pill } from "./AdminUi";
import { Button } from "@/components/ui/button";

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

  const customers = useShopCustomers([...rows.map((o) => o.customerId), filters.customerId]);
  const list = withFreeCodes(rows, customers, filters, cursor !== null, Date.now());

  const onlyCustomer = (customerId: string | null) => {
    const next = { ...draft, customerId: customerId ?? "" };
    setDraft(next);
    setFilters(toFilters(next));
  };
  const filtered = filters.customerId ? customers.get(filters.customerId) : undefined;

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

          {filters.customerId && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm" data-testid="shop-orders-customer">
              <span className="text-muted-foreground">Orders from</span>
              <CustomerCell customerId={filters.customerId} lookup={filtered} />
              <span className="text-muted-foreground">in every month, with their free codes.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => onlyCustomer(null)} className="ml-auto rounded-lg cursor-pointer" data-testid="button-all-customers">
                Show everyone
              </Button>
            </div>
          )}

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
              {list.length === 0 ? (
                <NoData colSpan={8} loading={loading} />
              ) : (
                list.map((row) => {
                  if (row.kind === "free") {
                    return (
                      <FreeRow
                        key={`free-${row.customerId}-${row.n}`}
                        free={row}
                        lookup={customers.get(row.customerId)}
                        onOnly={filters.customerId ? undefined : () => onlyCustomer(row.customerId)}
                      />
                    );
                  }
                  const order = row.order;
                  return (
                  <tr key={order.shopOrderId} className="group hover:bg-secondary/40 transition-colors" data-testid={`row-shop-order-${order.shopOrderId}`}>
                    <StampCell iso={order.createdAt} />
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
                      {order.code ?? <span className="font-sans text-muted-foreground">None yet</span>}
                      {order.reissues > 0 && <span className="block font-sans text-[11px] text-muted-foreground">Reissued</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap">
                      <CustomerCell
                        customerId={order.customerId}
                        lookup={order.customerId ? customers.get(order.customerId) : undefined}
                        onOnly={order.customerId && !filters.customerId ? () => onlyCustomer(order.customerId) : undefined}
                      />
                    </Cell>
                    <Cell className="whitespace-nowrap">
                      <ShopStatusPill status={order.status} testId={`shop-status-${order.shopOrderId}`} />
                    </Cell>
                  </tr>
                  );
                })
              )}
            </tbody>
          </DataTable>
          {cursor && <LoadMore onClick={() => page(cursor)} loading={loading} />}
        </>
      )}
    </MachinesShell>
  );
}

function FreeRow({ free, lookup, onOnly }: { free: FreeCode; lookup: CustomerLookup; onOnly?: () => void }) {
  return (
    <tr className="group bg-fuchsia-400/[0.03] hover:bg-secondary/40 transition-colors" data-testid={`row-free-code-${free.customerId}-${free.n}`}>
      <StampCell iso={free.at} />
      <Cell className="whitespace-nowrap">
        <span className="block text-foreground">Free drink {free.n}</span>
        <span className="block text-xs text-muted-foreground">From the stamp card</span>
      </Cell>
      <Cell className="whitespace-nowrap text-muted-foreground">Any machine</Cell>
      <Cell className="min-w-[10rem] text-muted-foreground">Any drink</Cell>
      <Cell align="right" className="whitespace-nowrap">Free</Cell>
      <Cell className="whitespace-nowrap font-mono text-xs">
        {free.code ? (
          <Link href={`/machines/redeem-codes/${encodeURIComponent(free.code)}`} className="text-foreground hover:text-primary hover:underline">
            {free.code}
          </Link>
        ) : (
          <span className="font-sans text-muted-foreground">Being made</span>
        )}
      </Cell>
      <Cell className="whitespace-nowrap">
        <CustomerCell customerId={free.customerId} lookup={lookup} onOnly={onOnly} />
      </Cell>
      <Cell className="whitespace-nowrap">
        <Pill className={FREE_LABEL.className} testId={`free-status-${free.customerId}-${free.n}`}>
          {FREE_LABEL.text}
        </Pill>
      </Cell>
    </tr>
  );
}

function StampCell({ iso }: { iso: string | null }) {
  const [date, time] = formatIstStamp(iso).split(" ");
  return (
    <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
      <span className="block">{date}</span>
      {time && <span className="block">{time}</span>}
    </Cell>
  );
}
