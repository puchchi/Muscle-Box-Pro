"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatInr, type ShopDrink } from "@shared/shop/shopSchema";
import type { ShopAdminOrder } from "@shared/admin/shopAdminSchema";
import type { MachineRow } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { fetchAllMachines } from "@/lib/adminMachineApi";
import { fetchShopMenu } from "@/lib/shopApi";
import { fetchShopOrder, refundShopOrder, reissueShopOrder, retryShopRefund, shopAdminConfigured, type ReissueRequest } from "@/lib/shopAdminApi";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Empty, Field, Fields, SuccessPanel } from "./AdminUi";
import { ConfirmDialog, formatIstStamp, MachineDialog, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { WarningPanel } from "./machines/WarningPanel";
import { canRefund, canReissue, canRetryRefund, reissueDrinks } from "./machines/shopOrderRules";
import { CustomerCell, ShopNotConfigured, ShopStatusPill } from "./machines/shopBits";

export default function AdminShopOrderDetail({ orderId }: { orderId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <ShopOrderPage session={guard.session} orderId={orderId} />;
}

type Dialog = "refund" | "retry" | "reissue" | "finish" | null;

function ShopOrderPage({ session, orderId }: { session: AdminSession; orderId: string }) {
  const configured = shopAdminConfigured();
  const [order, setOrder] = useState<ShopAdminOrder | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    void fetchShopOrder(orderId).then((result) => {
      if (result.ok) setOrder(result.data.order);
      else setProblem(problemOf(result));
    });
  }, [orderId, configured]);

  async function act(run: () => ReturnType<typeof retryShopRefund>, message: string) {
    setBusy(true);
    const result = await run();
    setBusy(false);
    setDialog(null);
    if (!result.ok) {
      setDone(null);
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    const fresh = await fetchShopOrder(orderId);
    setOrder(fresh.ok ? fresh.data.order : result.data.order);
    setDone(message);
  }

  return (
    <MachinesShell session={session} section="shopOrders">
      <MachinesHeader
        title="Shop order"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/shop-orders" className="text-primary hover:underline">
              Shop orders
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-xs">{orderId}</span>
          </span>
        }
      />
      {!configured && <ShopNotConfigured />}
      <ProblemPanel problem={problem} testId="shop-order-error" />
      {done && (
        <div className="mb-4">
          <SuccessPanel testId="shop-order-done">{done}</SuccessPanel>
        </div>
      )}
      {order && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <OrderCard order={order} />
          <div className="space-y-5">
            <ActionsCard order={order} onOpen={setDialog} />
            <RefundCard order={order} />
            <EarlierCodesCard order={order} />
          </div>
        </div>
      )}

      {order && (
        <>
          <ReasonDialog
            open={dialog === "refund"}
            title="Refund this order?"
            description={`This turns the code ${order.code ?? ""} off and refunds ${formatInr(order.pricePaise)} to the customer. The refund is paid within a few minutes. It can't be undone.`}
            confirmLabel="Refund"
            destructive
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={(reason) => void act(() => refundShopOrder(order.shopOrderId, reason), "The code is off and the refund is queued. It is paid within a few minutes.")}
            testId="dialog-shop-refund"
          />
          <ConfirmDialog
            open={dialog === "retry"}
            title="Try the refund again?"
            message={`This puts the refund of ${formatInr(order.pricePaise)} back in the queue. It is paid within a few minutes.`}
            confirmLabel="Try again"
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={() => void act(() => retryShopRefund(order.shopOrderId), "The refund is back in the queue.")}
            testId="dialog-retry-refund"
          />
          {order.pendingReissue && (
            <ReasonDialog
              open={dialog === "finish"}
              title="Finish the reissue?"
              description={`A reissue for ${order.pendingReissue.drinkName || order.pendingReissue.goodsId} at ${order.pendingReissue.machineName || order.pendingReissue.sn} didn't finish. This makes the new code.`}
              confirmLabel="Finish reissue"
              busy={busy}
              onClose={() => setDialog(null)}
              onConfirm={(reason) => {
                const target = order.pendingReissue!;
                void act(() => reissueShopOrder(order.shopOrderId, { sn: target.sn, goodsId: target.goodsId, reason }), "The new code is made and the old one is off.");
              }}
              testId="dialog-finish-reissue"
            />
          )}
          <ReissueDialog
            open={dialog === "reissue"}
            order={order}
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={(target) => void act(() => reissueShopOrder(order.shopOrderId, target), "The new code is made and the old one is off.")}
          />
        </>
      )}
    </MachinesShell>
  );
}

function Row({ label, testId, children }: { label: string; testId?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-baseline gap-x-4 px-4 py-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:px-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}

const usedText = (used: boolean | null) => (used === null ? "Not known" : used ? "Yes" : "No");

function OrderCard({ order }: { order: ShopAdminOrder }) {
  return (
    <Card title="Order" testId="card-shop-order">
      <Fields>
        <Field label="Order ID" value={order.shopOrderId} mono />
        <Row label="Status">
          <ShopStatusPill status={order.status} testId="shop-order-status" />
        </Row>
        <Row label="Machine">
          <Link href={`/machines/${encodeURIComponent(order.sn)}`} className="text-primary hover:underline">
            {order.machineName || order.sn}
          </Link>
          {order.machineName && <span className="block font-mono text-xs text-muted-foreground">{order.sn}</span>}
        </Row>
        <Field label="Drink" value={order.drinkName || order.goodsId} />
        <Field label="Paid" value={formatInr(order.pricePaise)} />
        <Row label="Code" testId="shop-order-code">
          {order.code ? (
            <Link href={`/machines/redeem-codes/${encodeURIComponent(order.code)}`} className="font-mono text-primary hover:underline">
              {order.code}
            </Link>
          ) : (
            <span className="text-muted-foreground">None yet</span>
          )}
        </Row>
        {order.code && <Field label="Code used" value={usedText(order.codeUsed)} testId="shop-order-used" />}
        <Row label="Customer">
          <CustomerCell customerId={order.customerId} />
        </Row>
        {order.guestEmail && <Field label="Guest email" value={order.guestEmail} testId="shop-order-guest-email" />}
        <Field label="Razorpay payment" value={order.razorpayPaymentId} mono />
        <Field label="Ordered" value={formatIstStamp(order.createdAt)} />
        <Field label="Paid at" value={formatIstStamp(order.paidAt)} />
        <Field label="Code made" value={formatIstStamp(order.codedAt)} />
        {order.failedAt && <Field label="Failed" value={formatIstStamp(order.failedAt)} />}
      </Fields>
    </Card>
  );
}

function ActionsCard({ order, onOpen }: { order: ShopAdminOrder; onOpen: (d: Dialog) => void }) {
  const refundable = canRefund(order);
  const reissuable = canReissue(order);
  const retryable = canRetryRefund(order);
  return (
    <Card title="Actions" testId="card-shop-actions">
      {order.pendingReissue && (
        <div className="px-4 pt-4 sm:px-5">
          <WarningPanel testId="shop-pending-reissue">
            A reissue started and didn&apos;t finish. Finish it before anything else. A refund can&apos;t be made until it is done.
          </WarningPanel>
        </div>
      )}
      {!refundable && !reissuable && !retryable ? (
        <Empty testId="shop-no-actions">{noActionReason(order)}</Empty>
      ) : (
        <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
          {refundable && (
            <Button type="button" variant="destructive" className="rounded-xl cursor-pointer" onClick={() => onOpen("refund")} data-testid="button-shop-refund">
              Refund
            </Button>
          )}
          {reissuable &&
            (order.pendingReissue ? (
              <Button type="button" className="rounded-xl cursor-pointer" onClick={() => onOpen("finish")} data-testid="button-shop-finish-reissue">
                Finish reissue
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-xl cursor-pointer" onClick={() => onOpen("reissue")} data-testid="button-shop-reissue">
                Reissue for another drink
              </Button>
            ))}
          {retryable && (
            <Button type="button" className="rounded-xl cursor-pointer" onClick={() => onOpen("retry")} data-testid="button-shop-retry-refund">
              Try the refund again
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function noActionReason(order: ShopAdminOrder): string {
  if (order.status === "coded" && order.codeUsed === true) return "The code has been used, so this order can't be refunded or reissued.";
  if (order.status === "refund_owed" || order.status === "refunding") return "The refund is on its way. Nothing to do.";
  if (order.status === "refunded") return "This order has been refunded.";
  if (order.status === "created") return "The customer hasn't paid.";
  if (order.status === "paid") return "Paid, and the code is being made. Check again in a minute.";
  return "Nothing can be done on this order.";
}

function RefundCard({ order }: { order: ShopAdminOrder }) {
  if (!order.refundRequestedAt && !order.refundId && order.refundRetries === 0) return null;
  return (
    <Card title="Refund" testId="card-shop-refund">
      <Fields>
        <Field label="Asked for by" value={order.refundRequestedBy} />
        <Field label="Asked for at" value={formatIstStamp(order.refundRequestedAt)} />
        <Field label="Reason" value={order.refundReason} />
        {order.refundRetries > 0 && <Field label="Tried again" value={`${order.refundRetries} time${order.refundRetries === 1 ? "" : "s"}`} />}
        <Field label="Razorpay refund" value={order.refundId} mono />
      </Fields>
    </Card>
  );
}

function EarlierCodesCard({ order }: { order: ShopAdminOrder }) {
  if (order.previousCodes.length === 0) return null;
  return (
    <Card title="Earlier codes" note="Turned off when the order was reissued." testId="card-shop-earlier-codes">
      <ol className="divide-y divide-border/70">
        {order.previousCodes.map((c) => (
          <li key={c.code} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm sm:px-5">
            <span className="font-mono text-muted-foreground line-through">{c.code}</span>
            <span className="text-xs text-muted-foreground">
              {formatIstStamp(c.replacedAt)}
              {c.by && `, by ${c.by}`}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const REASON_MAX = 200;

function ReasonField({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      Reason
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={REASON_MAX}
        rows={3}
        placeholder="For example: the machine didn't pour the drink"
        className="rounded-xl"
        data-testid={testId}
      />
    </label>
  );
}

function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy,
  onClose,
  onConfirm,
  testId,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  testId: string;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      testId={testId}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm(trimmed)}
            disabled={busy || trimmed.length === 0}
            className="rounded-xl cursor-pointer"
            data-testid={`${testId}-confirm`}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <ReasonField value={reason} onChange={setReason} testId={`${testId}-reason`} />
    </MachineDialog>
  );
}

type MenuState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; drinks: ShopDrink[] };

function ReissueDialog({
  open,
  order,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  order: ShopAdminOrder;
  busy: boolean;
  onClose: () => void;
  onConfirm: (target: ReissueRequest) => void;
}) {
  const [machines, setMachines] = useState<MachineRow[] | null>(null);
  const [sn, setSn] = useState(order.sn);
  const [menu, setMenu] = useState<MenuState>({ kind: "idle" });
  const [goodsId, setGoodsId] = useState("");
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  useEffect(() => {
    if (!open || machines !== null) return;
    void fetchAllMachines().then((result) => setMachines(result.ok ? result.data : []));
  }, [open, machines]);

  useEffect(() => {
    if (!open || !sn) return;
    let live = true;
    setMenu({ kind: "loading" });
    setGoodsId("");
    void fetchShopMenu(sn).then((result) => {
      if (!live) return;
      if (!result.ok) setMenu({ kind: "error", message: result.error.message });
      else setMenu({ kind: "ready", drinks: reissueDrinks(result.data.drinks, order.pricePaise) });
    });
    return () => {
      live = false;
    };
  }, [open, sn, order.pricePaise]);

  const machineOptions = machines ?? [];
  const known = machineOptions.some((m) => m.sn === order.sn);

  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      wide
      title="Reissue for another drink"
      description={`The old code is turned off and the customer gets a new one. Choose a drink at ${formatInr(order.pricePaise)} or less.`}
      testId="dialog-shop-reissue"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm({ sn, goodsId, reason: trimmed })}
            disabled={busy || !goodsId || trimmed.length === 0}
            className="rounded-xl cursor-pointer"
            data-testid="dialog-shop-reissue-confirm"
          >
            {busy ? "Working…" : "Reissue"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Machine
          <select
            value={sn}
            onChange={(event) => setSn(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
            data-testid="select-reissue-machine"
          >
            {!known && <option value={order.sn}>{order.machineName || order.sn}</option>}
            {machineOptions.map((m) => (
              <option key={m.sn} value={m.sn}>
                {m.name || m.deviceExtNo || m.sn}
                {m.online ? "" : " (offline)"}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-foreground">Drink</legend>
          {menu.kind === "loading" && <p className="text-sm text-muted-foreground">Loading the menu…</p>}
          {menu.kind === "error" && <p className="text-sm text-rose-300">{menu.message}</p>}
          {menu.kind === "ready" && menu.drinks.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="reissue-no-drinks">
              No drink on this machine costs {formatInr(order.pricePaise)} or less right now. Try another machine.
            </p>
          )}
          {menu.kind === "ready" && menu.drinks.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2" data-testid="reissue-drinks">
              {menu.drinks.map((d) => (
                <label
                  key={d.goodsId}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    goodsId === d.goodsId ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="reissue-drink"
                      value={d.goodsId}
                      checked={goodsId === d.goodsId}
                      onChange={() => setGoodsId(d.goodsId)}
                      className="accent-[hsl(var(--primary))]"
                      data-testid={`reissue-drink-${d.goodsId}`}
                    />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatInr(d.pricePaise)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <ReasonField value={reason} onChange={setReason} testId="input-shop-reissue-reason" />
      </div>
    </MachineDialog>
  );
}
