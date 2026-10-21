import type { Metadata } from "next";
import AdminInventoryCosts from "@/pages/admin/AdminInventoryCosts";

export const metadata: Metadata = {
  title: "Cost of drinks | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInventoryCosts />;
}
