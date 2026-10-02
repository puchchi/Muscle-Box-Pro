import type { Metadata } from "next";
import AdminShopCustomers from "@/pages/admin/AdminShopCustomers";

export const metadata: Metadata = {
  title: "Customers | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminShopCustomers />;
}
