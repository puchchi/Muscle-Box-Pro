import type { Metadata } from "next";
import AdminMachines from "@/pages/admin/AdminMachines";

export const metadata: Metadata = {
  title: "Machines | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachines />;
}
