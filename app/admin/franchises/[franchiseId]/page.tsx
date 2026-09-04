import type { Metadata } from "next";
import AdminFranchiseDetail from "@/pages/admin/AdminFranchiseDetail";

export const metadata: Metadata = {
  title: "Franchise | MBP admin",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ franchiseId: string }> }) {
  const { franchiseId } = await params;
  return <AdminFranchiseDetail franchiseId={franchiseId} />;
}
