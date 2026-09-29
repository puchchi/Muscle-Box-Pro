import type { Metadata } from "next";
import AdminMachineGoodEdit from "@/pages/admin/AdminMachineGoodEdit";

export const metadata: Metadata = {
  title: "Goods | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ goodsId: string }> }) {
  const { goodsId } = await params;
  return <AdminMachineGoodEdit goodsId={goodsId} />;
}
