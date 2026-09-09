import { Suspense } from "react";
import type { Metadata } from "next";
import AdminInviteGym from "@/pages/admin/AdminInviteGym";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Invite a gym | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminInviteGym />
    </Suspense>
  );
}
