"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatInr } from "@shared/shop/shopSchema";
import type { ShopCustomerDetail } from "@shared/admin/shopAdminSchema";
import type { AdminSession } from "@/lib/adminSession";
import { fetchShopCustomer, shopAdminConfigured } from "@/lib/shopAdminApi";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Empty, Field, Fields } from "./AdminUi";
import { Cell, Col, DataTable, formatIstStamp, Head, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { GymLink, FranchiseLink } from "./machines/ownerBits";
import { CustomerBalance } from "./machines/CustomerBalance";
import { ShopNotConfigured, shopOrderHref, ShopStatusPill } from "./machines/shopBits";

export default function AdminShopCustomerDetail({ customerId }: { customerId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <CustomerPage session={guard.session} customerId={customerId} />;
}

const STAMPS_PER_REWARD = 9;

function CustomerPage({ session, customerId }: { session: AdminSession; customerId: string }) {
  const configured = shopAdminConfigured();
  const [detail, setDetail] = useState<ShopCustomerDetail | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const moreLedger = async () => {
    if (!detail?.ledgerCursor) return;
    setLoadingLedger(true);
    const result = await fetchShopCustomer(customerId, detail.ledgerCursor);
    setLoadingLedger(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setDetail((d) => d && { ...d, ledger: [...d.ledger, ...result.data.ledger], ledgerCursor: result.data.ledgerCursor });
  };

  useEffect(() => {
    if (!configured) return;
    void fetchShopCustomer(customerId).then((result) => {
      if (result.ok) setDetail(result.data);
      else setProblem(problemOf(result));
    });
  }, [customerId, configured]);

  const c = detail?.customer;

  return (
    <MachinesShell session={session} section="customers">
      <MachinesHeader
        title="Customer"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/customers" className="text-primary hover:underline">
              Customers
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-xs">{customerId}</span>
          </span>
        }
      />
      {!configured && <ShopNotConfigured />}
      <ProblemPanel problem={problem} testId="customer-error" />
      {detail && c && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Profile" testId="card-customer">
            <Fields>
              <Field label="Customer ID" value={c.customerId} mono />
              <Field label="Email" value={c.deletedAt ? "Deleted with the account" : c.email} testId="customer-email" />
              <Field label="Name" value={c.name} />
              <Field label="Joined" value={formatIstStamp(c.createdAt)} />
              {c.deletedAt && <Field label="Account deleted" value={formatIstStamp(c.deletedAt)} />}
              <div className="grid items-baseline gap-x-4 px-4 py-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:px-5">
                <dt className="text-sm text-muted-foreground">Joined at</dt>
                <dd className="text-sm text-foreground">
                  {c.joinedSn ? (
                    <Link href={`/machines/${encodeURIComponent(c.joinedSn)}`} className="font-mono text-primary hover:underline">
                      {c.joinedSn}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {c.joinedGymId && (
                    <span className="block text-xs">
                      Gym <GymLink gymId={c.joinedGymId} name={null} />
                    </span>
                  )}
                  {c.joinedFranchiseId && (
                    <span className="block text-xs">
                      Franchise <FranchiseLink franchiseId={c.joinedFranchiseId} name={null} />
                    </span>
                  )}
                </dd>
              </div>
            </Fields>
          </Card>

          <Card title="Stamp card" testId="card-customer-stamps">
            <Fields>
              <Field label="Stamps" value={`${c.stamps} of ${STAMPS_PER_REWARD}`} testId="customer-stamps" />
              {c.stamps < 0 && <Field label="Note" value="Below zero because a refunded drink's stamp had already become a free drink." />}
              <Field label="Drinks bought" value={String(c.lifetimeDrinks)} />
              <Field label="Free drinks earned" value={String(c.rewardsIssued)} />
            </Fields>
            {detail.rewards.length > 0 && (
              <ul className="divide-y divide-border/70 border-t border-border/70">
                {detail.rewards.map((r) => (
                  <li key={r.n} className="flex justify-between gap-4 px-4 py-2 text-sm sm:px-5">
                    {r.status === "coded" && r.code ? (
                      <Link href={`/machines/redeem-codes/${encodeURIComponent(r.code)}`} className="font-mono text-primary hover:underline">
                        {r.code}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Free drink {r.n}, code being made</span>
                    )}
                    <span className="text-muted-foreground">{formatIstStamp(r.codedAt ?? r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-2">
            <Card
              title="Orders"
              testId="card-customer-orders"
              action={
                <Link href={`/machines/shop-orders?customerId=${encodeURIComponent(c.customerId)}`} className="text-sm text-primary hover:underline">
                  Search all orders
                </Link>
              }
            >
              {detail.orders.length === 0 ? (
                <Empty testId="customer-no-orders">No orders yet.</Empty>
              ) : (
                <DataTable testId="customer-orders">
                  <Head>
                    <Col>Time</Col>
                    <Col>Order</Col>
                    <Col>Drink</Col>
                    <Col align="right">Paid</Col>
                    <Col>Status</Col>
                  </Head>
                  <tbody className="divide-y divide-border/70">
                    {detail.orders.map((o) => (
                      <tr key={o.shopOrderId}>
                        <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(o.createdAt)}</Cell>
                        <Cell className="whitespace-nowrap font-mono text-xs">
                          <Link href={shopOrderHref(o.shopOrderId)} className="text-primary hover:underline">
                            {o.shopOrderId}
                          </Link>
                        </Cell>
                        <Cell>{o.drinkName || o.goodsId}</Cell>
                        <Cell align="right" className="whitespace-nowrap tabular-nums">{formatInr(o.pricePaise)}</Cell>
                        <Cell className="whitespace-nowrap">
                          <ShopStatusPill status={o.status} />
                        </Cell>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            <CustomerBalance
              balancePaise={c.balancePaise}
              ledger={detail.ledger}
              ledgerCursor={detail.ledgerCursor}
              onMoreLedger={() => void moreLedger()}
              loadingLedger={loadingLedger}
              topUps={detail.topUps}
              payouts={detail.payouts}
            />
          </div>
        </div>
      )}
    </MachinesShell>
  );
}
