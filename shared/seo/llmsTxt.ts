/**
 * `llms.txt`, generated.
 *
 * This replaced a hand-written `public/llms.txt`, which had to be **deleted** rather than left
 * in place: a file in `public/` shadows the route of the same path, so the two cannot coexist
 * and the stale one would win. Same trap `app/sitemap.ts` records.
 *
 * The reason for generating it is the two long entries for /gym-partnership and /franchise.
 * The static file restated the rupee figures, the percentages and the milestone thresholds by
 * hand, which made it a further copy of terms that `shared/partnership/summary.ts` and
 * `shared/franchise/program.ts` each declare themselves the single source of. They happened to
 * agree; nothing kept them agreeing. Both now come from `./llmDocs`, which is also what the
 * `.md` mirrors are built from.
 *
 * Everything else here is editorial one-liners that are not derivable from anything, so they
 * stay written out. Only the figures move on their own.
 */

import { COMPANY } from "../company";
import { FRANCHISE_PDF_PATH, FRANCHISE_SUMMARY, GYM_PARTNERSHIP_SUMMARY } from "./llmDocs";

const BASE_URL = "https://www.muscleboxpro.com";

export type LlmsTxtCity = { slug: string; name: string };

type Entry = {
  title: string;
  path: string;
  description: string;
  /** A plain-text alternate of the same page, listed the way the blog entries list theirs. */
  markdownPath?: string;
};

function entryLine({ title, path, description, markdownPath }: Entry): string {
  const markdown = markdownPath ? ` [Markdown](${BASE_URL}${markdownPath})` : "";
  return `- [${title}](${BASE_URL}${path}): ${description}${markdown}`;
}

function section(heading: string, entries: Entry[]): string {
  return `## ${heading}\n\n${entries.map(entryLine).join("\n")}`;
}

const PRODUCT: Entry[] = [
  {
    title: "Protein Shake Vending Machine",
    path: "/protein-shake-vending-machine",
    description:
      "Automated machine that blends 12 fresh protein shake variants in 60 seconds. Installed free in gyms across India.",
  },
  {
    title: "Gym Protein Shake Machine",
    path: "/gym-protein-shake-machine",
    description:
      "On-floor shake dispenser for fitness centres: zero staff, UPI payments, HD display, 24/7 operation.",
  },
  {
    title: "Shake Menu",
    path: "/menu",
    description:
      "12 protein shake blends including whey isolate, plant protein, banana, chocolate, and milk-based variants. Starting from ₹120.",
  },
  {
    title: "Machine Specifications",
    path: "/specs",
    description:
      "Technical details: blend time 60s, payment options, display specs, dimensions, hygiene system.",
  },
];

const FOR_GYM_OWNERS: Entry[] = [
  {
    title: "Gym Partnership Terms",
    path: "/gym-partnership",
    description: GYM_PARTNERSHIP_SUMMARY,
    markdownPath: "/gym-partnership.md",
  },
  {
    title: "Request a Demo",
    path: "/gym-demo",
    description:
      "Free demo machine installation with zero upfront cost. Revenue-sharing model for fitness centres.",
  },
  {
    title: "Advertise",
    path: "/advertise",
    description:
      "HD 4K advertising display on the machine: 60 seconds of captive audience per transaction. Targeted reach to gym members.",
  },
];

const BLOG: Entry[] = [
  {
    title: "Why Every Gym Should Install a Protein Shake Vending Machine",
    path: "/blog/why-gyms-need-vending-machines",
    description:
      "Business case for gym owners: revenue, member retention, and post-workout nutrition science.",
    markdownPath: "/blog/why-gyms-need-vending-machines.md",
  },
  {
    title: "The Best Protein Shake After a Workout: Whey vs. Plant",
    path: "/blog/best-protein-shake-after-workout",
    description:
      "Comparison of whey isolate and plant protein for post-workout recovery, citing peer-reviewed research.",
    markdownPath: "/blog/best-protein-shake-after-workout.md",
  },
  {
    title: "Why Protein Is Important for Diabetes Management",
    path: "/blog/protein-for-diabetes",
    description:
      "Evidence-based guide on protein's role in blood sugar control and muscle preservation for people with diabetes.",
    markdownPath: "/blog/protein-for-diabetes.md",
  },
  {
    title: "Gym Member Retention: The Role of On-Site Nutrition",
    path: "/blog/gym-member-retention",
    description:
      "Data-backed guide on how on-site post-workout protein dispensers reduce churn and strengthen the gym habit loop.",
    markdownPath: "/blog/gym-member-retention.md",
  },
  {
    title: "How I Dropped My HbA1C from 6.1 to 5.2: A Real Data Story",
    path: "/blog/how-i-fixed-my-hba1c",
    description:
      "18 months of real lab reports, 14 days of CGM glucose data, and 12 dietary findings that reversed early pre-diabetes without medication.",
    markdownPath: "/blog/how-i-fixed-my-hba1c.md",
  },
];

const COMPARISONS: Entry[] = [
  {
    title: "Protein Shake Vending Machine vs. Protein Shake Bar",
    path: "/vs/protein-shake-bar",
    description:
      "Side-by-side comparison of automated vending vs. staffed protein bars: upfront cost, staff overhead, hygiene, revenue, and 24/7 availability.",
  },
  {
    title: "Vending Machine vs. Supplement Counter",
    path: "/vs/supplement-counter",
    description:
      "ROI analysis comparing MuscleBoxPro against a traditional front-desk supplement retail counter for Indian gyms, including monthly net income estimates.",
  },
  {
    title: "7 Ways Indian Gyms Generate Passive Revenue",
    path: "/alternatives/gym-revenue-ideas",
    description:
      "Ranked list of gym revenue diversification strategies: protein vending, merchandise, personal training, lockers, spa, parking, and brand sponsorships, with investment ranges and monthly estimates.",
  },
];

const COMPANY_SECTION: Entry[] = [
  {
    title: "About Us",
    path: "/about",
    description: `MuscleBoxPro is built by ${COMPANY.legalName}, a DPIIT-recognised startup in the Food & Beverages sector. Mission: on-demand post-workout nutrition through smart automation.`,
  },
  {
    title: "Invest in Us",
    path: "/invest",
    description: `Investment opportunity page for ${COMPANY.legalName}: market size, traction, revenue streams, and contact form for prospective investors.`,
  },
  {
    title: "Franchise",
    path: "/franchise",
    description: FRANCHISE_SUMMARY,
    markdownPath: "/franchise.md",
  },
  {
    title: "Contact",
    path: "/contact",
    description: `Email ${COMPANY.email} · For gym partnerships, machine placement, and support.`,
  },
  {
    title: "Help Center",
    path: "/help",
    description: "FAQs on payments, machine operation, accounts, and troubleshooting.",
  },
];

/**
 * The franchise PDF is listed and the gym partnership PDF is not, and the asymmetry is
 * deliberate. `shared/seo/llmDocs.ts` carries the reason on `gymPartnershipMarkdown`.
 */
const DOCUMENTS: Entry[] = [
  {
    title: "Franchise Disclosure and Term Document (PDF)",
    path: FRANCHISE_PDF_PATH,
    description:
      "The full franchise program document as published, in PDF. The Markdown mirror above carries the same terms in a form that is easier to quote.",
  },
];

export function llmsTxt(cities: LlmsTxtCity[]): string {
  const cityLinks = cities
    .map(({ slug, name }) => `[${name}](${BASE_URL}/protein-vending-machine-${slug})`)
    .join(", ");

  return `${[
    `# ${COMPANY.brandName}`,
    `License: All content on this site is © 2026 ${COMPANY.legalName}. All rights reserved. AI models may reference and summarise this content for informational purposes; reproduction or training use without permission is prohibited.`,
    `> ${COMPANY.brandName} is a smart protein shake vending machine for gyms, operated by ${COMPANY.legalName}, a DPIIT-recognised startup (Certificate No: DIPP252770). The machine blends fresh whey or plant-based protein shakes in 60 seconds with zero staff, cashless payments (UPI, card), and a built-in HD advertising display. Gym owners receive free installation and earn passive revenue through a profit-sharing model.`,
    section("Product", PRODUCT),
    section("For Gym Owners", FOR_GYM_OWNERS),
    `## Coverage: India City Pages\n\n${entryLine({
      title: "Protein Vending Machine India",
      path: "/protein-vending-machine-india",
      description: "National overview of gym installations across India.",
    })}\n- ${cityLinks}`,
    section("Blog", BLOG),
    section("Comparisons", COMPARISONS),
    section("Company", COMPANY_SECTION),
    section("Documents", DOCUMENTS),
    `## Legal\n\n- [Terms & Conditions](${BASE_URL}/terms)\n- [Privacy Policy](${BASE_URL}/privacy)\n- [Refund & Cancellation](${BASE_URL}/refund-cancellation)`,
  ].join("\n\n")}\n`;
}
