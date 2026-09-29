import type { Metadata } from "next";
import AdminMachineRedeemCodeDetail from "@/pages/admin/AdminMachineRedeemCodeDetail";

export const metadata: Metadata = {
  title: "Redeem code | MBP machines",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AdminMachineRedeemCodeDetail code={code} />;
}
