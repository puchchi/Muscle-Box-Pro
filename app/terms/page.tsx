import type { Metadata } from "next";
import Terms from "@/pages/Terms";

export const metadata: Metadata = {
  title: "Terms & Conditions | Muscle Box Pro",
  description:
    "Read the official terms and conditions for using Muscle Box Pro services and platform features.",
  alternates: { canonical: "/terms" },
  openGraph: { type: "article", url: "/terms" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Terms & Conditions", item: "https://www.muscleboxpro.com/terms" },
  ],
};

export default function Page() {
  return (
    <>
      <Terms />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
