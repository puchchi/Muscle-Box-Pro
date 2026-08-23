import type { Metadata } from "next";
import AdminInviteGym from "@/pages/admin/AdminInviteGym";

export const metadata: Metadata = {
  title: "Invite a gym | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInviteGym />;
}
