"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-display font-black text-sm uppercase tracking-tight text-foreground"
            >
              MBP admin
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/gyms"
                className="text-muted-foreground hover:text-foreground"
                data-testid="link-gyms"
              >
                Gyms
              </Link>
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

      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>

      <footer className="max-w-5xl mx-auto px-6 pb-10">
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

/** What every admin page shows while `useAdminGuard` is still asking. */
export function AdminChecking() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Checking your session…
    </div>
  );
}
