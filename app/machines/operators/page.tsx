import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMachineOperators from "@/pages/admin/AdminMachineOperators";
import { AdminChecking } from "@/pages/admin/AdminShell";

export const metadata: Metadata = {
  title: "Operators | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<AdminChecking />}>
      <AdminMachineOperators />
    </Suspense>
  );
}
