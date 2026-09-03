/**
 * MuscleBoxPro Franchise Agreement, version 2.0.
 *
 * ── What changed from 1.0, and why it is a different kind of document ─────────
 * v1 was a term sheet. It said so of itself, it bound the commercials the program document fixed, and it
 * deferred a dozen substantive terms to a definitive agreement that would be signed later (v1 §17). That was
 * the honest shape while the program document deferred those terms too.
 *
 * It no longer does. As of 2026-09-03 the program document carries an addendum (§57-72) that supplies the
 * franchise term, dispute resolution, indemnity, insurance, food-safety allocation, data protection, force
 * majeure and post-termination restrictions, and §56 now says that once executed the document *is* the
 * binding franchise agreement rather than a step towards one. §72 is a real execution block.
 *
 * So v2 is that document, executed. There is no second signing event; the deferrals v1 §17 listed are
 * answered in the text rather than postponed, and where the document still points at something future, §57
 * defines it as a **Supplementary Terms Agreement** with a good-faith default until one is signed.
 *
 * ── The body is generated, and that is deliberate ────────────────────────────
 * `v2.generated.ts` holds §1-72 transcribed mechanically from `docs/MuscleBox_Pro_Franchise_Program_final.md`
 * by `src/tools/programToAgreement.ts`. That script's header has the argument; the short version is that
 * 60,000 characters of reviewed legal text retyped by hand is 60,000 chances to sign a clause nobody wrote.
 *
 * This file holds only what cannot be derived from the source document, which is everything per-franchise.
 * **The source names no party.** It never says which tier this franchisee bought, what their territory is,
 * how many machines they hold, what they paid or when. Executed as-is it would be an agreement missing its
 * own commercial terms, so Schedule 1 supplies them and §72 is re-cut to name the signatories.
 *
 * ── Rules, unchanged from v1 ─────────────────────────────────────────────────
 *   - FROZEN the moment one franchisee signs against it. A document change means v3 and a fresh run of the
 *     converter — never a re-run over this version. `goldenVector.ts` pins the exact bytes.
 *   - Rupee amounts, dates, the territory and the parties are tokenised, never literal. The figures that
 *     appear literally in §1-72 are the *program's* published figures, which are not per-franchise; the
 *     ones that bind this franchisee are in Schedule 1, and Schedule 1 says it prevails over them.
 *   - Where something is unresolved, emit a `todo` rather than inventing or omitting a clause.
 *
 * ── Why Schedule 1 has to say it prevails ────────────────────────────────────
 * The source document describes **both** tiers throughout — §2 and §3, §17 and §21, §53 and §54 — because it
 * is a programme brochure as well as an instrument. A franchisee reading their own executed agreement would
 * otherwise find two investments, two machine counts and two recovery thresholds in it with nothing saying
 * which is theirs. Schedule 1 names the tier and takes precedence on any figure, which resolves that without
 * touching a word of the reviewed text. It is the same device §57's precedence rule uses for the addendum.
 *
 * Section references in comments are to docs/MuscleBox_Pro_Franchise_Program_final.md.
 */

import type { Agreement, Block, Section } from "../../agreement/types";
import { PROGRAM_COVER_BLOCKS, PROGRAM_SECTIONS } from "./v2.generated";

/**
 * §72's blocks, re-cut so the executed document names its signatories.
 *
 * The source renders both parties as blank rules, which is right for a document meant to be printed and
 * signed by hand and wrong for this one: we know who the franchisee is, we collected it in step 1, and a
 * blank where we hold the value is a blank somebody can complete differently later. The MBP side stays a
 * rule, because which authorised signatory executes is decided when it is executed.
 *
 * `Date` and `Place` stay rules on both sides deliberately. Leegality's Aadhaar eSign stamps its own
 * timestamp into the signature, and printing our `effectiveDate` next to it would put two dates on one
 * execution — the one the document claims and the one the certificate proves. The witness lines stay as the
 * source has them: an Aadhaar eSign does not need them, and §72 asks for them anyway.
 *
 * **The lead paragraph is taken from the generated section rather than retyped**, and that is the only
 * substantive sentence §72 contains — everything after it in the source is rules and party labels. Copying
 * it here would put one sentence of reviewed legal text outside the generated file, where a later document
 * revision would reword the markdown and leave the signed agreement quoting the old wording with nothing to
 * detect it. So it is carried across, and `assertLead` refuses anything but the paragraph it expects to find
 * in that position.
 */
function executionBlocks(source: readonly Block[]): Block[] {
  const lead = source[0];
  if (!lead || lead.kind !== "paragraph") {
    throw new Error(
      "§72 of v2.generated.ts does not open with a paragraph; the execution block cannot be re-cut " +
        "without dropping source text. Check the section against the markdown.",
    );
  }

  return [
    lead,
    {
      kind: "signatures",
      parties: [
        {
          heading: "For and on behalf of BLENDBOX INNOVATIONS LLP",
          lines: ["BlendBox Innovations LLP, trading as MuscleBoxPro, by its authorised signatory."],
          fields: ["Name", "Designation", "Date", "Place", "Signature"],
        },
        {
          heading: "Franchisee",
          lines: [
            "{{franchiseeLegalName}}, {{franchiseeEntityType}}, PAN {{franchiseePan}}.",
            "Address: {{registeredAddress}}.",
            "Signing through {{signatoryName}}, {{signatoryDesignation}}.",
          ],
          fields: ["Date", "Place", "Signature"],
        },
      ],
    },
    { kind: "subheading", text: "Witnesses", level: 2 },
    {
      kind: "bullets",
      items: [
        "First Witness. Name: ______________________________ Signature: ______________________________",
        "Second Witness. Name: ______________________________ Signature: ______________________________",
      ],
    },
  ];
}

/**
 * The generated sections, with §72 replaced.
 *
 * Replaced by number rather than by position, and it throws if the number is absent: a converter run against
 * a renumbered document would otherwise leave the source's blank-rule execution block in place and drop the
 * tokenised one, producing an agreement that names nobody. That is exactly the failure mode this whole file
 * exists to prevent, so it fails loudly at module load instead.
 */
const SECTIONS: readonly Section[] = (() => {
  const execution = PROGRAM_SECTIONS.find((section) => section.number === "72");
  if (!execution) {
    throw new Error("v2.generated.ts has no section 72; the execution block cannot be tokenised");
  }
  return PROGRAM_SECTIONS.map((section) =>
    section.number === "72" ? { ...section, blocks: executionBlocks(section.blocks) } : section,
  );
})();

/**
 * Schedule 1 — every per-franchise value in the agreement, in one place.
 *
 * A schedule rather than a section inserted at the front, for two reasons. The numbering in §1-72 is
 * referenced by §57's precedence rule and by roughly forty cross-references in the body, so inserting a
 * section would renumber the document and silently break all of them. And a particulars schedule is where a
 * reader of a franchise agreement looks for their own figures.
 */
const PARTICULARS: Section = {
  number: "Schedule 1",
  heading: "Franchise Particulars",
  blocks: [
    {
      kind: "paragraph",
      text: "This Schedule records the particulars of the franchise granted to the Franchisee named below. Sections 1 to 72 describe the MuscleBoxPro Franchise Program generally, and state figures for more than one franchise tier. Where a figure or term in this Schedule differs from a figure or term stated generally in Sections 1 to 72, this Schedule governs for this franchise, to the extent of the difference. This does not limit the precedence rule at the end of Section 57.",
    },
    { kind: "subheading", text: "The Parties", level: 2 },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["Franchisor", "BlendBox Innovations LLP, trading as MuscleBoxPro"],
        ["Franchisee", "{{franchiseeLegalName}}"],
        ["Legal status", "{{franchiseeEntityType}}"],
        ["PAN", "{{franchiseePan}}"],
        ["Registered address", "{{registeredAddress}}"],
        ["Signing on behalf of the Franchisee", "{{signatoryName}}, {{signatoryDesignation}}"],
      ],
    },
    { kind: "subheading", text: "The Franchise", level: 2 },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["Franchise tier", "{{tierName}}"],
        ["Territory", "{{territory}}"],
        ["Territory boundary", "{{territoryBoundary}}"],
        ["Machine allocation", "{{machineAllocation}}"],
        ["Effective Date", "{{effectiveDate}}"],
      ],
    },
    { kind: "subheading", text: "The Investment", level: 2 },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["Franchise investment, exclusive of GST (Section 6, Section 63)", "{{investment}}"],
        ["In words", "{{investmentInWords}}"],
        ["First instalment", "{{firstInstalment}}"],
        ["Payable", "{{firstInstalmentTrigger}}"],
        ["Second instalment", "{{secondInstalment}}"],
        ["Payable", "{{secondInstalmentTrigger}}"],
        ["Capital Recovery Threshold, inclusive of GST (Section 57)", "{{capitalRecoveryThreshold}}"],
      ],
    },
    {
      kind: "paragraph",
      text: "The Capital Recovery Threshold above is the franchise investment together with GST and other statutory levies borne by the Franchisee, calculated at the rate applicable at the date of this document. Section 57 governs how it is determined if that rate changes before payment.",
    },
    { kind: "subheading", text: "Profit Sharing", level: 2 },
    {
      kind: "table",
      header: ["Particular", "Franchisee", "MuscleBoxPro"],
      rows: [
        ["Protein business, until the Capital Recovery Threshold is reached (Section 17)", "{{proteinShareDuringRecovery}}", "Nil"],
        ["Protein business, after the Capital Recovery Threshold is reached (Section 19)", "{{proteinShareAfterRecoveryFranchisee}}", "{{proteinShareAfterRecoveryMbp}}"],
        ["Advertising revenue, at all times (Section 18)", "{{advertisingShareFranchisee}}", "{{advertisingShareMbp}}"],
      ],
    },
    {
      kind: "paragraph",
      text: "The Franchisee's share of the protein business until the Capital Recovery Threshold is reached is a capital recovery mechanism and not a permanent margin. Advertising revenue never counts towards capital recovery (Section 18).",
    },
    { kind: "subheading", text: "Operations", level: 2 },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["Franchisee warehouse", "{{warehouseAddress}}"],
        ["Franchisee operations contact", "{{operationsContactName}}"],
        ["Contact telephone", "{{operationsContactPhone}}"],
      ],
    },
    { kind: "subheading", text: "Notices", level: 2 },
    {
      kind: "table",
      header: ["Party", "Address", "Email", "Telephone"],
      rows: [
        ["MuscleBoxPro", "{{mbpNotices.address}}", "{{mbpNotices.email}}", "{{mbpNotices.phone}}"],
        [
          "Franchisee",
          "{{franchiseeNotices.address}}",
          "{{franchiseeNotices.email}}",
          "{{franchiseeNotices.phone}}",
        ],
      ],
    },
    {
      kind: "paragraph",
      text: "The Operational Start Date is not fixed by this Schedule. It is the date the Franchisee's first Machine is deployed and operational at an approved gym location under Section 32, as defined in Section 57, and the periods in Section 58 and Section 68 run from it.",
    },
  ],
};

export const FRANCHISE_AGREEMENT_V2: Agreement = {
  version: "2.0",
  title: "Franchise Agreement",
  subtitle: "MUSCLEBOXPRO",
  runningFooter: "MuscleBoxPro - Franchise Agreement - Version 2.0",

  // The source document's own opening comes first, unaltered — its brand paragraphs and, more
  // importantly, its parties recital, which is operative text. Ours goes after it, because a recital
  // that reads "the Franchisee identified in Section 72" is answered by §72 and by Schedule 1, and
  // putting our summary above the recital would have the document introduce a party before it says who
  // the parties are.
  cover: [
    ...PROGRAM_COVER_BLOCKS,
    { kind: "subheading", text: "This Franchise", level: 2 },
    {
      kind: "paragraph",
      text: "The franchise granted to the Franchisee under this document is summarised below and set out in full in Schedule 1 (Franchise Particulars). Once executed by both Parties this document is the binding franchise agreement between them (Section 56). Before it is executed it creates no binding obligation, and nothing in it is a guarantee of returns, of profitability or of business performance.",
    },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["Franchisor", "BlendBox Innovations LLP, trading as MuscleBoxPro"],
        ["Franchisee", "{{franchiseeLegalName}}"],
        ["Legal status", "{{franchiseeEntityType}}"],
        ["PAN", "{{franchiseePan}}"],
        ["Franchise", "{{tierName}}"],
        ["Territory", "{{territory}}"],
        ["Machine allocation", "{{machineAllocation}}"],
        ["Franchise investment", "{{investment}}"],
        ["Capital Recovery Threshold", "{{capitalRecoveryThreshold}}"],
        ["Effective Date", "{{effectiveDate}}"],
        ["Open for execution until", "{{validUntil}}"],
      ],
    },
    {
      kind: "paragraph",
      text: "The particulars of this franchise are in Schedule 1, which governs where it differs from a figure stated generally in Sections 1 to 72.",
    },
    // The counterpart of v1's cover marker. What is unreviewed here is narrower than it was — the
    // addendum answered the substantive gaps — but it is not nothing, and it is not for a renderer to
    // decide: the residual items are in the audit trail against this document revision, and the ones
    // that need a lawyer rather than a decision are §65's missing exit for a prolonged force majeure,
    // §47's unstated confidentiality survival period, and §66's post-term restraint, which is drafted
    // to be read down under s.27 of the Contract Act rather than to survive it.
    {
      kind: "todo",
      id: "v2-counsel-review",
      severity: "needs-review",
      problem:
        "The addendum (§57-72) and the §56 self-execution change have not been through external counsel as an executed instrument. Three residual items are known: §65 gives neither Party an exit if a Force Majeure Event persists, §47 states no survival period for confidentiality, and §66's 12-month post-term non-compete is likely void under s.27 of the Indian Contract Act, 1872, and is drafted to be read down rather than to hold.",
      resolution:
        "Counsel review of the executed form. None of the three blocks issuing: the force-majeure gap and the confidentiality period are omissions rather than defects, and §66 carries its own read-down clause so an unenforceable restraint cannot take the surrounding sections with it.",
    },
  ],

  sections: [...SECTIONS],
  schedules: [PARTICULARS],
};
