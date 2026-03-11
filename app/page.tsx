import type { Metadata } from "next";
import Home from "@/pages/Home";

export const metadata: Metadata = {
  title: "Muscle Box Pro | Smart Protein Shake Vending Machines for Gyms",
  description:
    "Muscle Box Pro provides smart protein shake vending machines for gyms with zero-maintenance operations, fresh post-workout nutrition for members, and recurring revenue for gym owners.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/" },
};

export default function Page() {
  return <Home />;
}
