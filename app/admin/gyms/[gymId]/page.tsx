import type { Metadata } from "next";
import AdminGymDetail from "@/pages/admin/AdminGymDetail";

export const metadata: Metadata = {
  title: "Gym | MBP admin",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = await params;
  return <AdminGymDetail gymId={gymId} />;
}
