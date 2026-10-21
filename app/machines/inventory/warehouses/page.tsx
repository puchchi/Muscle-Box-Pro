import type { Metadata } from "next";
import AdminInventoryWarehouses from "@/pages/admin/AdminInventoryWarehouses";

export const metadata: Metadata = {
  title: "Warehouses | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInventoryWarehouses />;
}
