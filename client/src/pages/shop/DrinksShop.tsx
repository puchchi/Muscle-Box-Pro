"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, CupSoda, Flame, Loader2, MapPin, Receipt, RotateCw, Snowflake, UserRound } from "lucide-react";
import { formatInr, type ShopCustomer, type ShopDrink, type ShopErrorCode, type ShopMenu } from "@shared/shop/shopSchema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createShopOrder, fetchMe, fetchShopMenu } from "@/lib/shopApi";
import { signedInHint } from "@/lib/shopSession";
import { payWithRazorpay } from "@/lib/razorpayCheckout";
import { AccountLink, ShopHeader } from "./ShopHolding";
import { PAY_COPY, SHOP_COPY, SIGNIN_COPY } from "./shopCopy";
import { MachineScreenMock } from "./MachineScreenMock";
import { SignInForm } from "./SignInForm";
import { CONTAINER, SectionHeader, StepCards } from "./shopUi";
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
      if (me.ok) setCustomer(me.data);
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

  return (
    <div className="min-h-screen bg-background" data-testid="shop-menu-page">
      <ShopHeader sn={sn}>
        <AccountLink sn={sn} signedIn={customer !== null} />
      </ShopHeader>
      <main>
        <section className="border-b border-gray-100 bg-gray-50">
          <div className={`${CONTAINER} py-8 lg:py-12`}>
            {menu && <MachineLine menu={menu} />}
            <h1 className="mt-3 font-display font-black uppercase leading-[0.9] text-foreground" style={{ fontSize: "clamp(2.25rem, 5vw, 3.75rem)" }}>
              {SHOP_COPY.title}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{SHOP_COPY.lead}</p>
            {customer && (
              <p className="mt-3 text-sm text-gray-700" data-testid="shop-signed-in">
                {PAY_COPY.signedInAs(customer.email)}
              </p>
            )}
          </div>
        </section>

        <section className={`${CONTAINER} space-y-5 py-8 lg:py-12`} aria-label="Menu">
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

          {loadError ? (
            <LoadError message={loadError} onRetry={() => void load()} />
          ) : menu === null ? (
            <MenuSkeleton />
          ) : menu.drinks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-muted-foreground" data-testid="shop-empty">
              {SHOP_COPY.emptyMenu}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" data-testid="shop-drinks">
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

          {saved.length > 0 && <SavedOrders orders={saved} />}
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
        </section>

        <section className="bg-muted py-14 lg:py-20">
          <div className={CONTAINER}>
            <SectionHeader
              centered
              eyebrow={SHOP_COPY.stepsEyebrow}
              titleLead={SHOP_COPY.stepsTitleLead}
              titleHighlight={SHOP_COPY.stepsTitleHighlight}
              lead={SHOP_COPY.stepsLead}
            />
            <StepCards steps={SHOP_COPY.steps} />
            <MachineScreenMock />
          </div>
        </section>
      </main>
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
            <ChoiceButton title={PAY_COPY.member} body={PAY_COPY.memberBody} onClick={() => setSigningIn(true)} testId="pay-member" icon={<UserRound className="h-5 w-5" aria-hidden />} />
            <ChoiceButton title={PAY_COPY.guest} body={PAY_COPY.guestBody} onClick={() => onGuest(current)} testId="pay-guest" icon={<Receipt className="h-5 w-5" aria-hidden />} />
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

function ChoiceButton({ title, body, icon, onClick, testId }: { title: string; body: string; icon: React.ReactNode; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  return (
    <li
      className={`flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-col sm:p-5 ${unavailable ? "opacity-75" : ""}`}
      data-testid={`shop-drink-${drink.goodsId}`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:aspect-square sm:h-auto sm:w-full">
        <DrinkPicture url={drink.image} alt={drink.name} dim={unavailable !== null} />
        {drink.serveTemp && <TempSticker temp={drink.serveTemp} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="text-base font-bold leading-snug text-gray-900 sm:text-lg">{drink.name}</h2>
        {drink.spec && <p className="mt-0.5 text-sm text-muted-foreground">{drink.spec}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
          {!drink.comingSoon && (
            <span className="flex items-baseline gap-2" data-testid={`shop-price-${drink.goodsId}`}>
              <span className="font-display text-2xl font-black text-gray-900">{price}</span>
              {drink.listPricePaise !== null && drink.listPricePaise > drink.pricePaise && (
                <s className="text-sm text-muted-foreground">{formatInr(drink.listPricePaise)}</s>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={onBuy}
            disabled={unavailable !== null || !selling || locked}
            aria-label={unavailable ? `${drink.name}: ${unavailable}` : `${SHOP_COPY.buy} ${drink.name} for ${price}`}
            className="ml-auto inline-flex h-11 min-w-[6.5rem] cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-fill px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary-fill/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600 disabled:shadow-none"
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
      <span className="flex h-full w-full items-center justify-center text-gray-400">
        <CupSoda className="h-8 w-8" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`h-full w-full object-cover ${dim ? "grayscale" : ""}`}
      onError={() => setBroken(true)}
    />
  );
}

function TempSticker({ temp }: { temp: "chilled" | "hot" }) {
  const Icon = temp === "hot" ? Flame : Snowflake;
  return (
    <span
      className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm sm:left-3 sm:top-3 sm:text-xs ${temp === "hot" ? "bg-orange-100 text-orange-800" : "bg-sky-100 text-sky-800"}`}
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

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center" role="alert" data-testid="shop-load-error">
      <p className="font-semibold text-gray-900">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">{SHOP_COPY.loadErrorHint}</p>
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

function MenuSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" aria-busy="true" aria-label="Loading the menu" data-testid="shop-loading">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex animate-pulse gap-4 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-col sm:p-5">
          <span className="h-24 w-24 shrink-0 rounded-xl bg-gray-100 sm:aspect-square sm:h-auto sm:w-full" />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className="h-4 w-3/4 rounded bg-gray-100" />
            <span className="h-3 w-1/3 rounded bg-gray-100" />
            <span className="mt-auto h-11 w-28 self-end rounded-full bg-gray-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SavedOrders({ orders }: { orders: SavedOrder[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5" data-testid="shop-saved">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
        <Receipt className="h-4 w-4 text-primary" aria-hidden />
        {SHOP_COPY.savedTitle}
      </h2>
      <ul className="divide-y divide-gray-100">
        {orders.slice(0, 3).map((order) => (
          <li key={order.token} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-gray-900">{order.drinkName}</span>
              <span className="block text-xs text-muted-foreground">
                {new Date(order.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
              </span>
            </span>
            <a
              href={receiptHref(order.token)}
              className="inline-flex h-11 shrink-0 items-center rounded-full px-4 font-semibold text-primary-ink hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SHOP_COPY.savedOpen}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
