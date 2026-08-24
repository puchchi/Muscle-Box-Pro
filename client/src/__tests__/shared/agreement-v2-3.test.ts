import { describe, it, expect } from "vitest";
import { AGREEMENT_V2_2 } from "@shared/agreement/v2_2";
import { AGREEMENT_V2_3, AGREEMENT_V2_3_CHANGES } from "@shared/agreement/v2_3";
import {
  canIssue,
  collectBlockers,
  collectTokens,
  findUnresolvedTokens,
  renderPlainText,
  renderText,
} from "@shared/agreement/render";
import { PLAIN_LANGUAGE_V2_3 } from "@shared/agreement/plainLanguage";
import { ISSUED_AGREEMENT, ISSUED_PLAIN_LANGUAGE } from "@shared/agreement/issued";
import { GOLDEN_V2_3, verifyGoldenVector } from "@shared/agreement/goldenVector";
import type { Block, Section } from "@shared/agreement/types";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";
import { rupeesInWords } from "@shared/agreement/amountInWords";

/**
 * Agreement v2.3 — the version the onboarding flow issues.
 *
 * v2.1's suite asks "is this a faithful transcription, and does it correctly refuse to be
 * sent?". v2.2's asks "is it internally consistent, and is it now safe to send?". This one
 * asks the question 2.3 exists to answer: **does the document still ask the reader to fill
 * anything in, and did removing the places where it did change any term?**
 *
 * Both halves matter equally. A blank rule that survives is the defect 2.3 was written to
 * remove; a clause that moved while nobody was looking is a worse one, because 2.3's whole
 * claim is that it changes no term a gym is bound by, and that claim is what makes shipping
 * it a formatting decision rather than a renegotiation.
 */

const FIXTURE = GOLDEN_V2_3.fields;

const TEXT = renderPlainText(AGREEMENT_V2_3, FIXTURE);

/** Sections and schedules together — most checks here do not care which a block is in. */
function allSections(agreement = AGREEMENT_V2_3): Section[] {
  return [...agreement.sections, ...agreement.schedules];
}

function allBlocks(): { location: string; block: Block }[] {
  const out = AGREEMENT_V2_3.cover.map((block) => ({ location: "Cover", block }));
  for (const section of allSections()) {
    for (const block of section.blocks) out.push({ location: section.number, block });
  }
  return out;
}

function section(number: string): Section {
  const found = allSections().find((s) => s.number === number);
  if (!found) throw new Error(`no section ${number}`);
  return found;
}

function clausesIn(number: string): string[] {
  return section(number)
    .blocks.filter((b) => b.kind === "clause")
    .map((b) => b.number);
}

describe("agreement v2.3 structure", () => {
  it("is a new version rather than an edit of 2.2", () => {
    // The version string is hashed, so this is not cosmetic: a 2.3 labelled 2.2 makes
    // every stored 2.2 fingerprint ambiguous.
    expect(AGREEMENT_V2_3.version).toBe("2.3");
    expect(AGREEMENT_V2_3.runningFooter).toContain("Version 2.3");
    expect(AGREEMENT_V2_2.version).toBe("2.2");
    expect(TEXT).not.toBe(renderPlainText(AGREEMENT_V2_2, FIXTURE));
  });

  it("is the version the flow issues, with its own summary panel", () => {
    // `issued.ts` is the one place that decides, and a half-done version bump there —
    // the document moved to 2.3, the panel left on 2.2's list — is the failure that
    // module's docstring describes.
    expect(ISSUED_AGREEMENT).toBe(AGREEMENT_V2_3);
    expect(ISSUED_PLAIN_LANGUAGE).toBe(PLAIN_LANGUAGE_V2_3);
  });

  it("keeps all forty-seven sections and Schedules A through H", () => {
    expect(AGREEMENT_V2_3.sections.map((s) => s.number)).toEqual(
      Array.from({ length: 47 }, (_, i) => String(i + 1)),
    );
    expect(AGREEMENT_V2_3.schedules.map((s) => s.number)).toEqual([
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

  it("gives every section a heading and at least one block, with no empty clause", () => {
    for (const s of allSections()) {
      expect(s.heading, `section ${s.number}`).not.toBe("");
      expect(s.blocks.length, `section ${s.number}`).toBeGreaterThan(0);
    }
    for (const { location, block } of allBlocks()) {
      if (block.kind === "clause") {
        expect(block.text.trim().length, `${location} clause ${block.number}`).toBeGreaterThan(0);
      }
    }
  });

  it("numbers clauses in order within a section, with no repeats", () => {
    for (const s of allSections()) {
      const numbers = s.blocks.filter((b) => b.kind === "clause").map((b) => b.number);
      expect(new Set(numbers).size, `§${s.number} repeats a clause number`).toBe(numbers.length);
      for (const number of numbers) {
        expect(number.startsWith(`${s.number}.`), `${number} in §${s.number}`).toBe(true);
      }
    }
  });

  it("uses unique todo ids", () => {
    const ids = collectBlockers(AGREEMENT_V2_3).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/**
 * The point of the version: nothing on screen is waiting to be written on.
 *
 * 2.2 carried twenty-six blank rules, twenty-three of them belonging to installation and
 * to the return of the Machine — events months apart from signing. A gym reading a form it
 * could not fill in concluded it was looking at half of a two-party form and went looking
 * for its half. These are the tests that stop one coming back.
 */
describe("v2.3 prints no blank form", () => {
  it("has no blanks or checklist blocks anywhere in the document", () => {
    // Both kinds still exist on `Block` because 2.1 and 2.2 use them and still have to
    // render for verification. 2.3 uses neither, and a reintroduced one is the whole
    // defect returning rather than a stylistic slip.
    const offenders = allBlocks()
      .filter(({ block }) => block.kind === "blanks" || block.kind === "checklist")
      .map(({ location, block }) => `${location}: ${block.kind}`);
    expect(offenders).toEqual([]);
  });

  it("renders no rule to write on, in any form", () => {
    expect(TEXT).not.toContain("__________");
    expect(TEXT).not.toMatch(/_{3,}/);
    expect(TEXT).not.toMatch(/\[\s*to be completed/i);
    expect(TEXT).not.toMatch(/\[\s*\]/);
    // "Seal:" and a bare "Signature:" are the paper apparatus specifically; the word
    // "signature" itself stays, because §47.2 and the schedules describe signatures.
    expect(TEXT).not.toMatch(/^\s*(Signature|Seal|Date)\s*:/im);
  });

  it("still checks itself against a document that does print them", () => {
    // Proves the assertions above can fail. If `renderPlainText` ever stopped emitting
    // blanks at all, every check in this describe would pass vacuously.
    const v22 = renderPlainText(AGREEMENT_V2_2, FIXTURE);
    expect(v22).toMatch(/_{3,}/);
  });
});

/**
 * The machine identifiers, and the proof they are gone rather than merely unused.
 *
 * §2 listed Machine ID, Serial Number and Installation Date among the settled particulars
 * of a unit that has not been built when the agreement is signed, so all three rendered as
 * "To be completed at installation" — three holes in the middle of the table. They live on
 * the Installation Certificate under §17 now, and on step 6 of the onboarding flow.
 */
describe("§2 states only what is known at execution", () => {
  it("drops the Machine ID, Serial Number and Installation Date rows", () => {
    const table = section("2").blocks.find((b) => b.kind === "table");
    if (table?.kind !== "table") throw new Error("§2 has no table");
    expect(table.rows.map((r) => r[0])).toEqual([
      "Brand",
      "Model",
      "Machine Value",
      "Installation Location",
      "Accessories",
    ]);
  });

  it("says where the three particulars are recorded instead", () => {
    // Removed without a forwarding address, §2 would read as a document that simply does
    // not identify the unit it governs.
    expect(TEXT).toContain(
      "recorded on the Installation Certificate under clause 17, described in Schedule A",
    );
    expect(TEXT).toContain("this Agreement applies to the unit so recorded");
  });

  it("uses no token for a value that cannot be known at signing", () => {
    const tokens = new Set(collectTokens(AGREEMENT_V2_3));
    for (const token of ["machineId", "serialNumber", "installationDate"]) {
      expect(tokens.has(token), `{{${token}}} is still in the document`).toBe(false);
    }
  });

  it("renders identically whatever the machine identifiers say", () => {
    // The strong form of the test above, and the one that makes the hash meaningful: an
    // issued 2.3 cannot be made to differ by a unit allocated after it was signed.
    const later = renderPlainText(AGREEMENT_V2_3, {
      ...FIXTURE,
      machineId: "MBP-9999",
      serialNumber: "SN-OTHER-9999",
      installationDate: "31 December 2027",
    });
    expect(later).toBe(TEXT);
  });
});

/**
 * §47 — how the thing is actually executed.
 *
 * 2.2 gave each party Name, Designation, Signature, Date and Seal to write on, above a
 * paragraph asserting the Parties had already signed. Ten rules nobody can write on, on a
 * document executed by clicking a button in a browser.
 */
describe("§47 states how the agreement is executed", () => {
  const sig = (() => {
    const block = section("47").blocks.find((b) => b.kind === "signatures");
    if (block?.kind !== "signatures") throw new Error("§47 has no signature block");
    return block;
  })();

  it("is headed Execution and carries 47.1 to 47.3", () => {
    expect(section("47").heading).toBe("Execution");
    expect(clausesIn("47")).toEqual(["47.1", "47.2", "47.3"]);
  });

  it("says clicking is the signature, and that no handwritten one is needed", () => {
    expect(TEXT).toContain("executed electronically and is binding on both Parties");
    expect(TEXT).toContain("without a handwritten signature or seal");
    expect(TEXT).toContain("that the signatory is authorised to bind the Gym");
  });

  it("names the fingerprint and the timestamp as the evidence, and promises the gym both", () => {
    // This is the clause the stored `contentHash` and `signedAt` are evidence under. If
    // the wording stops saying we provide them, the flow is keeping a record the
    // agreement does not entitle the gym to see.
    expect(TEXT).toContain("records the SHA-256 fingerprint of the text of this Agreement");
    expect(TEXT).toContain("together with the date and time of that confirmation");
    expect(TEXT).toContain("provides both to the Gym with its copy");
    expect(TEXT).toContain("either Party may rely on it");
  });

  it("says Schedules A and H are signed separately and do not affect the fingerprint", () => {
    expect(TEXT).toContain(
      "Schedule A and Schedule H are completed and signed separately, at installation and on return",
    );
    expect(TEXT).toContain("neither affects the fingerprint recorded under clause 47.2");
  });

  it("prints the gym's signatory from the record rather than asking for them", () => {
    expect(sig.parties).toHaveLength(2);
    const gym = sig.parties[1];
    expect(renderText(gym.heading, FIXTURE)).toBe("FOR Iron Temple Fitness LLP");
    expect(gym.lines).toEqual([
      "Name: {{signatoryName}}",
      "Designation: {{signatoryDesignation}}",
      "Executed electronically on confirmation under clause 47.1.",
    ]);
    expect(TEXT).toContain("Name: A. Owner");
    expect(TEXT).toContain("Designation: Designated Partner");
  });

  it("makes the signatory load-bearing on the hashed text", () => {
    // Neither 2.1 nor 2.2 referenced these two fields by any token, so a step-1 typo
    // could not reach the document. In 2.3 it can, which is the point: the name in the
    // agreement is the name in the record, or the record is wrong.
    const other = renderPlainText(AGREEMENT_V2_3, {
      ...FIXTURE,
      signatoryName: "B. Manager",
      signatoryDesignation: "Director",
    });
    expect(other).not.toBe(TEXT);
    expect(other).toContain("Name: B. Manager");
    expect(other).not.toContain("A. Owner");
  });

  it("names MuscleBoxPro as an entity with no personal name and no blank for one", () => {
    // By decision: which of our people issued a given agreement is on our own record, and
    // a name printed into the hashed text is a second copy of that fact, free to be wrong.
    const mbp = sig.parties[0];
    expect(mbp.heading).toBe("FOR BLEND BOX INNOVATIONS LLP / MUSCLEBOXPRO");
    expect(mbp.lines).toEqual([
      "BlendBox Innovations LLP, by its authorised signatory.",
      "Executed electronically on issue of this Agreement.",
    ]);
    expect(JSON.stringify(mbp)).not.toContain("{{");
    expect(JSON.stringify(mbp)).not.toMatch(/Name:|Designation:/);
  });
});

/**
 * Schedules A and H — described, not printed.
 *
 * Both are certificates completed on site, one at installation and one at least twenty-four
 * months later on return of the Machine. 2.2 rendered both as forms inside a document
 * signed before either event, so the reader was shown a refund calculation that cannot be
 * performed for two years and asked, in effect, to check it.
 */
describe("the schedules describe their certificates instead of printing them", () => {
  for (const [number, certificate] of [
    ["Schedule A", "Installation Certificate"],
    ["Schedule H", "Return Certificate"],
  ]) {
    it(`${number} says what the ${certificate} records and who signs it`, () => {
      const s = section(number);
      const kinds = new Set(s.blocks.map((b) => b.kind));
      expect([...kinds].filter((k) => k !== "todo").sort()).toEqual(["bullets", "paragraph"]);

      const bullets = s.blocks.find((b) => b.kind === "bullets");
      if (bullets?.kind !== "bullets") throw new Error(`${number} has no bullet list`);
      expect(bullets.lead).toBe(`The ${certificate} records:`);
      expect(bullets.items.at(-1)).toBe(
        "the name, designation and signature of the representative of each Party present.",
      );
      expect(JSON.stringify(s.blocks)).toContain("clause 47.3");
    });
  }

  it("Schedule A points at §17.2 and lists what the installation day proves", () => {
    expect(TEXT).toContain("the certificate required by clause 17.2");
    expect(TEXT).toContain("the Machine ID, serial number, model and Machine Value");
    expect(TEXT).toContain("the serial number on the unit was verified against this Agreement");
    expect(TEXT).toContain("Nothing in this Schedule is completed at the time this Agreement is executed");
  });

  it("Schedule H points at §37.2 and at the deposit clauses that do the arithmetic", () => {
    expect(TEXT).toContain("following the inspection in clause 37.2");
    expect(TEXT).toContain("adjusted against the security deposit under clauses 5.4 to 5.7");
    expect(TEXT).toContain("which clause 5.8 requires MuscleBoxPro to settle within 30 days");
    expect(TEXT).toContain("A copy of the completed Return Certificate shall be given to the Gym");
  });

  it("keeps the second-signing marker, now pointing at step 6", () => {
    // The certificate is still signed by whoever is present on the day, and the flow
    // still captures one signature. Describing the schedule instead of printing it did
    // not resolve that — it made it visible, which is why the marker stays.
    const marker = collectBlockers(AGREEMENT_V2_3).find((b) => b.id === "schedule-a-second-signing");
    expect(marker).toBeDefined();
    expect(marker!.resolution).toMatch(/step 6/i);
    expect(marker!.problem).toContain("read-only");
  });
});

/**
 * The claim that makes 2.3 shippable: it changes no term.
 *
 * `AGREEMENT_V2_3_CHANGES` says every difference in the hashed text between 2.2 and 2.3 is
 * one of four locations. This is that sentence as a test — and it is the most valuable one
 * in the file, because a term edited in passing during a formatting change is exactly the
 * kind of thing no reviewer would find by reading the diff.
 */
describe("2.3 changes only the four places it says it does", () => {
  it("carries the identical text of every other section and schedule", () => {
    const before = new Map(allSections(AGREEMENT_V2_2).map((s) => [s.number, s]));
    const moved: string[] = [];
    for (const s of allSections()) {
      const previous = before.get(s.number);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(s)) moved.push(s.number);
    }
    expect(moved).toEqual(["2", "47", "Schedule A", "Schedule H"]);
  });

  it("records each of those four locations, and nothing it did not change", () => {
    expect(Object.keys(AGREEMENT_V2_3_CHANGES).sort()).toEqual([
      "s2-machine-identifiers",
      "s47-execution",
      "schedule-a-described-not-printed",
      "schedule-h-described-not-printed",
    ]);
    for (const [key, note] of Object.entries(AGREEMENT_V2_3_CHANGES)) {
      expect(note.length, key).toBeGreaterThan(80);
    }
  });

  it("changes the cover only by re-stamping the counsel marker with its version", () => {
    const withoutTodos = (blocks: readonly Block[]) =>
      JSON.stringify(blocks.filter((b) => b.kind !== "todo"));
    expect(withoutTodos(AGREEMENT_V2_3.cover)).toBe(withoutTodos(AGREEMENT_V2_2.cover));
  });

  it("carries every marker 2.2 left open", () => {
    // Two ids are unchanged; the counsel marker is renamed per version because its text
    // names the clauses that version added. Nothing is silently dropped.
    expect(collectBlockers(AGREEMENT_V2_3).map((b) => b.id).sort()).toEqual([
      "s41-mbp-address-incomplete",
      "schedule-a-second-signing",
      "v2-3-not-reviewed-by-counsel",
    ]);
  });

  it("adds §47 to the list of clauses counsel has not read", () => {
    const marker = collectBlockers(AGREEMENT_V2_3).find(
      (b) => b.id === "v2-3-not-reviewed-by-counsel",
    );
    expect(marker).toBeDefined();
    for (const ref of ["5.9", "6.1", "24.6", "34", "36.2", "46", "47"]) {
      expect(marker!.problem, `§${ref} not named`).toContain(ref);
    }
    expect(marker!.problem.toLowerCase()).toContain("stamp");
  });
});

describe("v2.3 can be issued", () => {
  it("has no blocks-send markers left", () => {
    const blocking = collectBlockers(AGREEMENT_V2_3).filter((b) => b.severity === "blocks-send");
    expect(blocking.map((b) => `${b.location}: ${b.id}`)).toEqual([]);
  });

  it("passes canIssue with real gym values", () => {
    expect(canIssue(AGREEMENT_V2_3, FIXTURE).ok).toBe(true);
  });

  it("keeps only reviewable markers, each still actionable", () => {
    for (const marker of collectBlockers(AGREEMENT_V2_3)) {
      expect(marker.severity, marker.id).toBe("needs-review");
      expect(marker.problem.length, marker.id).toBeGreaterThan(40);
      expect(marker.resolution.length, marker.id).toBeGreaterThan(40);
      expect(marker.location, marker.id).not.toBe("");
    }
  });

  it("refuses to issue when the gym's signatory is missing", () => {
    // New in 2.3: §47 prints the signatory, so an agreement rendered without one has a
    // placeholder where the name of the person binding the gym should be. `canIssue`
    // catching it is the reason the reader is allowed to render placeholders at all.
    const check = canIssue(AGREEMENT_V2_3, { ...FIXTURE, signatoryName: undefined });
    expect(check.ok).toBe(false);
  });
});

describe("commercial terms still agree with shared/partnership/summary", () => {
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

  it("states the same milestone, in the same words, in every place 2.2 did", () => {
    expect(TEXT).toContain("15,000 completed paid cups");
    expect(TEXT).toContain("₹5,00,000");
    expect(TEXT).toContain("until the Milestone in clause 6.1 is reached, being the earlier of");
    expect(TEXT).toContain("does not revert");
  });
});

describe("tokens and rendering", () => {
  it("resolves every token the document uses", () => {
    expect(findUnresolvedTokens(AGREEMENT_V2_3, FIXTURE)).toEqual([]);
    expect(TEXT).not.toMatch(/\{\{/);
  });

  it("only uses tokens that exist on AgreementFields", () => {
    const known = new Set([
      ...Object.keys(FIXTURE),
      ...["mbpNotices", "gymNotices"].flatMap((group) =>
        Object.keys(FIXTURE[group as "mbpNotices"]).map((k) => `${group}.${k}`),
      ),
    ]);
    for (const token of collectTokens(AGREEMENT_V2_3)) {
      expect(known.has(token), `unknown token {{${token}}}`).toBe(true);
    }
  });

  it("excludes todo markers from the hashed text", () => {
    for (const marker of collectBlockers(AGREEMENT_V2_3)) {
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

  it("still renders to the bytes the golden vector pins", async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // DO NOT UPDATE THE VECTOR TO MAKE THIS PASS.
    //
    // It pins the exact bytes a v2.3 signature attests to. Once a gym has signed
    // against 2.3, a change here means the clause text changed underneath a signed
    // document — the fix is v2_4.ts, not a new expected value.
    //
    // `mbp-backend` runs this same check against its copy of the renderer, so a
    // failure here and a failure there mean different things: here, the document
    // changed; there, the copy drifted and must be re-taken.
    // ─────────────────────────────────────────────────────────────────────────
    const verdict = await verifyGoldenVector(AGREEMENT_V2_3, GOLDEN_V2_3);
    expect(verdict.ok ? [] : verdict.problems).toEqual([]);
  });

  it("reports length and hash together when the document moves", async () => {
    const verdict = await verifyGoldenVector(AGREEMENT_V2_3, {
      ...GOLDEN_V2_3,
      contentHash: "0".repeat(64),
      length: 1,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("unreachable");
    expect(verdict.problems).toHaveLength(2);
    expect(verdict.problems.join(" ")).toContain(`length is ${GOLDEN_V2_3.length}`);
    expect(verdict.actual.contentHash).toBe(GOLDEN_V2_3.contentHash);
  });

  it("is longer than 2.2, which is why length is not the measure of this change", () => {
    // Recorded because the instinct is the opposite: removing twenty-six blank rules
    // *added* about 2,000 characters, since a described certificate is prose and a
    // printed one is mostly empty cells. Anyone tempted to check 2.3's work by comparing
    // sizes should read `v2.3 prints no blank form` instead — that is the actual property.
    expect(GOLDEN_V2_3.length).toBeGreaterThan(renderPlainText(AGREEMENT_V2_2, FIXTURE).length);
  });
});

/**
 * The "In short" panel against the document it summarises.
 *
 * The most important tests in this file for the same reason they are in v2.1's and v2.2's:
 * the panel is what a gym reads before clicking "I have read and agree", so a line that
 * drifts from its clause is not a documentation bug — it is what the gym relied on.
 */
describe("plain-language summary matches agreement v2.3", () => {
  const sectionNumbers = new Set(allSections().map((s) => s.number));
  const clauseNumbers = new Set(
    allBlocks()
      .map(({ block }) => (block.kind === "clause" ? block.number : null))
      .filter((n): n is string => n !== null),
  );

  it("links every item to a section that exists", () => {
    for (const item of PLAIN_LANGUAGE_V2_3) {
      expect(sectionNumbers.has(item.section), `§${item.section} (from §${item.clause})`).toBe(true);
    }
  });

  it("references clauses that exist, and that sit in the section they link to", () => {
    for (const item of PLAIN_LANGUAGE_V2_3) {
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
    for (const item of PLAIN_LANGUAGE_V2_3) {
      for (const quote of item.quotes ?? []) {
        expect(TEXT, `${quote} (from §${item.clause})`).toContain(quote);
      }
    }
  });

  it("covers 2.2's eleven clauses plus §47, with no duplicates", () => {
    expect(PLAIN_LANGUAGE_V2_3).toHaveLength(12);
    const refs = PLAIN_LANGUAGE_V2_3.map((i) => i.clause);
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
      "47",
    ]);
  });

  it("tells the reader that clicking is the signature", () => {
    // The one thing about the mechanics a non-lawyer needs to have been told before they
    // click, and the reason §47 is in a panel otherwise reserved for terms that bite.
    const item = PLAIN_LANGUAGE_V2_3.find((i) => i.clause === "47");
    expect(item).toBeDefined();
    expect(item!.short).toMatch(/is your signature/i);
    expect(item!.short).toMatch(/nothing to print, sign by hand or stamp/i);
    expect(item!.short).toMatch(/fingerprint/i);
  });

  it("discloses the terms that bite, not only the ones that sell", () => {
    const byClause = new Map(PLAIN_LANGUAGE_V2_3.map((i) => [i.clause, i.short]));
    expect(byClause.get("34")).toMatch(/cap on liability for direct loss/i);
    expect(byClause.get("34")).toMatch(/recoverable in full/i);
    expect(byClause.get("46")).toContain("Gautam Buddha Nagar");
    expect(byClause.get("46")).toMatch(/may not be where you are/i);
  });

  it("states each item in the second person, so it reads as an obligation not a feature", () => {
    for (const item of PLAIN_LANGUAGE_V2_3) {
      expect(item.short.length, `§${item.clause} too terse`).toBeGreaterThan(40);
      expect(/\b(you|your|we|our|us)\b/i.test(item.short), `§${item.clause}`).toBe(true);
    }
  });
});
