import type { Metadata } from "next";
import BlogProteinDiabetes from "@/pages/BlogProteinDiabetes";

export const metadata: Metadata = {
  title: "Why Protein Is Important for Diabetes Management | MuscleBoxPro",
  description: "Discover how protein helps control blood sugar, the best protein sources for diabetes, and why it's a crucial part of diabetes management.",
  alternates: { canonical: "/blog/protein-for-diabetes" },
  openGraph: {
    type: "article",
    url: "/blog/protein-for-diabetes",
    title: "Why Protein Is Important for Diabetes Management | MuscleBoxPro",
    description: "Discover how protein helps control blood sugar, the best protein sources for diabetes, and why it's a crucial part of diabetes management.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "Protein importance for diabetes management" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.muscleboxpro.com/blog" },
    { "@type": "ListItem", position: 3, name: "Why Protein Is Important for Diabetes Management", item: "https://www.muscleboxpro.com/blog/protein-for-diabetes" },
  ],
};

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.muscleboxpro.com/blog/protein-for-diabetes#article",
  headline: "Why Protein Is Important for Diabetes Management",
  description:
    "Discover how protein helps control blood sugar, the best protein sources for diabetes, and why it's a crucial part of diabetes management.",
  url: "https://www.muscleboxpro.com/blog/protein-for-diabetes",
  datePublished: "2026-02-01",
  dateModified: "2026-03-29",
  image: "https://www.muscleboxpro.com/images/pure_vanilla_protein_shake_in_glass.png",
  inLanguage: "en-IN",
  author: {
    "@type": "Person",
    name: "Rishi Raj Sharma",
    url: "https://www.muscleboxpro.com/about",
  },
  publisher: {
    "@type": "Organization",
    name: "MuscleBoxPro",
    logo: { "@type": "ImageObject", url: "https://www.muscleboxpro.com/favicon.png", width: 507, height: 520 },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.muscleboxpro.com/blog/protein-for-diabetes",
  },
  citation: [
    {
      "@type": "ScholarlyArticle",
      name: "Protein Intake and Glycemic Control in Type 2 Diabetes",
      url: "https://www.japi.org/article/japi-71-12-36",
      publisher: { "@type": "Organization", name: "Journal of the Association of Physicians of India" },
    },
    {
      "@type": "ScholarlyArticle",
      name: "Plant Protein and Diabetes Risk",
      url: "https://www.sciencedirect.com/science/article/pii/S0002916522031902",
      publisher: { "@type": "Organization", name: "American Journal of Clinical Nutrition" },
    },
    {
      "@type": "ScholarlyArticle",
      name: "High Protein Intake and Glycemic Control",
      url: "https://www.mdpi.com/1422-0067/25/20/10959",
      publisher: { "@type": "Organization", name: "International Journal of Molecular Sciences (MDPI)" },
    },
  ],
};

export default function Page() {
  return (
    <>
      <BlogProteinDiabetes />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
