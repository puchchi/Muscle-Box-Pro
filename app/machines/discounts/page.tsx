import type { Metadata } from "next";
import AdminMachinePromotions from "@/pages/admin/AdminMachinePromotions";

export const metadata: Metadata = {
  title: "Discounts | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachinePromotions kind="discount" />;
}
