import type { Metadata } from "next";
import GymDemo from "@/pages/GymDemo";

export const metadata: Metadata = {
  title: "Gym Demo | Muscle Box Pro",
  description:
    "See how Muscle Box Pro works inside gyms and how smart shake vending improves member experience and boosts recurring revenue.",
  alternates: { canonical: "/gym-demo" },
  openGraph: { type: "website", url: "/gym-demo" },
};

export default function Page() {
  return <GymDemo />;
}
