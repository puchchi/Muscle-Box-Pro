import type { Metadata } from "next";
import ProteinVendingMachineIndia from "@/pages/ProtienVendingMachineIndia";
import GymDemo from "@/pages/GymDemo";
import GymProteinShakeMachine from "@/pages/GymProtienShakeMachine";

export const metadata: Metadata = {
  title: "Gym Protein Shake Machine | Muscle Box Pro",
  description:
    "Discover how Muscle Box Pro gym protein shake machines help gyms increase member convenience and generate additional recurring revenue.",
  alternates: { canonical: "/gym-protein-shake-machine" },
  openGraph: { type: "website", url: "/gym-protein-shake-machine" },
};

export default function Page() {
  return <GymProteinShakeMachine />;
}
