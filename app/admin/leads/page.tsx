import type { Metadata } from "next";
import AdminLeads from "@/pages/admin/AdminLeads";

export const metadata: Metadata = {
  title: "Enquiries | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminLeads />;
}
