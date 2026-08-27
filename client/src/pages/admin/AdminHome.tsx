"use client";

import Link from "next/link";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { formatIstDateTime } from "./adminFormat";

/**
 * What an admin sees after signing in — proof that the session stuck, and the way in.
 *
 * This is not a placeholder in the "fill it in later" sense. It is the smallest page that
 * answers the question the login page cannot: **did the session actually stick?** Login
 * succeeding only proves the password was right; a cookie the browser refused to store, or a
 * sandbox token that never reached the header, both look like a successful login and then fail
 * on the first real request. So this page makes one authenticated call — `GET /admin/me`, via
 * `useAdminGuard` — and renders what it says.
 *
 * That makes it the first thing to open when the integration is misbehaving. The API host is
 * printed by `AdminShell` for the same reason.
 *
 * The probe, the chrome and the IST formatter used to live here inline. They moved out when the
 * Gyms pages needed them — `useAdminGuard` for the redirect ordering, `AdminShell` for the
 * sign-out cache eviction, `adminFormat` for the timestamp. A second copy of any of those is a
 * second thing to get wrong.
 */

export default function AdminHome() {
  const guard = useAdminGuard();
  if (guard.state !== "ready") return <AdminChecking />;
  const { session } = guard;

  return (
    <AdminShell session={session}>
      <div className="max-w-lg">
        <h1
          className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
          data-testid="admin-home-heading"
        >
          Signed in
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          The session is live and authenticating requests.
        </p>

        <dl className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
          <Row label="Name" value={session.displayName} testId="admin-name" />
          <Row label="Email" value={session.email} testId="admin-email" />
          <Row label="Role" value={session.role} testId="admin-role" />
          {/*
            §9.3: sessions last 12 hours and do not refresh. Shown rather than hidden because
            the failure mode of not refreshing is a 401 halfway through an invite form, and an
            admin who can see the time can finish first.
          */}
          <Row
            label="Session expires"
            value={session.expiresAt ? formatIstDateTime(session.expiresAt) : "Unknown"}
            testId="admin-expires"
          />
        </dl>

        <p className="text-sm text-muted-foreground mt-8">
          <Link href="/admin/gyms" className="font-semibold text-foreground hover:underline">
            Gyms
          </Link>: every gym and where it is in onboarding.
        </p>
      </div>
    </AdminShell>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
