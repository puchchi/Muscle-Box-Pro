import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineLogs from "@/pages/admin/AdminMachineLogs";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Machine logs | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineLogs />
    </Suspense>
  );
}
