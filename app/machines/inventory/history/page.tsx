import type { Metadata } from "next";
import AdminInventoryHistory from "@/pages/admin/AdminInventoryHistory";

export const metadata: Metadata = {
  title: "Stock history | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInventoryHistory />;
}
