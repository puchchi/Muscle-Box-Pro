import type { Metadata } from "next";
import AdminInventoryStock from "@/pages/admin/AdminInventoryStock";

export const metadata: Metadata = {
  title: "Stock | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInventoryStock />;
}
