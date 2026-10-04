import type { Metadata } from "next";
import AdminMachineOrderDetail from "@/pages/admin/AdminMachineOrderDetail";

export const metadata: Metadata = {
  title: "Machine order | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <AdminMachineOrderDetail orderId={orderId} />;
}
