import type { Metadata } from "next";
import MachineSpecs from "@/pages/MachineSpecs";

export const metadata: Metadata = {
  title: "Machine Specifications | MuscleBoxPro",
  description:
    "Explore the technical specifications and capabilities of MuscleBoxPro smart protein shake vending machines for modern gyms.",
  alternates: { canonical: "/specs" },
  openGraph: {
    type: "website",
    url: "/specs",
    title: "Machine Specifications | MuscleBoxPro",
    description: "Explore the technical specifications and capabilities of MuscleBoxPro smart protein shake vending machines for modern gyms.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Machine Specs", item: "https://www.muscleboxpro.com/specs" },
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://www.muscleboxpro.com/specs#product",
  name: "MuscleBoxPro Protein Shake Vending Machine",
  description:
    "Technical specifications of the MuscleBoxPro automated protein shake vending machine for gyms: 60s blend time, UPI payments, HD 4K display, self-cleaning system, under 10 sq ft footprint.",
  brand: { "@type": "Brand", name: "MuscleBoxPro" },
  manufacturer: { "@type": "Organization", name: "BlendBox Innovations LLP" },
  image: "https://www.muscleboxpro.com/assets/machine/machine_with_plane_bg.png",
  url: "https://www.muscleboxpro.com/specs",
  additionalProperty: [
    { "@type": "PropertyValue", name: "Blend Time", value: "60 seconds" },
    { "@type": "PropertyValue", name: "Shake Variants", value: "12" },
    { "@type": "PropertyValue", name: "Payment Options", value: "UPI, Credit Card, Debit Card" },
    { "@type": "PropertyValue", name: "Display", value: "HD 4K Advertising Display" },
    { "@type": "PropertyValue", name: "Footprint", value: "Less than 10 sq ft" },
    { "@type": "PropertyValue", name: "Cleaning System", value: "Automated self-cleaning after each use" },
    { "@type": "PropertyValue", name: "Operation", value: "24/7, zero staff required" },
  ],
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    price: "0",
    availability: "https://schema.org/InStock",
    priceValidUntil: "2026-12-31",
    seller: { "@type": "Organization", name: "MuscleBoxPro" },
    description: "Free installation with revenue-sharing model",
  },
};

export default function Page() {
  return (
    <>
      <MachineSpecs />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
