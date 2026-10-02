"use client";

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
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { AdminSession } from "@/lib/adminSession";
import { apiBaseUrl } from "@/lib/apiClient";
import { useAdminSignOut } from "../AdminShell";
import { useNewFeedbackCount } from "./newFeedbackCount";

const SECTIONS = [
  { href: "/machines", label: "Machines", id: "machines", icon: CupSoda },
  { href: "/machines/goods", label: "Goods library", id: "goods", icon: Package },
  { href: "/machines/materials", label: "Materials", id: "materials", icon: Boxes },
  { href: "/machines/ads", label: "Ads", id: "ads", icon: MonitorPlay },
  { href: "/machines/voices", label: "Voice prompts", id: "voices", icon: Volume2 },
  { href: "/machines/qr", label: "QR and logo", id: "qr", icon: QrCode },
  { href: "/machines/discounts", label: "Discounts", id: "discounts", icon: Percent },
  { href: "/machines/new-products", label: "New products", id: "newProducts", icon: Sparkles },
  { href: "/machines/redeem-codes", label: "Redeem codes", id: "redeemCodes", icon: Ticket },
  { href: "/machines/orders", label: "Orders", id: "orders", icon: ClipboardList },
  { href: "/machines/shop-orders", label: "Shop orders", id: "shopOrders", icon: ShoppingBag, shop: true },
  { href: "/machines/customers", label: "Customers", id: "customers", icon: Users, shop: true },
  { href: "/machines/feedback", label: "Feedback", id: "feedback", icon: MessageSquare },
  { href: "/machines/statistics", label: "Statistics", id: "statistics", icon: BarChart3 },
  { href: "/machines/logs", label: "Logs", id: "logs", icon: ScrollText },
] as const satisfies ReadonlyArray<{ href: string; label: string; id: string; icon: LucideIcon; shop?: true }>;

const VISIBLE_SECTIONS = SECTIONS.filter((s) => !("shop" in s) || apiBaseUrl("shopAdmin") !== null);

export type MachineSection = (typeof SECTIONS)[number]["id"];

export function MachinesShell({
  session,
  section,
  children,
}: {
  session: AdminSession;
  section: MachineSection;
  children: React.ReactNode;
}) {
  const handleSignOut = useAdminSignOut();
  const newFeedback = useNewFeedbackCount();

  return (
    <div className="dark theme-console min-h-screen bg-background text-foreground lg:flex">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Link href="/machines" className="block">
            <span className="block font-display text-sm font-black uppercase tracking-tight text-foreground">
              MBP machines
            </span>
            <span className="hidden text-xs text-muted-foreground lg:block">Vending fleet console</span>
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
          aria-label="Machine console"
          className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0"
        >
          {VISIBLE_SECTIONS.map(({ href, label, id, icon: Icon }) => {
            const active = id === section;
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
        </nav>

        <div className="hidden border-t border-border px-3 py-4 lg:block">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            data-testid="link-back-to-admin"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to admin
          </Link>
          <div className="mt-3 flex items-center justify-between gap-2 px-3">
            <span className="truncate text-xs text-muted-foreground" data-testid="shell-admin">
              {session.displayName}
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
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to admin
          </Link>
          <p className="text-xs text-muted-foreground" data-testid="admin-api-host">
            API: {apiBaseUrl("machineAdmin") ?? "not configured"}
          </p>
        </footer>
      </div>
    </div>
  );
}
