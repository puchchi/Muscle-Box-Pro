import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineFeedback from "@/pages/admin/AdminMachineFeedback";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Feedback | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineFeedback />
    </Suspense>
  );
}
