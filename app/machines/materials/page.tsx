import type { Metadata } from "next";
import AdminMachineMaterials from "@/pages/admin/AdminMachineMaterials";

export const metadata: Metadata = {
  title: "Materials | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineMaterials />;
}
