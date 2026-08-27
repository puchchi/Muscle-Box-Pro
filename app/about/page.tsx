import type { Metadata } from "next";
import AboutUs from "@/pages/AboutUs";

export const metadata: Metadata = {
  title: "About Us | MuscleBoxPro",
  description:
    "Learn about MuscleBoxPro — the company behind the Muscle Box Pro smart vending machine. Our mission: on-demand post-workout nutrition for every gym in India.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    title: "About Us | MuscleBoxPro",
    description: "Learn about MuscleBoxPro and our mission to deliver on-demand post-workout nutrition through smart gym vending technology.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "About Us", item: "https://www.muscleboxpro.com/about" },
  ],
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://www.muscleboxpro.com/about#webpage",
  name: "About MuscleBoxPro",
  url: "https://www.muscleboxpro.com/about",
  description:
    "Learn about MuscleBoxPro — the company behind the Muscle Box Pro smart vending machine. Our mission: on-demand post-workout nutrition for every gym in India.",
  inLanguage: "en-IN",
  isPartOf: { "@id": "https://www.muscleboxpro.com/#website" },
  about: { "@id": "https://www.muscleboxpro.com/#organization" },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AboutUs />
    </>
  );
}
