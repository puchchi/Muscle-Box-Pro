import type { Metadata } from "next";
import AdminMachineQr from "@/pages/admin/AdminMachineQr";

export const metadata: Metadata = {
  title: "QR and logo | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineQr />;
}
