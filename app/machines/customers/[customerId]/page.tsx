import type { Metadata } from "next";
import AdminShopCustomerDetail from "@/pages/admin/AdminShopCustomerDetail";

export const metadata: Metadata = {
  title: "Customer | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <AdminShopCustomerDetail customerId={customerId} />;
}
