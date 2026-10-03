"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ChevronRight, CupSoda, Flame, Gift, Loader2, MapPin, Receipt, ReceiptIndianRupee, RotateCw, Snowflake, UserRound } from "lucide-react";
import { formatInr, type ShopCustomer, type ShopDrink, type ShopErrorCode, type ShopMenu, type ShopMyCode } from "@shared/shop/shopSchema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createShopOrder, fetchMe, fetchMyCodes, fetchShopMenu } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { payWithRazorpay } from "@/lib/razorpayCheckout";
import { AccountLink, ShopHeader, accountHref } from "./ShopHolding";
import { ACCOUNT_COPY, PAY_COPY, SHOP_COPY, SIGNIN_COPY } from "./shopCopy";
import { MachineScreenMock } from "./MachineScreenMock";
import { cardIsFull, FreeShakeCodes, readyRewards, StampSlots, stampsShown } from "./DrinkAccount";
import { SignInForm } from "./SignInForm";
import { CONTAINER } from "./shopUi";
import { receiptHref, saveOrder, savedOrders, type SavedOrder } from "./savedOrders";

const MENU_CHANGED: ReadonlySet<ShopErrorCode> = new Set(["machine_offline", "machine_disabled", "drink_not_listed", "sold_out", "coming_soon"]);

type Notice = { kind: "error"; message: string } | { kind: "closed"; token: string };

export function DrinksShop({ sn }: { sn: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState<ShopMenu | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saved, setSaved] = useState<SavedOrder[]>([]);
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [rewards, setRewards] = useState<ShopMyCode[]>([]);
  const [choosing, setChoosing] = useState<ShopDrink | null>(null);

  const load = useCallback(async () => {
    const result = await fetchShopMenu(sn);
    if (result.ok) {
      setMenu(result.data);
      setLoadError(null);
    } else {
      setLoadError(result.error.code === "machine_unknown" ? result.error.message : SHOP_COPY.loadError);
    }
  }, [sn]);

  useEffect(() => {
    void load();
    setSaved(savedOrders());
  }, [load]);

  useEffect(() => {
    if (!signedInHint()) return;
    void fetchMe().then((me) => {
      if (!me.ok) return;
      setCustomer(me.data);
      void fetchMyCodes().then((codes) => {
        if (codes.ok) setRewards(readyRewards(codes.data));
      });
    });
  }, []);

  function startBuy(drink: ShopDrink) {
    if (customer) void buy(drink, true);
    else setChoosing(drink);
  }

  async function buy(drink: ShopDrink, asCustomer: boolean) {
    setChoosing(null);
    setBusy(drink.goodsId);
    setNotice(null);
    const order = await createShopOrder(sn, drink.goodsId, { asCustomer });
    if (!order.ok) {
      setBusy(null);
      setNotice({ kind: "error", message: order.error.message });
      if (MENU_CHANGED.has(order.error.code)) void load();
      return;
    }
    saveOrder({ token: order.data.token, sn, drinkName: drink.name, savedAt: Date.now() });
    setSaved(savedOrders());
    const outcome = await payWithRazorpay({ ...order.data, description: drink.name });
    if (outcome === "paid") {
      router.push(receiptHref(order.data.token));
      return;
    }
    setBusy(null);
    setNotice(outcome === "closed" ? { kind: "closed", token: order.data.token } : { kind: "error", message: SHOP_COPY.checkoutUnavailable });
  }

  const selling = menu !== null && menu.online && menu.enabled;
  const showMember = !loadError && menu !== null && menu.drinks.length > 0;
  const sidebar = showMember || saved.length > 0;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="shop-menu-page">
      <ShopHeader sn={null}>
        <AccountLink sn={sn} signedIn={customer !== null} />
      </ShopHeader>
      <main className={`${CONTAINER} py-6 sm:py-8 lg:py-10`}>
        <div>
          {menu && <MachineLine menu={menu} />}
          <h1 className="mt-3 font-display font-black uppercase leading-[0.95] text-foreground" style={{ fontSize: "clamp(1.875rem, 4vw, 2.75rem)" }}>
            {SHOP_COPY.title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">{SHOP_COPY.lead}</p>
        </div>

        <div className="mt-6 space-y-3 empty:hidden">
          {menu && !menu.online && <Banner tone="warn" testId="shop-offline">{SHOP_COPY.offlineNotice}</Banner>}
          {menu && menu.online && !menu.enabled && <Banner tone="warn" testId="shop-disabled">{SHOP_COPY.disabledNotice}</Banner>}
          {notice?.kind === "error" && (
            <Banner tone="error" testId="shop-notice">
              {notice.message}
            </Banner>
          )}
          {notice?.kind === "closed" && (
            <Banner tone="info" testId="shop-notice">
              <span className="block font-semibold text-gray-900">{SHOP_COPY.closedTitle}</span>
              <span className="block">{SHOP_COPY.closedBody}</span>
              <a href={receiptHref(notice.token)} className="mt-2 inline-block font-semibold text-primary-ink underline underline-offset-4">
                {SHOP_COPY.openOrder}
              </a>
            </Banner>
          )}
        </div>

        <div className={`mt-6 grid gap-6 lg:gap-8 ${sidebar ? "lg:grid-cols-12 lg:grid-rows-[auto_1fr]" : ""}`}>
          {showMember && (
            <div className="lg:col-span-4 lg:col-start-9 lg:row-start-1">
              <MemberCard sn={sn} customer={customer} rewards={rewards} />
            </div>
          )}
          <section className={sidebar ? "lg:col-span-8 lg:row-span-2 lg:row-start-1" : ""} aria-label="Menu">
            {loadError ? (
              <LoadError sn={sn} message={loadError} onRetry={() => void load()} />
            ) : menu === null ? (
              <MenuSkeleton wide={!sidebar} />
            ) : menu.drinks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600" data-testid="shop-empty">
                {SHOP_COPY.emptyMenu}
              </p>
            ) : (
              <ul className={`grid gap-4 sm:grid-cols-2 lg:gap-6 ${sidebar ? "" : "lg:grid-cols-3 xl:grid-cols-4"}`} data-testid="shop-drinks">
                {menu.drinks.map((drink) => (
                  <DrinkCard
                    key={drink.goodsId}
                    drink={drink}
                    selling={selling}
                    busy={busy === drink.goodsId}
                    locked={busy !== null}
                    onBuy={() => startBuy(drink)}
                  />
                ))}
              </ul>
            )}
          </section>
          {saved.length > 0 && (
            <div className="lg:col-span-4 lg:col-start-9 lg:row-start-2">
              <SavedOrders orders={saved} sn={sn} signedIn={customer !== null} />
            </div>
          )}
        </div>
          <PayChoice
            sn={sn}
            drink={choosing}
            claimToken={saved[0]?.token ?? null}
            onClose={() => setChoosing(null)}
            onGuest={(drink) => void buy(drink, false)}
            onSignedIn={(drink, who) => {
              setCustomer(who);
              void buy(drink, true);
            }}
          />

        <section className="mt-14 border-t border-gray-200 pt-10 lg:mt-20 lg:pt-14" aria-labelledby="how-title">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-5">
              <h2 id="how-title" className="text-2xl font-bold text-gray-900">
                {SHOP_COPY.stepsTitle}
              </h2>
              <p className="mt-2 text-gray-600">{SHOP_COPY.stepsLead}</p>
              <ol className="mt-6 space-y-5">
                {SHOP_COPY.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold text-gray-900">{step.title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:col-span-7">
              <MachineScreenMock />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MemberCard({ sn, customer, rewards }: { sn: string; customer: ShopCustomer | null; rewards: ShopMyCode[] }) {
  const filled = customer ? stampsShown(customer.stamps, rewards) : 0;
  const full = customer !== null && cardIsFull(customer.stamps, rewards);
  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-xl shadow-gray-900/10 sm:p-6"
      data-testid={customer ? "shop-signed-in" : "shop-member-strip"}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">{ACCOUNT_COPY.cardLabel}</span>
          {customer && <span className="text-sm font-semibold">{full ? ACCOUNT_COPY.freeReadyCaption : ACCOUNT_COPY.stampsCount(filled)}</span>}
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug">
          {!customer ? SHOP_COPY.memberTitle : full ? ACCOUNT_COPY.cardFull : ACCOUNT_COPY.stampsBody(customer.stampsToNext)}
        </p>
        <StampSlots filled={filled} className="mt-4 grid grid-cols-10 gap-1.5 sm:gap-2 lg:grid-cols-5 lg:gap-2.5" />
        {customer && rewards.length > 0 && <FreeShakeCodes rewards={rewards} />}
        {customer ? (
          <p className="mt-4 truncate text-sm text-white/70">{PAY_COPY.signedInAs(customer.email)}</p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-white/75">{SHOP_COPY.memberBody}</p>
            <Link
              href={accountHref(sn)}
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {SHOP_COPY.memberCta}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function PayChoice({
  sn,
  drink,
  claimToken,
  onClose,
  onGuest,
  onSignedIn,
}: {
  sn: string;
  drink: ShopDrink | null;
  claimToken: string | null;
  onClose: () => void;
  onGuest: (drink: ShopDrink) => void;
  onSignedIn: (drink: ShopDrink, customer: ShopCustomer) => void;
}) {
  const [signingIn, setSigningIn] = useState(false);
  const [shown, setShown] = useState<ShopDrink | null>(drink);
  if (drink && drink !== shown) {
    setShown(drink);
    setSigningIn(false);
  }
  const current = drink ?? shown;
  const price = current ? formatInr(current.pricePaise) : "";
  return (
    <Dialog open={drink !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6" data-testid="pay-choice">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-xl font-bold text-gray-900">{current ? PAY_COPY.title(current.name) : ""}</DialogTitle>
          <DialogDescription className="font-display text-2xl font-black text-gray-900">{price}</DialogDescription>
        </DialogHeader>
        {current && !signingIn && (
          <div className="mt-2 space-y-3">
            <ChoiceButton title={PAY_COPY.member} body={PAY_COPY.memberBody} onClick={() => setSigningIn(true)} testId="pay-member" icon={<UserRound className="h-5 w-5" aria-hidden />} featured />
            <ChoiceButton title={PAY_COPY.guest} body={PAY_COPY.guestBody} onClick={() => onGuest(current)} testId="pay-guest" icon={<ReceiptIndianRupee className="h-5 w-5" aria-hidden />} />
          </div>
        )}
        {current && signingIn && (
          <div className="mt-2">
            <SignInForm sn={sn} claimToken={claimToken} submitLabel={SIGNIN_COPY.verifyAndPay(price)} onSignedIn={(who) => onSignedIn(current, who)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceButton({
  title,
  body,
  icon,
  onClick,
  testId,
  featured,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  onClick: () => void;
  testId: string;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${featured ? "border-primary bg-primary/5" : "border-gray-200 bg-white"}`}
      data-testid={testId}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{body}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
    </button>
  );
}

function MachineLine({ menu }: { menu: ShopMenu }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${menu.online ? "bg-emerald-50 text-emerald-800" : "bg-gray-200 text-gray-700"}`}
        data-testid="shop-online"
      >
        <span className={`h-2 w-2 rounded-full ${menu.online ? "bg-emerald-500" : "bg-gray-500"}`} aria-hidden />
        {menu.online ? SHOP_COPY.online : SHOP_COPY.offline}
      </span>
      {(menu.name || menu.place) && (
        <span className="inline-flex items-center gap-1.5 text-gray-700" data-testid="shop-machine">
          <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
          {[menu.name, menu.place].filter(Boolean).join(", ")}
        </span>
      )}
    </div>
  );
}

function DrinkCard({
  drink,
  selling,
  busy,
  locked,
  onBuy,
}: {
  drink: ShopDrink;
  selling: boolean;
  busy: boolean;
  locked: boolean;
  onBuy: () => void;
}) {
  const unavailable = drink.comingSoon ? SHOP_COPY.comingSoon : drink.soldOut ? SHOP_COPY.soldOut : null;
  const price = formatInr(drink.pricePaise);
  const saving = drink.listPricePaise !== null && drink.listPricePaise > drink.pricePaise ? drink.listPricePaise - drink.pricePaise : 0;
  return (
    <li
      className="group flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80 transition-shadow duration-200 hover:shadow-lg sm:flex-col sm:rounded-3xl"
      data-testid={`shop-drink-${drink.goodsId}`}
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100/70 sm:aspect-[4/3] sm:w-full">
        <DrinkPicture url={drink.image} alt={drink.name} dim={unavailable !== null} />
        {drink.serveTemp && <TempSticker temp={drink.serveTemp} />}
        {saving > 0 && !unavailable && (
          <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            {SHOP_COPY.save(formatInr(saving))}
          </span>
        )}
      </div>
      <div className="flex min-h-36 min-w-0 flex-1 flex-col p-4 sm:min-h-0 sm:p-5">
        <h2 className="text-base font-bold leading-snug text-gray-900 sm:text-lg">{drink.name}</h2>
        {drink.spec && <p className="mt-1 text-sm text-gray-600">{drink.spec}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          {!drink.comingSoon && (
            <span className="flex items-baseline gap-2" data-testid={`shop-price-${drink.goodsId}`}>
              <span className="font-display text-2xl font-black leading-none text-gray-900">{price}</span>
              {saving > 0 && <s className="text-sm text-gray-500">{formatInr(drink.listPricePaise!)}</s>}
            </span>
          )}
          <button
            type="button"
            onClick={onBuy}
            disabled={unavailable !== null || !selling || locked}
            aria-label={unavailable ? `${drink.name}: ${unavailable}` : `${SHOP_COPY.buy} ${drink.name} for ${price}`}
            className={`ml-auto inline-flex h-11 min-w-[6.5rem] cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
              unavailable
                ? "border border-gray-200 bg-white text-gray-600"
                : "bg-primary-fill text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-fill/90 disabled:bg-gray-200 disabled:text-gray-600 disabled:shadow-none"
            }`}
            data-testid={`shop-buy-${drink.goodsId}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {busy ? SHOP_COPY.opening : (unavailable ?? SHOP_COPY.buy)}
          </button>
        </div>
      </div>
    </li>
  );
}

function DrinkPicture({ url, alt, dim }: { url: string; alt: string; dim: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className="flex h-full min-h-28 w-full items-center justify-center text-primary/40">
        <CupSoda className="h-10 w-10" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] ${dim ? "opacity-60 saturate-50" : ""}`}
      onError={() => setBroken(true)}
    />
  );
}

function TempSticker({ temp }: { temp: "chilled" | "hot" }) {
  const Icon = temp === "hot" ? Flame : Snowflake;
  return (
    <span
      className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${temp === "hot" ? "text-orange-800" : "text-sky-800"}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {temp === "hot" ? SHOP_COPY.hot : SHOP_COPY.chilled}
    </span>
  );
}

function Banner({ tone, testId, children }: { tone: "warn" | "error" | "info"; testId: string; children: React.ReactNode }) {
  const look = {
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-gray-200 bg-white text-gray-700",
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${look}`} role={tone === "info" ? "status" : "alert"} data-testid={testId}>
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function LoadError({ sn, message, onRetry }: { sn: string; message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center" role="alert" data-testid="shop-load-error">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <CupSoda className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-gray-900">{message}</p>
      <p className="mt-1 text-sm text-gray-600">{SHOP_COPY.loadErrorHint}</p>
      <p className="mt-3 font-mono text-xs text-gray-600">{SHOP_COPY.machineCode(sn)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-6 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        {SHOP_COPY.retry}
      </button>
    </div>
  );
}

function MenuSkeleton({ wide }: { wide: boolean }) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 lg:gap-6 ${wide ? "lg:grid-cols-3 xl:grid-cols-4" : ""}`} aria-busy="true" aria-label="Loading the menu" data-testid="shop-loading">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 sm:flex-col sm:rounded-3xl">
          <span className="h-28 w-32 shrink-0 bg-gray-100 sm:aspect-[4/3] sm:h-auto sm:w-full" />
          <span className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <span className="h-4 w-3/4 rounded bg-gray-100" />
            <span className="h-3 w-1/3 rounded bg-gray-100" />
            <span className="mt-auto h-11 w-28 self-end rounded-full bg-gray-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SavedOrders({ orders, sn, signedIn }: { orders: SavedOrder[]; sn: string; signedIn: boolean }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white" aria-labelledby="shop-saved-title" data-testid="shop-saved">
      <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
        <h2 id="shop-saved-title" className="text-base font-semibold tracking-tight text-gray-900">
          {SHOP_COPY.savedTitle}
        </h2>
        {signedIn && (
          <Link href={accountHref(sn)} className="text-sm font-semibold text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {SHOP_COPY.savedAll}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-gray-100 pb-1">
        {orders.slice(0, 3).map((order) => (
          <li key={order.token}>
            <a
              href={receiptHref(order.token)}
              aria-label={`${SHOP_COPY.savedOpen}: ${order.drinkName}`}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none sm:px-5"
            >
              <Receipt className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{order.drinkName}</span>
                <span className="block text-xs text-gray-600">
                  {new Date(order.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
