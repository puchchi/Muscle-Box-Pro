import { Suspense } from "react";
import type { Metadata } from "next";
import AdminInviteFranchise from "@/pages/admin/AdminInviteFranchise";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Invite a franchise | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminInviteFranchise />
    </Suspense>
  );
}
