import type { Metadata } from "next";
import AdminMachineAdDetail from "@/pages/admin/AdminMachineAdDetail";

export const metadata: Metadata = {
  title: "Ad | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;
  return <AdminMachineAdDetail adId={adId} />;
}
