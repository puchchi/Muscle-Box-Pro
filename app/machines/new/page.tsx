import type { Metadata } from "next";
import AdminMachineNew from "@/pages/admin/AdminMachineNew";

export const metadata: Metadata = {
  title: "Add machine | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineNew />;
}
