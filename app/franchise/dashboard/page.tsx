import type { Metadata } from "next";
import FranchiseDashboard from "@/pages/franchise/FranchiseDashboard";

export const metadata: Metadata = {
  title: "Franchise Dashboard | MuscleBoxPro",
  description: "Your territory, your terms, your instalments and your signed agreement.",
  alternates: { canonical: "/franchise/dashboard" },
  robots: { index: false, follow: false },
  openGraph: { type: "website", url: "/franchise/dashboard", title: "Franchise Dashboard | MuscleBoxPro", description: "Your territory, your terms, your instalments and your signed agreement." },
};

export default function Page() {
  return <FranchiseDashboard />;
}
