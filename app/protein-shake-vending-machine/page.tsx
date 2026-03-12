import type { Metadata } from "next";
import ProteinShakeVendingMachine from "@/pages/ProtienShakeVendingMachine";

export const metadata: Metadata = {
  title: "Protein Shake Vending Machine | Muscle Box Pro",
  description:
    "Discover how Muscle Box Pro protein shake vending machines help gyms increase member convenience and generate additional recurring revenue.",
  alternates: { canonical: "/protein-shake-vending-machine" },
  openGraph: { type: "website", url: "/protein-shake-vending-machine" },
};

export default function Page() {
  return <ProteinShakeVendingMachine />;
}
