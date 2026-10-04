import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineOrders from "@/pages/admin/AdminMachineOrders";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Machine orders | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineOrders />
    </Suspense>
  );
}
