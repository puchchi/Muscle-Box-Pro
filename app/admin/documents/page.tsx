import type { Metadata } from "next";
import AdminDocuments from "@/pages/admin/AdminDocuments";

export const metadata: Metadata = {
  title: "Documents | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminDocuments />;
}
