import type { Metadata } from "next";
import AdminMachineAssets from "@/pages/admin/AdminMachineAssets";

export const metadata: Metadata = {
  title: "Machine assets | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineAssets />;
}
