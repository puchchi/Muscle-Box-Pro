import type { Metadata } from "next";
import AdminMachinePromotionDetail from "@/pages/admin/AdminMachinePromotionDetail";

export const metadata: Metadata = {
  title: "New products | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ promoId: string }> }) {
  const { promoId } = await params;
  return <AdminMachinePromotionDetail kind="new" promoId={promoId} />;
}
