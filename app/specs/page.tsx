import type { Metadata } from "next";
import MachineSpecs from "@/pages/MachineSpecs";

export const metadata: Metadata = {
  title: "Machine Specifications | MuscleBoxPro",
  description:
    "Explore the technical specifications and capabilities of MuscleBoxPro smart protein shake vending machines for modern gyms.",
  alternates: { canonical: "/specs" },
  openGraph: { type: "website", url: "/specs" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Machine Specs", item: "https://www.muscleboxpro.com/specs" },
  ],
};

export default function Page() {
  return (
    <>
      <MachineSpecs />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
