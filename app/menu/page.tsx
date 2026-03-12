import type { Metadata } from "next";
import Menu from "@/pages/Menu";

export const metadata: Metadata = {
  title: "Protien Shake Blend Menu | Protein Shake Vending Machine | Muscle Box Pro",
  description:
    "Explore our full menu of 12 scientifically formulated protein shake blends available in our automated vending machines.",
  alternates: { canonical: "/menu" },
  openGraph: { type: "website", url: "/menu" },
};

export default function MenuPage() {
  return <Menu />;
}
