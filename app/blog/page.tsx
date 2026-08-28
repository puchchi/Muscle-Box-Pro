import type { Metadata } from "next";
import Blog from "@/pages/Blog";

export const metadata: Metadata = {
  title: "Blog | Nutrition Science, Gym Business & Fitness Tech | MuscleBoxPro",
  description:
    "Explore articles on protein nutrition, gym revenue strategies, and fitness technology from the MuscleBoxPro team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog | MuscleBoxPro",
    description:
      "Nutrition science, gym business insights, and fitness technology from the MuscleBoxPro team.",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.muscleboxpro.com/blog" },
  ],
};

const blogListingSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "MuscleBoxPro Blog",
  url: "https://www.muscleboxpro.com/blog",
  description:
    "Articles on protein nutrition, gym business strategies, and fitness technology.",
  publisher: {
    "@type": "Organization",
    name: "MuscleBoxPro",
    url: "https://www.muscleboxpro.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.muscleboxpro.com/favicon.png",
      width: 507,
      height: 520,
    },
  },
  blogPost: [
    {
      "@type": "BlogPosting",
      headline: "Why Every Gym Should Install a Protein Shake Vending Machine",
      url: "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines",
      datePublished: "2026-01-15",
    },
    {
      "@type": "BlogPosting",
      headline: "The Best Protein Shake After a Workout: Whey vs. Plant",
      url: "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout",
      datePublished: "2026-01-20",
    },
    {
      "@type": "BlogPosting",
      headline: "Why Protein Is Important for Diabetes Management",
      url: "https://www.muscleboxpro.com/blog/protein-for-diabetes",
      datePublished: "2026-02-01",
    },
    {
      "@type": "BlogPosting",
      headline: "How I Dropped My HbA1C from 6.1 to 5.2: A Real Data Story",
      url: "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c",
      datePublished: "2025-10-15",
    },
  ],
};

export default function Page() {
  return (
    <>
      <Blog />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
