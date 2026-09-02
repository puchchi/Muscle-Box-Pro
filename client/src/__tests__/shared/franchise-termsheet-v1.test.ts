import { describe, it, expect } from "vitest";
import { FRANCHISE_TERM_SHEET_V1 } from "@shared/franchise/termsheet/v1";
import {
  GOLDEN_TERM_SHEET_V1,
  type FranchiseTermSheetGoldenVector,
} from "@shared/franchise/termsheet/goldenVector";
import type { FranchiseTermSheetFields } from "@shared/franchise/termsheet/types";
import {
  canIssue,
  collectBlockers,
  collectTokens,
  findUnresolvedTokens,
  renderPlainText,
  renderText,
} from "@shared/agreement/render";
import { verifyGoldenVector } from "@shared/agreement/goldenVector";
import type { Block, Section } from "@shared/agreement/types";
import { FRANCHISE, franchiseTier, formatInr } from "@shared/franchise/program";
import { rupeesInWords } from "@shared/agreement/amountInWords";

/**
 * The Franchise Term Sheet, version 1.0.
 *
 * Three questions, and they are not the gym agreement's three. Is the document internally
 * consistent; do the figures in it match the program the /franchise page publishes; and
 * **does it still say what it is?** The last one is the whole reason this document exists
 * rather than a franchise agreement, and clause 2 is where it can quietly stop being true.
 *
 * The golden vector is asserted here rather than in its own file for the reason the gym
 * suite does the same: the pinned bytes and the content that produces them should fail in
 * the same test run, so a diff is readable as one change.
 */

const FIXTURE = GOLDEN_TERM_SHEET_V1.fields;

const TEXT = renderPlainText<FranchiseTermSheetFields>(FRANCHISE_TERM_SHEET_V1, FIXTURE);

function allSections(): Section[] {
  return [...FRANCHISE_TERM_SHEET_V1.sections, ...FRANCHISE_TERM_SHEET_V1.schedules];
}

function allBlocks(): { location: string; block: Block }[] {
  const out = FRANCHISE_TERM_SHEET_V1.cover.map((block) => ({ location: "Cover", block }));
  for (const s of allSections()) {
    for (const block of s.blocks) out.push({ location: s.number, block });
  }
  return out;
}

function section(number: string): Section {
  const found = allSections().find((s) => s.number === number);
  if (!found) throw new Error(`no section ${number}`);
  return found;
}

function textOf(number: string): string {
  return section(number)
    .blocks.flatMap((b) => {
      switch (b.kind) {
        case "clause":
        case "paragraph":
          return [b.text];
        case "bullets":
        case "checklist":
          return [...(b.lead ? [b.lead] : []), ...b.items];
        case "callout":
          return b.lines;
        case "table":
          return [...b.header, ...b.rows.flat()];
        default:
          return [];
      }
    })
    .join("\n");
}

describe("term sheet structure", () => {
  it("says 1.0 everywhere the version is printed", () => {
    // Hashed, so a 1.0 labelled otherwise makes every stored fingerprint ambiguous about
    // which text it describes.
    expect(FRANCHISE_TERM_SHEET_V1.version).toBe("1.0");
    expect(FRANCHISE_TERM_SHEET_V1.runningFooter).toContain("Version 1.0");
    expect(TEXT).toContain("Version 1.0");
  });

  it("numbers its sections 1 to 20 with no gaps and no repeats", () => {
    expect(FRANCHISE_TERM_SHEET_V1.sections.map((s) => s.number)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1)),
    );
  });

  it("numbers every clause under its own section", () => {
    for (const s of allSections()) {
      for (const block of s.blocks) {
        if (block.kind === "clause") expect(block.number.split(".")[0]).toBe(s.number);
      }
    }
  });

  it("carries the territory and the operations declaration as schedules", () => {
    expect(FRANCHISE_TERM_SHEET_V1.schedules.map((s) => s.number)).toEqual([
      "Schedule 1",
      "Schedule 2",
    ]);
  });
});

describe("what the term sheet says about itself", () => {
  it("is binding as to its commercial terms", () => {
    expect(textOf("2")).toContain("binding on both Parties as to the commercial terms it states");
  });

  it("is subject to the definitive agreement, which prevails on any conflict", () => {
    const status = textOf("2");
    expect(status).toContain("subject to the execution of a Definitive Franchise Agreement");
    expect(status).toContain("the Definitive Franchise Agreement will prevail");
  });

  it("expires, and names the date in the text that gets hashed", () => {
    // An offer with no expiry is an offer forever, and territory availability moves. The
    // date is a field so it is fixed in the signed bytes, not recomputed by a later reader.
    expect(textOf("2")).toContain("lapses if the Definitive Franchise Agreement has not been");
    expect(collectTokens(FRANCHISE_TERM_SHEET_V1)).toContain("validUntil");
    expect(TEXT).toContain("executed by 16 October 2026");
  });

  it("guarantees nothing about returns, profitability or performance", () => {
    expect(textOf("2")).toContain(
      "not a guarantee of returns, of profitability or of business performance",
    );
  });

  it("lists what the definitive agreement will settle rather than leaving it to be noticed", () => {
    // The honest counterpart to clause 2. Each of these is deferred by the program
    // document, and a term sheet silent about the deferral reads as a complete agreement.
    const deferred = textOf("17");
    for (const term of [
      "contractual term",
      "deployment deadlines",
      "audit and information review",
      "transfer, exit and termination",
      "death, insolvency and change of ownership",
      "Governing law, jurisdiction and dispute resolution for the franchise",
      "limitation of liability",
    ]) {
      expect(deferred).toContain(term);
    }
  });

  it("gives itself a forum, which is not the same thing as giving the franchise one", () => {
    // A binding instrument with no forum is the defect v2.3's §46 comment describes. Clause
    // 19 governs this Term Sheet; clause 17 leaves the franchise's own forum to the
    // definitive agreement. Conflating them would have this document settle a term the
    // program document explicitly defers.
    expect(textOf("19")).toContain("exclusive jurisdiction of the competent courts at Gautam");
    expect(section("19").heading).toContain("under this Term Sheet");
    expect(textOf("17")).toContain("Governing law, jurisdiction and dispute resolution");
  });
});

describe("the commercial terms match the published program", () => {
  const territory = franchiseTier("territory");

  it("prices the fixture at the published Territory investment, in figures and in words", () => {
    // The document tokenises every figure, so this checks the *vector* against
    // program.ts. A term sheet issued with the wrong instalment is a term sheet that
    // renders a number nobody published.
    expect(FIXTURE.investment).toBe(formatInr(territory.investmentInr));
    expect(FIXTURE.investmentInWords).toBe(rupeesInWords(territory.investmentInr));
    expect(FIXTURE.machineAllocation).toBe(String(territory.initialMachines));
    expect(FIXTURE.capitalRecoveryThreshold).toBe(formatInr(territory.capitalRecoveryInr!));
  });

  it("splits the investment the way the published payment schedule does", () => {
    const schedule = territory.paymentSchedule!;
    expect(schedule).toHaveLength(2);
    expect(FIXTURE.firstInstalment).toBe(
      formatInr((territory.investmentInr * schedule[0].pct) / 100),
    );
    expect(FIXTURE.firstInstalmentTrigger).toBe(schedule[0].trigger);
    expect(FIXTURE.secondInstalment).toBe(
      formatInr((territory.investmentInr * schedule[1].pct) / 100),
    );
    expect(FIXTURE.secondInstalmentTrigger).toBe(schedule[1].trigger);
  });

  it("carries the protein and advertising splits from program.ts", () => {
    expect(FIXTURE.proteinShareDuringRecovery).toBe(
      `${FRANCHISE.proteinProfitSharePct.duringRecovery}%`,
    );
    expect(FIXTURE.proteinShareAfterRecoveryFranchisee).toBe(
      `${FRANCHISE.proteinProfitSharePct.afterRecovery}%`,
    );
    expect(FIXTURE.advertisingShareFranchisee).toBe(`${FRANCHISE.advertising.franchiseeSharePct}%`);
    expect(FIXTURE.advertisingShareMbp).toBe(`${FRANCHISE.advertising.mbpSharePct}%`);
  });

  it("says advertising does not count toward capital recovery, in a callout rather than a clause", () => {
    // The single most misread term in the program (program.ts says so on the split
    // itself). A clause numbered 7.4 among nine others is a clause that gets skimmed.
    const callouts = section("7").blocks.filter((b) => b.kind === "callout");
    expect(callouts).toHaveLength(1);
    expect(callouts[0].lines.join(" ")).toContain(
      "Advertising income does not count toward capital recovery",
    );
  });

  it("says 100% during recovery is a recovery mechanism and not a permanent share", () => {
    expect(textOf("7")).toContain("capital recovery mechanism and not a permanent profit share");
  });

  it("does not restate the recovery arithmetic as an illustration", () => {
    // `recoveryExample()` exists for the public page. A worked example inside a binding
    // instrument is a second statement of the same term, free to disagree with the first.
    expect(TEXT).not.toContain("20,00,000");
    expect(TEXT).not.toContain("For illustration");
  });
});

describe("the terms a franchisee is most likely to misremember", () => {
  it("says the machines stay MuscleBox Pro property, before and after termination", () => {
    const ownership = textOf("6");
    expect(ownership).toContain("remain the exclusive property of MuscleBox Pro");
    expect(ownership).toContain("does not sell, transfer or assign any machine");
    expect(ownership).toContain(
      "On expiry or termination of the franchise, all machines remain the property of MuscleBox Pro",
    );
  });

  it("says the investment does not buy the machines, where the investment is stated", () => {
    // Clause 6 is four sections later. Someone reading the money section has to be told
    // there, or the table of figures is the last thing they read on the subject.
    expect(textOf("3")).toContain("It does not purchase the machines");
  });

  it("forbids delegating machine upkeep to the gym", () => {
    // §28 of the program document. Without this the model fails quietly: refilling moves
    // to gym staff, who have no contract with us and no stake in machine uptime.
    expect(textOf("14")).toContain(
      "may not transfer or delegate responsibility for stocking, refilling, inventory or the day to day operation",
    );
    expect(textOf("14")).toContain("does not extend to any other location");
  });

  it("states the exclusivity carve-outs next to the grant, not in a schedule", () => {
    const territory = textOf("4");
    expect(territory).toContain("Exclusivity does not extend to reserved accounts");
    expect(territory).toContain("conditional on the minimum performance requirements");
  });

  it("makes the schedule the record of the territory and says so", () => {
    expect(textOf("4")).toContain("described in Schedule 1");
    expect(textOf("Schedule 1")).toContain("this description prevails");
  });
});

describe("what happens to the money", () => {
  it("states where the first instalment stands if the definitive agreement is never executed", () => {
    // The one term the money makes unavoidable and the program document nowhere answers.
    // Drafted in-house and signed off commercially, so the three positions below are the
    // agreed ones rather than a first attempt.
    const money = textOf("5");
    expect(money).toContain("If the Definitive Franchise Agreement is not executed");
    expect(money).toContain("refunded without interest");
    expect(money).toContain("is not refundable");
  });

  it("treats payment as made on credit to our account, not on the franchisee's transfer", () => {
    // The claim-then-verify design of step 8 depends on this. A clause that said
    // "on transfer" would contradict the flow that waits for a bank statement.
    expect(textOf("5")).toContain("treated as made when it is credited to that account");
  });

  it("does not make the second instalment conditional on deployment", () => {
    expect(textOf("5")).toContain("not conditional on the deployment of any machine");
  });
});

describe("execution", () => {
  it("says the franchisee signs through an e-sign provider, not by typing a name", () => {
    const execution = textOf("20");
    expect(execution).toContain("electronic signature provider MuscleBox Pro nominates");
    expect(execution).toContain("Aadhaar based electronic signature or a digital signature");
  });

  it("names all three fingerprints and the provider audit trail as the evidence", () => {
    // docs/franchise-onboarding.md §6.1: the plain-text hash alone no longer answers
    // "what was signed" once a provider affixes the signature to a file.
    const execution = textOf("20");
    expect(execution).toContain("the text of this Term Sheet as issued");
    expect(execution).toContain("the document file presented for signature");
    expect(execution).toContain("the signed file it receives back");
    expect(execution).toContain("audit trail");
  });

  it("prints the signatory from the record and asks nobody to fill a blank in", () => {
    const signatures = section("20").blocks.filter((b) => b.kind === "signatures");
    expect(signatures).toHaveLength(1);
    const [mbp, franchisee] = signatures[0].parties;
    expect(mbp.fields).toBeUndefined();
    expect(franchisee.fields).toBeUndefined();
    expect(renderText<FranchiseTermSheetFields>(franchisee.heading, FIXTURE)).toBe(
      "FOR Northline Ventures Private Limited",
    );
    expect(franchisee.lines?.join(" ")).toContain("{{signatoryName}}");
  });

  it("prints no blank rules anywhere in the document", () => {
    // v2.3 was written to remove twenty-six of them from the gym agreement. Starting a
    // second document with any is starting it with the bug already fixed once.
    expect(allBlocks().filter(({ block }) => block.kind === "blanks")).toEqual([]);
    expect(TEXT).not.toContain("____");
  });
});

describe("issuing", () => {
  it("resolves every token from the vector's fields", () => {
    expect(findUnresolvedTokens<FranchiseTermSheetFields>(FRANCHISE_TERM_SHEET_V1, FIXTURE)).toEqual(
      [],
    );
  });

  it("uses every field it declares", () => {
    // The other direction: a field in the type that no clause renders is a value collected
    // from a franchisee for nothing, and a value that silently stops being checked.
    const tokens = new Set(collectTokens(FRANCHISE_TERM_SHEET_V1));
    for (const key of Object.keys(FIXTURE) as (keyof FranchiseTermSheetFields)[]) {
      const used =
        tokens.has(key) || [...tokens].some((t) => t.startsWith(`${String(key)}.`));
      expect(used, `${String(key)} is declared but never rendered`).toBe(true);
    }
  });

  it("issues on a complete set of fields", () => {
    const check = canIssue<FranchiseTermSheetFields>(FRANCHISE_TERM_SHEET_V1, FIXTURE);
    expect(check.ok).toBe(true);
  });

  it("carries exactly one marker and it does not block sending", () => {
    // A count, so that resolving one and adding two is visible. The severities matter:
    // needs-review is a knowing decision to carry risk, blocks-send is a stop, and a
    // blocks-send appearing here means no franchisee can be sent a term sheet at all.
    const bySeverity = collectBlockers(FRANCHISE_TERM_SHEET_V1).map((b) => b.severity);
    expect(bySeverity).toEqual(["needs-review"]);
  });

  it("names a resolution on every marker", () => {
    for (const blocker of collectBlockers(FRANCHISE_TERM_SHEET_V1)) {
      expect(blocker.problem.length).toBeGreaterThan(40);
      expect(blocker.resolution.length).toBeGreaterThan(40);
      expect(blocker.location).not.toBe("");
    }
  });

  it("keeps markers out of the hashed text", () => {
    // So that resolving a marker does not invalidate signatures taken against clauses that
    // never changed.
    expect(TEXT).not.toContain("needs-review");
    expect(TEXT).not.toContain("No Indian legal counsel");
  });
});

describe("golden vector", () => {
  it("renders to the pinned bytes", async () => {
    // ── If this fails, do not update the hash. ──────────────────────────────────
    // Either the content changed, which belongs in v2.ts, or `renderPlainText`'s format
    // changed, which moves every fingerprint already stored. See goldenVector.ts.
    const verdict = await verifyGoldenVector(FRANCHISE_TERM_SHEET_V1, GOLDEN_TERM_SHEET_V1);
    expect(verdict.ok ? [] : verdict.problems).toEqual([]);
  });

  it("would notice a single changed character", async () => {
    // Proves the assertion above can fail, which is the only thing that makes a pinned
    // hash worth having.
    const tampered: FranchiseTermSheetGoldenVector = {
      ...GOLDEN_TERM_SHEET_V1,
      fields: { ...FIXTURE, territory: "Noida and Greater Noida, Uttar Pradesh." },
    };
    const verdict = await verifyGoldenVector(FRANCHISE_TERM_SHEET_V1, tampered);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.problems.join(" ")).toContain(GOLDEN_TERM_SHEET_V1.contentHash);
  });

  it("pins a length that matches the rendering it pins a hash for", () => {
    expect(TEXT.length).toBe(GOLDEN_TERM_SHEET_V1.length);
  });
});
