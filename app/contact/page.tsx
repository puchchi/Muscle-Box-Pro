import type { Metadata } from "next";
import ContactUs from "@/pages/ContactUs";

export const metadata: Metadata = {
  title: "Contact Us | Muscle Box Pro",
  description:
    "Contact Muscle Box Pro for partnerships, machine placement, support, and business inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", url: "/contact" },
};

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://www.muscleboxpro.com/contact#webpage",
  name: "Contact Muscle Box Pro",
  url: "https://www.muscleboxpro.com/contact",
  description:
    "Contact Muscle Box Pro for partnerships, machine placement, support, and business inquiries.",
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
      <ContactUs />
    </>
  );
}
