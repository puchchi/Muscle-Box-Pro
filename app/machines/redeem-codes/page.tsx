import type { Metadata } from "next";
import AdminMachineRedeemCodes from "@/pages/admin/AdminMachineRedeemCodes";

export const metadata: Metadata = {
  title: "Redeem codes | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineRedeemCodes />;
}
