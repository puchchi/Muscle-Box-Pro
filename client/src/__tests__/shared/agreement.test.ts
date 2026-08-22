import { describe, it, expect } from "vitest";
import { AGREEMENT_V2_1 } from "@shared/agreement/v2_1";
import {
  MissingAgreementFieldError,
  canIssue,
  collectBlockers,
  collectTokens,
  findUnresolvedTokens,
  fingerprint,
  renderPlainText,
  renderText,
  sha256Hex,
} from "@shared/agreement/render";
import { PLAIN_LANGUAGE_V2_1 } from "@shared/agreement/plainLanguage";
import type { AgreementFields, Block } from "@shared/agreement/types";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";

/**
 * Fixed inputs for the hash test. These are NOT example values to be freshened —
 * changing any character here changes the expected hash below, which is the whole
 * point. Treat them as a golden fixture.
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
  // v2.1 has no token for this — its §5.1 transcribes the words as fixed text, which
  // is the defect v2.2 fixes. Present because `AgreementFields` requires it; it does
  // not appear in v2.1's rendered bytes, so the golden hash below is unaffected.
  securityDepositInWords: "Rupees Fifty Thousand Only",
  termMonths: "24",
  mbpNotices: {
    address: "BlendBox Innovations LLP, Bengaluru",
    email: "legal@muscleboxpro.com",
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

/** Flattens cover + sections + schedules so a test can search the whole tree. */
function allBlocks(): { location: string; block: Block }[] {
  const out = AGREEMENT_V2_1.cover.map((block) => ({ location: "Cover", block }));
  for (const section of [...AGREEMENT_V2_1.sections, ...AGREEMENT_V2_1.schedules]) {
    for (const block of section.blocks) out.push({ location: section.number, block });
  }
  return out;
}

describe("agreement v2.1 structure", () => {
  it("has all forty-seven sections, numbered 1 to 47 with no gaps", () => {
    expect(AGREEMENT_V2_1.sections.map((s) => s.number)).toEqual(
      Array.from({ length: 47 }, (_, i) => String(i + 1)),
    );
  });

  it("has Schedules A through H", () => {
    expect(AGREEMENT_V2_1.schedules.map((s) => s.number)).toEqual([
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
    for (const section of [...AGREEMENT_V2_1.sections, ...AGREEMENT_V2_1.schedules]) {
      expect(section.heading, `section ${section.number}`).not.toBe("");
      expect(section.blocks.length, `section ${section.number}`).toBeGreaterThan(0);
    }
  });

  it("uses unique todo ids", () => {
    const ids = collectBlockers(AGREEMENT_V2_1).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("commercial terms agree with shared/partnership/summary", () => {
  const text = renderPlainText(AGREEMENT_V2_1, FIXTURE);

  it("states the same term length the public page advertises", () => {
    // FIXTURE.termMonths is the token value, so this catches the summary and the
    // agreement drifting apart — /gym-partnership says 24 months, §4.2 must too.
    expect(FIXTURE.termMonths).toBe(String(PARTNERSHIP.initialTermMonths));
    expect(text).toContain(`The initial term shall be ${PARTNERSHIP.initialTermMonths} months`);
  });

  it("states the same security deposit", () => {
    expect(FIXTURE.securityDeposit).toBe(formatInr(PARTNERSHIP.securityDepositInr));
    expect(text).toContain(formatInr(PARTNERSHIP.securityDepositInr));
  });

  it("states the same profit-share ratios", () => {
    const before = PARTNERSHIP.gymNetProfitSharePct.beforeMilestone;
    const after = PARTNERSHIP.gymNetProfitSharePct.afterMilestone;
    expect(text).toContain(`${100 - before}% - MuscleBoxPro | ${before}% - Gym`);
    expect(text).toContain(`${100 - after}% - MuscleBoxPro | ${after}% - Gym`);
  });

  it("states the same settlement window and exit notice", () => {
    expect(text).toContain(
      `settled within ${PARTNERSHIP.settlementDaysAfterMonthEnd} days after the end`,
    );
    expect(text).toContain(`providing ${PARTNERSHIP.noticeDays.gymExit} days' written notice`);
    expect(text).toContain(
      `providing the Gym with ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice`,
    );
  });

  it("states the same electricity reimbursement rule", () => {
    const { inrPerBlock, cupsPerBlock, reviewWindowMonths } = PARTNERSHIP.electricity;
    expect(text).toContain(
      `${formatInr(inrPerBlock)} for every completed ${cupsPerBlock.toLocaleString("en-IN")} paid cups`,
    );
    // The clause spells the window out in words, so the numeral is checked
    // against the constant separately rather than interpolated into the string.
    expect(reviewWindowMonths).toBe(3);
    expect(text).toContain("For each three-month review period");
    expect(PARTNERSHIP.electricity.carryForward).toBe(false);
    expect(text).toContain("shall not carry forward");
  });
});

describe("unresolved source-document content", () => {
  it("refuses to issue while blocks-send markers remain", () => {
    const check = canIssue(AGREEMENT_V2_1, FIXTURE);
    expect(check.ok).toBe(false);
  });

  it("names exactly the defects that must be fixed before a gym sees this", () => {
    // Locked deliberately. Adding a blocker is fine; silently *removing* one means
    // somebody deleted a marker without fixing the document, which is the failure
    // this whole mechanism exists to prevent.
    const blocking = collectBlockers(AGREEMENT_V2_1)
      .filter((b) => b.severity === "blocks-send")
      .map((b) => b.id)
      .sort();
    expect(blocking).toEqual([
      "s4-4-empty",
      "s46-dispute-mechanism-missing",
      "s6-1-no-heading",
      "s6-3-empty",
      "s6-milestone-ambiguity",
      "schedule-b-early-termination-charge",
      "schedule-b-unlabelled-ratio-rows",
      "schedule-c-step4-conflicts-with-s6-1",
    ]);
  });

  it("flags the milestone conflict in every clause that states a trigger", () => {
    // §6.1 says "earlier of 15,000 cups or ₹5,00,000 gross"; §6.2's heading and
    // Schedule C step 4 say cups only. Both places must carry a marker, or a
    // reader of one clause never learns the other contradicts it.
    const ids = collectBlockers(AGREEMENT_V2_1).map((b) => b.id);
    expect(ids).toContain("s6-milestone-ambiguity");
    expect(ids).toContain("schedule-c-step4-conflicts-with-s6-1");
    expect(ids).toContain("s21-5-revenue-milestone-omitted");
  });

  it("keeps clause 4.4 and 6.3 as marked gaps rather than quietly dropping them", () => {
    // Renumbering around a missing clause would hide the omission. §4 must still
    // stop at 4.3 with a marker, and 6.3 must keep its heading and empty body.
    const section4 = AGREEMENT_V2_1.sections.find((s) => s.number === "4")!;
    expect(section4.blocks.filter((b) => b.kind === "clause").map((b) => b.number)).toEqual([
      "4.1",
      "4.2",
      "4.3",
    ]);
    const section6 = AGREEMENT_V2_1.sections.find((s) => s.number === "6")!;
    const c63 = section6.blocks.find((b) => b.kind === "clause" && b.number === "6.3");
    expect(c63).toEqual({ kind: "clause", number: "6.3", text: "Milestone Interpretation" });
  });

  it("gives every marker a problem and a resolution someone can act on", () => {
    for (const blocker of collectBlockers(AGREEMENT_V2_1)) {
      expect(blocker.problem.length, blocker.id).toBeGreaterThan(40);
      expect(blocker.resolution.length, blocker.id).toBeGreaterThan(40);
      expect(blocker.location, blocker.id).not.toBe("");
    }
  });

  it("sorts blockers with blocks-send first", () => {
    const severities = collectBlockers(AGREEMENT_V2_1).map((b) => b.severity);
    const rank = { "blocks-send": 0, "needs-review": 1, cosmetic: 2 } as const;
    expect(severities.map((s) => rank[s])).toEqual([...severities.map((s) => rank[s])].sort());
  });
});

describe("token substitution", () => {
  it("resolves nested dotted paths", () => {
    expect(renderText("Email: {{gymNotices.email}}", FIXTURE)).toBe(
      "Email: owner@irontemple.example",
    );
  });

  it("resolves every token the document uses", () => {
    expect(findUnresolvedTokens(AGREEMENT_V2_1, FIXTURE)).toEqual([]);
  });

  it("only uses tokens that exist on AgreementFields", () => {
    // A typo'd token would render as a placeholder in preview mode and go
    // unnoticed until a real contract went out with a blank in it.
    const known = new Set([
      ...Object.keys(FIXTURE),
      ...["mbpNotices", "gymNotices"].flatMap((group) =>
        Object.keys(FIXTURE[group as "mbpNotices"]).map((k) => `${group}.${k}`),
      ),
    ]);
    for (const token of collectTokens(AGREEMENT_V2_1)) {
      expect(known.has(token), `unknown token {{${token}}}`).toBe(true);
    }
  });

  it("throws rather than emit a contract containing a literal token", () => {
    expect(() => renderText("Deposit {{securityDeposit}}", {})).toThrow(
      MissingAgreementFieldError,
    );
  });

  it("substitutes a visible blank in preview mode", () => {
    expect(renderText("Deposit {{securityDeposit}}", {}, { onMissing: "placeholder" })).toBe(
      "Deposit __________",
    );
  });

  it("leaves no unsubstituted braces in the rendered agreement", () => {
    expect(renderPlainText(AGREEMENT_V2_1, FIXTURE)).not.toMatch(/\{\{/);
  });

  it("templates the deposit everywhere it appears, including the damage clauses", () => {
    // §5.7 and §20.5 hardcoded ₹50,000 in the PDF. If they were transcribed as
    // literals, a gym with a negotiated deposit would get a self-contradicting
    // contract, so both must come from the token.
    const rendered = renderPlainText(AGREEMENT_V2_1, { ...FIXTURE, securityDeposit: "₹75,000" });
    expect(rendered).toContain("If the cost of damage exceeds ₹75,000");
    expect(rendered).toContain("Where the damage exceeds ₹75,000");
    expect(rendered).not.toContain("₹50,000");
  });
});

describe("plain-text rendering and hashing", () => {
  it("is byte-identical across repeated renders", () => {
    expect(renderPlainText(AGREEMENT_V2_1, FIXTURE)).toBe(
      renderPlainText(AGREEMENT_V2_1, FIXTURE),
    );
  });

  it("excludes todo markers from the hashed text", () => {
    // A todo describes the document; it is not a term of it. If markers were
    // hashed, resolving a cosmetic transcription note would invalidate every
    // signature taken against clauses that never changed.
    const text = renderPlainText(AGREEMENT_V2_1, FIXTURE);
    for (const blocker of collectBlockers(AGREEMENT_V2_1)) {
      expect(text).not.toContain(blocker.problem);
      expect(text).not.toContain(blocker.resolution);
    }
  });

  it("changes the hash when a gym's values change", async () => {
    const a = await sha256Hex(renderPlainText(AGREEMENT_V2_1, FIXTURE));
    const b = await sha256Hex(
      renderPlainText(AGREEMENT_V2_1, { ...FIXTURE, gymLegalName: "Other Gym LLP" }),
    );
    expect(a).not.toBe(b);
  });

  it("produces a stable hash for v2.1 with the golden fixture", async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // DO NOT UPDATE THIS HASH TO MAKE A FAILING TEST PASS.
    //
    // It pins the exact bytes that a v2.1 signature attests to. If this fails,
    // either the agreement content changed — in which case add v2_2.ts rather
    // than editing v2.1 — or renderPlainText's format changed, which invalidates
    // every signature already stored. Both are things to stop and think about.
    // ─────────────────────────────────────────────────────────────────────────
    const { version, contentHash, length } = await fingerprint(AGREEMENT_V2_1, FIXTURE);
    expect(version).toBe("2.1");
    expect(length).toBe(31_103);
    expect(contentHash).toBe(
      "32e560ac088577008ff7af73f9cf4c1c4940ea4ff54a1e42301d1362374a75cf",
    );
  });

  it("refuses to fingerprint a half-substituted contract", async () => {
    await expect(
      fingerprint(AGREEMENT_V2_1, { ...FIXTURE, securityDeposit: undefined as never }),
    ).rejects.toThrow(MissingAgreementFieldError);
  });
});

describe("transcription fidelity", () => {
  it("keeps the clause text that gyms are most likely to be surprised by", () => {
    const text = renderPlainText(AGREEMENT_V2_1, FIXTURE);
    // The obligations a gym would call unexpected if it found them after signing.
    // /gym-partnership summarises these; the agreement must actually contain them.
    expect(text).toContain("does not constitute a sale of the Machine to the Gym");
    expect(text).toContain("not add its own protein powder");
    expect(text).toContain("shall not relocate the Machine without prior written approval");
    expect(text).toContain("commercially underperforming");
    expect(text).toContain("does not guarantee any minimum advertising revenue");
  });

  it("does not describe the advertising split as changing at the milestone", () => {
    const text = renderPlainText(AGREEMENT_V2_1, FIXTURE);
    expect(text).toContain("shall remain 80:20 even after");
  });

  it("keeps the §10.3 reimbursement table consistent with the §10.4 block rule", () => {
    const section10 = AGREEMENT_V2_1.sections.find((s) => s.number === "10")!;
    const table = section10.blocks.find((b) => b.kind === "table");
    expect(table).toBeDefined();
    if (table?.kind !== "table") throw new Error("unreachable");
    // 0-999 pays the floor, 1,000-1,999 is one completed block and also pays the
    // floor amount, and each further completed block adds ₹1,000.
    expect(table.rows).toEqual([
      ["0-999", "₹1,000"],
      ["1,000-1,999", "₹1,000"],
      ["2,000-2,999", "₹2,000"],
      ["3,000-3,999", "₹3,000"],
      ["4,000-4,999", "₹4,000"],
    ]);
  });

  it("has no leftover mojibake from the PDF extraction", () => {
    // The source PDF renders ₹ as "?" in the §6 callout. Transcription restored
    // the real character; this guards against it coming back via copy-paste.
    for (const { location, block } of allBlocks()) {
      if (block.kind === "todo") continue;
      const strings = JSON.stringify(block);
      expect(strings, location).not.toMatch(/�/);
      expect(strings, location).not.toMatch(/\?\s?\d[\d,]{2,}/);
    }
  });

  it("carries a signature block for both parties", () => {
    const section47 = AGREEMENT_V2_1.sections.find((s) => s.number === "47")!;
    const sig = section47.blocks.find((b) => b.kind === "signatures");
    if (sig?.kind !== "signatures") throw new Error("§47 has no signature block");
    expect(sig.parties).toHaveLength(2);
    expect(renderText(sig.parties[1].heading, FIXTURE)).toBe("FOR Iron Temple Fitness LLP");
  });
});

/**
 * The "In short" panel against the document it summarises.
 *
 * This is the test that matters most in this file, because the panel is what a gym
 * actually reads before clicking "I have read and agree". A summary that drifts from
 * the clauses it claims to summarise is not a documentation bug — it is the thing the
 * gym relied on, and it would be read against us.
 */
describe("plain-language summary matches agreement v2.1", () => {
  const sectionNumbers = new Set(
    [...AGREEMENT_V2_1.sections, ...AGREEMENT_V2_1.schedules].map((s) => s.number),
  );
  const clauseNumbers = new Set(
    allBlocks()
      .map(({ block }) => (block.kind === "clause" ? block.number : null))
      .filter((n): n is string => n !== null),
  );

  it("links every item to a section that exists", () => {
    for (const item of PLAIN_LANGUAGE_V2_1) {
      expect(sectionNumbers.has(item.section), `§${item.section} (from §${item.clause})`).toBe(true);
    }
  });

  it("references clauses that exist, and that sit in the section they link to", () => {
    for (const item of PLAIN_LANGUAGE_V2_1) {
      // A bare section reference like "3" or "14" is the section itself; anything
      // dotted has to be a real clause number inside it.
      if (item.clause.includes(".")) {
        expect(clauseNumbers.has(item.clause), `clause ${item.clause}`).toBe(true);
        expect(item.clause.startsWith(`${item.section}.`), `${item.clause} in §${item.section}`).toBe(
          true,
        );
      } else {
        expect(item.clause).toBe(item.section);
      }
    }
  });

  it("quotes only figures that appear in the rendered document", () => {
    const text = renderPlainText(AGREEMENT_V2_1, FIXTURE);
    for (const item of PLAIN_LANGUAGE_V2_1) {
      for (const quote of item.quotes ?? []) {
        expect(text, `${quote} (from §${item.clause})`).toContain(quote);
      }
    }
  });

  it("covers the eight clauses the flow promises, with no duplicates", () => {
    expect(PLAIN_LANGUAGE_V2_1).toHaveLength(8);
    const refs = PLAIN_LANGUAGE_V2_1.map((i) => i.clause);
    expect(new Set(refs).size).toBe(refs.length);
    // Named explicitly: dropping one of these is a decision, not a refactor.
    expect(refs).toEqual(["3", "5.6", "14", "21", "12.4", "36.1", "6", "9.4"]);
  });

  it("states each item in the second person, so it reads as an obligation not a feature", () => {
    for (const item of PLAIN_LANGUAGE_V2_1) {
      expect(item.short.length, `§${item.clause} too terse`).toBeGreaterThan(40);
      expect(/\b(you|your)\b/i.test(item.short), `§${item.clause}`).toBe(true);
    }
  });
});
