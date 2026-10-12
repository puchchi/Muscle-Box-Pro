import type { Metadata } from "next";
import FranchiseDashboard from "@/pages/franchise/FranchiseDashboard";

export const metadata: Metadata = {
  title: "Sales and payouts | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FranchiseDashboard view="payouts" />;
}
