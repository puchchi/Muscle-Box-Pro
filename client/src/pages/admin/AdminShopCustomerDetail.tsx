"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatInr } from "@shared/shop/shopSchema";
import type { ShopBalanceRefund, ShopCustomerDetail, ShopPayout } from "@shared/admin/shopAdminSchema";
import type { AdminSession } from "@/lib/adminSession";
import { fetchShopCustomer, refundCustomerBalance, resolveShopPayout, shopAdminConfigured, type PayoutOutcome } from "@/lib/shopAdminApi";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Empty, Field, Fields, SuccessPanel } from "./AdminUi";
import { Cell, Col, DataTable, formatIstStamp, Head, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { GymLink, FranchiseLink } from "./machines/ownerBits";
import { CustomerBalance } from "./machines/CustomerBalance";
import { ReasonDialog } from "./machines/ReasonDialog";
import { WarningPanel } from "./machines/WarningPanel";
import { ShopNotConfigured, shopOrderHref, ShopStatusPill } from "./machines/shopBits";

export default function AdminShopCustomerDetail({ customerId }: { customerId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <CustomerPage session={guard.session} customerId={customerId} />;
}

const STAMPS_PER_REWARD = 9;

type Notice = { tone: "done" | "warn"; text: string };

export function balanceRefundNotice(r: ShopBalanceRefund): Notice {
  const sent = r.refundedPaise > 0 ? `${formatInr(r.refundedPaise)} is queued to go back to the UPI or card it came from. Razorpay pays it within a few minutes.` : "Nothing could be refunded to a payment.";
  const left =
    r.remainderPaise === 0
      ? ""
      : r.remainderReason === "payout_cap"
        ? ` ${formatInr(r.remainderPaise)} is still on the balance because there were too many top-ups for one go. Press Refund balance again.`
        : ` ${formatInr(r.remainderPaise)} stays on the balance. It is past the 175-day refund window, or came from a refunded drink rather than a top-up, so it has to be returned another way.`;
  return { tone: r.refundedPaise > 0 ? "done" : "warn", text: sent + left };
}

function CustomerPage({ session, customerId }: { session: AdminSession; customerId: string }) {
  const configured = shopAdminConfigured();
  const [detail, setDetail] = useState<ShopCustomerDetail | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [dialog, setDialog] = useState<{ kind: "refund" } | { kind: "resolve"; payout: ShopPayout } | null>(null);
  const [outcome, setOutcome] = useState<PayoutOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const reload = async () => {
    const fresh = await fetchShopCustomer(customerId);
    if (fresh.ok) setDetail(fresh.data);
    else setProblem(problemOf(fresh));
  };

  const refund = async (reason: string) => {
    setBusy(true);
    const result = await refundCustomerBalance(customerId, reason);
    setBusy(false);
    setDialog(null);
    if (!result.ok) {
      setNotice(null);
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(balanceRefundNotice(result.data));
    await reload();
  };

  const resolve = async (payout: ShopPayout, chosen: PayoutOutcome, reason: string) => {
    setBusy(true);
    const result = await resolveShopPayout(payout.payoutId, chosen, reason);
    setBusy(false);
    setDialog(null);
    if (!result.ok) {
      setNotice(null);
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice({
      tone: "done",
      text: chosen === "refunded" ? `Recorded: ${formatInr(payout.amountPaise)} went back to the customer.` : `Recorded: not refunded. ${formatInr(payout.amountPaise)} is back on the balance.`,
    });
    await reload();
  };

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
      {notice && (
        <div className="mb-4">
          {notice.tone === "done" ? <SuccessPanel testId="customer-done">{notice.text}</SuccessPanel> : <WarningPanel testId="customer-warn">{notice.text}</WarningPanel>}
        </div>
      )}
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
              onRefund={() => setDialog({ kind: "refund" })}
              onResolve={(payout) => {
                setOutcome(null);
                setDialog({ kind: "resolve", payout });
              }}
            />
          </div>
        </div>
      )}

      {detail && c && (
        <ReasonDialog
          open={dialog?.kind === "refund"}
          title="Refund the balance?"
          description={`This takes ${formatInr(c.balancePaise)} off the balance and sends it back to the UPI or card it was topped up from, newest top-up first. Money past a top-up's refundable-until date, or from a refunded drink, stays on the balance. It can't be undone.`}
          confirmLabel="Refund balance"
          destructive
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => void refund(reason)}
          placeholder="For example: the customer asked for their money back"
          testId="dialog-refund-balance"
        />
      )}
      {dialog?.kind === "resolve" && (
        <ReasonDialog
          open
          title="What does Razorpay show?"
          description={`Razorpay didn't say whether this ${formatInr(dialog.payout.amountPaise)} refund went through. Find payment ${dialog.payout.paymentId ?? ""} in the Razorpay dashboard, then record what it shows.`}
          confirmLabel="Record"
          busy={busy}
          ready={outcome !== null}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => outcome && void resolve(dialog.payout, outcome, reason)}
          placeholder="For example: Razorpay shows the refund as processed"
          testId="dialog-resolve-payout"
        >
          <fieldset className="mb-4 space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-foreground">Razorpay shows</legend>
            {(
              [
                ["refunded", "Refunded. The money went back to the customer."],
                ["not_refunded", "Not refunded. Put it back on the balance."],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                <input type="radio" name="payout-outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} className="mt-1" data-testid={`resolve-${value}`} />
                {label}
              </label>
            ))}
          </fieldset>
        </ReasonDialog>
      )}
    </MachinesShell>
  );
}
