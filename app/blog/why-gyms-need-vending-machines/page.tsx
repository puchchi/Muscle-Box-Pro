import type { Metadata } from "next";
import BlogWhyGymVending from "@/pages/BlogWhyGymVending";

export const metadata: Metadata = {
  title: "Why Every Gym Should Install a Protein Shake Vending Machine | MuscleBoxPro",
  description: "Discover why protein shake vending machines are becoming the most profitable and member-retaining asset for modern gyms.",
  alternates: { canonical: "/blog/why-gyms-need-vending-machines" },
  openGraph: {
    type: "article",
    url: "/blog/why-gyms-need-vending-machines",
    title: "Why Every Gym Should Install a Protein Shake Vending Machine | MuscleBoxPro",
    description: "Discover why protein shake vending machines are becoming the most profitable and member-retaining asset for modern gyms.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "Protein shake vending machine in a modern gym" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.muscleboxpro.com/blog" },
    { "@type": "ListItem", position: 3, name: "Why Every Gym Should Install a Protein Shake Vending Machine", item: "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines" },
  ],
};

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines#article",
  headline: "Why Every Gym Should Install a Protein Shake Vending Machine",
  description:
    "Discover why protein shake vending machines are becoming the most profitable and member-retaining asset for modern gyms.",
  url: "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines",
  datePublished: "2026-01-15",
  dateModified: "2026-03-29",
  image: "https://www.muscleboxpro.com/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png",
  inLanguage: "en",
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
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines",
  },
  citation: [
    {
      "@type": "ScholarlyArticle",
      name: "Nutrient Timing: The Anabolic Window",
      url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5",
      publisher: { "@type": "Organization", name: "Journal of the International Society of Sports Nutrition" },
    },
    {
      "@type": "Article",
      name: "USDA Dietary Guidelines: Protein Needs for Active Adults",
      url: "https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf",
      publisher: { "@type": "GovernmentOrganization", name: "U.S. Department of Agriculture" },
    },
  ],
};

export default function Page() {
  return (
    <>
      <BlogWhyGymVending />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
