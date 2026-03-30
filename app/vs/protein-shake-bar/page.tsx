import type { Metadata } from "next";
import VsProteinShakeBar from "@/pages/VsProteinShakeBar";

/* ─── SEO Metadata ─────────────────────────────────────────────────
   Primary keyword   : protein shake bar vs vending machine gym
   Secondary keywords: protein shake bar gym india, automated shake machine vs bar,
                       gym nutrition revenue india, protein vending machine india 2026
   ─────────────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "Protein Shake Vending Machine vs. Protein Shake Bar (2026) | MuscleBoxPro",
  description:
    "Protein shake bar vs vending machine for your gym — a detailed 2026 comparison across upfront cost, staff, hygiene, 24/7 availability, and revenue. See which model wins for Indian gym owners.",
  alternates: { canonical: "/vs/protein-shake-bar" },
  openGraph: {
    type: "article",
    url: "/vs/protein-shake-bar",
    title: "Protein Shake Vending Machine vs. Protein Shake Bar (2026)",
    description:
      "10-dimension comparison: automated protein shake machine vs. a staffed shake bar. Cost, hygiene, revenue, and 24/7 availability for Indian gyms.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630 }],
  },
  keywords: [
    "protein shake bar vs vending machine gym",
    "protein shake bar gym india",
    "automated shake machine vs bar",
    "gym nutrition revenue india",
    "protein vending machine india 2026",
    "passive income gym india",
    "best gym nutrition option india",
    "gym shake counter vs machine",
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
      name: "Protein Shake Bar vs Vending Machine",
      item: "https://www.muscleboxpro.com/vs/protein-shake-bar",
    },
  ],
};

/* ─── Article Schema ─── */
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://www.muscleboxpro.com/vs/protein-shake-bar#article",
  headline: "Protein Shake Vending Machine vs. Protein Shake Bar: Which Is Better for Your Gym?",
  description:
    "A balanced 10-dimension comparison of automated protein shake vending machines (MuscleBoxPro) vs. staffed protein shake bars for Indian gym owners in 2026.",
  author: {
    "@type": "Organization",
    name: "BlendBox Innovations LLP",
    url: "https://www.muscleboxpro.com",
  },
  publisher: {
    "@type": "Organization",
    name: "MuscleBoxPro",
    logo: { "@type": "ImageObject", url: "https://www.muscleboxpro.com/favicon.png", width: 507, height: 520 },
  },
  datePublished: "2026-01-15",
  dateModified: "2026-03-29",
  url: "https://www.muscleboxpro.com/vs/protein-shake-bar",
  image: "https://www.muscleboxpro.com/og-image.png",
  inLanguage: "en-IN",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.muscleboxpro.com/vs/protein-shake-bar",
  },
  about: [
    { "@type": "Thing", name: "Protein Shake Vending Machine" },
    { "@type": "Thing", name: "Protein Shake Bar" },
    { "@type": "Thing", name: "Gym Revenue India" },
  ],
};

export default function Page() {
  return (
    <>
      <VsProteinShakeBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
