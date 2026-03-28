import type { Metadata } from "next";
import GymDemo from "@/pages/GymDemo";

export const metadata: Metadata = {
  title: "Gym Demo | Muscle Box Pro",
  description:
    "See how Muscle Box Pro works inside gyms and how smart shake vending improves member experience and boosts recurring revenue.",
  alternates: { canonical: "/gym-demo" },
  openGraph: { type: "website", url: "/gym-demo" },
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
