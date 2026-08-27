import type { Metadata } from "next";
import HelpCenter from "@/pages/HelpCenter";

export const metadata: Metadata = {
  title: "Help Center | MuscleBoxPro",
  description:
    "Find answers to common questions about MuscleBoxPro accounts, machines, billing, and support.",
  alternates: { canonical: "/help" },
  openGraph: {
    type: "website",
    url: "/help",
    title: "Help Center | MuscleBoxPro",
    description: "Find answers to common questions about MuscleBoxPro accounts, machines, billing, and support.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Help Center", item: "https://www.muscleboxpro.com/help" },
  ],
};

export default function Page() {
  return (
    <>
      <HelpCenter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
