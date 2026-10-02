"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ShopCustomerRow } from "@shared/admin/shopAdminSchema";
import type { AdminSession } from "@/lib/adminSession";
import { fetchShopCustomers, shopAdminConfigured } from "@/lib/shopAdminApi";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Pill } from "./AdminUi";
import { Cell, Col, DataTable, formatIstStamp, Head, LoadMore, MachinesHeader, NoData, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { customerHref, ShopNotConfigured } from "./machines/shopBits";

export default function AdminShopCustomers() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Customers session={guard.session} />;
}

function Customers({ session }: { session: AdminSession }) {
  const configured = shopAdminConfigured();
  const [rows, setRows] = useState<ShopCustomerRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  const page = useCallback(
    async (from: string | null) => {
      if (!configured) return;
      setLoading(true);
      const result = await fetchShopCustomers(from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setRows((r) => (from ? [...r, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
    },
    [configured],
  );

  useEffect(() => {
    void page(null);
  }, [page]);

  return (
    <MachinesShell session={session} section="customers">
      <MachinesHeader title="Customers" subtitle="People with a website account, newest first. Open one to see their email." />
      {!configured ? (
        <ShopNotConfigured />
      ) : (
        <>
          <ProblemPanel problem={problem} testId="customers-error" />
          <DataTable testId="customers-table">
            <Head>
              <Col>Customer</Col>
              <Col>Name</Col>
              <Col>Joined at machine</Col>
              <Col align="right">Stamps</Col>
              <Col align="right">Drinks</Col>
              <Col align="right">Free drinks</Col>
              <Col>Joined</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {rows.length === 0 ? (
                <NoData colSpan={7} loading={loading} />
              ) : (
                rows.map((c) => (
                  <tr key={c.customerId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-customer-${c.customerId}`}>
                    <Cell className="whitespace-nowrap font-mono text-xs">
                      <Link href={customerHref(c.customerId)} className="text-primary hover:underline">
                        {c.customerId}
                      </Link>
                      {c.deletedAt && (
                        <span className="ml-2">
                          <Pill testId={`deleted-${c.customerId}`}>Deleted</Pill>
                        </span>
                      )}
                    </Cell>
                    <Cell>{c.name ?? <span className="text-muted-foreground">—</span>}</Cell>
                    <Cell className="whitespace-nowrap font-mono text-xs">{c.joinedSn ?? <span className="font-sans text-muted-foreground">—</span>}</Cell>
                    <Cell align="right" className="tabular-nums">{c.stamps}</Cell>
                    <Cell align="right" className="tabular-nums">{c.lifetimeDrinks}</Cell>
                    <Cell align="right" className="tabular-nums">{c.rewardsIssued}</Cell>
                    <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(c.createdAt)}</Cell>
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
