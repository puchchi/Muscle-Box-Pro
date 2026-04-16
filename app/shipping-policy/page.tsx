import type { Metadata } from "next";
import ShippingPolicy from "@/pages/ShippingPolicy";

export const metadata: Metadata = {
  title: "Shipping Policy | MuscleBoxPro",
  description:
    "MuscleBoxPro's shipping policy — delivery timelines, shipping charges, order tracking, and returns for protein shake orders across India.",
  alternates: { canonical: "/shipping-policy" },
  openGraph: {
    type: "article",
    url: "/shipping-policy",
    title: "Shipping Policy | MuscleBoxPro",
    description: "MuscleBoxPro's shipping policy — delivery timelines, shipping charges, order tracking, and returns for protein shake orders across India.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "MuscleBoxPro shipping policy" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Shipping Policy", item: "https://www.muscleboxpro.com/shipping-policy" },
  ],
};

export default function Page() {
  return (
    <>
      <ShippingPolicy />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
