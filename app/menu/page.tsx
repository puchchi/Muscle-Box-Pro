import type { Metadata } from "next";
import Menu from "@/pages/Menu";

export const metadata: Metadata = {
  title: "Protein Shake Blend Menu | Protein Shake Vending Machine | MuscleBoxPro",
  description:
    "Explore our full menu of 12 scientifically formulated protein shake blends available in our automated vending machines.",
  alternates: { canonical: "/menu" },
  openGraph: {
    type: "website",
    url: "/menu",
    title: "Protein Shake Blend Menu | MuscleBoxPro",
    description: "Explore our full menu of 12 scientifically formulated protein shake blends available in our automated vending machines.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "MuscleBoxPro protein shake blends menu" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Menu", item: "https://www.muscleboxpro.com/menu" },
  ],
};

const menuSchema = {
  "@context": "https://schema.org",
  "@type": "Menu",
  name: "MuscleBoxPro Protein Shake Menu",
  url: "https://www.muscleboxpro.com/menu",
  description: "12 fresh protein shake blends available in the MuscleBoxPro automated vending machine, starting from ₹120.",
  hasMenuSection: [
    {
      "@type": "MenuSection",
      name: "Classic",
      hasMenuItem: [
        { "@type": "MenuItem", name: "Pure Whey", description: "Classic whey isolate shake", offers: { "@type": "Offer", price: "120", priceCurrency: "INR" } },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Flavoured Shakes",
      hasMenuItem: [
        { "@type": "MenuItem", name: "Chocolate Pure", offers: { "@type": "Offer", price: "130", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Banana Blend", offers: { "@type": "Offer", price: "150", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Date Delight", offers: { "@type": "Offer", price: "160", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Chocolate Banana", offers: { "@type": "Offer", price: "160", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Chocolate Date", offers: { "@type": "Offer", price: "170", priceCurrency: "INR" } },
      ],
    },
    {
      "@type": "MenuSection",
      name: "Milk-Based",
      hasMenuItem: [
        { "@type": "MenuItem", name: "Creamy Whey", offers: { "@type": "Offer", price: "130", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Creamy Banana", offers: { "@type": "Offer", price: "160", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Creamy Date", offers: { "@type": "Offer", price: "170", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Chocolate Creamy", offers: { "@type": "Offer", price: "140", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Chocolate Creamy Banana", offers: { "@type": "Offer", price: "150", priceCurrency: "INR" } },
        { "@type": "MenuItem", name: "Chocolate Creamy Date", offers: { "@type": "Offer", price: "160", priceCurrency: "INR" } },
      ],
    },
  ],
};

export default function MenuPage() {
  return (
    <>
      <Menu />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
