import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineStatistics from "@/pages/admin/AdminMachineStatistics";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Statistics | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineStatistics />
    </Suspense>
  );
}
