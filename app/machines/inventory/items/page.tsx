import type { Metadata } from "next";
import AdminInventoryItems from "@/pages/admin/AdminInventoryItems";

export const metadata: Metadata = {
  title: "Stock items | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInventoryItems />;
}
