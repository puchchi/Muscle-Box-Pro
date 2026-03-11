import type { Metadata } from "next";
import MachineSpecs from "@/pages/MachineSpecs";

export const metadata: Metadata = {
  title: "Machine Specifications | Muscle Box Pro",
  description:
    "Explore the technical specifications and capabilities of Muscle Box Pro smart protein shake vending machines for modern gyms.",
  alternates: { canonical: "/specs" },
  openGraph: { type: "website", url: "/specs" },
};

export default function Page() {
  return <MachineSpecs />;
}
