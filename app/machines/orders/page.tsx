import type { Metadata } from "next";
import AdminMachineOrders from "@/pages/admin/AdminMachineOrders";

export const metadata: Metadata = {
  title: "Machine orders | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineOrders />;
}
