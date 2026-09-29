import type { Metadata } from "next";
import AdminMachineGoodNew from "@/pages/admin/AdminMachineGoodNew";

export const metadata: Metadata = {
  title: "New goods | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineGoodNew />;
}
