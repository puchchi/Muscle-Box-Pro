import type { Metadata } from "next";
import BlogBestProteinShake from "@/pages/BlogBestProteinShake";

export const metadata: Metadata = {
  title: "The Best Protein Shake After a Workout: Whey vs. Plant | MuscleBoxPro",
  description: "Discover the science behind the best post-workout protein shakes. Compare whey and plant protein to find the perfect recovery drink.",
  alternates: { canonical: "/blog/best-protein-shake-after-workout" },
  openGraph: {
    type: "article",
    url: "/blog/best-protein-shake-after-workout",
    title: "The Best Protein Shake After a Workout: Whey vs. Plant | MuscleBoxPro",
    description: "Discover the science behind the best post-workout protein shakes. Compare whey and plant protein to find the perfect recovery drink.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "Best protein shake after workout" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.muscleboxpro.com/blog" },
    { "@type": "ListItem", position: 3, name: "Best Protein Shake After a Workout", item: "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout" },
  ],
};

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout#article",
  headline: "The Best Protein Shake After a Workout: Whey vs. Plant",
  description:
    "Discover the science behind the best post-workout protein shakes. Compare whey and plant protein to find the perfect recovery drink.",
  url: "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout",
  datePublished: "2026-01-20",
  dateModified: "2026-03-29",
  image: "https://www.muscleboxpro.com/images/chocolate_banana_milk_protein_shake.png",
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
    "@id": "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout",
  },
  citation: [
    {
      "@type": "ScholarlyArticle",
      name: "Whey Protein Stimulates Greater Muscle Protein Synthesis Than Casein or Soy",
      url: "https://academic.oup.com/ajcn/article/89/1/161/4598335",
      publisher: { "@type": "Organization", name: "American Journal of Clinical Nutrition" },
    },
    {
      "@type": "ScholarlyArticle",
      name: "Pea Protein vs Whey in Resistance Training",
      url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-015-0087-9",
      publisher: { "@type": "Organization", name: "Journal of the International Society of Sports Nutrition" },
    },
    {
      "@type": "ScholarlyArticle",
      name: "NIH: Dietary Protein and Muscle Protein Synthesis",
      url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5852756/",
      publisher: { "@type": "GovernmentOrganization", name: "National Institutes of Health (NIH)" },
    },
  ],
};

export default function Page() {
  return (
    <>
      <BlogBestProteinShake />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
