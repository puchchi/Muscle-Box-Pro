import type { Metadata } from "next";
import AdminMachineRedeemCodeNew from "@/pages/admin/AdminMachineRedeemCodeNew";

export const metadata: Metadata = {
  title: "Add redeem code | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineRedeemCodeNew />;
}
