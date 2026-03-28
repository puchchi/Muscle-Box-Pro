import type { Metadata } from "next";
import Advertiser from "@/pages/Advertiser";

export const metadata: Metadata = {
  title: "Advertise With Muscle Box Pro",
  description:
    "Reach health-focused gym audiences through high-visibility digital ad placements on Muscle Box Pro smart vending screens.",
  alternates: { canonical: "/advertise" },
  openGraph: { type: "website", url: "/advertise" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Advertise", item: "https://www.muscleboxpro.com/advertise" },
  ],
};

export default function Page() {
  return (
    <>
      <Advertiser />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
