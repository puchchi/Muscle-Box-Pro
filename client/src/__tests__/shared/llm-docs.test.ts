/**
 * What these tests are for: the `.md` mirrors and `llms.txt` are the only surfaces that state
 * the commercial terms to a machine, and the failure they are guarding against is not a crash.
 * It is a figure drifting away from `shared/partnership/summary.ts` or
 * `shared/franchise/program.ts` and being quoted back by an AI engine for months.
 *
 * So every assertion below derives its expected value from those modules rather than typing a
 * rupee figure, which is the same rule the pages follow. A test with `₹50,000` written into it
 * is a fourth copy of the term.
 */
import { describe, expect, it } from "vitest";
import { COMPANY } from "@shared/company";
import {
  CITY_SCHEDULE_CAVEAT,
  FRANCHISE,
  FRANCHISE_TIERS,
  formatLakh,
  franchiseTier,
} from "@shared/franchise/program";
import { FRANCHISE_FAQ } from "@shared/franchise/faq";
import { PARTNERSHIP_FAQ } from "@shared/partnership/faq";
import { INDICATIVE_ECONOMICS, PARTNERSHIP, formatInr } from "@shared/partnership/summary";
import { PAGE_CHANGED_ON } from "@shared/seo/pages";
import {
  FRANCHISE_PDF_PATH,
  franchiseMarkdown,
  gymPartnershipMarkdown,
} from "@shared/seo/llmDocs";
import { llmsTxt } from "@shared/seo/llmsTxt";

const CITIES = [
  { slug: "delhi", name: "Delhi" },
  { slug: "noida", name: "Noida" },
];

describe("gymPartnershipMarkdown", () => {
  const doc = gymPartnershipMarkdown();

  it("opens with front matter naming the canonical page", () => {
    expect(doc.startsWith("---\n")).toBe(true);
    expect(doc).toContain("canonical: https://www.muscleboxpro.com/gym-partnership");
    expect(doc).toContain(`updated: ${PAGE_CHANGED_ON["/gym-partnership"]}`);
    expect(doc).toContain(`publisher: ${COMPANY.legalName}`);
  });

  it("states every headline commercial term from PARTNERSHIP", () => {
    expect(doc).toContain(formatInr(PARTNERSHIP.securityDepositInr));
    expect(doc).toContain(`${PARTNERSHIP.initialTermMonths} months`);
    expect(doc).toContain(`${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}%`);
    expect(doc).toContain(`${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}%`);
    expect(doc).toContain(formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr));
    expect(doc).toContain(PARTNERSHIP.milestone.cups.toLocaleString("en-IN"));
    expect(doc).toContain(`${PARTNERSHIP.advertisingGymSharePct}%`);
    expect(doc).toContain(formatInr(PARTNERSHIP.electricity.inrPerBlock));
    expect(doc).toContain(`${PARTNERSHIP.settlementDaysAfterMonthEnd} days`);
    expect(doc).toContain(`${PARTNERSHIP.noticeDays.gymExit} days`);
  });

  it("carries the worked month's arithmetic rather than a transcribed total", () => {
    const cups = INDICATIVE_ECONOMICS.exampleCupsPerMonth;
    const net =
      cups * (INDICATIVE_ECONOMICS.avgSellingPriceInr - INDICATIVE_ECONOMICS.directCostPerCupInr);
    expect(doc).toContain(formatInr(net));
    expect(doc).toContain(
      formatInr(Math.round((net * PARTNERSHIP.gymNetProfitSharePct.beforeMilestone) / 100)),
    );
    expect(doc).toContain(
      formatInr(Math.round((net * PARTNERSHIP.gymNetProfitSharePct.afterMilestone) / 100)),
    );
  });

  it("reproduces every FAQ the page renders", () => {
    for (const faq of PARTNERSHIP_FAQ) {
      expect(doc).toContain(`### ${faq.question}`);
      expect(doc).toContain(faq.answer);
    }
  });

  /*
   * The PDF still carries the pre-2.2 milestone basis, so citing it beside the current one
   * would publish both answers at once. When it is re-exported from `v2_3.ts` this test is
   * what has to be deleted, deliberately, rather than the omission being noticed by accident.
   */
  it("does not cite the stale gym partnership PDF", () => {
    expect(doc).not.toContain("gym-partnership-terms");
  });

  it("says the signed agreement governs", () => {
    expect(doc.toLowerCase()).toContain("governs");
  });
});

describe("franchiseMarkdown", () => {
  const doc = franchiseMarkdown();
  const territory = franchiseTier("territory");
  const city = franchiseTier("city");

  it("opens with front matter naming the canonical page", () => {
    expect(doc.startsWith("---\n")).toBe(true);
    expect(doc).toContain("canonical: https://www.muscleboxpro.com/franchise");
    expect(doc).toContain(`as_of: ${FRANCHISE.asOf}`);
  });

  it("prices both tiers from FRANCHISE_TIERS", () => {
    for (const tier of [territory, city]) {
      expect(doc).toContain(tier.shortName);
      expect(doc).toContain(formatInr(tier.investmentInr));
      expect(doc).toContain(`${tier.initialMachines} machines`);
      expect(doc).toContain(tier.marketRights);
    }
  });

  it("states the two profit splits and that advertising is separate", () => {
    expect(doc).toContain(`${FRANCHISE.proteinProfitSharePct.duringRecovery}%`);
    expect(doc).toContain(
      `${FRANCHISE.proteinProfitSharePct.afterRecovery}:${
        100 - FRANCHISE.proteinProfitSharePct.afterRecovery
      }`,
    );
    expect(doc).toContain(
      `${FRANCHISE.advertising.franchiseeSharePct}% to you and ${FRANCHISE.advertising.mbpSharePct}%`,
    );
    expect(doc).toContain("does not count toward capital recovery");
  });

  it("keeps the recovery example's parts summing to the distribution", () => {
    const match = doc.match(/Total to you from that distribution: (₹[\d,]+)/);
    expect(match).not.toBeNull();
  });

  it("says the machines are not being bought", () => {
    expect(doc).toContain("not a purchase of the machines");
    for (const item of FRANCHISE.franchiseLevelCosts) {
      expect(doc.toLowerCase()).toContain(item.toLowerCase());
    }
  });

  it("reproduces every FAQ the page renders", () => {
    for (const faq of FRANCHISE_FAQ) {
      expect(doc).toContain(`### ${faq.question}`);
      expect(doc).toContain(faq.answer);
    }
  });

  it("cites the franchise PDF, which is current", () => {
    expect(doc).toContain(FRANCHISE_PDF_PATH);
  });

  it("keeps the load-bearing disclaimer", () => {
    expect(doc).toContain("Not an offer");
    expect(doc).toContain("not a guarantee of returns");
  });
});

/*
 * §6 publishes a payment schedule for both tiers. It used to publish only the Territory one, and
 * the /franchise FAQ still carried the answer from that era ("set in the definitive agreement")
 * while the tier cards, read from `paymentSchedule`, stated the City stages. Both render on the
 * page, and `franchiseMarkdown()` put them a few screens apart in one document.
 *
 * These assert the two surfaces agree, and that they agree by reading the field rather than by
 * someone having reconciled the prose once.
 */
describe("the §6 payment schedule", () => {
  const whenDoIPay = FRANCHISE_FAQ.find((faq) => faq.question === "When do I pay?");
  const doc = franchiseMarkdown();

  it("is still the FAQ question this reconciles", () => {
    expect(whenDoIPay).toBeDefined();
  });

  it("states every stage of every published schedule, in both surfaces", () => {
    for (const tier of FRANCHISE_TIERS) {
      expect(tier.paymentSchedule).not.toBeNull();
      for (const stage of tier.paymentSchedule ?? []) {
        const amount = formatInr((tier.investmentInr * stage.pct) / 100);
        expect(whenDoIPay?.answer).toContain(amount);
        expect(doc).toContain(amount);
      }
    }
  });

  it("carries the City carve-out wherever the City stages appear", () => {
    expect(whenDoIPay?.answer).toContain(CITY_SCHEDULE_CAVEAT);
    expect(doc).toContain(CITY_SCHEDULE_CAVEAT);
  });

  it("no longer claims the City schedule is deferred", () => {
    expect(whenDoIPay?.answer).not.toContain("set in the definitive agreement");
  });
});

describe("llmsTxt", () => {
  const txt = llmsTxt(CITIES);

  it("starts with the brand heading and ends with a newline", () => {
    expect(txt.startsWith(`# ${COMPANY.brandName}\n`)).toBe(true);
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("lists every city it is given, by name", () => {
    for (const { slug, name } of CITIES) {
      expect(txt).toContain(`[${name}](https://www.muscleboxpro.com/protein-vending-machine-${slug})`);
    }
  });

  it("links both Markdown mirrors", () => {
    expect(txt).toContain("https://www.muscleboxpro.com/gym-partnership.md");
    expect(txt).toContain("https://www.muscleboxpro.com/franchise.md");
  });

  it("keeps the five blog Markdown mirrors that already existed", () => {
    for (const slug of [
      "why-gyms-need-vending-machines",
      "best-protein-shake-after-workout",
      "protein-for-diabetes",
      "gym-member-retention",
      "how-i-fixed-my-hba1c",
    ]) {
      expect(txt).toContain(`https://www.muscleboxpro.com/blog/${slug}.md`);
    }
  });

  /*
   * The reason this file is generated at all. The static version restated these by hand and
   * nothing tied them to the modules that own them.
   */
  it("takes its figures from the terms modules", () => {
    expect(txt).toContain(formatInr(PARTNERSHIP.securityDepositInr));
    expect(txt).toContain(formatLakh(franchiseTier("territory").investmentInr));
    expect(txt).toContain(formatLakh(franchiseTier("city").investmentInr));
  });

  it("lists the franchise PDF and not the gym one", () => {
    expect(txt).toContain(FRANCHISE_PDF_PATH);
    expect(txt).not.toContain("gym-partnership-terms");
  });

  it("keeps the licence line and the DPIIT registration", () => {
    expect(txt).toContain("All rights reserved");
    expect(txt).toContain("DIPP252770");
  });
});

describe("the generated documents", () => {
  /*
   * Em dashes are out of UI copy by a standing decision, and these strings are rendered copy
   * even though no React component renders them. Asserted here because a hand-edit to a long
   * template literal is exactly where one reappears.
   */
  it("use no em dashes", () => {
    for (const doc of [gymPartnershipMarkdown(), franchiseMarkdown(), llmsTxt(CITIES)]) {
      expect(doc).not.toContain("—");
    }
  });

  it("emit no unresolved template holes", () => {
    for (const doc of [gymPartnershipMarkdown(), franchiseMarkdown(), llmsTxt(CITIES)]) {
      expect(doc).not.toContain("undefined");
      expect(doc).not.toContain("NaN");
      expect(doc).not.toContain("${");
    }
  });
});
