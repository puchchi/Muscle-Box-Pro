import type { Metadata } from "next";
import BlogGymRetention from "@/pages/BlogGymRetention";

export const metadata: Metadata = {
  title: "Gym Member Retention: The Role of On-Site Nutrition | MuscleBoxPro",
  description:
    "Discover how on-site protein nutrition reduces gym member churn in India. Data-backed strategies to improve retention through post-workout convenience.",
  alternates: { canonical: "/blog/gym-member-retention" },
  openGraph: {
    type: "article",
    url: "/blog/gym-member-retention",
    title: "Gym Member Retention: The Role of On-Site Nutrition | MuscleBoxPro",
    description: "Discover how on-site protein nutrition reduces gym member churn in India. Data-backed strategies to improve retention through post-workout convenience.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "Gym member retention strategies with on-site nutrition" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.muscleboxpro.com/blog" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Gym Member Retention: The Role of On-Site Nutrition",
      item: "https://www.muscleboxpro.com/blog/gym-member-retention",
    },
  ],
};

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.muscleboxpro.com/blog/gym-member-retention#article",
  headline: "Gym Member Retention: The Role of On-Site Nutrition",
  description:
    "Discover how on-site protein nutrition reduces gym member churn in India. Data-backed strategies to improve retention through post-workout convenience.",
  url: "https://www.muscleboxpro.com/blog/gym-member-retention",
  datePublished: "2026-03-25",
  dateModified: "2026-03-25",
  image: "https://www.muscleboxpro.com/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png",
  inLanguage: "en-IN",
  author: {
    "@type": "Person",
    name: "Anurag Singh",
    url: "https://www.muscleboxpro.com/about",
  },
  publisher: {
    "@type": "Organization",
    name: "MuscleBoxPro",
    logo: {
      "@type": "ImageObject",
      url: "https://www.muscleboxpro.com/favicon.png",
      width: 507,
      height: 520,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.muscleboxpro.com/blog/gym-member-retention",
  },
  keywords: [
    "gym member retention strategies india",
    "how to retain gym members",
    "on-site nutrition gym",
    "post-workout protein gym",
    "reduce gym churn india",
    "gym retention tips",
  ],
  citation: [
    {
      "@type": "ScholarlyArticle",
      name: "Nutrient Timing: The Anabolic Window",
      url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5",
      publisher: {
        "@type": "Organization",
        name: "Journal of the International Society of Sports Nutrition",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <BlogGymRetention />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
