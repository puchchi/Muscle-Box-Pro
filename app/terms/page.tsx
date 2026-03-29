import type { Metadata } from "next";
import Terms from "@/pages/Terms";

export const metadata: Metadata = {
  title: "Terms & Conditions | MuscleBoxPro",
  description:
    "Read the official terms and conditions for using MuscleBoxPro services and platform features.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "article",
    url: "/terms",
    title: "Terms & Conditions | MuscleBoxPro",
    description: "Read the official terms and conditions for using MuscleBoxPro services and platform features.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.png", width: 1200, height: 630, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
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
