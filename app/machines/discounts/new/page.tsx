import type { Metadata } from "next";
import AdminMachinePromotionNew from "@/pages/admin/AdminMachinePromotionNew";

export const metadata: Metadata = {
  title: "Add discount | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachinePromotionNew kind="discount" />;
}
