import type { Metadata } from "next";
import AdminMachineAds from "@/pages/admin/AdminMachineAds";

export const metadata: Metadata = {
  title: "Ads | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineAds />;
}
