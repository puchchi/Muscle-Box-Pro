import type { Metadata } from "next";
import AdminHome from "@/pages/admin/AdminHome";

export const metadata: Metadata = {
  title: "Admin | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminHome />;
}
