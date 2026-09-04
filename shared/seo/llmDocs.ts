/**
 * The plain-text mirrors of /gym-partnership and /franchise, and the figure-bearing lines
 * of `llms.txt`.
 *
 * **Generated, and that is the whole point.** Every number in these documents is already
 * declared once in `shared/partnership/summary.ts` and `shared/franchise/program.ts`, both of
 * which open with the rule that nothing may hardcode a rupee figure or a percentage. A
 * hand-written `.md` under `public/` would be a further copy of the commercial terms that
 * nothing can keep in step, which is exactly how `public/assets/gym-partnership-terms-2026-09.pdf`
 * came to carry four pre-2.2 answers while the page beside it states the current ones.
 *
 * Here rather than in the route handlers so the text is testable without Next, and so
 * `app/llms.txt` and `app/gym-partnership.md` cannot describe the same deal two ways.
 *
 * These are not pages. They are `rel="alternate"` representations of a canonical URL, so they
 * stay out of `app/sitemap.ts` and out of `PAGE_CHANGED_ON`: a `.md` listed as its own URL is
 * a duplicate of the page it mirrors.
 */

import { COMPANY } from "../company";
import { FRANCHISE_FAQ } from "../franchise/faq";
import {
  CITY_SCHEDULE_CAVEAT,
  DASHBOARD_VISIBILITY,
  FRANCHISE,
  FRANCHISE_TIERS,
  MACHINE_RIGHTS,
  MACHINE_UPKEEP,
  PERFORMANCE_REQUIREMENTS,
  RESERVED_ACCOUNTS,
  RESPONSIBILITIES,
  formatLakh,
  franchiseTier,
  journeyByPhase,
  recoveryExample,
  tierIncludes,
  tierPaymentStages,
  type FranchiseTier,
} from "../franchise/program";
import { PARTNERSHIP_FAQ } from "../partnership/faq";
import {
  INDICATIVE_ECONOMICS,
  PARTNERSHIP,
  bindingMilestone,
  formatInr,
  workedMonth,
} from "../partnership/summary";
import { PAGE_CHANGED_ON } from "./pages";
import type { FaqEntry } from "../partnership/faq";

const BASE_URL = "https://www.muscleboxpro.com";

function count(n: number): string {
  return n.toLocaleString("en-IN");
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function faqSection(entries: readonly FaqEntry[]): string {
  return entries.map((entry) => `### ${entry.question}\n\n${entry.answer}`).join("\n\n");
}

function frontMatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---`;
}

/* ── /gym-partnership ─────────────────────────────────────────────────────── */

/**
 * Rounded to the nearest hundred because the sentence it lands in says "about". The exact
 * 9,091 reads as a figure someone could hold us to, and it moves with the indicative margin.
 */
const milestoneCups = Math.round(bindingMilestone().cups / 100) * 100;
const beforeMilestone = workedMonth();
const afterMilestone = workedMonth(INDICATIVE_ECONOMICS.exampleCupsPerMonth, true);

/**
 * Every headline term in one sentence, for the document's own "At a glance" and for the
 * /gym-partnership entry in `llms.txt`.
 *
 * One string for both because they are the same claim, and those are the two places an AI
 * engine quotes back verbatim. Only the lead-in differs, so `GYM_PARTNERSHIP_SUMMARY` adds it
 * and the document does not: "published in full" is a thing to say *about* a document, not
 * inside one.
 */
const GYM_PARTNERSHIP_TERMS_LINE =
  `${formatInr(PARTNERSHIP.machineCostInr)} for the machine, refundable ` +
  `${formatInr(PARTNERSHIP.securityDepositInr)} security deposit, ` +
  `${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% of net protein profit rising to ` +
  `${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% at the performance milestone ` +
  `(${count(PARTNERSHIP.milestone.cups)} paid cups or ` +
  `${formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr)} cumulative net profit, whichever ` +
  `comes first), ${PARTNERSHIP.advertisingGymSharePct}% of advertising revenue, electricity ` +
  `reimbursed at ${formatInr(PARTNERSHIP.electricity.inrPerBlock)} per completed ` +
  `${count(PARTNERSHIP.electricity.cupsPerBlock)} paid cups, payouts within ` +
  `${PARTNERSHIP.settlementDaysAfterMonthEnd} days of month-end, ` +
  `${PARTNERSHIP.initialTermMonths}-month initial term with a ` +
  `${PARTNERSHIP.noticeDays.gymExit}-day exit on notice and no early-termination charge. ` +
  `Placement is invite-only.`;

export const GYM_PARTNERSHIP_SUMMARY = `The standard gym partnership, published in full. ${GYM_PARTNERSHIP_TERMS_LINE}`;

/**
 * Deliberately does not link `public/assets/gym-partnership-terms-2026-09.pdf`, which
 * /gym-partnership does link.
 *
 * That PDF still carries the pre-2.2 milestone basis (see the note at the top of
 * `shared/partnership/summary.ts`), and on the gross basis the milestone fires at roughly
 * 4,167 cups where net profit fires at ~9,100. Citing it from a machine-readable document
 * that states the current basis a few lines above would publish both answers at once. Add the
 * link once the PDF is re-exported from `shared/agreement/v2_3.ts`.
 */
export function gymPartnershipMarkdown(): string {
  return [
    frontMatter({
      title: "MuscleBoxPro Gym Partnership: Standard Terms",
      canonical: `${BASE_URL}/gym-partnership`,
      updated: PAGE_CHANGED_ON["/gym-partnership"],
      publisher: COMPANY.legalName,
      language: "en-IN",
      status: "Indicative standard terms. A gym's own signed agreement governs.",
    }),
    `# MuscleBoxPro Gym Partnership: Standard Terms`,
    `MuscleBoxPro installs a protein shake vending machine in your gym and operates it. The ` +
      `machine stays our property and our expense. You provide the floor space and a power ` +
      `point, and you take a share of the profit it makes.`,
    `## At a glance`,
    GYM_PARTNERSHIP_TERMS_LINE,
    `## What it costs`,
    [
      `| Item | Amount |`,
      `| --- | --- |`,
      `| Machine, delivery and installation | ${formatInr(PARTNERSHIP.machineCostInr)} |`,
      `| Security deposit, refundable | ${formatInr(PARTNERSHIP.securityDepositInr)} |`,
      `| Initial term | ${PARTNERSHIP.initialTermMonths} months |`,
      `| Notice to exit | ${PARTNERSHIP.noticeDays.gymExit} days |`,
      `| Early-termination charge | ${formatInr(PARTNERSHIP.earlyTerminationChargeInr)} |`,
    ].join("\n"),
    `## What MuscleBoxPro provides at no cost to the gym`,
    bullets(PARTNERSHIP.includedInService),
    `## What the gym provides`,
    bullets(PARTNERSHIP.gymProvides),
    `## How the money works`,
    `Your share is calculated on net profit, not on gross sales. Net profit is gross customer ` +
      `sales less taxes collected for the Government and less the agreed direct variable costs, ` +
      `which are the ingredients, the cup and the consumables. Those costs are ours to carry ` +
      `and they come off before the split.`,
    `### Profit share on shakes`,
    bullets([
      `${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% of net profit before the performance milestone.`,
      `${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% of net profit after it.`,
    ]),
    `The milestone is whichever comes first of ${count(PARTNERSHIP.milestone.cups)} paid cups ` +
      `or ${formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr)} of cumulative net profit. ` +
      `Net profit there is the pool before the split, not either party's share of it. Which of ` +
      `the two tests fires first depends on the margin the machine earns per cup. At the ` +
      `indicative economics below the profit test arrives at about ${count(milestoneCups)} ` +
      `cups; on a thinner margin the cup count arrives first.`,
    `### Advertising`,
    `${PARTNERSHIP.advertisingGymSharePct}% of the advertising revenue earned by the machine in ` +
      `your gym. This share is flat for the life of the agreement. It does not step up at the ` +
      `performance milestone.`,
    `### Electricity`,
    `Reimbursed at ${formatInr(PARTNERSHIP.electricity.inrPerBlock)} for every completed block ` +
      `of ${count(PARTNERSHIP.electricity.cupsPerBlock)} paid cups, assessed over a ` +
      `${PARTNERSHIP.electricity.reviewWindowMonths}-month review window, with a floor of ` +
      `${formatInr(PARTNERSHIP.electricity.floorInrPerWindow)} per window even if the machine ` +
      `sells very little. Part-completed blocks do not carry into the next window.`,
    `### When you are paid`,
    `Within ${PARTNERSHIP.settlementDaysAfterMonthEnd} days of the end of each month, against a ` +
      `statement showing cups sold, gross revenue, direct costs and your share. The partner ` +
      `dashboard shows live figures during the month, but those are provisional. The statement ` +
      `is the settled amount.`,
    `### Worked month`,
    `Indicative, as of ${INDICATIVE_ECONOMICS.asOf}. At ` +
      `${count(beforeMilestone.cups)} cups a month, ` +
      `${formatInr(INDICATIVE_ECONOMICS.avgSellingPriceInr)} average selling price and ` +
      `${formatInr(INDICATIVE_ECONOMICS.directCostPerCupInr)} of direct cost per cup:`,
    bullets([
      `Gross revenue: ${formatInr(beforeMilestone.grossInr)}`,
      `Direct costs: ${formatInr(beforeMilestone.directCostsInr)}`,
      `Net profit: ${formatInr(beforeMilestone.netProfitInr)}`,
      `Your share at ${beforeMilestone.gymSharePct}%: ${formatInr(beforeMilestone.gymShareInr)}`,
      `Your share at ${afterMilestone.gymSharePct}%: ${formatInr(afterMilestone.gymShareInr)}`,
    ]),
    `The electricity reimbursement is left out of that month because it is assessed per ` +
      `${PARTNERSHIP.electricity.reviewWindowMonths}-month window, so folding it into a monthly ` +
      `figure would overstate it. These are typical volumes, not a guarantee of income.`,
    `## Term and exit`,
    bullets([
      `Initial term of ${PARTNERSHIP.initialTermMonths} months, running from the later of signing and installation.`,
      `The gym may end it for convenience on ${PARTNERSHIP.noticeDays.gymExit} days' written notice.`,
      `MuscleBoxPro may remove a persistently underperforming machine on ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice.`,
      `No early-termination charge. The exit price is the notice, not a payment.`,
      `Either way the machine is collected at our cost and the deposit is returned, less any amounts properly due.`,
    ]),
    `## Getting started`,
    `Placement is invite-only. A machine that does not sell helps neither side, so we look at ` +
      `daily footfall, member mix, the space available and the city first. After a demo, a gym ` +
      `that is a fit receives one link that walks through every step, and it can be stopped ` +
      `partway and picked up later. Before signing, the gym is shown its own copy of the ` +
      `agreement clause by clause.`,
    `## Frequently asked`,
    faqSection(PARTNERSHIP_FAQ),
    `## Status of this document`,
    `Published by ${COMPANY.legalName}. This is the standard offer and it is indicative. The ` +
      `binding document is the Machine Placement and Profit Sharing Agreement each gym signs, ` +
      `and per-gym terms may differ from the standard ones above. Figures are as of ` +
      `${INDICATIVE_ECONOMICS.asOf} and are not a guarantee of income.`,
    `Canonical HTML version: ${BASE_URL}/gym-partnership`,
    `Contact: ${COMPANY.email}`,
  ].join("\n\n");
}

/* ── /franchise ───────────────────────────────────────────────────────────── */

const territory = franchiseTier("territory");
const city = franchiseTier("city");
const recovery = recoveryExample("territory");

/** The PDF /franchise links. Current, unlike the gym one: see `program.ts`'s header. */
export const FRANCHISE_PDF_PATH = "/assets/franchise-program-2026-09.pdf";

export const FRANCHISE_SUMMARY =
  `Protein vending machine franchise in India, at territory and city level. ` +
  `${formatLakh(territory.investmentInr)} for ${territory.initialMachines} machines and a ` +
  `territory, ${formatLakh(city.investmentInr)} for ${city.initialMachines} machines and a ` +
  `city. ${FRANCHISE.proteinProfitSharePct.duringRecovery}% of protein profit until capital ` +
  `recovery, then ${FRANCHISE.proteinProfitSharePct.afterRecovery}:` +
  `${100 - FRANCHISE.proteinProfitSharePct.afterRecovery}. Advertising profit shared ` +
  `${FRANCHISE.advertising.franchiseeSharePct}:${FRANCHISE.advertising.mbpSharePct} and never ` +
  `counts toward capital recovery. Machines remain MuscleBoxPro property. The franchisee ` +
  `provides the warehouse, local transport and team, and is responsible for keeping every ` +
  `machine working and stocked; that work cannot be passed to the gym without written approval.`;

function tierRow(tier: FranchiseTier): string {
  return (
    `| ${tier.shortName} | ${formatInr(tier.investmentInr)} | ${tier.initialMachines} | ` +
    `${tier.marketRights} |`
  );
}

export function franchiseMarkdown(): string {
  const { shared, unique } = tierIncludes();

  return [
    frontMatter({
      title: "MuscleBoxPro Franchise: Territory and City Programs",
      canonical: `${BASE_URL}/franchise`,
      updated: PAGE_CHANGED_ON["/franchise"],
      as_of: FRANCHISE.asOf,
      publisher: COMPANY.legalName,
      language: "en-IN",
      status:
        "Indicative program terms. Not an offer. The definitive franchise agreement governs.",
    }),
    `# MuscleBoxPro Franchise: Territory and City Programs`,
    `MuscleBoxPro appoints franchisees to develop and operate a protein shake vending machine ` +
      `network across a defined territory or city in India. Everything below is subject to ` +
      `approval, due diligence and the definitive franchise agreement, which is what governs. ` +
      `It is not an offer and not a guarantee of returns. Take independent legal, tax and ` +
      `financial advice before committing.`,
    `## At a glance`,
    FRANCHISE_SUMMARY,
    `## The two franchises`,
    [
      `| Franchise | Investment | Machines | Market rights |`,
      `| --- | --- | --- | --- |`,
      ...FRANCHISE_TIERS.map(tierRow),
      ``,
      `Investment figures are exclusive of GST, currently ${FRANCHISE.gstRatePct}%.`,
    ].join("\n"),
    ...FRANCHISE_TIERS.map((tier) => `${tier.shortName}: ${tier.positioning}`),
    `### What both include`,
    bullets(shared),
    ...FRANCHISE_TIERS.map((tier) => `### Only in the ${tier.shortName}\n\n${bullets(unique[tier.id])}`),
    `### When you pay`,
    bullets(FRANCHISE_TIERS.map(tierPaymentStages)),
    CITY_SCHEDULE_CAVEAT,
    `## How the money works`,
    `Every percentage below is a share of distributable profit, after the costs of running the ` +
      `network. It is not a share of revenue.`,
    `### Capital recovery`,
    `Until you have received cumulative eligible protein-business distributable profit equal to ` +
      `your investment plus GST, ${FRANCHISE.proteinProfitSharePct.duringRecovery}% of that ` +
      `profit from your machines goes to you. After that the split moves to ` +
      `${FRANCHISE.proteinProfitSharePct.afterRecovery}:` +
      `${100 - FRANCHISE.proteinProfitSharePct.afterRecovery} and you keep participating for the ` +
      `life of the franchise. ${FRANCHISE.proteinProfitSharePct.duringRecovery}% is a recovery ` +
      `mechanism, not a permanent margin.`,
    `### Advertising`,
    `Shared ${FRANCHISE.advertising.franchiseeSharePct}% to you and ` +
      `${FRANCHISE.advertising.mbpSharePct}% to MuscleBoxPro from day one, calculated after ` +
      `applicable advertising costs. It does not count toward capital recovery and it does not ` +
      `stop when recovery completes. Protein and advertising are two separate streams ` +
      `throughout. This is the term people most often read the other way.`,
    `### What comes off before each share is worked out`,
    `Before the gym's share: ${FRANCHISE.gymLevelCosts.map((c) => c.toLowerCase()).join(", ")}.`,
    `Before the franchise share: ` +
      `${FRANCHISE.franchiseLevelCosts.map((c) => c.toLowerCase()).join(", ")}. That list is ` +
      `longer on purpose. Franchise profit is calculated on the real economics of running a ` +
      `local network.`,
    `### Worked recovery example`,
    `Illustrative, on a ${territory.shortName} and in base rupees against the ` +
      `${formatInr(recovery.thresholdInr)} investment rather than the GST-inclusive threshold. ` +
      `Suppose ${formatInr(recovery.alreadyReceivedInr)} has already been received, leaving ` +
      `${formatInr(recovery.remainingInr)} to recover, and the next distribution is ` +
      `${formatInr(recovery.nextDistributionInr)}:`,
    bullets([
      `${formatInr(recovery.completesRecoveryInr)} completes the recovery and is paid to you in full.`,
      `The remaining ${formatInr(recovery.postRecoveryPoolInr)} is past the threshold, so it is split: ${formatInr(recovery.postRecoveryToFranchiseeInr)} to you and ${formatInr(recovery.postRecoveryToMbpInr)} to MuscleBoxPro.`,
      `Total to you from that distribution: ${formatInr(recovery.totalToFranchiseeInr)}.`,
      `Advertising income received over the same period does not reduce the remaining amount.`,
    ]),
    `### Who sets prices`,
    `MuscleBoxPro does. Consumer pricing, promotional pricing, formulations, product ` +
      `configuration and the gym profit-sharing model are centrally controlled. Gym ` +
      `arrangements run at splits such as ${FRANCHISE.gymProfitSharingExamples.join(" or ")} ` +
      `depending on the location.`,
    `## The machines`,
    `The franchise investment is not a purchase of the machines. It buys the right to operate ` +
      `them in your market, and they remain MuscleBoxPro property for as long as the franchise ` +
      `runs.`,
    `### You may`,
    bullets(MACHINE_RIGHTS.may),
    `### You may not`,
    bullets(MACHINE_RIGHTS.mayNot),
    `## Who does what`,
    `Your warehouse is the dividing line. Everything before it is ours. Everything after it is ` +
      `yours.`,
    `### MuscleBoxPro provides`,
    bullets(RESPONSIBILITIES.mbp),
    `### You provide`,
    bullets(RESPONSIBILITIES.franchisee),
    `### The daily job at each machine`,
    `Once a machine is deployed, this is yours, and it cannot be passed to the gym, its staff ` +
      `or anyone else without our written approval:`,
    bullets(MACHINE_UPKEEP),
    `These local costs are yours to carry. They are not taken off the profit your share is ` +
      `worked out from.`,
    `## What the dashboard shows`,
    bullets(DASHBOARD_VISIBILITY),
    `## Territory and growth`,
    `Territorial exclusivity is real and it is conditional. A franchisee cannot pay for a city, ` +
      `leave most of it undeveloped and block MuscleBoxPro from expanding into it. Exclusivity ` +
      `depends on:`,
    bullets(PERFORMANCE_REQUIREMENTS),
    `### Reserved to MuscleBoxPro`,
    `These sit outside your exclusivity, and it is better said early than discovered later:`,
    bullets(RESERVED_ACCOUNTS),
    `## What happens after you apply`,
    journeyByPhase()
      .map(
        (phase) =>
          `### ${phase.title}\n\n` +
          phase.steps
            .map((step) => `${step.position}. ${step.title}. ${step.body}`)
            .join("\n"),
      )
      .join("\n\n"),
    `## Frequently asked`,
    faqSection(FRANCHISE_FAQ),
    `## Status of this document`,
    `Published by ${COMPANY.legalName}. Indicative program terms as of ${FRANCHISE.asOf}. Not ` +
      `an offer, and not a guarantee of returns. Actual results depend on machine utilisation, ` +
      `gym locations, customer demand, pricing, operating costs, local market conditions, ` +
      `advertising demand and your own performance. The definitive franchise agreement is what ` +
      `binds.`,
    `Canonical HTML version: ${BASE_URL}/franchise`,
    `Full program document, PDF: ${BASE_URL}${FRANCHISE_PDF_PATH}`,
    `Contact: ${COMPANY.email}`,
  ].join("\n\n");
}
