import type { Metadata } from "next";
import GymPartnership from "@/pages/GymPartnership";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";

export const metadata: Metadata = {
  title: "Gym Partnership: Terms & Revenue Share | MuscleBoxPro",
  description:
    "The MuscleBoxPro gym partnership in plain English: ₹0 for the machine, a refundable ₹50,000 deposit, 20% of net profit rising to 50%, advertising revenue share, electricity reimbursed, and payouts within 15 days of month-end.",
  alternates: { canonical: "/gym-partnership" },
  openGraph: {
    type: "website",
    url: "/gym-partnership",
    title: "Gym Partnership: Terms & Revenue Share | MuscleBoxPro",
    description:
      "What a MuscleBoxPro machine costs your gym, how the profit share works, who pays for what, and how to get started. The full standard offer, published openly.",
    images: [
      {
        url: "https://www.muscleboxpro.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "MuscleBoxPro smart protein shake vending machine",
      },
    ],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Gym Partnership",
      item: "https://www.muscleboxpro.com/gym-partnership",
    },
  ],
};

/*
 * Built from the same PARTNERSHIP_FAQ array the page renders visibly. Google
 * requires FAQPage markup to match on-page content, so these must never be
 * maintained as two separate lists — see shared/partnership/faq.ts.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PARTNERSHIP_FAQ.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function Page() {
  return (
    <>
      <GymPartnership />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
