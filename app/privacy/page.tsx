import type { Metadata } from "next";
import Privacy from "@/pages/Privacy";

export const metadata: Metadata = {
  title: "Privacy Policy | Muscle Box Pro",
  description:
    "Review how Muscle Box Pro collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
  openGraph: { type: "article", url: "/privacy" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Privacy Policy", item: "https://www.muscleboxpro.com/privacy" },
  ],
};

export default function Page() {
  return (
    <>
      <Privacy />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
