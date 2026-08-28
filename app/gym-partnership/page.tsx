import type { Metadata } from "next";
import GymPartnership from "@/pages/GymPartnership";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";
import { PAGE_CHANGED_ON } from "@shared/seo/pages";

/*
 * "Protein vending machine" rather than "gym partnership" alone, which reads as a
 * gym-to-gym tie-up and matches nothing a gym owner types. The product noun is what
 * carries the query; "partnership terms" is what distinguishes this page from /specs.
 */
const title = "Protein Vending Machine for Gyms: Partnership Terms | MuscleBoxPro";

/*
 * Under 160 characters, so Google shows the whole thing rather than cutting it mid-clause.
 * The three figures a gym owner is deciding on, then the payout cadence — everything else
 * this page covers (advertising share, electricity, notice periods) is what the snippet
 * has to give up to fit, and it is what the page's own headings surface anyway.
 */
const description =
  "The MuscleBoxPro gym partnership in plain English: ₹0 for the machine, a refundable ₹50,000 deposit, and 20% of net profit rising to 50%. Paid monthly.";

const PAGE_URL = "https://www.muscleboxpro.com/gym-partnership";
const OG_IMAGE_URL = "https://www.muscleboxpro.com/og-image.jpg";

/*
 * Verbatim the alt in `app/layout.tsx`, because that is where the `twitter:image` for this
 * page comes from. This page overrides `openGraph.images` and not `twitter.images`, so a
 * different wording here left one file describing the same JPEG two ways.
 */
const OG_IMAGE_ALT = "MuscleBoxPro smart protein shake vending machine in a gym";

export const metadata: Metadata = {
  title,
  description,
  /*
   * Overrides the sitewide list in the root layout, which is about the machine and the
   * product ("post workout protein shakes", "automated fitness vending") and says nothing
   * about the commercials this page exists to publish. No engine ranks on this tag; the
   * point of the override is that an inaccurate list is the one version that can hurt.
   */
  keywords: [
    "gym partnership protein vending machine",
    "protein vending machine revenue share",
    "free vending machine for gym",
    "gym profit sharing machine placement",
    "protein shake machine for gym owners",
  ],
  alternates: { canonical: "/gym-partnership" },
  openGraph: {
    type: "website",
    url: "/gym-partnership",
    title,
    description:
      "What a MuscleBoxPro machine costs your gym, how the profit share works, who pays for what, and how to get started. The full standard offer, published openly.",
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
      name: "Gym Partnership",
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
  dateModified: PAGE_CHANGED_ON["/gym-partnership"],
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: OG_IMAGE_URL,
    width: 1200,
    height: 800,
    caption: OG_IMAGE_ALT,
  },
};

/*
 * The deal itself, as a `Service` with one `Offer`.
 *
 * Every figure interpolates from `@shared/partnership/summary` for the same reason the
 * visible page does: a number typed in here is a number that goes stale silently, and this
 * copy is the one a machine reads and quotes back. `LimitedAvailability` rather than
 * `InStock` is not hedging — placement is invite-only, and the page says so.
 */
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${PAGE_URL}#service`,
  name: "Protein shake vending machine placement for gyms",
  serviceType: "Vending machine placement and profit share",
  description: `MuscleBoxPro installs and operates a protein shake vending machine in your gym at no cost. We buy, deliver, stock, clean and service the machine; you provide the floor space and a power point. You receive ${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% of net profit on shakes, rising to ${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% at the performance milestone, plus ${PARTNERSHIP.advertisingGymSharePct}% of advertising revenue, paid within ${PARTNERSHIP.settlementDaysAfterMonthEnd} days of month-end.`,
  provider: { "@id": "https://www.muscleboxpro.com/#organization" },
  availableAtOrFrom: { "@id": "https://www.muscleboxpro.com/#localbusiness" },
  areaServed: { "@type": "Country", name: "India" },
  audience: { "@type": "BusinessAudience", name: "Gyms and fitness centres in India" },
  termsOfService: "https://www.muscleboxpro.com/terms",
  mainEntityOfPage: { "@id": `${PAGE_URL}#webpage` },
  offers: {
    "@type": "Offer",
    "@id": `${PAGE_URL}#offer`,
    name: "Machine placement at no cost, on a profit share",
    url: PAGE_URL,
    price: PARTNERSHIP.machineCostInr,
    priceCurrency: "INR",
    description: `${formatInr(PARTNERSHIP.machineCostInr)} for the machine, its installation and its upkeep. A refundable ${formatInr(PARTNERSHIP.securityDepositInr)} security deposit, a ${PARTNERSHIP.initialTermMonths}-month initial term, exit on ${PARTNERSHIP.noticeDays.gymExit} days' written notice and no early-termination charge.`,
    availability: "https://schema.org/LimitedAvailability",
    eligibleCustomerType: "https://schema.org/Business",
    eligibleRegion: { "@type": "Country", name: "India" },
  },
};

/*
 * Built from the same PARTNERSHIP_FAQ array the page renders visibly. Google
 * requires FAQPage markup to match on-page content, so these must never be
 * maintained as two separate lists — see shared/partnership/faq.ts.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
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
