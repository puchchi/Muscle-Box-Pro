import type { Metadata } from "next";
import ProteinVendingMachineIndia from "@/pages/ProtienVendingMachineIndia";

export const metadata: Metadata = {
  title: "Protein Vending Machine in India | Muscle Box Pro",
  description:
    "Discover how Muscle Box Pro protein vending machines help gyms increase member convenience and generate additional recurring revenue in India.",
  alternates: { canonical: "/protein-vending-machine-india" },
  openGraph: { type: "website", url: "/protein-vending-machine-india" },
};

export default function Page() {
  return <ProteinVendingMachineIndia />;
}
