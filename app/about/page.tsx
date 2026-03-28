import type { Metadata } from "next";
import AboutUs from "@/pages/AboutUs";

export const metadata: Metadata = {
  title: "About Us | Muscle Box Pro",
  description:
    "Learn about Muscle Box Pro and our mission to deliver on-demand post-workout nutrition through smart gym vending technology.",
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: "/about" },
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://www.muscleboxpro.com/about#webpage",
  name: "About Muscle Box Pro",
  url: "https://www.muscleboxpro.com/about",
  description:
    "Learn about Muscle Box Pro and our mission to deliver on-demand post-workout nutrition through smart gym vending technology.",
  inLanguage: "en",
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
      <AboutUs />
    </>
  );
}
