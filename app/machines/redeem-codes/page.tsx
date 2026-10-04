import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineRedeemCodes from "@/pages/admin/AdminMachineRedeemCodes";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Redeem codes | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineRedeemCodes />
    </Suspense>
  );
}
