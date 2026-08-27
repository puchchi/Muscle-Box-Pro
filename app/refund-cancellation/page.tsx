import type { Metadata } from "next";
import RefundCancellation from "@/pages/RefundCancellation";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | MuscleBoxPro",
  description:
    "Understand MuscleBoxPro refund and cancellation terms, timelines, and support process.",
  alternates: { canonical: "/refund-cancellation" },
  openGraph: {
    type: "article",
    url: "/refund-cancellation",
    title: "Refund & Cancellation Policy | MuscleBoxPro",
    description: "Understand MuscleBoxPro refund and cancellation terms, timelines, and support process.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Refund & Cancellation", item: "https://www.muscleboxpro.com/refund-cancellation" },
  ],
};

export default function Page() {
  return (
    <>
      <RefundCancellation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
