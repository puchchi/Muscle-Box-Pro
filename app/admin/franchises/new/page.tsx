import type { Metadata } from "next";
import AdminInviteFranchise from "@/pages/admin/AdminInviteFranchise";

export const metadata: Metadata = {
  title: "Invite a franchise | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInviteFranchise />;
}
