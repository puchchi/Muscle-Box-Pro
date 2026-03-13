import type { Metadata } from "next";
import ProteinVendingMachineIndia from "@/pages/ProtienVendingMachineIndia";

export const metadata: Metadata = {
  title: "Protein Vending Machine India for Gyms | Automated Protein Shake Machine | MuscleBoxPro",
  description:
    "MuscleBoxPro offers automated protein vending machines for gyms in India. Serve fresh protein shakes instantly and generate additional revenue for fitness centers.",
  alternates: { canonical: "/protein-vending-machine-india" },
  openGraph: { type: "website", url: "/protein-vending-machine-india" },
};

export default function Page() {
  return <ProteinVendingMachineIndia />;
}
