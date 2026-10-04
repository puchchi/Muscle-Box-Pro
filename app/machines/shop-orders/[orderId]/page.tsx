import type { Metadata } from "next";
import AdminShopOrderDetail from "@/pages/admin/AdminShopOrderDetail";

export const metadata: Metadata = {
  title: "Shop order | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <AdminShopOrderDetail orderId={orderId} />;
}
