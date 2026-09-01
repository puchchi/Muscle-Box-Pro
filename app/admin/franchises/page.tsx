import type { Metadata } from "next";
import AdminFranchises from "@/pages/admin/AdminFranchises";

export const metadata: Metadata = {
  title: "Franchises | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminFranchises />;
}
