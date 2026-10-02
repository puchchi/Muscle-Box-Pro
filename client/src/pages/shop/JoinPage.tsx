"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { ShopCustomer } from "@shared/shop/shopSchema";
import { fetchMe } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { StampSlots } from "./DrinkAccount";
import { accountHref, ShopHeader } from "./ShopHolding";
import { ACCOUNT_COPY, MEMBER_COPY } from "./shopCopy";
import { EYEBROW, GRADIENT_TEXT } from "./shopUi";
import { savedOrders } from "./savedOrders";
import { PRIMARY_BUTTON, SignInForm } from "./SignInForm";

const PAGE = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const TEXT_LINK =
  "inline-flex cursor-pointer items-center gap-1.5 font-semibold text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type View = { kind: "signedOut" } | { kind: "checking" } | { kind: "member"; customer: ShopCustomer };

const menuHref = (sn: string | null) => (sn ? `/drinks?sn=${encodeURIComponent(sn)}` : null);

export function JoinPage({ sn }: { sn: string | null }) {
  const [view, setView] = useState<View>({ kind: "signedOut" });

  useEffect(() => {
    if (!signedInHint()) return;
    setView({ kind: "checking" });
    void fetchMe().then((me) => setView(me.ok ? { kind: "member", customer: me.data } : { kind: "signedOut" }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="shop-join">
      <ShopHeader sn={null} container="max-w-6xl px-4 sm:px-6 lg:px-8" />

      <main className={`${PAGE} py-8 sm:py-12 lg:py-16`}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10">
          <div className="lg:col-span-7">
            <p className={EYEBROW}>{MEMBER_COPY.eyebrow}</p>
            <h1 className="mt-3 font-display font-black uppercase leading-[0.95] text-gray-900" style={{ fontSize: "clamp(2.25rem, 5vw, 3.75rem)" }}>
              {MEMBER_COPY.titleLead} <span className={GRADIENT_TEXT}>{MEMBER_COPY.titleHighlight}</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-700">{MEMBER_COPY.lead}</p>
          </div>

          <section
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start"
            aria-labelledby="join-title"
            data-testid="join-card"
          >
            {view.kind === "member" ? <Member sn={sn} customer={view.customer} /> : <JoinForm sn={sn} view={view} onJoined={(customer) => setView({ kind: "member", customer })} />}
          </section>

          <div className="space-y-8 lg:col-span-7">
            {view.kind === "member" ? (
              <StampCard filled={view.customer.stamps} caption={`${ACCOUNT_COPY.stampsCount(view.customer.stamps)}. ${ACCOUNT_COPY.stampsBody(view.customer.stampsToNext)}`} />
            ) : (
              <StampCard filled={6} caption={MEMBER_COPY.cardBody} />
            )}
            <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6" data-testid="join-benefits">
              {MEMBER_COPY.benefits.map((benefit) => (
                <li key={benefit.title} className="flex gap-3 sm:block">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary-ink" aria-hidden />
                  </span>
                  <span className="sm:mt-3 sm:block">
                    <span className="block font-semibold text-gray-900">{benefit.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-gray-600">{benefit.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="mt-16 border-t border-gray-200 pt-10" aria-labelledby="join-steps">
          <h2 id="join-steps" className="text-2xl font-bold text-gray-900">
            {MEMBER_COPY.stepsTitle}
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {MEMBER_COPY.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white" aria-hidden>
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">{step.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-gray-600">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-gray-600">{MEMBER_COPY.guestNote}</p>
        </section>
      </main>
    </div>
  );
}

function JoinForm({ sn, view, onJoined }: { sn: string | null; view: View; onJoined: (customer: ShopCustomer) => void }) {
  const menu = menuHref(sn);
  return (
    <>
      <h2 id="join-title" className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {MEMBER_COPY.formTitle}
      </h2>
      <p className="mb-6 mt-2 text-gray-700">{MEMBER_COPY.formLead}</p>
      {view.kind === "checking" ? (
        <p className="flex items-center gap-2 py-6 text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {MEMBER_COPY.checking}
        </p>
      ) : (
        <SignInForm sn={sn} claimToken={savedOrders()[0]?.token ?? null} submitLabel={MEMBER_COPY.submit} onSignedIn={onJoined} />
      )}
      {menu && (
        <p className="mt-6 border-t border-gray-100 pt-5 text-sm text-gray-600">
          {MEMBER_COPY.guestLead}{" "}
          <Link href={menu} className={TEXT_LINK} data-testid="join-guest">
            {MEMBER_COPY.guestCta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </p>
      )}
    </>
  );
}

function Member({ sn, customer }: { sn: string | null; customer: ShopCustomer }) {
  const menu = menuHref(sn);
  return (
    <div data-testid="join-member">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-5 w-5 text-emerald-700" aria-hidden />
      </span>
      <h2 id="join-title" className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {MEMBER_COPY.doneTitle}
      </h2>
      <p className="mt-2 text-gray-700">{customer.email}</p>
      <p className="mt-3 text-gray-700">{MEMBER_COPY.doneBody}</p>
      <div className="mt-6 space-y-3">
        {menu && (
          <Link href={menu} className={PRIMARY_BUTTON} data-testid="join-menu">
            {MEMBER_COPY.doneCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
        <Link href={accountHref(sn)} className={menu ? `${TEXT_LINK} w-full justify-center py-2` : PRIMARY_BUTTON} data-testid="join-account">
          {MEMBER_COPY.accountCta}
        </Link>
      </div>
    </div>
  );
}

function StampCard({ filled, caption }: { filled: number; caption: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-6 text-white sm:p-7" data-testid="shop-stamp-card">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" aria-hidden />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">{MEMBER_COPY.cardLabel}</p>
        <StampSlots filled={filled} className="mt-4 grid grid-cols-10 gap-1.5 sm:gap-2.5" />
        <p className="mt-4 text-sm leading-relaxed text-white/80">{caption}</p>
      </div>
    </div>
  );
}
