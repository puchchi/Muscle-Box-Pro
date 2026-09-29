import type { Metadata } from "next";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";

export const metadata: Metadata = {
  title: "Goods library | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineGoods />;
}
