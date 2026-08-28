import type { Metadata } from "next";
import AdminInbox from "@/pages/admin/AdminInbox";

export const metadata: Metadata = {
  title: "Inbox | MBP admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminInbox />;
}
