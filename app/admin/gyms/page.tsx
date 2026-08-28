import type { Metadata } from "next";
import AdminGyms from "@/pages/admin/AdminGyms";

export const metadata: Metadata = {
  title: "Gyms | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminGyms />;
}
