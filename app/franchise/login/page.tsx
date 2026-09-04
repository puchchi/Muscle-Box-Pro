import type { Metadata } from "next";
import FranchiseLogin from "@/pages/franchise/FranchiseLogin";

export const metadata: Metadata = {
  title: "Franchise Login | MuscleBoxPro",
  description: "Sign in to your MuscleBoxPro franchise portal.",
  alternates: { canonical: "/franchise/login" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/franchise/login", title: "Franchise Login | MuscleBoxPro", description: "Sign in to your MuscleBoxPro franchise portal." },
};

export default function Page() {
  return <FranchiseLogin />;
}
