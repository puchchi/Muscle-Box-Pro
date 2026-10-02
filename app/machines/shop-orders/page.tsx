import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShopOrders from "@/pages/admin/AdminShopOrders";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Shop orders | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminShopOrders />
    </Suspense>
  );
}
