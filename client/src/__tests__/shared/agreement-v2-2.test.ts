import { describe, it, expect } from "vitest";
import { AGREEMENT_V2_1 } from "@shared/agreement/v2_1";
import { AGREEMENT_V2_2, AGREEMENT_V2_2_RESOLUTIONS } from "@shared/agreement/v2_2";
import {
  canIssue,
  collectBlockers,
  collectTokens,
  findUnresolvedTokens,
  fingerprint,
  renderPlainText,
  renderText,
} from "@shared/agreement/render";
import { PLAIN_LANGUAGE_V2_2 } from "@shared/agreement/plainLanguage";
import type { AgreementFields, Block } from "@shared/agreement/types";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";
import { rupeesInWords } from "@shared/agreement/amountInWords";

/**
 * Agreement v2.2 — the version the onboarding flow issues.
 *
 * v2.1's test file asks "is this a faithful transcription, and does it correctly refuse
 * to be sent?". This one asks a different question, because 2.2 is drafted rather than
 * transcribed: **is it internally consistent, and is it now safe to send?** The two
 * failure modes it hunts are the ones a resolved document is uniquely exposed to —
 * a marker deleted without the clause behind it being fixed, and the same commercial
 * term stated two different ways in the body and the schedules.
 */

/**
 * Deliberately a separate copy of v2.1's fixture rather than a shared import.
 *
 * Each version's golden hash pins the bytes a signature against that version attests
 * to. If both suites read one fixture, a value edited to suit a future v2_3 test would
 * move v2.1's and v2.2's hashes as a side effect — and the fix at that point looks like
 * "update the expected hash", which is the one thing neither file may do.
 */
const FIXTURE: AgreementFields = {
  gymLegalName: "Iron Temple Fitness LLP",
  effectiveDate: "01 September 2026",
  machineModel: "MuscleBoxPro MBP-1",
  machineId: "MBP-0001",
  serialNumber: "SN-TEST-0001",
  machineValue: "₹4,50,000",
  installationDate: "05 September 2026",
  installationAddress: "12 MG Road, Bengaluru, Karnataka 560001",
  accessories: "Cup dispenser, water line kit",
  securityDeposit: "₹50,000",
  securityDepositInWords: "Rupees Fifty Thousand Only",
  termMonths: "24",
  mbpNotices: {
    address: "BlendBox Innovations LLP, Bengaluru",
    email: "legal@muscleboxpro.com",
    // Empty in production — see MBP_NOTICES. Populated here so the fixture also proves
    // that v2.2 renders identically whether or not a phone number exists, which is what
    // makes dropping the channel a §41 drafting change rather than a data change.
    phone: "+91 00000 00000",
  },
  gymNotices: {
    address: "12 MG Road, Bengaluru, Karnataka 560001",
    email: "owner@irontemple.example",
    phone: "+91 11111 11111",
  },
  signatoryName: "A. Owner",
  signatoryDesignation: "Designated Partner",
};

function allBlocks(): { location: string; block: Block }[] {
  const out = AGREEMENT_V2_2.cover.map((block) => ({ location: "Cover", block }));
  for (const section of [...AGREEMENT_V2_2.sections, ...AGREEMENT_V2_2.schedules]) {
    for (const block of section.blocks) out.push({ location: section.number, block });
  }
  return out;
}

const TEXT = renderPlainText(AGREEMENT_V2_2, FIXTURE);

/** Pinned bytes for the fingerprint test at the bottom of this file. */
const GOLDEN_LENGTH = 36_242;
const GOLDEN_HASH = "99a1394bd545d9e8f87666dfd4896cefa65c246ceffa5153f111a0a5b63152b0";

function clausesIn(sectionNumber: string): string[] {
  const section = [...AGREEMENT_V2_2.sections, ...AGREEMENT_V2_2.schedules].find(
    (s) => s.number === sectionNumber,
  );
  if (!section) throw new Error(`no section ${sectionNumber}`);
  return section.blocks.filter((b) => b.kind === "clause").map((b) => b.number);
}

describe("agreement v2.2 structure", () => {
  it("is a new version rather than an edit of 2.1", () => {
    // The version string is part of what gets hashed, so this is not cosmetic: a 2.2
    // labelled 2.1 would make every stored 2.1 fingerprint ambiguous.
    expect(AGREEMENT_V2_2.version).toBe("2.2");
    expect(AGREEMENT_V2_2.runningFooter).toContain("Version 2.2");
    expect(AGREEMENT_V2_1.version).toBe("2.1");
    expect(renderPlainText(AGREEMENT_V2_2, FIXTURE)).not.toBe(
      renderPlainText(AGREEMENT_V2_1, FIXTURE),
    );
  });

  it("keeps all forty-seven sections and Schedules A through H", () => {
    // §4.4 and §33.3 were deleted, not the sections holding them. Renumbering sections
    // would break every clause cross-reference and every stored section anchor.
    expect(AGREEMENT_V2_2.sections.map((s) => s.number)).toEqual(
      Array.from({ length: 47 }, (_, i) => String(i + 1)),
    );
    expect(AGREEMENT_V2_2.schedules.map((s) => s.number)).toEqual([
      "Schedule A",
      "Schedule B",
      "Schedule C",
      "Schedule D",
      "Schedule E",
      "Schedule F",
      "Schedule G",
      "Schedule H",
    ]);
  });

  it("gives every section a heading and at least one block", () => {
    for (const section of [...AGREEMENT_V2_2.sections, ...AGREEMENT_V2_2.schedules]) {
      expect(section.heading, `section ${section.number}`).not.toBe("");
      expect(section.blocks.length, `section ${section.number}`).toBeGreaterThan(0);
    }
  });

  it("numbers clauses in order within a section, with no repeats", () => {
    for (const section of [...AGREEMENT_V2_2.sections, ...AGREEMENT_V2_2.schedules]) {
      const numbers = section.blocks.filter((b) => b.kind === "clause").map((b) => b.number);
      expect(new Set(numbers).size, `§${section.number} repeats a clause number`).toBe(
        numbers.length,
      );
      for (const number of numbers) {
        expect(number.startsWith(`${section.number}.`), `${number} in §${section.number}`).toBe(
          true,
        );
      }
    }
  });

  it("uses unique todo ids", () => {
    const ids = collectBlockers(AGREEMENT_V2_2).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/**
 * The point of the version: it can actually be sent.
 *
 * These four tests are the ones that would catch the worst possible mistake in this
 * file — a marker deleted to make `canIssue()` pass while the clause behind it stayed
 * broken. Two directions are checked: nothing blocking survives, and every v2.1 marker
 * that no longer exists has a recorded resolution.
 */
describe("v2.2 can be issued", () => {
  it("has no blocks-send markers left", () => {
    const blocking = collectBlockers(AGREEMENT_V2_2).filter((b) => b.severity === "blocks-send");
    expect(blocking.map((b) => `${b.location}: ${b.id}`)).toEqual([]);
  });

  it("passes canIssue with real gym values", () => {
    const check = canIssue(AGREEMENT_V2_2, FIXTURE);
    expect(check.ok).toBe(true);
  });

  it("accounts for every marker v2.1 carried", () => {
    // Every id that was in 2.1 must either still be in 2.2 (carried over deliberately)
    // or have a line in AGREEMENT_V2_2_RESOLUTIONS saying how it was closed. Deleting a
    // marker and saying nothing fails here.
    const remaining = new Set(collectBlockers(AGREEMENT_V2_2).map((b) => b.id));
    for (const { id } of collectBlockers(AGREEMENT_V2_1)) {
      const accounted = remaining.has(id) || id in AGREEMENT_V2_2_RESOLUTIONS;
      expect(accounted, `v2.1 marker "${id}" is neither carried over nor resolved`).toBe(true);
    }
  });

  it("does not claim to have resolved a marker that was never raised", () => {
    const v21Ids = new Set(collectBlockers(AGREEMENT_V2_1).map((b) => b.id));
    for (const id of Object.keys(AGREEMENT_V2_2_RESOLUTIONS)) {
      expect(v21Ids.has(id), `resolution recorded for unknown marker "${id}"`).toBe(true);
    }
  });

  it("keeps only reviewable markers, each still actionable", () => {
    const remaining = collectBlockers(AGREEMENT_V2_2);
    expect(remaining.map((b) => b.id).sort()).toEqual([
      "s41-mbp-address-incomplete",
      "schedule-a-second-signing",
      "v2-2-not-reviewed-by-counsel",
    ]);
    for (const marker of remaining) {
      expect(marker.severity, marker.id).toBe("needs-review");
      expect(marker.problem.length, marker.id).toBeGreaterThan(40);
      expect(marker.resolution.length, marker.id).toBeGreaterThan(40);
      expect(marker.location, marker.id).not.toBe("");
    }
  });

  it("says on its face that its new clauses have not been through counsel", () => {
    // The honest marker. It is needs-review rather than blocks-send by decision, which
    // means issuing 2.2 is a knowing acceptance of that risk — so the record of the
    // risk has to exist and has to name the clauses it covers.
    const marker = collectBlockers(AGREEMENT_V2_2).find(
      (b) => b.id === "v2-2-not-reviewed-by-counsel",
    );
    expect(marker).toBeDefined();
    for (const ref of ["5.9", "6.1", "24.6", "34", "36.2", "46"]) {
      expect(marker!.problem, `§${ref} not named`).toContain(ref);
    }
    // Removing the stamp-duty section removed the reminder, not the liability.
    expect(marker!.problem.toLowerCase()).toContain("stamp");
  });
});

/**
 * The milestone, stated in five places.
 *
 * v2.1's single worst defect was that §6.1, Schedule B and Schedule C step 4 disagreed
 * about what triggers 50:50, while §43 made all three part of one entire agreement. A
 * contract that states the same commercial term two ways is a contract where the gym
 * gets to pick. This is the test that stops it coming back.
 */
describe("the milestone is stated identically everywhere", () => {
  const CUPS = "15,000 completed paid cups";
  const PROFIT = "₹5,00,000";

  it("matches the standard terms in shared/partnership/summary", () => {
    // The clause text is a literal, because a signed document cannot be rewritten by a
    // later change to our standard commercials. This asserts they agreed when 2.2 was
    // written — if the standard terms move, the answer is v2_3, not an edit here.
    expect(PARTNERSHIP.milestone.cups).toBe(15_000);
    expect(PARTNERSHIP.milestone.cumulativeNetProfitInr).toBe(5_00_000);
    expect(PARTNERSHIP.milestone.basis).toBe("earlier-of");
    expect(TEXT).toContain(CUPS);
    expect(TEXT).toContain(PROFIT);
  });

  it("states the earlier-of test in §6.1, §21.5, Schedule B and Schedule C", () => {
    const section6 = AGREEMENT_V2_2.sections.find((s) => s.number === "6")!;
    const s61Body = section6.blocks.find(
      (b) => b.kind === "paragraph" && b.text.includes("Milestone"),
    );
    if (s61Body?.kind !== "paragraph") throw new Error("§6.1 has no body text");
    expect(s61Body.text).toContain(CUPS);
    expect(s61Body.text).toContain(PROFIT);
    expect(s61Body.text).toContain("earlier of");

    const scheduleB = AGREEMENT_V2_2.schedules.find((s) => s.number === "Schedule B")!;
    const table = scheduleB.blocks.find((b) => b.kind === "table");
    if (table?.kind !== "table") throw new Error("Schedule B has no table");
    const milestoneRow = table.rows.find((r) => r[0].startsWith("Milestone"));
    expect(milestoneRow?.[1]).toBe(
      `Earlier of ${CUPS} or ${PROFIT} cumulative Net Profit as defined in Section 7`,
    );

    // Schedule C step 4 and §21.5 both restate it rather than cross-referencing, so
    // both have to carry both tests.
    expect(TEXT).toContain(`until the Milestone in clause 6.1 is reached, being the earlier of`);
    expect(TEXT).toContain("does not reset the cumulative cup count, the cumulative Net Profit");
  });

  it("says the profit test is the pool, not the gym's share, and not gross", () => {
    // The single most valuable sentence in §6.3. Read as the gym's 20% share, the
    // threshold arrives five times later; read as gross, it arrives ~3.6x sooner.
    expect(TEXT).toContain("before any division between the Parties");
    expect(TEXT).toContain("It is not the Gym's share of Net Profit, and it is not gross");
  });

  it("makes the step-up a one-way ratchet in words, matching what compute.ts does", () => {
    expect(TEXT).toContain("does not revert");
    expect(TEXT).toContain("falls below ₹5,00,000");
  });

  it("gives §6.3 real sub-clauses instead of an empty heading", () => {
    expect(clausesIn("6")).toEqual([
      "6.1",
      "6.2",
      "6.3",
      "6.3.1",
      "6.3.2",
      "6.3.3",
      "6.3.4",
      "6.3.5",
      "6.4",
    ]);
  });

  it("commits to showing the gym where the milestone was crossed", () => {
    // §6.3.5 is what makes 6.3.3's mid-month split auditable by the gym rather than
    // something it has to take on trust. The dashboard already renders it.
    expect(TEXT).toContain("record the date and the cumulative cup number");
    expect(TEXT).toContain("partner dashboard and the monthly statement");
  });
});

describe("the clauses 2.2 resolved", () => {
  it("§4 stops at 4.3 with no empty clause left behind", () => {
    expect(clausesIn("4")).toEqual(["4.1", "4.2", "4.3"]);
    for (const { location, block } of allBlocks()) {
      if (block.kind === "clause") {
        expect(block.text.trim().length, `${location} clause ${block.number} is empty`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("§5.1 prints the deposit as a figure and in words, from the same number", () => {
    expect(TEXT).toContain("₹50,000 - Rupees Fifty Thousand Only");
    // The defect this closes: a negotiated deposit used to leave the words behind.
    const negotiated = renderPlainText(AGREEMENT_V2_2, {
      ...FIXTURE,
      securityDeposit: formatInr(75_000),
      securityDepositInWords: rupeesInWords(75_000),
    });
    expect(negotiated).toContain("₹75,000 - Rupees Seventy Five Thousand Only");
    expect(negotiated).not.toContain("Fifty Thousand");
  });

  it("§5.9 says the deposit carries no GST and gets a receipt, not a tax invoice", () => {
    expect(TEXT).toContain("not consideration for a supply of goods or services");
    expect(TEXT).toContain("deposit receipt rather than a tax invoice");
    // And does not stop there: a forfeited deposit is consideration, and that case
    // needs its own tax document rather than silence.
    expect(TEXT).toContain("applied or forfeited");
  });

  it("§10.3's table is illustrative, and continues past ₹4,000", () => {
    const section10 = AGREEMENT_V2_2.sections.find((s) => s.number === "10")!;
    const table = section10.blocks.find((b) => b.kind === "table");
    if (table?.kind !== "table") throw new Error("§10 has no table");
    expect(table.rows).toEqual([
      ["0-999", "₹1,000"],
      ["1,000-1,999", "₹1,000"],
      ["2,000-2,999", "₹2,000"],
      ["3,000-3,999", "₹3,000"],
      ["4,000-4,999", "₹4,000"],
      ["5,000 and above", "₹1,000 for each completed block of 1,000 paid cups"],
    ]);
    // The words matter more than the row: a gym at 12,000 cups in a window has no
    // reading available to it that pays ₹4,000.
    expect(TEXT).toContain("does not cap the reimbursement");
  });

  it("§24.6 names MuscleBoxPro as the FSSAI food business operator, in both places", () => {
    expect(TEXT).toContain(
      "MuscleBoxPro is the Food Business Operator in respect of the food dispensed by the Machine",
    );
    expect(TEXT).toContain("shall not hold itself out as the Food Business Operator");
    // Schedule F restates it; if only one of the two said it, §43 would make the
    // document ambiguous about who holds the licence.
    const scheduleF = AGREEMENT_V2_2.schedules.find((s) => s.number === "Schedule F")!;
    expect(JSON.stringify(scheduleF)).toContain("Food Business Operator");
    expect(TEXT).not.toContain("food consultant");
  });

  it("§34 excludes consequential loss, caps nothing, and protects the gym's share", () => {
    expect(clausesIn("34")).toEqual(["34.1", "34.2", "34.3", "34.4"]);
    expect(TEXT).toContain("No monetary cap applies to either Party's liability for direct loss");
    // The trap an uncapped exclusion clause sets: read widely, "loss of profit" would
    // swallow the gym's own profit share, which is the consideration for the deal.
    expect(TEXT).toContain("are a direct contractual entitlement and are not excluded");
    expect(TEXT).toContain("death or personal injury caused by negligence");
    // No promise of a figure to be settled later.
    expect(TEXT).not.toContain("to be determined");
  });

  it("§33 drops the 'counsel will finalise this' clause and keeps a food-safety indemnity", () => {
    expect(clausesIn("33")).toEqual(["33.1", "33.2"]);
    expect(TEXT).toContain("indemnify the Gym against third-party claims arising from the");
  });

  it("§36.2 states the early-termination charge itself rather than pointing at a blank", () => {
    expect(PARTNERSHIP.earlyTerminationChargeInr).toBe(0);
    expect(TEXT).toContain("No early-termination charge is payable by the Gym");
    expect(TEXT).toContain("Nil, where the Gym gives the 30 days' written notice in clause 36.1");
    // Nil is conditional on the notice; without it, §37.6 recovers actual cost.
    expect(TEXT).toContain("without giving that notice");
    expect(TEXT).not.toContain("TO BE AGREED");
  });

  it("§41 offers only channels we actually staff", () => {
    const section41 = AGREEMENT_V2_2.sections.find((s) => s.number === "41")!;
    const table = section41.blocks.find((b) => b.kind === "table");
    if (table?.kind !== "table") throw new Error("§41 has no table");
    expect(table.rows).toHaveLength(2);
    expect(JSON.stringify(table.rows)).not.toContain("mbpNotices.phone");
    expect(TEXT).toContain("Telephone contact is not a channel for formal notice");
    // The gym's number stays in the document, labelled for what it is.
    expect(TEXT).toContain("operational contact number is +91 11111 11111");
  });

  it("renders §41 identically whether or not we hold a notices phone number", () => {
    // MBP_NOTICES.phone is "" in production. If §41 still referenced it, an empty
    // string would render as resolved — a silently blank notice channel — which is
    // why the clause drops the row rather than the value.
    const withoutPhone = renderPlainText(AGREEMENT_V2_2, {
      ...FIXTURE,
      mbpNotices: { ...FIXTURE.mbpNotices, phone: "" },
    });
    expect(withoutPhone).toBe(TEXT);
  });

  it("§46 gives a forum, and says arbitration is not it", () => {
    expect(clausesIn("46")).toEqual(["46.1", "46.2", "46.3", "46.4"]);
    expect(TEXT).toContain("governed by and construed in accordance with the laws of India");
    expect(TEXT).toContain(
      "exclusive jurisdiction of the competent courts at Gautam Buddha Nagar, Uttar Pradesh",
    );
    // Stated positively, so the absence of an arbitration clause cannot be argued to be
    // an oversight that some default rule fills in.
    expect(TEXT).toContain("have not agreed to refer disputes to arbitration");
    expect(TEXT).not.toMatch(/\bseat of arbitration\b/);
  });

  it("Schedule B labels which ratio belongs to which side of the milestone", () => {
    const scheduleB = AGREEMENT_V2_2.schedules.find((s) => s.number === "Schedule B")!;
    const table = scheduleB.blocks.find((b) => b.kind === "table");
    if (table?.kind !== "table") throw new Error("Schedule B has no table");
    // v2.1's three ratio rows had an empty label column.
    for (const row of table.rows) {
      expect(row[0].trim(), `unlabelled row: ${row.join(" | ")}`).not.toBe("");
      expect(row[1].trim(), `empty value for ${row[0]}`).not.toBe("");
    }
    const labels = table.rows.map((r) => r[0]);
    expect(labels).toContain("Profit Share, before the Milestone");
    expect(labels).toContain("Profit Share, after the Milestone");
    expect(labels).toContain("FSSAI Food Business Operator");
  });

  it("carries no execution note deferring its own terms to advisors", () => {
    // 2.1's cover told the reader that stamp duty, tax, the FBO, liability and the
    // forum were all still open. A document that lists its own provisional clauses
    // invites an argument about every one of them.
    const coverText = JSON.stringify(AGREEMENT_V2_2.cover.filter((b) => b.kind !== "todo"));
    expect(coverText).not.toMatch(/stamp/i);
    expect(coverText).not.toMatch(/execution note/i);
    expect(TEXT).not.toMatch(/stamp dut/i);
    expect(TEXT).not.toMatch(/legal counsel/i);
  });
});

describe("commercial terms agree with shared/partnership/summary", () => {
  it("states the same term length, deposit and ratios", () => {
    expect(FIXTURE.termMonths).toBe(String(PARTNERSHIP.initialTermMonths));
    expect(FIXTURE.securityDeposit).toBe(formatInr(PARTNERSHIP.securityDepositInr));
    expect(FIXTURE.securityDepositInWords).toBe(rupeesInWords(PARTNERSHIP.securityDepositInr));
    expect(TEXT).toContain(`The initial term shall be ${PARTNERSHIP.initialTermMonths} months`);

    const before = PARTNERSHIP.gymNetProfitSharePct.beforeMilestone;
    const after = PARTNERSHIP.gymNetProfitSharePct.afterMilestone;
    expect(TEXT).toContain(`${100 - before}% - MuscleBoxPro | ${before}% - Gym`);
    expect(TEXT).toContain(`${100 - after}% - MuscleBoxPro | ${after}% - Gym`);
  });

  it("states the same settlement window and notice periods", () => {
    expect(TEXT).toContain(
      `settled within ${PARTNERSHIP.settlementDaysAfterMonthEnd} days after the end`,
    );
    expect(TEXT).toContain(`giving MuscleBoxPro ${PARTNERSHIP.noticeDays.gymExit} days' written notice`);
    expect(TEXT).toContain(
      `providing the Gym with ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice`,
    );
  });

  it("states the same electricity rule, and keeps advertising off the milestone", () => {
    const { inrPerBlock, cupsPerBlock } = PARTNERSHIP.electricity;
    expect(TEXT).toContain(
      `${formatInr(inrPerBlock)} for every completed ${cupsPerBlock.toLocaleString("en-IN")} paid cups`,
    );
    expect(TEXT).toContain("shall not carry forward");
    // §9.4 — the easiest clause in the document to get wrong by "tidying".
    expect(PARTNERSHIP.advertisingGymSharePct).toBe(20);
    expect(TEXT).toContain("shall remain 80:20 even after");
  });
});

describe("tokens and rendering", () => {
  it("resolves every token the document uses", () => {
    expect(findUnresolvedTokens(AGREEMENT_V2_2, FIXTURE)).toEqual([]);
    expect(TEXT).not.toMatch(/\{\{/);
  });

  it("only uses tokens that exist on AgreementFields", () => {
    const known = new Set([
      ...Object.keys(FIXTURE),
      ...["mbpNotices", "gymNotices"].flatMap((group) =>
        Object.keys(FIXTURE[group as "mbpNotices"]).map((k) => `${group}.${k}`),
      ),
    ]);
    for (const token of collectTokens(AGREEMENT_V2_2)) {
      expect(known.has(token), `unknown token {{${token}}}`).toBe(true);
    }
  });

  it("templates the deposit everywhere it appears", () => {
    const rendered = renderPlainText(AGREEMENT_V2_2, {
      ...FIXTURE,
      securityDeposit: "₹75,000",
      securityDepositInWords: rupeesInWords(75_000),
    });
    expect(rendered).toContain("If the cost of damage exceeds ₹75,000");
    expect(rendered).toContain("Where the damage exceeds ₹75,000");
    expect(rendered).not.toContain("₹50,000");
  });

  it("excludes todo markers from the hashed text", () => {
    for (const marker of collectBlockers(AGREEMENT_V2_2)) {
      expect(TEXT).not.toContain(marker.problem);
      expect(TEXT).not.toContain(marker.resolution);
    }
  });

  it("has no mojibake or stray placeholder braces", () => {
    for (const { location, block } of allBlocks()) {
      if (block.kind === "todo") continue;
      const strings = JSON.stringify(block);
      expect(strings, location).not.toMatch(/�/);
      expect(strings, location).not.toMatch(/\?\s?\d[\d,]{2,}/);
    }
  });

  it("carries a signature block for both parties", () => {
    const section47 = AGREEMENT_V2_2.sections.find((s) => s.number === "47")!;
    const sig = section47.blocks.find((b) => b.kind === "signatures");
    if (sig?.kind !== "signatures") throw new Error("§47 has no signature block");
    expect(sig.parties).toHaveLength(2);
    expect(renderText(sig.parties[1].heading, FIXTURE)).toBe("FOR Iron Temple Fitness LLP");
  });

  it("produces a stable hash for v2.2 with the golden fixture", async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // DO NOT UPDATE THIS HASH TO MAKE A FAILING TEST PASS.
    //
    // It pins the exact bytes a v2.2 signature attests to. Once a gym has signed
    // against 2.2, a change here means the clause text changed underneath a signed
    // document — the fix is v2_3.ts, not a new expected value.
    // ─────────────────────────────────────────────────────────────────────────
    const { version, contentHash, length } = await fingerprint(AGREEMENT_V2_2, FIXTURE);
    expect(version).toBe("2.2");
    expect(length).toBe(GOLDEN_LENGTH);
    expect(contentHash).toBe(GOLDEN_HASH);
  });
});

/**
 * The "In short" panel against the document it summarises.
 *
 * The most important tests in this file, for the same reason they are in v2.1's: the
 * panel is what a gym reads before clicking "I have read and agree", so a line that
 * drifts from its clause is not a documentation bug — it is what the gym relied on.
 */
describe("plain-language summary matches agreement v2.2", () => {
  const sectionNumbers = new Set(
    [...AGREEMENT_V2_2.sections, ...AGREEMENT_V2_2.schedules].map((s) => s.number),
  );
  const clauseNumbers = new Set(
    allBlocks()
      .map(({ block }) => (block.kind === "clause" ? block.number : null))
      .filter((n): n is string => n !== null),
  );

  it("links every item to a section that exists", () => {
    for (const item of PLAIN_LANGUAGE_V2_2) {
      expect(sectionNumbers.has(item.section), `§${item.section} (from §${item.clause})`).toBe(
        true,
      );
    }
  });

  it("references clauses that exist, and that sit in the section they link to", () => {
    for (const item of PLAIN_LANGUAGE_V2_2) {
      if (item.clause.includes(".")) {
        expect(clauseNumbers.has(item.clause), `clause ${item.clause}`).toBe(true);
        expect(
          item.clause.startsWith(`${item.section}.`),
          `${item.clause} in §${item.section}`,
        ).toBe(true);
      } else {
        expect(item.clause).toBe(item.section);
      }
    }
  });

  it("quotes only figures that appear in the rendered document", () => {
    for (const item of PLAIN_LANGUAGE_V2_2) {
      for (const quote of item.quotes ?? []) {
        expect(TEXT, `${quote} (from §${item.clause})`).toContain(quote);
      }
    }
  });

  it("covers the eleven clauses the flow promises, with no duplicates", () => {
    expect(PLAIN_LANGUAGE_V2_2).toHaveLength(11);
    const refs = PLAIN_LANGUAGE_V2_2.map((i) => i.clause);
    expect(new Set(refs).size).toBe(refs.length);
    // Named explicitly: dropping one of these is a decision, not a refactor.
    expect(refs).toEqual([
      "3",
      "6",
      "9.4",
      "5.6",
      "14",
      "24.6",
      "21",
      "12.4",
      "36.1",
      "34",
      "46",
    ]);
  });

  it("discloses the terms that bite, not only the ones that sell", () => {
    const byClause = new Map(PLAIN_LANGUAGE_V2_2.map((i) => [i.clause, i.short]));
    // Uncapped direct liability and a forum in our own district are the two things a
    // gym would be entitled to be annoyed about finding after signing.
    expect(byClause.get("34")).toMatch(/cap on liability for direct loss/i);
    expect(byClause.get("34")).toMatch(/recoverable in full/i);
    expect(byClause.get("46")).toContain("Gautam Buddha Nagar");
    expect(byClause.get("46")).toMatch(/may not be where you are/i);
  });

  it("no longer describes resolved clauses as unresolved", () => {
    const all = PLAIN_LANGUAGE_V2_2.map((i) => i.short).join(" ");
    // v2.1's panel truthfully said §36.2's charge was blank and that §6 contradicted
    // its own schedules. Both are fixed, so both lines had to be rewritten — a summary
    // describing a defect the document no longer has is as wrong as the reverse.
    expect(all).not.toMatch(/still blank/i);
    expect(all).not.toMatch(/do not agree/i);
    expect(all).not.toMatch(/read it as a request/i);
  });

  it("states each item in the second person, so it reads as an obligation not a feature", () => {
    for (const item of PLAIN_LANGUAGE_V2_2) {
      expect(item.short.length, `§${item.clause} too terse`).toBeGreaterThan(40);
      expect(/\b(you|your|we|our|us)\b/i.test(item.short), `§${item.clause}`).toBe(true);
    }
  });
});
