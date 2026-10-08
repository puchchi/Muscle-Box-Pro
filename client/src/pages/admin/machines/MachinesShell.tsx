"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  CupSoda,
  LogOut,
  MessageSquare,
  MonitorPlay,
  Package,
  Percent,
  QrCode,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { apiBaseUrl } from "@/lib/apiClient";
import { ROLE_LABEL, type MachineViewer, type Permission, type ViewerRole } from "@shared/admin/viewerSchema";
import { useNewFeedbackCount } from "./newFeedbackCount";
import { useMachineSignOut, ViewerProvider } from "./viewer";

type NavItem = { href: string; label: string; id: string; icon: LucideIcon; needs: Permission | Permission[]; shop?: true };

const GROUPS = [
  {
    label: "Fleet",
    items: [
      { href: "/machines", label: "Machines", id: "machines", icon: CupSoda, needs: "machines.list.view" },
      { href: "/machines/statistics", label: "Statistics", id: "statistics", icon: BarChart3, needs: "stats.view" },
      { href: "/machines/logs", label: "Logs", id: "logs", icon: ScrollText, needs: ["logs.equipment.view", "logs.operations.view"] },
      { href: "/machines/operators", label: "Operators", id: "operators", icon: UserCog, needs: "operators.view" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/machines/orders", label: "Orders", id: "orders", icon: ClipboardList, needs: "orders.view" },
      { href: "/machines/shop-orders", label: "Shop orders", id: "shopOrders", icon: ShoppingBag, needs: "shopOrders.view", shop: true },
      { href: "/machines/customers", label: "Customers", id: "customers", icon: Users, needs: "customers.view", shop: true },
      { href: "/machines/redeem-codes", label: "Redeem codes", id: "redeemCodes", icon: Ticket, needs: "redeemCodes.view" },
      { href: "/machines/feedback", label: "Feedback", id: "feedback", icon: MessageSquare, needs: "feedback.view" },
    ],
  },
  {
    label: "Menu",
    items: [
      { href: "/machines/goods", label: "Goods library", id: "goods", icon: Package, needs: "goodsLibrary.view" },
      { href: "/machines/materials", label: "Materials", id: "materials", icon: Boxes, needs: "materials.view" },
      { href: "/machines/discounts", label: "Discounts", id: "discounts", icon: Percent, needs: "discounts.view" },
      { href: "/machines/new-products", label: "New products", id: "newProducts", icon: Sparkles, needs: "newProducts.view" },
    ],
  },
  {
    label: "On screen",
    items: [
      { href: "/machines/ads", label: "Ads", id: "ads", icon: MonitorPlay, needs: "ads.view" },
      { href: "/machines/voices", label: "Voice prompts", id: "voices", icon: Volume2, needs: "voiceDefaults.view" },
      { href: "/machines/qr", label: "QR and logo", id: "qr", icon: QrCode, needs: "qr.view" },
    ],
  },
] as const satisfies ReadonlyArray<{ label: string; items: ReadonlyArray<NavItem> }>;

const shopConfigured = apiBaseUrl("shopAdmin") !== null;

const allows = (viewer: MachineViewer, needs: NavItem["needs"]) =>
  (Array.isArray(needs) ? needs : [needs]).some((p) => viewer.can.has(p));

const visibleGroups = (viewer: MachineViewer) =>
  GROUPS.map((g) => ({
    label: g.label,
    items: (g.items as ReadonlyArray<NavItem>).filter((s) => (!s.shop || shopConfigured) && allows(viewer, s.needs)),
  })).filter((g) => g.items.length > 0);

const ALL_ITEMS: ReadonlyArray<NavItem> = GROUPS.flatMap((g) => g.items as ReadonlyArray<NavItem>);

const BACK_LINK: Record<ViewerRole, { href: string; label: string } | null> = {
  admin: { href: "/admin", label: "Back to admin" },
  franchise: { href: "/franchise/dashboard", label: "Back to your dashboard" },
  gym: { href: "/gym/dashboard", label: "Back to your dashboard" },
  operator: null,
};

export type MachineSection = (typeof GROUPS)[number]["items"][number]["id"];

export function NoAccess() {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-8 text-center" data-testid="machines-no-access">
      <p className="font-semibold text-foreground">You don&apos;t have access to this page.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        <Link href="/machines" className="text-primary hover:underline">
          Go to your machines
        </Link>
      </p>
    </div>
  );
}

export function MachinesShell({
  session,
  section,
  needs,
  children,
}: {
  session: MachineViewer;
  section: MachineSection;
  needs?: NavItem["needs"];
  children: React.ReactNode;
}) {
  return (
    <ViewerProvider value={session}>
      <Shell session={session} section={section} needs={needs}>
        {children}
      </Shell>
    </ViewerProvider>
  );
}

function Shell({
  session,
  section,
  needs,
  children,
}: {
  session: MachineViewer;
  section: MachineSection;
  needs?: NavItem["needs"];
  children: React.ReactNode;
}) {
  const handleSignOut = useMachineSignOut();
  const newFeedback = useNewFeedbackCount(session.can.has("feedback.view"));
  const groups = visibleGroups(session);
  const current = ALL_ITEMS.find((item) => item.id === section);
  const allowed = (!current || allows(session, current.needs)) && (!needs || allows(session, needs));
  const back = BACK_LINK[session.role];
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    if (nav.scrollHeight > nav.clientHeight) nav.scrollTop = active.offsetTop - (nav.clientHeight - active.offsetHeight) / 2;
  }, [section]);

  return (
    <div className="dark theme-console min-h-screen bg-background text-foreground lg:flex">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Link href="/machines" className="block">
            <span className="block font-display text-sm font-black uppercase tracking-tight text-foreground">
              MBP machines
            </span>
            <span className="hidden text-xs text-muted-foreground lg:block">
              {session.role === "admin" ? "Vending fleet console" : `${ROLE_LABEL[session.role]} console`}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer lg:hidden"
            data-testid="button-signout-mobile"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>

        <nav
          ref={navRef}
          aria-label="Machine console"
          className="relative flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:px-3 lg:pb-3"
        >
          {groups.map((group, i) => (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className={`flex shrink-0 gap-1 lg:flex-col lg:gap-0.5 ${i > 0 ? "border-l border-border pl-1 lg:border-l-0 lg:pl-0" : ""}`}
              data-testid={`machines-nav-group-${i}`}
            >
              <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 lg:block" aria-hidden>
                {group.label}
              </p>
              {group.items.map(({ href, label, id, icon: Icon }) => {
                const active = id === section;
                return (
                  <Link
                    key={id}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:py-1.5 ${
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                    data-testid={`machines-tab-${id}`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} aria-hidden />
                    {label}
                    {id === "feedback" && newFeedback > 0 && (
                      <span
                        className="relative ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 tabular-nums text-primary-foreground"
                        data-testid="badge-new-feedback"
                      >
                        {newFeedback}
                        <span className="sr-only"> new</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-border px-3 py-4 lg:block">
          {back && (
            <Link
              href={back.href}
              className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              data-testid="link-back-to-admin"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {back.label}
            </Link>
          )}
          <div className="flex items-center justify-between gap-2 px-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground" data-testid="shell-admin">
              {session.name}
              {session.role !== "admin" && <span className="block text-[11px] text-muted-foreground/70">{ROLE_LABEL[session.role]}</span>}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              data-testid="button-signout"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{allowed ? children : <NoAccess />}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          {back && (
            <Link
              href={back.href}
              className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {back.label}
            </Link>
          )}
          {session.role === "admin" && (
            <p className="text-xs text-muted-foreground" data-testid="admin-api-host">
              API: {apiBaseUrl("machineAdmin") ?? "not configured"}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
