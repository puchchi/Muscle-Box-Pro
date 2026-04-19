import type { Metadata } from "next";
import GymDemo from "@/pages/GymDemo";

export const metadata: Metadata = {
  title: "Gym Demo | MuscleBoxPro",
  description:
    "See how the Muscle Box Pro machine works inside gyms — smart shake vending that improves member experience and generates recurring passive revenue for gym owners.",
  alternates: { canonical: "/gym-demo" },
  openGraph: {
    type: "website",
    url: "/gym-demo",
    title: "Gym Demo | MuscleBoxPro",
    description: "See how MuscleBoxPro works inside gyms and how smart shake vending improves member experience and boosts recurring revenue.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Request a Demo", item: "https://www.muscleboxpro.com/gym-demo" },
  ],
};

export default function Page() {
  return (
    <>
      <GymDemo />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
