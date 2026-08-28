import type { Metadata } from "next";
import VsSupplementCounter from "@/pages/VsSupplementCounter";

/* ─── SEO Metadata ─────────────────────────────────────────────────
   Primary keyword   : gym supplement counter vs vending machine india
   Secondary keywords: supplement counter roi gym india, gym retail counter india,
                       protein vending machine vs supplement shelf, passive gym income india,
                       gym inventory management india
   ─────────────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "Vending Machine vs. Supplement Counter: ROI Analysis for Gym Owners India (2026) | MuscleBoxPro",
  description:
    "Gym supplement counter vs vending machine India: honest ROI analysis. Compare capital required, inventory risk, theft, staff cost, and monthly net income for Indian gym owners in 2026.",
  alternates: { canonical: "/vs/supplement-counter" },
  openGraph: {
    type: "article",
    url: "/vs/supplement-counter",
    title: "Vending Machine vs. Supplement Counter: ROI Analysis for Gym Owners India (2026)",
    description:
      "Which generates more passive income for Indian gyms: a protein shake vending machine or a front-desk supplement counter? Full ROI breakdown, 10-dimension comparison, and honest verdict.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800 }],
  },
  keywords: [
    "gym supplement counter vs vending machine india",
    "supplement counter roi gym india",
    "gym retail counter india",
    "protein vending machine vs supplement shelf",
    "passive gym income india",
    "gym inventory management india",
    "gym revenue ideas india 2026",
    "impulse purchase gym india",
  ],
};

/* ─── Breadcrumb Schema ─── */
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://www.muscleboxpro.com/vs" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Vending Machine vs. Supplement Counter",
      item: "https://www.muscleboxpro.com/vs/supplement-counter",
    },
  ],
};

/* ─── Article Schema ─── */
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://www.muscleboxpro.com/vs/supplement-counter#article",
  headline: "Vending Machine vs. Supplement Counter: ROI Analysis for Gym Owners India",
  description:
    "A balanced ROI analysis comparing automated protein shake vending machines (MuscleBoxPro) vs. traditional front-desk supplement retail counters for Indian gym owners in 2026.",
  author: {
    "@type": "Person",
    name: "Anurag Singh",
    url: "https://www.muscleboxpro.com/about",
  },
  publisher: {
    "@type": "Organization",
    name: "MuscleBoxPro",
    logo: { "@type": "ImageObject", url: "https://www.muscleboxpro.com/favicon.png", width: 507, height: 520 },
  },
  datePublished: "2026-01-15",
  dateModified: "2026-03-29",
  url: "https://www.muscleboxpro.com/vs/supplement-counter",
  image: "https://www.muscleboxpro.com/og-image.jpg",
  inLanguage: "en-IN",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.muscleboxpro.com/vs/supplement-counter",
  },
  about: [
    { "@type": "Thing", name: "Protein Shake Vending Machine" },
    { "@type": "Thing", name: "Supplement Retail Counter" },
    { "@type": "Thing", name: "Gym Passive Income India" },
  ],
};

export default function Page() {
  return (
    <>
      <VsSupplementCounter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
