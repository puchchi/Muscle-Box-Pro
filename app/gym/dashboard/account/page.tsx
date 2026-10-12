import type { Metadata } from "next";
import GymDashboard from "@/pages/gym/GymDashboard";

export const metadata: Metadata = {
  title: "Your account | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GymDashboard view="account" />;
}
