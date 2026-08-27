import type { Metadata } from "next";
import Franchise from "@/pages/Franchise";
import { FRANCHISE_FAQ } from "@shared/franchise/faq";
import { FRANCHISE, formatLakh, franchiseTier } from "@shared/franchise/program";

const territory = franchiseTier("territory");
const city = franchiseTier("city");

const description = `The MuscleBoxPro franchise program in plain English: ${formatLakh(
  territory.investmentInr,
)} for ${territory.initialMachines} machines and a territory, ${formatLakh(
  city.investmentInr,
)} for ${city.initialMachines} and a city, ${
  FRANCHISE.proteinProfitSharePct.duringRecovery
}% of protein profit until you recover your capital, then ${
  FRANCHISE.proteinProfitSharePct.afterRecovery
}:${100 - FRANCHISE.proteinProfitSharePct.afterRecovery}. Machines remain MuscleBoxPro property.`;

export const metadata: Metadata = {
  title: "Franchise: Territory & City Terms | MuscleBoxPro",
  description,
  alternates: { canonical: "/franchise" },
  openGraph: {
    type: "website",
    url: "/franchise",
    title: "Franchise: Territory & City Terms | MuscleBoxPro",
    description,
    images: [
      {
        url: "https://www.muscleboxpro.com/og-image.jpg",
        width: 1200,
        height: 800,
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
      name: "Franchise",
      item: "https://www.muscleboxpro.com/franchise",
    },
  ],
};

/*
 * Built from the same FRANCHISE_FAQ array the page renders visibly. Google requires
 * FAQPage markup to match on-page content, so these must never be maintained as two
 * separate lists. See shared/franchise/faq.ts.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FRANCHISE_FAQ.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function Page() {
  return (
    <>
      <Franchise />
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
