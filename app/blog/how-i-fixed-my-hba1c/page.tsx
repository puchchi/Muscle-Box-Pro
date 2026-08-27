import type { Metadata } from "next";
import BlogHba1c from "@/pages/BlogHba1c";

export const metadata: Metadata = {
  title: "How I Dropped My HbA1C from 6.1 to 5.2 — A Real Data Story | MuscleBoxPro",
  description:
    "A borderline pre-diabetic shares 18 months of real lab reports, 14 days of continuous glucose data, and 12 dietary findings that reversed early diabetes without medication.",
  alternates: { canonical: "/blog/how-i-fixed-my-hba1c" },
  openGraph: {
    type: "article",
    url: "/blog/how-i-fixed-my-hba1c",
    title: "How I Dropped My HbA1C from 6.1 to 5.2 — A Real Data Story",
    description:
      "Real lab reports, 14 days of CGM glucose data, and 12 dietary findings that reversed early pre-diabetes. No medication, just food changes.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "HbA1C journey from 6.1 to 5.2" }],
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
      name: "How I Dropped My HbA1C from 6.1 to 5.2",
      item: "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c",
    },
  ],
};

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c#article",
  headline: "How I Dropped My HbA1C from 6.1 to 5.2 — A Real Data Story",
  description:
    "A borderline pre-diabetic shares 18 months of real lab reports, 14 days of continuous glucose data, and 12 dietary findings that reversed early diabetes without medication.",
  url: "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c",
  datePublished: "2026-04-20",
  dateModified: "2026-04-03",
  inLanguage: "en-IN",
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
    "@id": "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c",
  },
  keywords: [
    "HbA1C reversal",
    "pre-diabetes diet",
    "CGM India",
    "FreeStyle LibreSensor",
    "blood sugar spikes",
    "Indian food glucose",
    "how to lower HbA1C",
    "continuous glucose monitor",
  ],
};

export default function Page() {
  return (
    <>
      <BlogHba1c />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
