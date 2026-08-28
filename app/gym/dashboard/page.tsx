import type { Metadata } from "next";
import GymDashboard from "@/pages/gym/GymDashboard";

export const metadata: Metadata = {
  title: "Partner Dashboard | MuscleBoxPro",
  description: "Track your machine, cups sold, revenue and payout share.",
  alternates: { canonical: "/gym/dashboard" },
  robots: { index: false, follow: false },
  openGraph: { type: "website", url: "/gym/dashboard", title: "Partner Dashboard | MuscleBoxPro", description: "Track your machine, cups sold, revenue and payout share." },
};

export default function Page() {
  return <GymDashboard />;
}
