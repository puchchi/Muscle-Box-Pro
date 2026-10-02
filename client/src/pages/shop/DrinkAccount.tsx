"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, CupSoda, Gift, KeyRound, Loader2, LogOut, ReceiptIndianRupee, RotateCw } from "lucide-react";
import { formatInr, type ShopCustomer, type ShopMyCode, type ShopMyOrder } from "@shared/shop/shopSchema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccount, fetchMe, fetchMyCodes, fetchMyOrders, signOut } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { ShopHeader } from "./ShopHolding";
import { ACCOUNT_COPY, RECEIPT_COPY } from "./shopCopy";
import { EYEBROW, GRADIENT_TEXT } from "./shopUi";
import { savedOrders } from "./savedOrders";
import { PRIMARY_BUTTON, SignInForm } from "./SignInForm";

const PAGE = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const PANEL = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";
const PANEL_TITLE = "text-lg font-bold text-gray-900";
const QUIET_BUTTON =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

type View = { kind: "checking" } | { kind: "signedOut" } | { kind: "error" } | { kind: "deleted" } | { kind: "signedIn"; customer: ShopCustomer };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const menuHref = (sn: string) => `/drinks?sn=${encodeURIComponent(sn)}`;

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
      <ShopHeader sn={null} container="max-w-6xl px-4 sm:px-6 lg:px-8">
        {sn && (
          <Link
            href={menuHref(sn)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="account-menu"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {RECEIPT_COPY.backToMenu}
          </Link>
        )}
      </ShopHeader>

      <main className={`${PAGE} py-8 sm:py-12 lg:py-16`}>
        {view.kind === "checking" && (
          <p className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {ACCOUNT_COPY.loading}
          </p>
        )}

        {view.kind === "error" && (
          <div className={`${PANEL} mx-auto max-w-md text-center`} role="alert" data-testid="account-error">
            <p className="font-semibold text-gray-900">{ACCOUNT_COPY.loadError}</p>
            <button type="button" className={`${QUIET_BUTTON} mt-4`} onClick={() => void load()}>
              <RotateCw className="h-4 w-4" aria-hidden />
              {ACCOUNT_COPY.retry}
            </button>
          </div>
        )}

        {view.kind === "deleted" && (
          <p className={`${PANEL} mx-auto max-w-md text-center`} role="status" data-testid="account-deleted">
            {ACCOUNT_COPY.deleted}
          </p>
        )}

        {view.kind === "signedOut" && <SignedOut sn={sn} onSignedIn={(customer) => setView({ kind: "signedIn", customer })} />}

        {view.kind === "signedIn" && (
          <SignedIn
            sn={sn}
            customer={view.customer}
            onSignedOut={() => setView({ kind: "signedOut" })}
            onDeleted={() => setView({ kind: "deleted" })}
          />
        )}
      </main>
    </div>
  );
}

function SignedOut({ sn, onSignedIn }: { sn: string | null; onSignedIn: (customer: ShopCustomer) => void }) {
  return (
    <div className="mx-auto grid max-w-lg overflow-hidden lg:max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 lg:grid-cols-5">
      <section className="p-6 sm:p-10 lg:col-span-3 lg:flex lg:flex-col lg:justify-center lg:p-12" aria-labelledby="signin-title">
        <h1 id="signin-title" className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {ACCOUNT_COPY.formTitle}
        </h1>
        <p className="mb-8 mt-3 text-gray-700">{ACCOUNT_COPY.formLead}</p>
        <SignInForm sn={sn} claimToken={savedOrders()[0]?.token ?? null} submitLabel={ACCOUNT_COPY.signInTitle} onSignedIn={onSignedIn} />
      </section>

      <section className="relative overflow-hidden bg-gray-900 p-6 text-white sm:p-10 lg:col-span-2" aria-labelledby="perks-title" data-testid="account-perks">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="relative">
          <h2 id="perks-title" className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
            {ACCOUNT_COPY.perksTitle}
          </h2>
          <p className="mt-3 font-display text-2xl font-black uppercase leading-[0.95] sm:text-3xl">
            {ACCOUNT_COPY.heroTitleLead} <span className={GRADIENT_TEXT}>{ACCOUNT_COPY.heroTitleHighlight}</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">{ACCOUNT_COPY.heroBody}</p>
          <StampSlots filled={6} className="mt-6 grid grid-cols-10 gap-1.5" />
          <ul className="mt-8 space-y-5">
            {ACCOUNT_COPY.perks.map((perk) => {
              const Icon = PERK_ICONS[perk.icon as keyof typeof PERK_ICONS];
              return (
                <li key={perk.title} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold">{perk.title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-white/75">{perk.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/75">{ACCOUNT_COPY.perksJoin}</p>
        </div>
      </section>
    </div>
  );
}

const PERK_ICONS = { codes: KeyRound, orders: ReceiptIndianRupee } as const;

function LoyaltyCard({ filled, caption, children }: { filled: number; caption: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-xl shadow-gray-900/10 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">{ACCOUNT_COPY.cardLabel}</span>
          <span className="text-sm font-semibold">{caption}</span>
        </div>
        <StampSlots filled={filled} className="mt-5 grid grid-cols-5 gap-2.5 sm:gap-3 md:grid-cols-10 lg:grid-cols-5" />
        {children}
      </div>
    </div>
  );
}

export function StampSlots({ filled, className }: { filled: number; className: string }) {
  return (
    <ol className={className} aria-hidden>
      {Array.from({ length: 10 }, (_, i) => {
        const reward = i === 9;
        const on = i < filled;
        return (
          <li
            key={i}
            className={`flex aspect-square items-center justify-center rounded-full ${
              reward ? "border-2 border-dashed border-white/70 text-white" : on ? "bg-white text-gray-900" : "border-2 border-white/25 text-white/30"
            }`}
          >
            {reward ? <Gift className="h-1/2 w-1/2" /> : <CupSoda className="h-[45%] w-[45%]" />}
          </li>
        );
      })}
    </ol>
  );
}

function SignedIn({
  sn,
  customer,
  onSignedOut,
  onDeleted,
}: {
  sn: string | null;
  customer: ShopCustomer;
  onSignedOut: () => void;
  onDeleted: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const filled = Math.min(customer.stamps, 9);

  async function leave() {
    setLeaving(true);
    await signOut();
    onSignedOut();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className={EYEBROW}>{ACCOUNT_COPY.eyebrow}</span>
          <h1 className="font-display font-black uppercase leading-[0.9] text-foreground" style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}>
            {ACCOUNT_COPY.hello(customer.name)}
          </h1>
          <p className="mt-2 truncate text-gray-700" data-testid="account-email">
            {customer.email}
          </p>
        </div>
        <button type="button" className={QUIET_BUTTON} disabled={leaving} onClick={() => void leave()} data-testid="account-sign-out">
          <LogOut className="h-4 w-4" aria-hidden />
          {ACCOUNT_COPY.signOut}
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-5">
          <section aria-labelledby="stamps-title" data-testid="account-stamps">
            <h2 id="stamps-title" className="sr-only">
              {ACCOUNT_COPY.stampsTitle}
            </h2>
            <LoyaltyCard filled={filled} caption={ACCOUNT_COPY.stampsCount(filled)}>
              <p className="mt-5 text-white/90">{ACCOUNT_COPY.stampsBody(customer.stampsToNext)}</p>
            </LoyaltyCard>
          </section>
          <dl className="grid grid-cols-2 gap-4">
            <Stat label={ACCOUNT_COPY.statsDrinks} value={customer.lifetimeDrinks} />
            <Stat label={ACCOUNT_COPY.statsFree} value={customer.rewardsIssued} />
          </dl>
          {sn ? (
            <Link href={menuHref(sn)} className={PRIMARY_BUTTON}>
              {ACCOUNT_COPY.buyMore}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <p className="text-center text-sm text-gray-600">{ACCOUNT_COPY.scanHint}</p>
          )}
        </div>

        <div className="space-y-6 lg:col-span-7">
          <MyCodes />
          <MyOrders />
        </div>
      </div>

      <DeleteAccount onDeleted={onDeleted} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-black text-gray-900">{value}</dd>
    </div>
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

  const ready = codes?.filter((c) => c.used !== true) ?? [];
  const used = codes?.filter((c) => c.used === true) ?? [];

  return (
    <section className={PANEL} aria-labelledby="codes-title" data-testid="account-codes">
      <h2 id="codes-title" className={PANEL_TITLE}>
        {ACCOUNT_COPY.codesTitle}
      </h2>
      {failed ? (
        <Retry onRetry={() => void load()} />
      ) : codes === null ? (
        <p className="mt-3 text-sm text-gray-600">{ACCOUNT_COPY.loading}</p>
      ) : (
        <>
          {ready.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">{codes.length === 0 ? ACCOUNT_COPY.codesEmpty : ACCOUNT_COPY.readyEmpty}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-600">{ACCOUNT_COPY.readyHint}</p>
              <ul className="mt-4 space-y-3">
                {ready.map((c) => (
                  <li
                    key={c.code}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4"
                    data-testid={`account-code-${c.code}`}
                  >
                    <CodeLabel code={c} />
                    <span className="sm:text-right">
                      <span className="block font-mono text-2xl font-bold tracking-[0.15em] text-gray-900">{grouped(c.code)}</span>
                      <CodeState used={c.used} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {used.length > 0 && (
            <details className="group mt-4 border-t border-gray-100 pt-3">
              <summary className="flex min-h-11 list-none [&::-webkit-details-marker]:hidden cursor-pointer items-center text-sm font-semibold text-gray-700 hover:text-gray-900">
                {ACCOUNT_COPY.usedTitle(used.length)}
                <ChevronDown className="ml-1 h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="divide-y divide-gray-100">
                {used.map((c) => (
                  <li key={c.code} className="flex items-center justify-between gap-4 py-3" data-testid={`account-code-${c.code}`}>
                    <CodeLabel code={c} />
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-gray-500 line-through">{grouped(c.code)}</span>
                      <CodeState used={c.used} />
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

const grouped = (code: string) => (code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code);

function CodeLabel({ code }: { code: ShopMyCode }) {
  const reward = code.kind === "reward";
  return (
    <span className="flex min-w-0 items-center gap-3">
      {reward && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold text-gray-900">{reward ? ACCOUNT_COPY.freeDrink : (code.drink?.name ?? "")}</span>
        <span className="block truncate text-sm text-gray-600">
          {reward ? ACCOUNT_COPY.freeDrinkWhere : [code.machineName, when(code.createdAt)].filter(Boolean).join(", ")}
        </span>
      </span>
    </span>
  );
}

function CodeState({ used }: { used: boolean | null }) {
  if (used === null) return <span className="block text-xs text-gray-600">{ACCOUNT_COPY.unknown}</span>;
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
    <section className={PANEL} aria-labelledby="orders-title" data-testid="account-orders">
      <h2 id="orders-title" className={PANEL_TITLE}>
        {ACCOUNT_COPY.ordersTitle}
      </h2>
      {orders === null ? (
        failed ? <Retry onRetry={() => void load(null)} /> : <p className="mt-3 text-sm text-gray-600">{ACCOUNT_COPY.loading}</p>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">{ACCOUNT_COPY.ordersEmpty}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-100">
            {orders.map((o) => (
              <li key={o.shopOrderId} className="flex items-center justify-between gap-4 py-3" data-testid={`account-order-${o.shopOrderId}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-900">{o.drink.name}</span>
                  <span className="block truncate text-sm text-gray-600">{[o.machineName, when(o.createdAt)].filter(Boolean).join(", ")}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold text-gray-900">{formatInr(o.pricePaise)}</span>
                  <span className="block text-xs text-gray-600">{ACCOUNT_COPY.status[o.status] ?? ""}</span>
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
    <div className="mt-12 border-t border-gray-200 pt-6 text-center sm:text-left">
      <button
        type="button"
        className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-rose-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
        data-testid="account-delete"
      >
        {ACCOUNT_COPY.deleteTitle}
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
    </div>
  );
}
