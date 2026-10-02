"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Loader2, LogOut, RotateCw, Trash2 } from "lucide-react";
import { formatInr, type ShopCustomer, type ShopMyCode, type ShopMyOrder } from "@shared/shop/shopSchema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccount, fetchMe, fetchMyCodes, fetchMyOrders, signOut } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { ShopHeader } from "./ShopHolding";
import { ACCOUNT_COPY, RECEIPT_COPY } from "./shopCopy";
import { savedOrders } from "./savedOrders";
import { SignInForm } from "./SignInForm";

const COLUMN = "mx-auto max-w-2xl px-4 sm:px-6";
const SECTION = "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6";
const QUIET_BUTTON =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

type View = { kind: "checking" } | { kind: "signedOut" } | { kind: "error" } | { kind: "deleted" } | { kind: "signedIn"; customer: ShopCustomer };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function DrinkAccount({ sn }: { sn: string | null }) {
  const [view, setView] = useState<View>({ kind: "checking" });

  const load = useCallback(async () => {
    if (!signedInHint()) {
      setView({ kind: "signedOut" });
      return;
    }
    setView({ kind: "checking" });
    const me = await fetchMe();
    if (me.ok) setView({ kind: "signedIn", customer: me.data });
    else setView(me.error.code === "signed_out" ? { kind: "signedOut" } : { kind: "error" });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="shop-account-page">
      <ShopHeader sn={sn} container="max-w-2xl px-4 sm:px-6" />
      <main className={`${COLUMN} space-y-5 py-8 lg:py-12`}>
        <h1 className="font-display font-black uppercase leading-[0.9] text-foreground" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          {view.kind === "signedIn" ? ACCOUNT_COPY.title : ACCOUNT_COPY.signInTitle}
        </h1>

        {view.kind === "checking" && (
          <p className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {ACCOUNT_COPY.loading}
          </p>
        )}

        {view.kind === "error" && (
          <div className={`${SECTION} text-center`} role="alert" data-testid="account-error">
            <p className="font-semibold text-gray-900">{ACCOUNT_COPY.loadError}</p>
            <button type="button" className={`${QUIET_BUTTON} mt-4`} onClick={() => void load()}>
              <RotateCw className="h-4 w-4" aria-hidden />
              {ACCOUNT_COPY.retry}
            </button>
          </div>
        )}

        {view.kind === "deleted" && (
          <p className={SECTION} role="status" data-testid="account-deleted">
            {ACCOUNT_COPY.deleted}
          </p>
        )}

        {view.kind === "signedOut" && (
          <div className={SECTION}>
            <p className="mb-4 text-gray-700">{ACCOUNT_COPY.signInLead}</p>
            <SignInForm
              sn={sn}
              claimToken={savedOrders()[0]?.token ?? null}
              submitLabel={ACCOUNT_COPY.signInTitle}
              onSignedIn={(customer) => setView({ kind: "signedIn", customer })}
            />
          </div>
        )}

        {view.kind === "signedIn" && (
          <SignedIn
            customer={view.customer}
            onSignedOut={() => setView({ kind: "signedOut" })}
            onDeleted={() => setView({ kind: "deleted" })}
          />
        )}

        <BackToMenu sn={sn} />
      </main>
    </div>
  );
}

function SignedIn({ customer, onSignedOut, onDeleted }: { customer: ShopCustomer; onSignedOut: () => void; onDeleted: () => void }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-gray-700" data-testid="account-email">
          {customer.email}
        </p>
        <button
          type="button"
          className={QUIET_BUTTON}
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            await signOut();
            onSignedOut();
          }}
          data-testid="account-sign-out"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {ACCOUNT_COPY.signOut}
        </button>
      </div>
      <StampCard customer={customer} />
      <MyCodes />
      <MyOrders />
      <DeleteAccount onDeleted={onDeleted} />
    </>
  );
}

function StampCard({ customer }: { customer: ShopCustomer }) {
  const filled = Math.min(customer.stamps, 9);
  return (
    <section className={SECTION} aria-labelledby="stamps-title" data-testid="account-stamps">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="stamps-title" className="text-lg font-bold text-gray-900">
          {ACCOUNT_COPY.stampsTitle}
        </h2>
        <span className="text-sm font-semibold text-gray-700">{ACCOUNT_COPY.stampsCount(filled)}</span>
      </div>
      <ol className="mt-4 grid grid-cols-10 gap-1.5 sm:gap-2" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <li
            key={i}
            className={`flex aspect-square items-center justify-center rounded-full border-2 ${
              i === 9 ? "border-dashed border-primary text-primary-ink" : i < filled ? "border-primary bg-primary-fill" : "border-gray-200 bg-gray-50"
            }`}
          >
            {i === 9 && <Gift className="h-4 w-4" />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">{ACCOUNT_COPY.stampsBody(customer.stampsToNext)}</p>
    </section>
  );
}

function MyCodes() {
  const [codes, setCodes] = useState<ShopMyCode[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const result = await fetchMyCodes();
    if (result.ok) setCodes(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={SECTION} aria-labelledby="codes-title" data-testid="account-codes">
      <h2 id="codes-title" className="text-lg font-bold text-gray-900">
        {ACCOUNT_COPY.codesTitle}
      </h2>
      {failed ? (
        <Retry onRetry={() => void load()} />
      ) : codes === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{ACCOUNT_COPY.loading}</p>
      ) : codes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{ACCOUNT_COPY.codesEmpty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {codes.map((c) => (
            <li key={c.code} className="flex items-center justify-between gap-4 py-3" data-testid={`account-code-${c.code}`}>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-gray-900">{c.kind === "reward" ? ACCOUNT_COPY.freeDrink : (c.drink?.name ?? "")}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.kind === "reward" ? ACCOUNT_COPY.freeDrinkWhere : [c.machineName, when(c.createdAt)].filter(Boolean).join(", ")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block font-mono text-lg font-bold tracking-wider ${c.used ? "text-gray-400 line-through" : "text-gray-900"}`}>{c.code}</span>
                <CodeState used={c.used} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CodeState({ used }: { used: boolean | null }) {
  if (used === null) return <span className="block text-xs text-muted-foreground">{ACCOUNT_COPY.unknown}</span>;
  return <span className={`block text-xs font-semibold ${used ? "text-gray-600" : "text-emerald-700"}`}>{used ? ACCOUNT_COPY.used : ACCOUNT_COPY.ready}</span>;
}

function MyOrders() {
  const [orders, setOrders] = useState<ShopMyOrder[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (from: string | null) => {
    setBusy(true);
    setFailed(false);
    const result = await fetchMyOrders(from);
    setBusy(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    setOrders((prev) => (from && prev ? [...prev, ...result.data.orders] : result.data.orders));
    setCursor(result.data.nextCursor);
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  return (
    <section className={SECTION} aria-labelledby="orders-title" data-testid="account-orders">
      <h2 id="orders-title" className="text-lg font-bold text-gray-900">
        {ACCOUNT_COPY.ordersTitle}
      </h2>
      {orders === null ? (
        failed ? <Retry onRetry={() => void load(null)} /> : <p className="mt-3 text-sm text-muted-foreground">{ACCOUNT_COPY.loading}</p>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{ACCOUNT_COPY.ordersEmpty}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-100">
            {orders.map((o) => (
              <li key={o.shopOrderId} className="flex items-center justify-between gap-4 py-3" data-testid={`account-order-${o.shopOrderId}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-900">{o.drink.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[o.machineName, when(o.createdAt)].filter(Boolean).join(", ")}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold text-gray-900">{formatInr(o.pricePaise)}</span>
                  <span className="block text-xs text-muted-foreground">{ACCOUNT_COPY.status[o.status] ?? ""}</span>
                </span>
              </li>
            ))}
          </ul>
          {failed && <Retry onRetry={() => void load(cursor)} />}
          {cursor && !failed && (
            <button type="button" className={`${QUIET_BUTTON} mt-3`} disabled={busy} onClick={() => void load(cursor)} data-testid="account-orders-more">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {ACCOUNT_COPY.more}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-3" role="alert">
      <p className="text-sm text-gray-700">{ACCOUNT_COPY.loadError}</p>
      <button type="button" className={`${QUIET_BUTTON} mt-3`} onClick={onRetry}>
        <RotateCw className="h-4 w-4" aria-hidden />
        {ACCOUNT_COPY.retry}
      </button>
    </div>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await deleteAccount();
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      onDeleted();
    } else setError(result.error.message);
  }

  return (
    <section className={SECTION} aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-lg font-bold text-gray-900">
        {ACCOUNT_COPY.deleteTitle}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{ACCOUNT_COPY.deleteBody}</p>
      <button type="button" className={`${QUIET_BUTTON} mt-4 border-rose-300 text-rose-700 hover:bg-rose-50`} onClick={() => setOpen(true)} data-testid="account-delete">
        <Trash2 className="h-4 w-4" aria-hidden />
        {ACCOUNT_COPY.deleteConfirm}
      </button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left">
            <DialogTitle>{ACCOUNT_COPY.deleteAsk}</DialogTitle>
            <DialogDescription>{ACCOUNT_COPY.deleteBody}</DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm font-medium text-rose-700" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <button type="button" className={QUIET_BUTTON} disabled={busy} onClick={() => setOpen(false)}>
              {ACCOUNT_COPY.cancel}
            </button>
            <button
              type="button"
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-rose-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              disabled={busy}
              onClick={() => void confirm()}
              data-testid="account-delete-confirm"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {ACCOUNT_COPY.deleteConfirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BackToMenu({ sn }: { sn: string | null }) {
  if (!sn) return <p className="text-center text-sm text-muted-foreground">{ACCOUNT_COPY.scanHint}</p>;
  return (
    <Link
      href={`/drinks?sn=${encodeURIComponent(sn)}`}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="account-menu"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {RECEIPT_COPY.backToMenu}
    </Link>
  );
}
