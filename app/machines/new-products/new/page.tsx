import type { Metadata } from "next";
import AdminMachinePromotionNew from "@/pages/admin/AdminMachinePromotionNew";

export const metadata: Metadata = {
  title: "Add new-product promotion | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachinePromotionNew kind="new" />;
}
