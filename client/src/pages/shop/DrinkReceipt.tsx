"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Clock, Copy, CupSoda, Loader2, Mail, RotateCcw, SearchX, XCircle } from "lucide-react";
import { formatInr, type ShopReceipt } from "@shared/shop/shopSchema";
import { emailShopCode, fetchShopReceipt } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { AccountLink, ShopHeader } from "./ShopHolding";
import { RECEIPT_COPY } from "./shopCopy";
import { isAccountOrder, tokenFromHash } from "./savedOrders";

export const POLL_FAST_MS = 3_000;
export const POLL_SLOW_MS = 10_000;
const FAST_FOR_MS = 2 * 60_000;
const SLOW_AFTER_MS = 5 * 60_000;
const STOP_AFTER_MS = 30 * 60_000;

type View = { kind: "loading" } | { kind: "missing" } | { kind: "receipt"; receipt: ShopReceipt };

const waiting = (receipt: ShopReceipt) => receipt.status === "created" || receipt.status === "paid";

export function DrinkReceipt() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(signedInHint());
    const read = () => setToken(tokenFromHash(window.location.hash));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    if (token === undefined) return;
    if (token === null) {
      setView({ kind: "missing" });
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    setView({ kind: "loading" });
    setSlow(false);

    async function poll() {
      const result = await fetchShopReceipt(token!);
      if (!live) return;
      const elapsed = Date.now() - started;
      if (!result.ok && result.error.code === "order_not_found") {
        setView({ kind: "missing" });
        return;
      }
      setRetrying(!result.ok);
      if (result.ok) setView({ kind: "receipt", receipt: result.data });
      if (result.ok && !waiting(result.data)) return;
      if (elapsed > SLOW_AFTER_MS) setSlow(true);
      if (elapsed > STOP_AFTER_MS) return;
      timer = setTimeout(poll, elapsed < FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS);
    }
    void poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [token]);

  const receipt = view.kind === "receipt" ? view.receipt : null;
  const menuHref = receipt ? `/drinks?sn=${encodeURIComponent(receipt.sn)}` : "/drinks";

  return (
    <div className="min-h-screen bg-gray-50" data-testid="shop-receipt-page">
      <ShopHeader sn={receipt?.sn ?? null} container="max-w-xl px-4 sm:px-6">
        {signedIn && <AccountLink sn={receipt?.sn ?? null} signedIn />}
      </ShopHeader>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
        {view.kind === "loading" && (
          <Panel testId="receipt-loading">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-label="Loading your order" />
          </Panel>
        )}
        {view.kind === "missing" && (
          <Panel testId="receipt-missing">
            <StatusHeading icon={<SearchX className="h-7 w-7 text-gray-500" aria-hidden />} title={RECEIPT_COPY.notFoundTitle} body={RECEIPT_COPY.notFoundBody} />
          </Panel>
        )}
        {receipt && <ReceiptBody receipt={receipt} token={token!} slow={slow} />}
        {retrying && (
          <p className="text-center text-xs text-muted-foreground" role="status" data-testid="receipt-retrying">
            {RECEIPT_COPY.reconnecting}
          </p>
        )}
        <div className="text-center">
          <Link
            href={menuHref}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="receipt-menu"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {RECEIPT_COPY.backToMenu}
          </Link>
        </div>
      </main>
    </div>
  );
}

function ReceiptBody({ receipt, token, slow }: { receipt: ShopReceipt; token: string; slow: boolean }) {
  const price = formatInr(receipt.pricePaise);
  return (
    <>
      <Panel testId={`receipt-${receipt.status}`}>
        <Status receipt={receipt} price={price} slow={slow} />
      </Panel>
      <OrderLine receipt={receipt} price={price} />
      {receipt.status === "coded" && receipt.code && receipt.used !== true && (isAccountOrder(token) ? <AccountEmailed /> : <EmailCode token={token} />)}
    </>
  );
}

function Status({ receipt, price, slow }: { receipt: ShopReceipt; price: string; slow: boolean }) {
  switch (receipt.status) {
    case "created":
    case "paid": {
      const paid = receipt.status === "paid";
      return (
        <>
          <StatusHeading
            icon={<Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />}
            title={paid ? RECEIPT_COPY.paidTitle : RECEIPT_COPY.waitingTitle}
            body={paid ? RECEIPT_COPY.paidBody : RECEIPT_COPY.waitingBody}
          />
          {slow && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" data-testid="receipt-slow">
              {RECEIPT_COPY.slow}
            </p>
          )}
        </>
      );
    }
    case "coded":
      return receipt.code ? <CodeCard code={receipt.code} used={receipt.used} /> : null;
    case "failed":
      return <StatusHeading icon={<XCircle className="h-7 w-7 text-gray-500" aria-hidden />} title={RECEIPT_COPY.failedTitle} body={RECEIPT_COPY.failedBody} />;
    case "refund_owed":
    case "refunding":
      return <StatusHeading icon={<RotateCcw className="h-7 w-7 text-primary" aria-hidden />} title={RECEIPT_COPY.refundingTitle} body={RECEIPT_COPY.refundingBody(price)} />;
    case "refunded":
      return <StatusHeading icon={<CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />} title={RECEIPT_COPY.refundedTitle} body={RECEIPT_COPY.refundedBody(price)} />;
    case "refund_failed":
      return (
        <>
          <StatusHeading icon={<Clock className="h-7 w-7 text-amber-600" aria-hidden />} title={RECEIPT_COPY.refundFailedTitle} body={RECEIPT_COPY.refundFailedBody} />
          <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-primary-ink underline underline-offset-4">
            {RECEIPT_COPY.contact}
          </Link>
        </>
      );
  }
}

function StatusHeading({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">{icon}</div>
      <h1 className="font-display text-2xl font-black uppercase text-foreground sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>
    </div>
  );
}

function CodeCard({ code, used }: { code: string; used: boolean | null }) {
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">{RECEIPT_COPY.codeTitle}</h1>
        {used !== null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${used ? "bg-gray-200 text-gray-700" : "bg-emerald-50 text-emerald-800"}`}
            data-testid="receipt-used"
          >
            {used ? RECEIPT_COPY.used : RECEIPT_COPY.ready}
          </span>
        )}
      </div>
      <p
        className={`mt-4 whitespace-nowrap font-mono font-black tabular-nums tracking-[0.08em] ${used ? "text-gray-400 line-through" : "text-gray-900"}`}
        style={{ fontSize: "clamp(2.5rem, 13vw, 4rem)" }}
        data-testid="receipt-code"
      >
        <span className="sr-only">{code.split("").join(" ")}</span>
        <span aria-hidden>
          {code.slice(0, 4)}
          <span className="inline-block w-[0.4em]" />
          {code.slice(4)}
        </span>
      </p>
      {used ? (
        <p className="mt-3 text-sm text-muted-foreground">{RECEIPT_COPY.usedBody}</p>
      ) : (
        <>
          {canCopy && (
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="receipt-copy"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? RECEIPT_COPY.copied : RECEIPT_COPY.copy}
            </button>
          )}
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left">
            <p className="mb-2 text-sm font-bold text-gray-900">{RECEIPT_COPY.howTitle}</p>
            <ol className="space-y-1.5 text-sm text-gray-700">
              {RECEIPT_COPY.howSteps.map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fill text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">{RECEIPT_COPY.rules}</p>
          </div>
        </>
      )}
    </div>
  );
}

function OrderLine({ receipt, price }: { receipt: ShopReceipt; price: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4" data-testid="receipt-order">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        {receipt.drink.image && !broken ? (
          <img src={receipt.drink.image} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <CupSoda className="h-6 w-6 text-gray-400" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-gray-900">{receipt.drink.name}</span>
        <span className="block truncate text-sm text-muted-foreground">{receipt.machineName || receipt.sn}</span>
      </span>
      <span className="text-right">
        <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{receipt.status === "created" || receipt.status === "failed" ? RECEIPT_COPY.price : RECEIPT_COPY.paidFor}</span>
        <span className="block font-display text-lg font-black text-gray-900">{price}</span>
      </span>
    </div>
  );
}

function AccountEmailed() {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700 sm:p-5" data-testid="receipt-account-emailed">
      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
      {RECEIPT_COPY.accountEmailed}
    </p>
  );
}

function EmailCode({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string }>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) {
      input.current?.focus();
      return;
    }
    setState({ kind: "sending" });
    const result = await emailShopCode(token, address);
    if (result.ok) setState({ kind: "sent", email: address });
    else setState({ kind: "error", message: result.error.fieldErrors?.email ?? result.error.message });
  }

  return (
    <form onSubmit={(event) => void send(event)} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5" noValidate data-testid="receipt-email">
      <label htmlFor="receipt-email-input" className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <Mail className="h-4 w-4 text-primary" aria-hidden />
        {RECEIPT_COPY.emailLabel}
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">{RECEIPT_COPY.emailHint}</p>
      <div className="mt-3 flex gap-2">
        <input
          ref={input}
          id="receipt-email-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.kind === "error"}
          aria-describedby="receipt-email-result"
          className="h-11 min-w-0 flex-1 rounded-full border border-gray-300 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          data-testid="receipt-email-input"
        />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary-fill px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-fill/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="receipt-email-send"
        >
          {state.kind === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {state.kind === "sending" ? RECEIPT_COPY.emailSending : RECEIPT_COPY.emailSend}
        </button>
      </div>
      <p id="receipt-email-result" className="mt-2 min-h-[1.25rem] text-sm" role="status" aria-live="polite">
        {state.kind === "sent" && <span className="text-emerald-700">{RECEIPT_COPY.emailSent(state.email)}</span>}
        {state.kind === "error" && <span className="text-rose-700">{state.message}</span>}
      </p>
    </form>
  );
}

function Panel({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8" data-testid={testId}>
      {children}
    </section>
  );
}
