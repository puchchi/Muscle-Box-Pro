import type { Metadata } from "next";
import Menu from "@/pages/Menu";

export const metadata: Metadata = {
  title: "Protien Shake Blend Menu | Protein Shake Vending Machine | MuscleBoxPro",
  description:
    "Explore our full menu of 12 scientifically formulated protein shake blends available in our automated vending machines.",
  alternates: { canonical: "/menu" },
  openGraph: { type: "website", url: "/menu" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Menu", item: "https://www.muscleboxpro.com/menu" },
  ],
};

export default function MenuPage() {
  return (
    <>
      <Menu />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
