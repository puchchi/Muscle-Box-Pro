import type { Metadata } from "next";
import ContactUs from "@/pages/ContactUs";

export const metadata: Metadata = {
  title: "Contact Us | MuscleBoxPro",
  description:
    "Contact MuscleBoxPro for partnerships, machine placement, support, and business inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    title: "Contact Us | MuscleBoxPro",
    description: "Contact MuscleBoxPro for partnerships, machine placement, support, and business inquiries.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Contact Us", item: "https://www.muscleboxpro.com/contact" },
  ],
};

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://www.muscleboxpro.com/contact#webpage",
  name: "Contact MuscleBoxPro",
  url: "https://www.muscleboxpro.com/contact",
  description:
    "Contact MuscleBoxPro for partnerships, machine placement, support, and business inquiries.",
  inLanguage: "en",
  isPartOf: { "@id": "https://www.muscleboxpro.com/#website" },
  mainEntity: { "@id": "https://www.muscleboxpro.com/#organization" },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ContactUs />
    </>
  );
}
