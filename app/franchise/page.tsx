import type { Metadata } from "next";
import Franchise from "@/pages/Franchise";
import { FRANCHISE_FAQ } from "@shared/franchise/faq";
import {
  FRANCHISE,
  FRANCHISE_TIERS,
  formatLakh,
  franchiseTier,
  type FranchiseTier,
} from "@shared/franchise/program";
import { PAGE_CHANGED_ON } from "@shared/seo/pages";

const territory = franchiseTier("territory");
const city = franchiseTier("city");

/*
 * "Protein vending machine franchise" rather than "Franchise: Territory & City Terms",
 * which was the previous title. The product noun and the market are what carry the
 * query; "territory" and "city" are our own vocabulary for the two tiers and match
 * nothing anyone types, so they belong in the H2 and the description, not here.
 */
const title = "Protein Vending Machine Franchise in India | MuscleBoxPro";

/*
 * Under 160 characters. The generated version this replaced ran to 227 and Google cut it
 * at "until you recov", losing the sentence that carried the hook. Both investments and
 * the recovery mechanism fit; everything else the page publishes (advertising split,
 * payment stages, exclusivity conditions) is what the snippet gives up to stay whole.
 */
const description = `Protein vending machine franchises in India: ${formatLakh(
  territory.investmentInr,
)} for ${territory.initialMachines} machines and a territory, ${formatLakh(
  city.investmentInr,
)} for ${city.initialMachines} and a city. ${
  FRANCHISE.proteinProfitSharePct.duringRecovery
}% of protein profit until you recover.`;

const PAGE_URL = "https://www.muscleboxpro.com/franchise";
const OG_IMAGE_URL = "https://www.muscleboxpro.com/og-image.jpg";

/*
 * Verbatim the alt in `app/layout.tsx`, because that is where the `twitter:image` for
 * this page comes from. This page overrides `openGraph.images` and not `twitter.images`,
 * so a different wording here left one file describing the same JPEG two ways.
 */
const OG_IMAGE_ALT = "MuscleBoxPro smart protein shake vending machine in a gym";

export const metadata: Metadata = {
  title,
  description,
  /*
   * Overrides the sitewide list in the root layout, which is about the machine and the
   * product and says nothing about franchising, territories or investment. No engine
   * ranks on this tag; the point of the override is that an inaccurate list is the one
   * version that can hurt.
   */
  keywords: [
    "protein vending machine franchise",
    "vending machine franchise India",
    "protein shake franchise",
    "gym vending machine franchise",
    "franchise territory rights India",
  ],
  alternates: { canonical: "/franchise" },
  openGraph: {
    type: "website",
    url: "/franchise",
    title,
    description,
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 800, alt: OG_IMAGE_ALT }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": `${PAGE_URL}#breadcrumb`,
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Franchise",
      item: PAGE_URL,
    },
  ],
};

/*
 * The node that ties this page to the graph the root layout publishes.
 *
 * Without it the `Organization`, `ProfessionalService` and `WebSite` in `app/layout.tsx`
 * are three unlinked islands on every route, and the `BreadcrumbList` above belongs to no
 * page. The `@id` references are what make it one graph; changing any of those three
 * fragments in the layout breaks these silently, because a dangling `@id` is not an error
 * in JSON-LD — it is just a node nobody claimed.
 *
 * `dateModified` comes from the same table `app/sitemap.ts` reads, so this page cannot
 * claim one date here and a different `<lastmod>` there.
 */
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  url: PAGE_URL,
  name: title,
  description,
  inLanguage: "en-IN",
  isPartOf: { "@id": "https://www.muscleboxpro.com/#website" },
  publisher: { "@id": "https://www.muscleboxpro.com/#organization" },
  breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
  dateModified: PAGE_CHANGED_ON["/franchise"],
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: OG_IMAGE_URL,
    width: 1200,
    height: 800,
    caption: OG_IMAGE_ALT,
  },
};

/**
 * One `Offer` per tier, priced.
 *
 * Only what `FRANCHISE_TIERS` publishes. The City tier's `capitalRecoveryInr` and
 * `paymentSchedule` are deliberately `null` because §21 and §6 set them in the definitive
 * agreement, and `null` means "not published" rather than "does not apply" — so neither
 * appears here for either tier. An invented threshold in structured data is a priced
 * representation about money that no document behind it supports.
 */
function tierOffer(tier: FranchiseTier) {
  return {
    "@type": "Offer",
    "@id": `${PAGE_URL}#offer-${tier.id}`,
    name: tier.name,
    url: `${PAGE_URL}#tiers`,
    price: tier.investmentInr,
    priceCurrency: "INR",
    description: `${tier.initialMachines} machines and ${tier.marketRights.toLowerCase()}. ${
      tier.positioning
    }`,
    availability: "https://schema.org/LimitedAvailability",
    eligibleCustomerType: "https://schema.org/Business",
    eligibleRegion: { "@type": "Country", name: "India" },
  };
}

/*
 * The program itself, as a `Service` with one priced `Offer` per tier.
 *
 * This is the page's whole subject and it was previously invisible to a machine: two
 * investments with concrete rupee figures, described only in prose. Every figure
 * interpolates from `@shared/franchise/program` for the same reason the visible page
 * does, and this copy is the one an AI engine quotes back.
 *
 * `LimitedAvailability` is not hedging. A territory is exclusive, so each one can be sold
 * exactly once, and the page says approval and availability come first.
 */
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${PAGE_URL}#service`,
  name: "MuscleBox Pro protein vending machine franchise",
  serviceType: "Vending machine franchise",
  description: `MuscleBox Pro appoints franchisees to develop and operate a protein shake vending machine network across a defined territory or city. The franchisee receives ${FRANCHISE.proteinProfitSharePct.duringRecovery}% of eligible protein-business distributable profit until their capital is recovered, then ${FRANCHISE.proteinProfitSharePct.afterRecovery}:${100 - FRANCHISE.proteinProfitSharePct.afterRecovery}. Advertising profit is shared ${FRANCHISE.advertising.franchiseeSharePct}:${FRANCHISE.advertising.mbpSharePct} throughout and never counts toward capital recovery. Machines remain MuscleBox Pro property.`,
  provider: { "@id": "https://www.muscleboxpro.com/#organization" },
  availableAtOrFrom: { "@id": "https://www.muscleboxpro.com/#localbusiness" },
  areaServed: { "@type": "Country", name: "India" },
  audience: { "@type": "BusinessAudience", name: "Franchise investors and operators in India" },
  termsOfService: "https://www.muscleboxpro.com/terms",
  mainEntityOfPage: { "@id": `${PAGE_URL}#webpage` },
  offers: FRANCHISE_TIERS.map(tierOffer),
};

/*
 * Built from the same FRANCHISE_FAQ array the page renders visibly. Google requires
 * FAQPage markup to match on-page content, so these must never be maintained as two
 * separate lists. See shared/franchise/faq.ts.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
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
      {[webPageSchema, breadcrumbSchema, serviceSchema, faqSchema].map((schema) => (
        <script
          key={schema["@id"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
