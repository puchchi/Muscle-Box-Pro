import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineFiles from "@/pages/admin/AdminMachineFiles";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Machine files | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ sn: string }> }) {
  const { sn } = await params;
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineFiles sn={sn} />
    </Suspense>
  );
}
