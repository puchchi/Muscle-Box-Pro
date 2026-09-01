"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { ADMIN_SESSION_QUERY_KEY, signOutAsAdmin, type AdminSession } from "@/lib/adminSession";
import { BEARER_SESSION_ALLOWED, MBP_API_BASE_URL } from "@/lib/apiClient";

/**
 * The chrome every signed-in admin page sits in: who you are, where you can go, how to leave.
 *
 * One component rather than a copy per page, because sign-out has an ordering requirement that
 * is invisible if you get it wrong — see `handleSignOut` — and because the API host in the
 * footer is the first thing to check when the panel is mysteriously empty.
 */
export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  async function handleSignOut() {
    // The result is not checked, for the same reason the gym portal does not check its own:
    // only the server can expire an `HttpOnly` cookie, and an admin who has pressed this must
    // leave the screen whether or not the call landed.
    await signOutAsAdmin();
    // `removeQueries` rather than `invalidateQueries`, and **all** admin queries rather than
    // just the session. Invalidating leaves one admin's gym list in the cache for whoever
    // signs in next while the refetch is in flight; scoping it to the session key alone would
    // leave the gym data behind entirely, which is the same leak with an extra step.
    queryClient.removeQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["admin"] });
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {/*
          `flex-wrap` on both rows, because four tabs plus the brand and the sign-out button no longer
          fit a 390px viewport: without it the right-hand group lands off-screen and the whole document
          scrolls sideways.
        */}
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link
              href="/admin"
              className="font-display font-black text-sm uppercase tracking-tight text-foreground"
            >
              MBP admin
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              <NavLink href="/admin" pathname={pathname} testId="link-overview" exact>
                Overview
              </NavLink>
              <NavLink href="/admin/gyms" pathname={pathname} testId="link-gyms">
                Gyms
              </NavLink>
              <NavLink href="/admin/franchises" pathname={pathname} testId="link-franchises">
                Franchises
              </NavLink>
              {/*
                Two links rather than two sections of the overview, and that is the whole of the
                lazy-loading design: `/admin/inbox` opens an IMAP connection and `/admin/leads` reaches
                Supabase, so both stay unpaid for until somebody clicks.
              */}
              <NavLink href="/admin/inbox" pathname={pathname} testId="link-inbox">
                Inbox
              </NavLink>
              <NavLink href="/admin/leads" pathname={pathname} testId="link-leads">
                Enquiries
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline" data-testid="shell-admin">
              {session.displayName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl cursor-pointer"
              data-testid="button-signout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
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
  );
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
  exact = false,
  children,
}: {
  href: string;
  pathname: string;
  testId: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
        active
          ? "bg-gray-100 text-foreground"
          : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      {children}
    </Link>
  );
}

/** What every admin page shows while `useAdminGuard` is still asking. */
export function AdminChecking() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Checking your session…
    </div>
  );
}
