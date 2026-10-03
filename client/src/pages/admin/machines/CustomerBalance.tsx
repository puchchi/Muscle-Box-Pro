"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatInr } from "@shared/shop/shopSchema";
import type { ShopLedgerEntry, ShopPayout, ShopTopUp } from "@shared/admin/shopAdminSchema";
import { Card, Empty, Field, Fields, Pill } from "../AdminUi";
import { Cell, Col, DataTable, formatIstStamp, Head, LoadMore } from "./MachinesUi";
import { shopOrderHref } from "./shopBits";

const NEUTRAL = "bg-secondary text-muted-foreground";
const GOOD = "bg-emerald-400/10 text-emerald-200";
const BUSY = "bg-amber-400/10 text-amber-200";
const BAD = "bg-rose-400/10 text-rose-300";

const LEDGER_LABEL: Record<ShopLedgerEntry["kind"], string> = {
  top_up: "Top-up",
  purchase: "Drink bought",
  drink_refund: "Drink refunded",
  support_refund: "Refunded to the customer",
  payout_reversed: "Refund refused, put back",
  other: "Other",
};

const TOP_UP_LABEL: Record<ShopTopUp["status"], { text: string; className: string }> = {
  created: { text: "Not paid", className: NEUTRAL },
  credited: { text: "Credited", className: GOOD },
  failed: { text: "Failed", className: BAD },
  other: { text: "Unknown", className: NEUTRAL },
};

const PAYOUT_LABEL: Record<ShopPayout["status"], { text: string; className: string }> = {
  owed: { text: "Queued", className: BUSY },
  refunding: { text: "Refunding", className: BUSY },
  refunded: { text: "Refunded", className: GOOD },
  failed: { text: "Refused, put back", className: BAD },
  unknown: { text: "Check in Razorpay", className: BAD },
  other: { text: "Unknown", className: NEUTRAL },
};

const signed = (paise: number) => `${paise < 0 ? "−" : "+"}${formatInr(Math.abs(paise))}`;

export function CustomerBalance({
  balancePaise,
  ledger,
  ledgerCursor,
  onMoreLedger,
  loadingLedger,
  topUps,
  payouts,
  onRefund,
  onResolve,
}: {
  balancePaise: number;
  ledger: ShopLedgerEntry[];
  ledgerCursor: string | null;
  onMoreLedger: () => void;
  loadingLedger: boolean;
  topUps: ShopTopUp[];
  payouts: ShopPayout[];
  onRefund: () => void;
  onResolve: (payout: ShopPayout) => void;
}) {
  const toppedUp = topUps.filter((t) => t.status === "credited").reduce((sum, t) => sum + t.amountPaise, 0);
  const credited = topUps.filter((t) => t.status === "credited").length;
  const paidBack = payouts.filter((p) => p.status === "refunded").reduce((sum, p) => sum + p.amountPaise, 0);
  return (
    <Card
      title="Balance"
      testId="card-customer-balance"
      action={
        balancePaise > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={onRefund} className="rounded-lg cursor-pointer" data-testid="button-refund-balance">
            Refund balance
          </Button>
        )
      }
    >
      <Fields>
        <Field label="Balance now" value={formatInr(balancePaise)} testId="customer-balance" />
        <Field label="Topped up" value={`${formatInr(toppedUp)} in ${credited} ${credited === 1 ? "top-up" : "top-ups"}`} />
        {paidBack > 0 && <Field label="Refunded to the customer" value={formatInr(paidBack)} />}
      </Fields>

      <Section title="History">
        {ledger.length === 0 ? (
          <Empty testId="customer-no-ledger">No money in or out yet.</Empty>
        ) : (
          <>
            <DataTable testId="customer-ledger">
              <Head>
                <Col>Time</Col>
                <Col>What</Col>
                <Col>For</Col>
                <Col align="right">Amount</Col>
                <Col align="right">Balance after</Col>
              </Head>
              <tbody className="divide-y divide-border/70">
                {ledger.map((e, i) => (
                  <tr key={`${e.createdAt}-${i}`}>
                    <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(e.createdAt)}</Cell>
                    <Cell>{LEDGER_LABEL[e.kind]}</Cell>
                    <Cell className="whitespace-nowrap font-mono text-xs">
                      {e.shopOrderId ? (
                        <Link href={shopOrderHref(e.shopOrderId)} className="text-primary hover:underline">
                          {e.shopOrderId}
                        </Link>
                      ) : (
                        (e.payoutId ?? e.topUpId ?? "")
                      )}
                    </Cell>
                    <Cell align="right" className={`whitespace-nowrap tabular-nums ${e.amountPaise < 0 ? "" : "text-emerald-300"}`}>
                      {signed(e.amountPaise)}
                    </Cell>
                    <Cell align="right" className="whitespace-nowrap tabular-nums">{formatInr(e.balanceAfterPaise)}</Cell>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {ledgerCursor && <LoadMore onClick={onMoreLedger} loading={loadingLedger} />}
          </>
        )}
      </Section>

      {topUps.length > 0 && (
        <Section title="Top-ups">
          <DataTable testId="customer-top-ups">
            <Head>
              <Col>Time</Col>
              <Col>Top-up</Col>
              <Col align="right">Amount</Col>
              <Col align="right">Refunded</Col>
              <Col>Status</Col>
              <Col>Refundable until</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {topUps.map((t) => (
                <tr key={t.topUpId}>
                  <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(t.createdAt)}</Cell>
                  <Cell className="whitespace-nowrap font-mono text-xs">
                    {t.topUpId}
                    {t.razorpayPaymentId && <span className="block text-muted-foreground">{t.razorpayPaymentId}</span>}
                  </Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">{formatInr(t.amountPaise)}</Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">{t.refundedPaise > 0 ? formatInr(t.refundedPaise) : ""}</Cell>
                  <Cell className="whitespace-nowrap">
                    <Pill className={TOP_UP_LABEL[t.status].className}>{TOP_UP_LABEL[t.status].text}</Pill>
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{t.status === "credited" ? formatIstStamp(t.refundableUntil) : ""}</Cell>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      )}

      {payouts.length > 0 && (
        <Section title="Refunds to the customer">
          <DataTable testId="customer-payouts">
            <Head>
              <Col>Time</Col>
              <Col align="right">Amount</Col>
              <Col>Status</Col>
              <Col>Asked by</Col>
              <Col>Reason</Col>
            </Head>
            <tbody className="divide-y divide-border/70">
              {payouts.map((p) => (
                <tr key={p.payoutId} data-testid={`payout-${p.payoutId}`}>
                  <Cell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatIstStamp(p.createdAt)}</Cell>
                  <Cell align="right" className="whitespace-nowrap tabular-nums">{formatInr(p.amountPaise)}</Cell>
                  <Cell className="whitespace-nowrap">
                    <Pill className={PAYOUT_LABEL[p.status].className}>{PAYOUT_LABEL[p.status].text}</Pill>
                    {p.error && <span className="mt-1 block text-xs text-muted-foreground">{p.error}</span>}
                    {p.status === "unknown" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onResolve(p)}
                        className="mt-2 block rounded-lg cursor-pointer"
                        data-testid={`button-resolve-${p.payoutId}`}
                      >
                        Record what Razorpay shows
                      </Button>
                    )}
                  </Cell>
                  <Cell className="text-xs">{p.requestedBy}</Cell>
                  <Cell className="text-xs">
                    {p.reason}
                    {p.resolveReason && <span className="mt-1 block text-muted-foreground">Resolved by {p.resolvedBy}: {p.resolveReason}</span>}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/70 px-4 py-4 sm:px-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
