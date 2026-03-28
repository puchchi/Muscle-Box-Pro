import type { Metadata } from "next";
import HelpCenter from "@/pages/HelpCenter";

export const metadata: Metadata = {
  title: "Help Center | Muscle Box Pro",
  description:
    "Find answers to common questions about Muscle Box Pro accounts, machines, billing, and support.",
  alternates: { canonical: "/help" },
  openGraph: { type: "website", url: "/help" },
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
