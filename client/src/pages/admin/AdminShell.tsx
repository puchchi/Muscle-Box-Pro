"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CupSoda, Dumbbell, Inbox, LayoutDashboard, LogOut, MessageSquare, Store, type LucideIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ADMIN_SESSION_QUERY_KEY, signOutAsAdmin, type AdminSession } from "@/lib/adminSession";
import { forgetVerifiedSession } from "./useAdminGuard";
import { BEARER_SESSION_ALLOWED, MBP_API_BASE_URL } from "@/lib/apiClient";
import { formatIstDateTime } from "./adminFormat";

/**
 * The chrome every signed-in admin page sits in: who you are, where you can go, how to leave.
 *
 * One component rather than a copy per page, because sign-out has an ordering requirement that
 * is invisible if you get it wrong — see `handleSignOut` — and because the API host in the
 * footer is the first thing to check when the panel is mysteriously empty.
 *
 * `dark theme-console` is unconditional and belongs on this element specifically: nothing under
 * `admin/` renders in a portal, so every page, card and pill inherits from here. It is not a
 * preference and there is no light variant to fall back to — the whole tree was converted off
 * `bg-white` and `text-gray-700` onto the semantic tokens to make this work, so removing the
 * class leaves near-white cards under near-white text rather than the old light panel.
 */
export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const handleSignOut = useAdminSignOut();

  return (
    <div className="dark theme-console min-h-screen bg-background text-foreground lg:flex">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <Link href="/admin" className="block">
            <span className="block font-display text-sm font-black uppercase tracking-tight text-foreground">MBP admin</span>
            <span className="hidden text-xs text-muted-foreground lg:block">Gyms and franchises</span>
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
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {SECTIONS.map(({ href, label, testId, icon, exact }) => (
            <NavLink key={href} href={href} pathname={pathname} testId={testId} icon={icon} exact={exact}>
              {label}
            </NavLink>
          ))}
          <div className="hidden lg:my-2 lg:block lg:border-t lg:border-border" aria-hidden />
          <NavLink href="/machines" pathname={pathname} testId="link-machines" icon={CupSoda}>
            Machine console
          </NavLink>
        </nav>

        <div className="hidden border-t border-border px-5 py-4 lg:block" data-testid="shell-session">
          <p className="truncate text-sm font-semibold text-foreground" data-testid="shell-admin">
            {session.displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground" data-testid="admin-email">
            {session.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="capitalize" data-testid="admin-role">
              {session.role}
            </span>
            {" · Session ends "}
            <span className="tabular-nums" data-testid="admin-expires">
              {session.expiresAt ? formatIstDateTime(session.expiresAt) : "Unknown"}
            </span>
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="-ml-2 mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            data-testid="button-signout"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          {/*
            Not a leak — the origin is in the JS bundle either way. It is here because pointing a
            build at the wrong stage is the most common way for all of this to be mysteriously
            broken, and the two candidate sandbox gateways in `mbp-backend` differ by six
            characters.
          */}
          <p className="text-xs text-muted-foreground" data-testid="admin-api-host">
            API: {MBP_API_BASE_URL}
            {BEARER_SESSION_ALLOWED && " · non-production host, bearer session in use"}
          </p>
        </footer>
      </div>
    </div>
  );
}

const SECTIONS: ReadonlyArray<{ href: string; label: string; testId: string; icon: LucideIcon; exact?: boolean }> = [
  { href: "/admin", label: "Overview", testId: "link-overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/gyms", label: "Gyms", testId: "link-gyms", icon: Dumbbell },
  { href: "/admin/franchises", label: "Franchises", testId: "link-franchises", icon: Store },
  { href: "/admin/inbox", label: "Inbox", testId: "link-inbox", icon: Inbox },
  { href: "/admin/leads", label: "Enquiries", testId: "link-leads", icon: MessageSquare },
];

export function useAdminSignOut() {
  const router = useRouter();

  return async function handleSignOut() {
    // The result is not checked, for the same reason the gym portal does not check its own:
    // only the server can expire an `HttpOnly` cookie, and an admin who has pressed this must
    // leave the screen whether or not the call landed.
    await signOutAsAdmin();
    forgetVerifiedSession();
    // `removeQueries` rather than `invalidateQueries`, and **all** admin queries rather than
    // just the session. Invalidating leaves one admin's gym list in the cache for whoever
    // signs in next while the refetch is in flight; scoping it to the session key alone would
    // leave the gym data behind entirely, which is the same leak with an extra step.
    queryClient.removeQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["admin"] });
    router.replace("/admin/login");
  };
}

/**
 * A nav link that knows whether it is the page you are on.
 *
 * `exact` exists because `/admin` is a prefix of every other admin route, so the prefix match that
 * keeps `Gyms` lit on a gym's detail page would keep `Overview` lit everywhere. `aria-current`
 * rather than colour alone: the highlight is the only thing distinguishing two links that otherwise
 * read identically, and colour is not an indicator a screen reader has.
 */
function NavLink({
  href,
  pathname,
  testId,
  icon: Icon,
  exact = false,
  children,
}: {
  href: string;
  pathname: string;
  testId: string;
  icon: LucideIcon;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} aria-hidden />
      {children}
    </Link>
  );
}

/** What every admin page shows while `useAdminGuard` is still asking. */
export function AdminChecking() {
  return (
    <div className="dark theme-console min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Checking your session…
    </div>
  );
}
