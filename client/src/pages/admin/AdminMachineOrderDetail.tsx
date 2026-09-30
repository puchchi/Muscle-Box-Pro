"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMachine, fetchMaterials, fetchOrder } from "@/lib/adminMachineApi";
import type { OrderDetail } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Empty, Field, Fields, Pill } from "./AdminUi";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  formatRupees,
  Head,
  MachinesHeader,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";
import {
  PAY_METHOD_LABEL,
  REFUND_LABEL,
  REFUND_PILL_CLASS,
  STATUS_CLASS,
  STATUS_LABEL,
  UNKNOWN_HINT,
} from "./machines/orderLabels";

const STEP_LABEL: Record<string, string> = { created: "Created", made: "Made", dispensed: "Dispensed", failed: "Failed" };

export default function AdminMachineOrderDetail({ orderId }: { orderId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <OrderPage session={guard.session} orderId={orderId} />;
}

function OrderPage({ session, orderId }: { session: AdminSession; orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    fetchOrder(orderId).then(async (result) => {
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setOrder(result.data.order);
      const machine = await fetchMachine(result.data.order.sn);
      if (!machine.ok) return;
      const materials = await fetchMaterials(machine.data.machine.modelId);
      if (materials.ok) setNames(new Map(materials.data.items.map((m) => [m.materialId, m.name])));
    });
  }, [orderId]);

  return (
    <MachinesShell session={session} section="orders">
      <MachinesHeader
        title="Order"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/orders" className="text-primary hover:underline">
              Orders
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-xs">{orderId}</span>
          </span>
        }
      />
      <ProblemPanel problem={problem} testId="order-error" />
      {order && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Order" testId="card-order">
            <Fields>
              <Field label="Order number" value={order.orderId} mono />
              <Field label="Machine number" value={order.deviceExtNo} />
              <Field label="Machine name" value={order.machineName} />
              <Field label="Machine ID" value={order.sn} mono />
              <Field label="Goods name" value={order.goodsName} />
              <Field label="Amount" value={formatRupees(order.amountInr)} />
              <Field label="Payment method" value={PAY_METHOD_LABEL[order.payMethod]} />
              {order.redeemCode && <Field label="Redeem code" value={order.redeemCode} mono />}
              <div className="grid items-baseline gap-x-4 px-4 sm:px-5 py-2 sm:grid-cols-[14rem_minmax(0,1fr)]">
                <dt className="text-sm text-muted-foreground">Order status</dt>
                <dd className={`text-sm font-semibold ${STATUS_CLASS[order.status]}`} data-testid="order-status">
                  {STATUS_LABEL[order.status]}
                  {order.status === "unknown" && <span className="block text-xs font-normal">{UNKNOWN_HINT}</span>}
                </dd>
              </div>
              <Field label="Dispensed" value={order.dispensed ? "Yes" : "No"} />
              <Field label="Failure reason" value={order.failReason} />
              <Field label="Order time" value={formatIstStamp(order.createdAt)} />
            </Fields>
          </Card>

          <div className="space-y-5">
            {order.payMethod === "qr" && <PaymentCard order={order} />}

            <Card title="Timeline" testId="card-timeline">
              <ol className="divide-y divide-border/70">
                {order.timeline.map((step) => (
                  <li key={step.state} className="flex justify-between gap-4 px-4 py-2 text-sm sm:px-5">
                    <span className={step.state === "failed" ? "text-rose-300" : "text-foreground"}>{STEP_LABEL[step.state] ?? step.state}</span>
                    <span className="tabular-nums text-muted-foreground">{formatIstStamp(step.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card title="Materials used" note="As the machine reported them, in board units." testId="card-materials">
              {order.materials.length === 0 ? (
                <Empty testId="materials-empty">The machine hasn't reported what it used.</Empty>
              ) : (
                <DataTable testId="order-materials">
                  <Head>
                    <Col>Material</Col>
                    <Col align="right">Amount</Col>
                    <Col align="right">Time</Col>
                    <Col align="right">Strength offset</Col>
                  </Head>
                  <tbody className="divide-y divide-border/70">
                    {order.materials.map((m, i) => (
                      <tr key={`${m.materialId}-${i}`}>
                        <Cell>{names.get(m.materialId) ?? m.materialId}</Cell>
                        <Cell align="right" className="tabular-nums">{m.amount ?? "—"}</Cell>
                        <Cell align="right" className="tabular-nums">{m.time ?? "—"}</Cell>
                        <Cell align="right" className="tabular-nums">{m.strengthOffset ?? "—"}</Cell>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>
          </div>
        </div>
      )}
    </MachinesShell>
  );
}

function PaymentCard({ order }: { order: OrderDetail }) {
  const payment = order.payment;
  return (
    <Card title="Payment" testId="card-payment">
      <Fields>
        <div className="grid items-baseline gap-x-4 px-4 sm:px-5 py-2 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <dt className="text-sm text-muted-foreground">Refund</dt>
          <dd className="text-sm" data-testid="payment-refund">
            <RefundState order={order} />
          </dd>
        </div>
        {payment?.refundReason && <Field label="Refund reason" value={payment.refundReason} />}
        <Field label="Paid at" value={payment ? formatIstStamp(payment.paidAt) : null} />
        <Field label="Payment reference" value={order.payNo} mono />
        <Field label="Razorpay reference" value={order.thirdOrderNo} mono />
      </Fields>
    </Card>
  );
}

function RefundState({ order }: { order: OrderDetail }) {
  const refund = order.payment?.refund ?? null;
  if (refund) return <Pill className={REFUND_PILL_CLASS[refund]}>{REFUND_LABEL[refund]}</Pill>;
  if (!order.payment) return <span className="text-muted-foreground">Not available yet</span>;
  if (order.status === "failed" || (order.status === "made" && !order.dispensed)) {
    return <span className="text-amber-200">No refund started</span>;
  }
  return <span className="text-muted-foreground">None needed</span>;
}
