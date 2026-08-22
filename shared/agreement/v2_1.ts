/**
 * MuscleBoxPro Machine Placement & Profit Sharing Agreement, version 2.1.
 *
 * Transcribed from
 * docs/MuscleBoxPro_Machine_Placement_Profit_Sharing_Agreement_v2_1.pdf.
 *
 * ── Rules ────────────────────────────────────────────────────────────────────
 * This version is FROZEN once a single gym has signed against it. Any content
 * change — including fixing a typo — means adding `v2_2.ts`, because the version
 * string is part of the hash stored with every signature.
 *
 * Clause text is transcribed verbatim. Two categories of deliberate deviation,
 * both of them visible rather than silent:
 *
 *   - Rupee amounts and per-gym details are tokenised as `{{securityDeposit}}`
 *     etc., so a negotiated deposit cannot leave a stale ₹50,000 in clause 5.7.
 *   - Where the PDF has an empty or broken clause, a `todo` block sits in its
 *     place. `collectBlockers()` finds them and `canIssue()` refuses to send.
 *
 * The PDF is an execution draft with unresolved items. It is NOT ready to go to
 * a gym — see AGREEMENT_V2_1_ISSUE_SUMMARY at the bottom of this file, and
 * docs/gym-onboarding.md §12.
 */

import type { Agreement } from "./types";

export const AGREEMENT_V2_1: Agreement = {
  version: "2.1",
  title: "Machine Placement & Profit Sharing Agreement",
  subtitle: "MUSCLEBOXPRO",
  runningFooter:
    "MuscleBoxPro - Machine Placement & Profit Sharing Agreement - Version 2.1",

  // ── Cover ──────────────────────────────────────────────────────────────────
  cover: [
    {
      kind: "todo",
      id: "cover-version-mismatch",
      severity: "cosmetic",
      problem:
        "The PDF cover page and every page footer read 'Execution Draft - Version 2.0', but the file is named v2_1 and is treated as 2.1 everywhere else.",
      resolution:
        "Decide which number is authoritative and make the document say it. A signature references a version string; two numbers for one document is an evidential weakness.",
    },
    { kind: "paragraph", text: "MACHINE PLACEMENT + PROFIT SHARING" },
    {
      kind: "paragraph",
      text: "This Agreement governs the placement, operation, maintenance and commercial sharing of a MuscleBoxPro protein shake vending machine at a participating gym.",
    },
    {
      kind: "table",
      header: ["Party", "Details"],
      rows: [
        ["MuscleBoxPro", "BlendBox Innovations LLP"],
        ["Gym", "{{gymLegalName}}"],
        ["Effective Date", "{{effectiveDate}}"],
        ["Agreement Term", "{{termMonths}} months"],
        ["Security Deposit", "{{securityDeposit}}"],
      ],
    },
    {
      kind: "paragraph",
      text: "Important execution note: the final stamp duty, tax, FSSAI/FBO allocation, arbitration and jurisdiction provisions should be confirmed by the Company's Indian legal/CA/food-compliance advisors before execution.",
    },
    {
      kind: "todo",
      id: "cover-execution-note-unresolved",
      severity: "needs-review",
      problem:
        "The document's own cover page defers stamp duty, tax treatment, FSSAI/FBO allocation, arbitration and jurisdiction to advisors who have not yet reported.",
      resolution:
        "Indian legal counsel, a CA (including GST treatment of the refundable deposit) and a food-law consultant to confirm; then remove this note and fold the outcomes into §§24, 34 and 46.",
    },
  ],

  sections: [
    // ── 1 ────────────────────────────────────────────────────────────────────
    {
      number: "1",
      heading: "Purpose of the Agreement",
      blocks: [
        {
          kind: "clause",
          number: "1.1",
          text: "MuscleBoxPro operates automated protein shake vending machines under the brand MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "1.2",
          text: 'MuscleBoxPro agrees to place one or more protein shake vending machines ("Machine") at the Gym\'s premises for the sale of protein shakes to customers, members and other permitted users.',
        },
        {
          kind: "clause",
          number: "1.3",
          text: "The Machine shall operate under a profit-sharing arrangement between MuscleBoxPro and the Gym.",
        },
        {
          kind: "clause",
          number: "1.4",
          text: "This Agreement does not constitute a sale of the Machine to the Gym.",
        },
        {
          kind: "clause",
          number: "1.5",
          text: "The Machine shall remain the property of MuscleBoxPro throughout the term of this Agreement.",
        },
      ],
    },

    // ── 2 ────────────────────────────────────────────────────────────────────
    {
      number: "2",
      heading: "Machine Details",
      blocks: [
        {
          kind: "table",
          header: ["Particular", "Details"],
          rows: [
            ["Brand", "MuscleBoxPro"],
            ["Model", "{{machineModel}}"],
            ["Machine ID", "{{machineId}}"],
            ["Serial Number", "{{serialNumber}}"],
            ["Machine Value", "{{machineValue}}"],
            ["Installation Date", "{{installationDate}}"],
            ["Installation Location", "{{installationAddress}}"],
            ["Accessories", "{{accessories}}"],
          ],
        },
        {
          kind: "paragraph",
          text: "The machine-specific details shall also be recorded in Schedule A - Machine Details & Installation Certificate.",
        },
      ],
    },

    // ── 3 ────────────────────────────────────────────────────────────────────
    {
      number: "3",
      heading: "Ownership",
      blocks: [
        {
          kind: "clause",
          number: "3.1",
          text: "The Machine shall remain the sole and exclusive property of MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "3.2",
          text: "Nothing in this Agreement shall constitute a sale, transfer, assignment or other transfer of ownership of the Machine to the Gym.",
        },
        {
          kind: "clause",
          number: "3.3",
          text: "The Gym receives only a limited contractual right to host and permit operation of the Machine at the approved premises during the term of this Agreement.",
        },
        {
          kind: "bullets",
          lead: "3.4 The Gym shall not:",
          items: [
            "sell the Machine;",
            "pledge or mortgage the Machine;",
            "create any lien over the Machine;",
            "lease or sublease the Machine;",
            "transfer the Machine to another person or entity;",
            "relocate the Machine without written approval;",
            "represent itself as owner of the Machine; or",
            "permit any third party to claim ownership over the Machine.",
          ],
        },
      ],
    },

    // ── 4 ────────────────────────────────────────────────────────────────────
    {
      number: "4",
      heading: "Term",
      blocks: [
        {
          kind: "clause",
          number: "4.1",
          text: "The Agreement shall commence on the Effective Date or the Machine installation date, whichever is later.",
        },
        {
          kind: "clause",
          number: "4.2",
          text: "The initial term shall be {{termMonths}} months, unless terminated earlier in accordance with this Agreement.",
        },
        {
          kind: "clause",
          number: "4.3",
          text: "The Parties may mutually agree in writing to renew the Agreement.",
        },
        {
          kind: "todo",
          id: "s4-4-empty",
          severity: "blocks-send",
          problem:
            "Clause 4.4 exists as a bare number on page 2 of the PDF with no text of any kind following it.",
          resolution:
            "Supply the missing clause text, or delete 4.4 from the document. An agreement issued with a numbered-but-empty clause invites an argument that a term was omitted.",
        },
      ],
    },

    // ── 5 ────────────────────────────────────────────────────────────────────
    {
      number: "5",
      heading: "Security Deposit",
      blocks: [
        {
          kind: "clause",
          number: "5.1",
          text: "The Gym shall pay MuscleBoxPro a refundable security deposit of:",
        },
        { kind: "callout", lines: ["{{securityDeposit}} - Rupees Fifty Thousand Only"] },
        {
          kind: "todo",
          id: "s5-1-amount-in-words",
          severity: "cosmetic",
          problem:
            "The words 'Rupees Fifty Thousand Only' are fixed text while the figure beside them is tokenised, so a negotiated deposit would produce a clause whose figure and words disagree.",
          resolution:
            "Either generate the amount in words from the figure, or record in gym_terms that the deposit is not negotiable and drop the token.",
        },
        {
          kind: "clause",
          number: "5.2",
          text: "The security deposit is not consideration for purchase of the Machine and shall not be treated as a lease payment.",
        },
        {
          kind: "clause",
          number: "5.3",
          text: "The security deposit shall serve as security for the Gym's obligations under this Agreement.",
        },
        {
          kind: "bullets",
          lead: "5.4 MuscleBoxPro may adjust the security deposit against:",
          items: [
            "physical damage to the Machine;",
            "missing components or accessories;",
            "unauthorized modifications;",
            "unauthorized relocation;",
            "misuse;",
            "negligence attributable to the Gym;",
            "repair costs;",
            "recovery costs where attributable to the Gym;",
            "unpaid amounts; or",
            "other amounts contractually payable by the Gym.",
          ],
        },
        {
          kind: "clause",
          number: "5.5",
          text: "For ordinary accidental or repairable damage, MuscleBoxPro may deduct the actual reasonable repair/replacement cost from the security deposit.",
        },
        {
          kind: "clause",
          number: "5.6",
          text: "In cases of intentional, negligent, reckless or severe physical damage, MuscleBoxPro may forfeit the entire security deposit and may additionally recover any repair or replacement cost exceeding the deposit.",
        },
        {
          kind: "clause",
          number: "5.7",
          text: "If the cost of damage exceeds {{securityDeposit}}, the Gym shall remain liable for the balance.",
        },
        {
          kind: "clause",
          number: "5.8",
          text: "After termination and return of the Machine, MuscleBoxPro shall settle all outstanding amounts and refund the remaining security deposit, if any, within 30 days.",
        },
      ],
    },

    // ── 6 ────────────────────────────────────────────────────────────────────
    {
      number: "6",
      heading: "Profit-Sharing Model",
      blocks: [
        {
          kind: "todo",
          id: "s6-1-no-heading",
          severity: "blocks-send",
          problem:
            "Clause 6.1 has no heading in the PDF. The number is followed straight by a callout box titled 'UPDATED COMMERCIAL MILESTONE', which reads as a change note left in the document rather than as contract text.",
          resolution:
            "Give 6.1 a heading and make the milestone a clause rather than a callout. 'UPDATED' is meaningless to a gym reading it for the first time and dates the document the moment it is signed.",
        },
        { kind: "clause", number: "6.1", text: "" },
        {
          kind: "callout",
          lines: [
            "UPDATED COMMERCIAL MILESTONE",
            "80:20 profit sharing continues until the earlier of:",
            "• 15,000 completed paid cups; OR",
            "• ₹5,00,000 cumulative Gross Protein Shake Sales (excluding GST/taxes).",
            "After the first milestone is reached: 50:50 profit sharing for subsequent protein shake sales.",
            "80% - MuscleBoxPro | 20% - Gym",
          ],
        },
        {
          kind: "todo",
          id: "s6-1-mojibake",
          severity: "cosmetic",
          problem:
            "In the PDF this callout renders as '? 15,000 completed paid cups; OR / ? ?5,00,000 cumulative Gross Protein Shake Sales' — the bullet glyphs and the ₹ sign are both broken. Transcribed here with the intended characters restored.",
          resolution:
            "Regenerate the PDF with a font that carries ₹ (U+20B9). A gym cannot be asked to sign a document where the currency symbol is a question mark.",
        },
        {
          kind: "todo",
          id: "s6-milestone-ambiguity",
          severity: "blocks-send",
          problem:
            "The document contradicts itself on what triggers the 50:50 step. §6.1 says the earlier of 15,000 cups or ₹5,00,000 cumulative gross. §6.2's heading says 'After 15,000 Cups'. Schedule B and Schedule C step 4 say 'Cups 1-15,000 = 80:20, Cup 15,001 onward = 50:50' with no mention of the revenue trigger at all. §21.5 preserves 'the 15,000-cup milestone' on relocation and is silent on the revenue figure. Materially: at a ₹120 selling price ₹5,00,000 is reached at about 4,167 cups, so under §6.1 the step happens roughly 3.6x sooner than under Schedule C.",
          resolution:
            "Settle which trigger governs and make §6.1, §6.2, §21.5, Schedule B and Schedule C say the same thing. This is a commercial decision about MuscleBoxPro's margin over the term, not a drafting tidy-up. See docs/gym-onboarding.md §14.",
        },
        { kind: "clause", number: "6.2", text: "After 15,000 Cups" },
        { kind: "callout", lines: ["50% - MuscleBoxPro | 50% - Gym"] },
        { kind: "clause", number: "6.3", text: "Milestone Interpretation" },
        {
          kind: "todo",
          id: "s6-3-empty",
          severity: "blocks-send",
          problem:
            "Clause 6.3 carries the heading 'Milestone Interpretation' and an entirely empty body.",
          resolution:
            "This is the clause that should resolve the §6.1-vs-Schedule-C conflict, say whether the cup and revenue tests are assessed per machine or per gym, and state what happens to a month the milestone falls inside. It is the most load-bearing gap in the document.",
        },
        { kind: "clause", number: "6.4", text: "Cup Count" },
        {
          kind: "paragraph",
          text: "The cumulative cup count shall be determined primarily from the Machine's transaction and dispensing records. The following shall generally not count toward the milestone:",
        },
        {
          kind: "bullets",
          items: [
            "cancelled transactions;",
            "refunded transactions;",
            "failed transactions;",
            "failed dispensing;",
            "test shakes;",
            "internal testing;",
            "complimentary/free shakes; and",
            "other transactions not representing a completed paid customer sale.",
          ],
        },
      ],
    },

    // ── 7 ────────────────────────────────────────────────────────────────────
    {
      number: "7",
      heading: "Net Profit Calculation",
      blocks: [
        {
          kind: "callout",
          lines: [
            "Net Profit = Gross Customer Sales - Applicable Taxes - Agreed Direct Variable Costs",
          ],
        },
        {
          kind: "bullets",
          lead: "Agreed direct variable costs may include:",
          items: [
            "Ingredient cost;",
            "Cup/packaging cost;",
            "Payment gateway/transaction charges;",
            "Refunds;",
            "Promotional discounts, where applicable; and",
            "Other direct variable costs expressly agreed by the Parties.",
          ],
        },
        { kind: "clause", number: "7.1", text: "Taxes" },
        {
          kind: "paragraph",
          text: "Gross customer sales shall be considered exclusive of applicable GST or other indirect taxes collected on behalf of the Government for purposes of calculating Net Profit. Taxes collected from customers shall not constitute distributable profit.",
        },
        { kind: "clause", number: "7.2", text: "Excluded Costs" },
        {
          kind: "paragraph",
          text: "Unless expressly agreed otherwise, the following shall not be deducted while calculating Net Profit: general corporate overhead; employee salaries of MuscleBoxPro; depreciation; financing costs; general marketing expenditure; general administrative expenses; and other general business expenses.",
        },
        { kind: "clause", number: "7.3", text: "Cost Schedule" },
        {
          kind: "paragraph",
          text: "MuscleBoxPro may maintain an agreed cost schedule for ingredients, cups, packaging and other direct variable costs. Material changes to the agreed methodology shall be communicated to the Gym and documented appropriately.",
        },
      ],
    },

    // ── 8 ────────────────────────────────────────────────────────────────────
    {
      number: "8",
      heading: "Monthly Settlement",
      blocks: [
        {
          kind: "clause",
          number: "8.1",
          text: "Profit-sharing shall be calculated on a monthly basis.",
        },
        {
          kind: "clause",
          number: "8.2",
          text: "At the end of each calendar month, MuscleBoxPro shall calculate Gross customer sales, applicable taxes, direct variable costs, Net Profit, applicable profit-sharing ratio, Gym's share of Net Profit, advertising revenue, Gym's advertising share, electricity reimbursement and applicable adjustments.",
        },
        {
          kind: "clause",
          number: "8.3",
          text: "The Gym's net amount shall be settled within 15 days after the end of the relevant month, subject to completion of transaction reconciliation and availability of complete payment records.",
        },
        {
          kind: "clause",
          number: "8.4",
          text: "Any demonstrable discrepancy shall be reviewed by the Parties in good faith.",
        },
      ],
    },

    // ── 9 ────────────────────────────────────────────────────────────────────
    {
      number: "9",
      heading: "Advertising Revenue",
      blocks: [
        {
          kind: "clause",
          number: "9.1",
          text: "MuscleBoxPro may use the Machine's screen, display area or other approved surfaces for advertising.",
        },
        {
          kind: "clause",
          number: "9.2",
          text: "Advertising revenue shall be treated separately from protein shake sales.",
        },
        {
          kind: "clause",
          number: "9.3",
          text: "Advertising revenue shall be distributed throughout the entire Agreement as:",
        },
        { kind: "callout", lines: ["80% - MuscleBoxPro | 20% - Gym"] },
        {
          kind: "clause",
          number: "9.4",
          text: "The advertising revenue ratio shall remain 80:20 even after the shake-sale profit-sharing ratio changes to 50:50.",
        },
        {
          kind: "clause",
          number: "9.5",
          text: "Advertising arrangements shall generally be managed by MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "9.6",
          text: "MuscleBoxPro does not guarantee any minimum advertising revenue.",
        },
        {
          kind: "clause",
          number: "9.7",
          text: "Advertising content shall be subject to applicable law and MuscleBoxPro's advertising policies.",
        },
      ],
    },

    // ── 10 ───────────────────────────────────────────────────────────────────
    {
      number: "10",
      heading: "Electricity Reimbursement",
      blocks: [
        {
          kind: "clause",
          number: "10.1",
          text: "MuscleBoxPro shall provide the Gym an electricity reimbursement calculated at ₹1,000 for every completed 1,000 paid cups sold.",
        },
        {
          kind: "clause",
          number: "10.2",
          text: "For each three-month review period, a minimum electricity reimbursement of ₹1,000 shall apply even if fewer than 1,000 cups are sold during that period.",
        },
        { kind: "clause", number: "10.3", text: "The calculation shall therefore be:" },
        {
          kind: "table",
          header: ["Cups sold in 3-month period", "Electricity reimbursement"],
          rows: [
            ["0-999", "₹1,000"],
            ["1,000-1,999", "₹1,000"],
            ["2,000-2,999", "₹2,000"],
            ["3,000-3,999", "₹3,000"],
            ["4,000-4,999", "₹4,000"],
          ],
        },
        {
          kind: "clause",
          number: "10.4",
          text: "Only completed blocks of 1,000 paid cups shall generate additional ₹1,000 reimbursement.",
        },
        {
          kind: "clause",
          number: "10.5",
          text: "The minimum ₹1,000 reimbursement shall apply once per three-month review period.",
        },
        {
          kind: "clause",
          number: "10.6",
          text: "Unused electricity reimbursement shall not carry forward to a subsequent three-month period.",
        },
        {
          kind: "clause",
          number: "10.7",
          text: "Electricity reimbursement shall be settled as part of the applicable commercial reconciliation.",
        },
        {
          kind: "todo",
          id: "s10-3-table-truncated",
          severity: "needs-review",
          problem:
            "The §10.3 table stops at 4,000-4,999 with no 'and so on' row, so it reads as a cap of ₹4,000 per review period even though §10.4 states the rule generally. A gym selling 6,000 cups in a quarter has a literal reading available to it that pays less than the rule does.",
          resolution:
            "Add a final row along the lines of '5,000 and above — ₹1,000 per completed block of 1,000 cups', or state that the table is illustrative of §10.4 and not exhaustive.",
        },
      ],
    },

    // ── 11 ───────────────────────────────────────────────────────────────────
    {
      number: "11",
      heading: "Water",
      blocks: [
        {
          kind: "clause",
          number: "11.1",
          text: "MuscleBoxPro shall be responsible for filling/replenishing the Machine's water supply required for normal operation.",
        },
        {
          kind: "clause",
          number: "11.2",
          text: "The Gym shall provide reasonable access to the agreed water source/storage arrangement.",
        },
        {
          kind: "clause",
          number: "11.3",
          text: "The cost of water used for Machine operation shall be borne by MuscleBoxPro, unless otherwise specified in the Commercial Schedule.",
        },
        {
          kind: "clause",
          number: "11.4",
          text: "The Gym shall not independently modify the Machine's water system.",
        },
        {
          kind: "clause",
          number: "11.5",
          text: "Where the available water does not meet MuscleBoxPro's prescribed operating/quality requirements, MuscleBoxPro may suspend operation until a suitable water arrangement is available.",
        },
      ],
    },

    // ── 12 ───────────────────────────────────────────────────────────────────
    {
      number: "12",
      heading: "Three-Month Performance Review",
      blocks: [
        {
          kind: "clause",
          number: "12.1",
          text: "MuscleBoxPro shall review Machine performance every three months.",
        },
        {
          kind: "clause",
          number: "12.2",
          text: "The review may consider cups sold, average monthly sales, revenue, Net Profit, Machine utilization, ingredient consumption, maintenance requirements, customer usage, operational problems and overall commercial viability.",
        },
        {
          kind: "clause",
          number: "12.3",
          text: "MuscleBoxPro may determine whether continued placement of the Machine at the Gym is commercially viable.",
        },
        {
          kind: "clause",
          number: "12.4",
          text: "If MuscleBoxPro determines that the Machine is commercially underperforming, MuscleBoxPro may remove and redeploy the Machine by providing the Gym with 15 days' notice.",
        },
        {
          kind: "clause",
          number: "12.5",
          text: "Removal for commercial underperformance shall not affect MuscleBoxPro's ownership of the Machine or the Gym's obligation to settle outstanding amounts.",
        },
      ],
    },

    // ── 13 ───────────────────────────────────────────────────────────────────
    {
      number: "13",
      heading: "Gym Responsibilities",
      blocks: [
        {
          kind: "bullets",
          lead: "The Gym shall:",
          items: [
            "provide suitable space for the Machine;",
            "provide the required electricity connection;",
            "provide reasonable access to the Machine for MuscleBoxPro personnel;",
            "provide reasonable protection against theft, vandalism and avoidable damage;",
            "promptly report damage or malfunction;",
            "not move or modify the Machine;",
            "not permit unauthorized servicing;",
            "not modify ingredients;",
            "not permit unauthorized persons to access internal Machine components;",
            "maintain reasonable cleanliness around the Machine;",
            "comply with reasonable Machine operating instructions;",
            "cooperate with MuscleBoxPro's maintenance and replenishment personnel; and",
            "ensure that the Machine remains accessible during agreed operating/service hours.",
          ],
        },
      ],
    },

    // ── 14 ───────────────────────────────────────────────────────────────────
    {
      number: "14",
      heading: "Ingredient and Protein Control",
      blocks: [
        {
          kind: "clause",
          number: "14.1",
          text: "All protein powder and other ingredients used in the Machine shall be supplied, approved or authorized by MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "14.2",
          text: "The Gym shall not add, remove, replace, dilute, mix or modify any protein or other ingredient.",
        },
        {
          kind: "clause",
          number: "14.3",
          text: "In particular, the Gym shall not add its own protein powder; remove MuscleBoxPro protein; replace protein; mix third-party protein; add supplements; alter ingredient ratios; add sweeteners; add flavors; modify recipes; or permit any third party to do any of these activities.",
        },
        {
          kind: "clause",
          number: "14.4",
          text: "Only MuscleBoxPro-authorized personnel may refill, replace or modify Machine ingredients.",
        },
        {
          kind: "clause",
          number: "14.5",
          text: "This restriction exists to protect food safety, product consistency, recipe integrity, ingredient traceability, quality control and MuscleBoxPro intellectual property.",
        },
      ],
    },

    // ── 15 ───────────────────────────────────────────────────────────────────
    {
      number: "15",
      heading: "Protein and Ingredient Replenishment",
      blocks: [
        {
          kind: "clause",
          number: "15.1",
          text: "MuscleBoxPro shall be responsible for filling and replenishing protein powder and other approved ingredients.",
        },
        {
          kind: "clause",
          number: "15.2",
          text: "MuscleBoxPro shall, as applicable, monitor ingredient levels; replenish ingredients; check expiry information; maintain batch information; replace expired/unsuitable ingredients; and maintain appropriate ingredient-handling procedures.",
        },
        {
          kind: "clause",
          number: "15.3",
          text: "The Gym shall provide reasonable access for such activities.",
        },
        {
          kind: "clause",
          number: "15.4",
          text: "The Gym shall not independently purchase or refill ingredients for the Machine without written authorization from MuscleBoxPro.",
        },
      ],
    },

    // ── 16 ───────────────────────────────────────────────────────────────────
    {
      number: "16",
      heading: "Machine Usage Restrictions",
      blocks: [
        {
          kind: "bullets",
          lead: "The Gym shall not:",
          items: [
            "open electrical/electronic compartments;",
            "modify firmware;",
            "modify software;",
            "bypass safety systems;",
            "change recipes;",
            "alter ingredient quantities;",
            "interfere with IoT systems;",
            "interfere with payment systems;",
            "attach unauthorized equipment;",
            "paint or structurally modify the Machine;",
            "drill or cut the Machine;",
            "relocate the Machine;",
            "permit unauthorized technicians to service the Machine; or",
            "allow another business to operate the Machine.",
          ],
        },
      ],
    },

    // ── 17 ───────────────────────────────────────────────────────────────────
    {
      number: "17",
      heading: "Installation and Acceptance",
      blocks: [
        {
          kind: "clause",
          number: "17.1",
          text: "MuscleBoxPro shall install the Machine at the agreed location.",
        },
        {
          kind: "clause",
          number: "17.2",
          text: "The Parties shall complete a Machine Installation & Acceptance Certificate at installation.",
        },
        {
          kind: "clause",
          number: "17.3",
          text: "The certificate shall record Machine ID, serial number, installation date, Machine condition, accessories, photographs, electrical testing, payment testing, dispensing testing and signatures of authorized representatives.",
        },
        {
          kind: "clause",
          number: "17.4",
          text: "Photographs may be retained by MuscleBoxPro as evidence of the Machine's condition at handover.",
        },
      ],
    },

    // ── 18 ───────────────────────────────────────────────────────────────────
    {
      number: "18",
      heading: "Maintenance",
      blocks: [
        {
          kind: "clause",
          number: "18.1",
          text: "MuscleBoxPro shall be responsible for normal preventive and corrective maintenance.",
        },
        {
          kind: "clause",
          number: "18.2",
          text: "Maintenance may include inspection, cleaning, mixer inspection, calibration, software updates, component replacement, payment-system checks, ingredient-system inspection and general operational testing.",
        },
        {
          kind: "clause",
          number: "18.3",
          text: "Normal wear and tear shall generally be the responsibility of MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "18.4",
          text: "Damage arising from misuse, negligence, unauthorized modification, vandalism, theft or other Gym-attributable causes shall be the responsibility of the Gym.",
        },
      ],
    },

    // ── 19 ───────────────────────────────────────────────────────────────────
    {
      number: "19",
      heading: "Service and Downtime",
      blocks: [
        {
          kind: "clause",
          number: "19.1",
          text: "MuscleBoxPro shall use reasonable efforts to restore the Machine following a technical fault.",
        },
        {
          kind: "clause",
          number: "19.2",
          text: "MuscleBoxPro shall not be responsible for downtime caused by power failure, internet/network failure, payment-provider failure, misuse, vandalism, theft, unauthorized modification, unsuitable premises, water supply issues, Gym closure, force majeure or other circumstances outside MuscleBoxPro's reasonable control.",
        },
        {
          kind: "clause",
          number: "19.3",
          text: "Unless separately agreed in writing, MuscleBoxPro does not guarantee uninterrupted operation or a specific uptime percentage.",
        },
      ],
    },

    // ── 20 ───────────────────────────────────────────────────────────────────
    {
      number: "20",
      heading: "Machine Security and Damage",
      blocks: [
        {
          kind: "clause",
          number: "20.1",
          text: "The Gym shall exercise reasonable care to protect the Machine.",
        },
        {
          kind: "clause",
          number: "20.2",
          text: "The Gym shall immediately notify MuscleBoxPro of physical damage, theft, attempted theft, vandalism, fire, water damage, electrical damage, unauthorized access or any other material incident.",
        },
        {
          kind: "clause",
          number: "20.3",
          text: "Damage attributable to the Gym, its employees, contractors, customers, members or persons under its control shall be recoverable from the Gym.",
        },
        {
          kind: "clause",
          number: "20.4",
          text: "MuscleBoxPro may use the security deposit toward such costs.",
        },
        {
          kind: "clause",
          number: "20.5",
          text: "Where the damage exceeds {{securityDeposit}}, the Gym shall pay the balance.",
        },
      ],
    },

    // ── 21 ───────────────────────────────────────────────────────────────────
    {
      number: "21",
      heading: "Relocation",
      blocks: [
        {
          kind: "clause",
          number: "21.1",
          text: "The Gym shall not relocate the Machine without prior written approval.",
        },
        {
          kind: "clause",
          number: "21.2",
          text: "Relocation to another branch or premises shall require written approval.",
        },
        {
          kind: "clause",
          number: "21.3",
          text: "MuscleBoxPro may charge reasonable transportation, dismantling, installation and reinstallation costs for approved relocation.",
        },
        {
          kind: "clause",
          number: "21.4",
          text: "Unauthorized relocation shall constitute a material breach.",
        },
        {
          kind: "clause",
          number: "21.5",
          text: "Unless otherwise agreed in writing, relocation of the Machine does not reset the cumulative cup count or the 15,000-cup milestone.",
        },
        {
          kind: "todo",
          id: "s21-5-revenue-milestone-omitted",
          severity: "needs-review",
          problem:
            "21.5 preserves 'the cumulative cup count or the 15,000-cup milestone' across a relocation but says nothing about the ₹5,00,000 cumulative-gross milestone in §6.1. Read strictly, relocation resets the revenue test — which at realistic prices is the test that actually governs.",
          resolution:
            "Add the cumulative gross sales figure to 21.5, or make 6.3 state that both tests are assessed per gym-machine relationship rather than per installation.",
        },
      ],
    },

    // ── 22 ───────────────────────────────────────────────────────────────────
    {
      number: "22",
      heading: "Software, Firmware and IoT",
      blocks: [
        {
          kind: "clause",
          number: "22.1",
          text: "All software, firmware, Machine interfaces, cloud systems, dashboards, APIs and related technology remain the property of MuscleBoxPro or its licensors.",
        },
        {
          kind: "clause",
          number: "22.2",
          text: "The Gym receives no ownership rights in such technology.",
        },
        {
          kind: "clause",
          number: "22.3",
          text: "The Gym shall not copy software, reverse engineer, extract source code, bypass security, modify firmware, access unauthorized APIs, interfere with telemetry or disable monitoring systems.",
        },
        {
          kind: "clause",
          number: "22.4",
          text: "MuscleBoxPro may remotely monitor Machine status, transactions, ingredient levels, errors and operational information for legitimate business, maintenance and analytics purposes.",
        },
      ],
    },

    // ── 23 ───────────────────────────────────────────────────────────────────
    {
      number: "23",
      heading: "Sales and Transaction Records",
      blocks: [
        {
          kind: "clause",
          number: "23.1",
          text: "Sales shall be recorded through the Machine's applicable payment and transaction systems.",
        },
        {
          kind: "clause",
          number: "23.2",
          text: "MuscleBoxPro may maintain cup count, transaction value, payment status, refunds, Machine status, ingredient usage, maintenance records and other operational information.",
        },
        {
          kind: "clause",
          number: "23.3",
          text: "Such records shall be used for settlement and performance review.",
        },
        {
          kind: "clause",
          number: "23.4",
          text: "The Parties shall cooperate to resolve demonstrable errors.",
        },
      ],
    },

    // ── 24 ───────────────────────────────────────────────────────────────────
    {
      number: "24",
      heading: "Food Safety and Regulatory Compliance",
      blocks: [
        {
          kind: "clause",
          number: "24.1",
          text: "The Parties acknowledge that the Machine is used for the automated sale/dispensing of food and beverages.",
        },
        {
          kind: "clause",
          number: "24.2",
          text: "FSSAI currently recognizes Food Vending Agencies as a specific category covering sale of packaged/fresh food through machines or automation. The applicable license/registration depends on the relevant eligibility criteria.",
        },
        {
          kind: "clause",
          number: "24.3",
          text: "MuscleBoxPro shall be responsible for the food-vending activities that it controls, including, as applicable, ingredient sourcing, approved formulations, ingredient replenishment, batch traceability, Machine hygiene, cleaning, water handling, food-quality procedures and relevant food-safety documentation.",
        },
        {
          kind: "clause",
          number: "24.4",
          text: "The Gym shall not independently alter, prepare or handle the ingredients used by the Machine.",
        },
        {
          kind: "clause",
          number: "24.5",
          text: "The Parties shall obtain and maintain the registrations/licences applicable to their respective legal responsibilities.",
        },
        {
          kind: "clause",
          number: "24.6",
          text: "The exact FSSAI Food Business Operator/licensing structure shall be confirmed by the Parties' food-law consultant before execution and, if required, incorporated into this Agreement by amendment.",
        },
        {
          kind: "todo",
          id: "s24-6-fbo-unresolved",
          severity: "needs-review",
          problem:
            "24.6 defers the FSSAI Food Business Operator structure to a consultant 'before execution'. Until that lands, neither party knows which of them holds the licence for the food being dispensed.",
          resolution:
            "Food-law consultant to confirm the FBO allocation, then amend §24 and Schedule F to state it rather than promise it.",
        },
        {
          kind: "clause",
          number: "24.7",
          text: "Both Parties shall cooperate with lawful regulatory inspections, complaints, investigations and food-safety incidents.",
        },
      ],
    },

    // ── 25 ───────────────────────────────────────────────────────────────────
    {
      number: "25",
      heading: "Cleaning and Hygiene",
      blocks: [
        {
          kind: "clause",
          number: "25.1",
          text: "MuscleBoxPro shall maintain the Machine according to its prescribed cleaning and sanitation procedures.",
        },
        {
          kind: "clause",
          number: "25.2",
          text: "The Gym shall maintain reasonable cleanliness around the Machine.",
        },
        {
          kind: "clause",
          number: "25.3",
          text: "The Gym shall not use chemicals or cleaning methods that may damage the Machine.",
        },
        {
          kind: "clause",
          number: "25.4",
          text: "MuscleBoxPro may maintain cleaning and sanitation records.",
        },
      ],
    },

    // ── 26 ───────────────────────────────────────────────────────────────────
    {
      number: "26",
      heading: "Ingredient Traceability",
      blocks: [
        {
          kind: "paragraph",
          text: "MuscleBoxPro may maintain records including ingredient, supplier, batch number, manufacturing date, expiry date, quantity, refill date, Machine ID and person performing the refill. These records may be used for quality control, investigation and recall purposes.",
        },
      ],
    },

    // ── 27 ───────────────────────────────────────────────────────────────────
    {
      number: "27",
      heading: "Customer Complaints and Incidents",
      blocks: [
        {
          kind: "clause",
          number: "27.1",
          text: "The Gym shall promptly inform MuscleBoxPro of material complaints relating to product quality, Machine malfunction, payment, contamination, foreign objects, illness, allergic reaction, injury or other safety concerns.",
        },
        {
          kind: "clause",
          number: "27.2",
          text: "The Gym shall not make unsupported statements about the cause of an incident.",
        },
        {
          kind: "clause",
          number: "27.3",
          text: "MuscleBoxPro shall investigate incidents relating to the Machine, ingredients and its operating procedures.",
        },
        {
          kind: "clause",
          number: "27.4",
          text: "Both Parties shall cooperate with each other and competent authorities where required.",
        },
      ],
    },

    // ── 28 ───────────────────────────────────────────────────────────────────
    {
      number: "28",
      heading: "Branding and Advertising",
      blocks: [
        {
          kind: "clause",
          number: "28.1",
          text: "MuscleBoxPro branding remains the property of MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "28.2",
          text: "The Gym shall not remove MuscleBoxPro branding; cover the logo; modify branding; represent the Machine as Gym-owned; create confusingly similar branding; or use MuscleBoxPro intellectual property outside the Agreement.",
        },
        {
          kind: "clause",
          number: "28.3",
          text: "MuscleBoxPro may display advertisements on the Machine.",
        },
        {
          kind: "clause",
          number: "28.4",
          text: "Advertising revenue shall be shared according to Section 9.",
        },
      ],
    },

    // ── 29 ───────────────────────────────────────────────────────────────────
    {
      number: "29",
      heading: "Intellectual Property",
      blocks: [
        {
          kind: "clause",
          number: "29.1",
          text: "All MuscleBoxPro trademarks, logos, recipes, formulations, Machine designs, software, technical documentation, operating procedures and proprietary information remain the property of MuscleBoxPro or its licensors.",
        },
        {
          kind: "clause",
          number: "29.2",
          text: "No intellectual property rights are transferred to the Gym.",
        },
        {
          kind: "clause",
          number: "29.3",
          text: "The Gym shall not reproduce, copy or commercially exploit MuscleBoxPro intellectual property without written authorization.",
        },
      ],
    },

    // ── 30 ───────────────────────────────────────────────────────────────────
    {
      number: "30",
      heading: "Data and Privacy",
      blocks: [
        {
          kind: "clause",
          number: "30.1",
          text: "The Machine and related systems may process transaction and operational information.",
        },
        {
          kind: "clause",
          number: "30.2",
          text: "Where personal information is collected, it shall be handled in accordance with applicable law.",
        },
        {
          kind: "clause",
          number: "30.3",
          text: "Wherever practical, sensitive payment credentials shall be processed by authorized payment service providers rather than stored directly by MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "30.4",
          text: "MuscleBoxPro may use non-personalized operational data for analytics, Machine optimization, maintenance, planning, performance measurement and product improvement.",
        },
      ],
    },

    // ── 31 ───────────────────────────────────────────────────────────────────
    {
      number: "31",
      heading: "Insurance and Risk",
      blocks: [
        {
          kind: "clause",
          number: "31.1",
          text: "Each Party shall be responsible for insurance appropriate to its own operations and risks where legally required or commercially appropriate.",
        },
        {
          kind: "clause",
          number: "31.2",
          text: "The Gym shall immediately notify MuscleBoxPro of any incident affecting the Machine that may result in an insurance claim.",
        },
        {
          kind: "clause",
          number: "31.3",
          text: "The Parties may agree to additional insurance requirements in writing.",
        },
      ],
    },

    // ── 32 ───────────────────────────────────────────────────────────────────
    {
      number: "32",
      heading: "Gym Representations",
      blocks: [
        {
          kind: "paragraph",
          text: "The Gym represents that it has authority to enter into this Agreement; its signatory is authorized; it has the right to permit Machine placement at the premises; it shall comply with applicable laws; it shall not knowingly permit unlawful use of the Machine; and information provided to MuscleBoxPro is materially accurate.",
        },
      ],
    },

    // ── 33 ───────────────────────────────────────────────────────────────────
    {
      number: "33",
      heading: "Indemnification",
      blocks: [
        {
          kind: "clause",
          number: "33.1",
          text: "The Gym shall indemnify MuscleBoxPro against losses, claims, costs and damages arising from Gym negligence, unauthorized Machine modification, misuse, unauthorized relocation, intentional damage, breach of this Agreement, unauthorized ingredient handling, or acts/omissions of persons under the Gym's control.",
        },
        {
          kind: "clause",
          number: "33.2",
          text: "MuscleBoxPro shall be responsible for losses arising from its own negligence, willful misconduct or material breach, subject to applicable law.",
        },
        {
          kind: "clause",
          number: "33.3",
          text: "Final indemnity language shall be reviewed by legal counsel.",
        },
        {
          kind: "todo",
          id: "s33-3-indemnity-not-final",
          severity: "needs-review",
          problem:
            "33.3 says the indemnity language is not final. Asking a gym to accept an indemnity that the drafting party has flagged as provisional is a poor position to sign from and a poor one to enforce from.",
          resolution:
            "Legal counsel to settle §33.1–33.2, then delete 33.3 entirely rather than leaving a clause that advertises the gap.",
        },
      ],
    },

    // ── 34 ───────────────────────────────────────────────────────────────────
    {
      number: "34",
      heading: "Limitation of Liability",
      blocks: [
        {
          kind: "paragraph",
          text: "To the maximum extent permitted by applicable law, neither Party shall be liable to the other for indirect, incidental, special or consequential losses. Nothing in this clause shall exclude or limit liability that cannot legally be excluded, including applicable liability arising from fraud, willful misconduct or other non-excludable matters. The final liability cap, if any, shall be determined by legal counsel.",
        },
        {
          kind: "todo",
          id: "s34-liability-cap-undetermined",
          severity: "needs-review",
          problem:
            "The liability cap is left to counsel inside the operative clause, so §34 currently has no cap at all — the sentence describing one is a promise to write one later.",
          resolution:
            "Counsel to set the cap (or confirm there is none) and rewrite §34 as a self-contained clause.",
        },
      ],
    },

    // ── 35 ───────────────────────────────────────────────────────────────────
    {
      number: "35",
      heading: "Termination by MuscleBoxPro",
      blocks: [
        {
          kind: "paragraph",
          text: "MuscleBoxPro may terminate the Agreement and recover the Machine if the Gym fails to make required payments; materially breaches this Agreement; damages the Machine; permits unauthorized modification; relocates the Machine without approval; interferes with software/IoT; handles ingredients without authorization; becomes insolvent or ceases operations; engages in unlawful activity involving the Machine; or repeatedly breaches operational requirements.",
        },
        {
          kind: "paragraph",
          text: "MuscleBoxPro may also remove the Machine following a three-month commercial performance review in accordance with Section 12.",
        },
      ],
    },

    // ── 36 ───────────────────────────────────────────────────────────────────
    {
      number: "36",
      heading: "Termination by Gym",
      blocks: [
        {
          kind: "clause",
          number: "36.1",
          text: "The Gym may request early termination by providing 30 days' written notice.",
        },
        {
          kind: "clause",
          number: "36.2",
          text: "If the Gym terminates before expiry of the agreed {{termMonths}}-month term, any applicable early-termination amount or recovery of specifically agreed costs shall be as set out in the Commercial Schedule.",
        },
        {
          kind: "clause",
          number: "36.3",
          text: "The Gym shall remain responsible for all outstanding amounts until final settlement and Machine return.",
        },
      ],
    },

    // ── 37 ───────────────────────────────────────────────────────────────────
    {
      number: "37",
      heading: "Machine Return and Recovery",
      blocks: [
        {
          kind: "clause",
          number: "37.1",
          text: "Upon expiry or termination, the Gym shall provide MuscleBoxPro reasonable access to retrieve the Machine.",
        },
        { kind: "clause", number: "37.2", text: "MuscleBoxPro shall inspect the Machine." },
        {
          kind: "clause",
          number: "37.3",
          text: "The Parties shall complete a Machine Return Certificate.",
        },
        {
          kind: "clause",
          number: "37.4",
          text: "The inspection may include physical condition, serial number, accessories, touchscreen, payment hardware, ingredient containers and electrical components.",
        },
        {
          kind: "clause",
          number: "37.5",
          text: "Damage beyond normal wear and tear may be charged to the Gym.",
        },
        {
          kind: "clause",
          number: "37.6",
          text: "Where termination or recovery is attributable to the Gym's breach, MuscleBoxPro may recover reasonable transportation and retrieval costs.",
        },
      ],
    },

    // ── 38 ───────────────────────────────────────────────────────────────────
    {
      number: "38",
      heading: "Effect of Termination",
      blocks: [
        {
          kind: "paragraph",
          text: "Upon termination, the Gym's right to operate the Machine ceases; the Machine shall be returned; MuscleBoxPro branding shall no longer be used; outstanding amounts shall be settled; the security deposit shall be adjusted; remaining deposit shall be refunded where applicable; and confidential information shall continue to be protected. Clauses concerning ownership, intellectual property, confidentiality, indemnity, payment obligations, liability and dispute resolution shall survive termination to the extent applicable.",
        },
      ],
    },

    // ── 39 ───────────────────────────────────────────────────────────────────
    {
      number: "39",
      heading: "Force Majeure",
      blocks: [
        {
          kind: "paragraph",
          text: "Neither Party shall be liable for delay or failure caused by circumstances beyond reasonable control, including natural disasters, fire, flood, war, government restrictions, epidemic/pandemic, major infrastructure failure, prolonged power outage, internet failure, strikes, civil disturbance or comparable events.",
        },
      ],
    },

    // ── 40 ───────────────────────────────────────────────────────────────────
    {
      number: "40",
      heading: "Confidentiality",
      blocks: [
        {
          kind: "paragraph",
          text: "Each Party shall keep confidential commercially sensitive information received from the other Party, including pricing, recipes, business plans, technical information, Machine information, customer information, sales information and proprietary processes. Disclosure shall be permitted where required by law or reasonably necessary to perform the Agreement.",
        },
      ],
    },

    // ── 41 ───────────────────────────────────────────────────────────────────
    {
      number: "41",
      heading: "Notices",
      blocks: [
        {
          kind: "table",
          header: ["MuscleBoxPro", "Gym"],
          rows: [
            ["Address: {{mbpNotices.address}}", "Address: {{gymNotices.address}}"],
            ["Email: {{mbpNotices.email}}", "Email: {{gymNotices.email}}"],
            ["Phone: {{mbpNotices.phone}}", "Phone: {{gymNotices.phone}}"],
          ],
        },
        {
          kind: "paragraph",
          text: "Formal notices shall be delivered through the agreed communication channels.",
        },
      ],
    },

    // ── 42 ───────────────────────────────────────────────────────────────────
    {
      number: "42",
      heading: "Assignment",
      blocks: [
        {
          kind: "clause",
          number: "42.1",
          text: "The Gym shall not assign or transfer this Agreement or any rights relating to the Machine without prior written consent of MuscleBoxPro.",
        },
        {
          kind: "clause",
          number: "42.2",
          text: "MuscleBoxPro may assign the Agreement to an affiliate, successor or purchaser of the relevant business, subject to applicable law.",
        },
      ],
    },

    // ── 43 ───────────────────────────────────────────────────────────────────
    {
      number: "43",
      heading: "Entire Agreement",
      blocks: [
        {
          kind: "paragraph",
          text: "This Agreement and its Schedules constitute the entire agreement between the Parties regarding placement and operation of the Machine and supersede prior discussions relating to the same subject matter.",
        },
      ],
    },

    // ── 44 ───────────────────────────────────────────────────────────────────
    {
      number: "44",
      heading: "Amendments",
      blocks: [
        {
          kind: "paragraph",
          text: "Any material amendment shall be made in writing and signed/accepted by authorized representatives of both Parties.",
        },
      ],
    },

    // ── 45 ───────────────────────────────────────────────────────────────────
    {
      number: "45",
      heading: "Severability",
      blocks: [
        {
          kind: "paragraph",
          text: "If any provision is determined to be invalid or unenforceable, the remaining provisions shall continue to the extent permitted by law.",
        },
      ],
    },

    // ── 46 ───────────────────────────────────────────────────────────────────
    {
      number: "46",
      heading: "Governing Law and Dispute Resolution",
      blocks: [
        {
          kind: "paragraph",
          text: "This Agreement shall be governed by the laws of India. The Parties shall first attempt to resolve disputes amicably. If a dispute cannot be resolved amicably within 30 days, it shall be referred to the dispute-resolution mechanism agreed by the Parties. Final arbitration clause, seat/venue and jurisdiction shall be inserted following review by Indian legal counsel.",
        },
        {
          kind: "todo",
          id: "s46-dispute-mechanism-missing",
          severity: "blocks-send",
          problem:
            "§46 refers disputes to 'the dispute-resolution mechanism agreed by the Parties' — a mechanism this Agreement never specifies — and defers the arbitration clause, seat, venue and jurisdiction to counsel. As drafted there is no forum, so the dispute clause has no operative effect.",
          resolution:
            "Indian legal counsel to insert the arbitration clause with seat and venue, and name the jurisdiction. Signing a 24-month agreement with a ₹50,000 deposit and no forum is not a defensible position for either party.",
        },
      ],
    },

    // ── 47 ───────────────────────────────────────────────────────────────────
    {
      number: "47",
      heading: "Signatures",
      blocks: [
        {
          kind: "paragraph",
          text: "IN WITNESS WHEREOF, the Parties have executed this Agreement on the date first written above.",
        },
        {
          kind: "signatures",
          parties: [
            {
              heading: "FOR BLEND BOX INNOVATIONS LLP / MUSCLEBOXPRO",
              fields: ["Name", "Designation", "Signature", "Date", "Seal"],
            },
            {
              heading: "FOR {{gymLegalName}}",
              fields: ["Name", "Designation", "Signature", "Date", "Seal"],
            },
          ],
        },
      ],
    },
  ],

  // ── Schedules ──────────────────────────────────────────────────────────────
  schedules: [
    {
      number: "Schedule A",
      heading: "Machine Details & Installation Certificate",
      blocks: [
        {
          kind: "table",
          header: ["Item", "Details"],
          rows: [
            ["Machine ID", "{{machineId}}"],
            ["Serial Number", "{{serialNumber}}"],
            ["Model", "{{machineModel}}"],
            ["Machine Value", "{{machineValue}}"],
            ["Installation Date", "{{installationDate}}"],
            ["Gym", "{{gymLegalName}}"],
            ["Installation Address", "{{installationAddress}}"],
            ["Gym Representative", "[●]"],
            ["MuscleBoxPro Representative", "[●]"],
          ],
        },
        {
          kind: "checklist",
          lead: "Installation Checklist:",
          items: [
            "Machine received",
            "Serial number verified",
            "Physical condition inspected",
            "Accessories received",
            "Power tested",
            "Touchscreen tested",
            "Payment system tested",
            "Dispensing tested",
            "Machine location accepted",
            "Photographs taken",
          ],
        },
        {
          kind: "blanks",
          items: [
            { label: "Gym Representative", width: "long" },
            { label: "MuscleBoxPro Representative", width: "long" },
            { label: "Date", width: "short" },
          ],
        },
        {
          kind: "todo",
          id: "schedule-a-second-signing",
          severity: "needs-review",
          problem:
            "Schedule A is signed at installation, days or weeks after the agreement itself, by whoever is physically present. The onboarding flow only captures one signature.",
          resolution:
            "Treat Schedule A as a separate signing event against the same agreement record — see docs/gym-onboarding.md §6. Do not fold it into step 3.",
        },
      ],
    },

    {
      number: "Schedule B",
      heading: "Commercial Terms",
      blocks: [
        {
          kind: "table",
          header: ["Commercial Item", "Agreed Term"],
          rows: [
            ["Machine Ownership", "MuscleBoxPro"],
            ["Security Deposit", "{{securityDeposit}}"],
            ["Agreement Term", "{{termMonths}} months"],
            ["Initial Profit Share", "80% MuscleBoxPro / 20% Gym"],
            ["", "First 15,000 completed paid cups"],
            ["", "80:20"],
            ["", "50:50"],
            ["Advertising Revenue", "80% MuscleBoxPro / 20% Gym"],
            ["Electricity Reimbursement", "₹1,000 per completed 1,000 cups"],
            ["Minimum Electricity Reimbursement", "₹1,000 per 3 months"],
            ["Electricity Carry Forward", "No"],
            ["Performance Review", "Every 3 months"],
            ["Machine Removal Notice", "15 days"],
            ["Protein Replenishment", "MuscleBoxPro"],
            ["Water Replenishment", "MuscleBoxPro"],
            ["Water Cost", "MuscleBoxPro"],
            ["Normal Maintenance", "MuscleBoxPro"],
            ["Gym Electricity", "Gym, reimbursed as specified"],
            ["Monthly Settlement", "Within 15 days after month-end"],
            ["Gym Early Termination Notice", "30 days"],
            ["Early Termination Charges", "[TO BE AGREED]"],
          ],
        },
        {
          kind: "todo",
          id: "schedule-b-unlabelled-ratio-rows",
          severity: "blocks-send",
          problem:
            "Three rows under 'Initial Profit Share' have an empty label column: 'First 15,000 completed paid cups', '80:20', '50:50'. Which ratio attaches to which cup band is left for the reader to infer, and the ₹5,00,000 trigger from §6.1 is absent entirely.",
          resolution:
            "Relabel as explicit rows — e.g. 'Profit Share, cups 1-15,000' / 'Profit Share, thereafter' — and add the cumulative-gross trigger so Schedule B agrees with §6.1.",
        },
        {
          kind: "todo",
          id: "schedule-b-early-termination-charge",
          severity: "blocks-send",
          problem:
            "'Early Termination Charges: [TO BE AGREED]' is an unfilled placeholder, and §36.2 points at this row for the amount the gym owes on early exit. So the agreement's exit cost is undefined while §36.1 grants the right to exit.",
          resolution:
            "Fill the amount, or state 'Nil' explicitly. A gym signing a 24-month term is entitled to know the exit price before it signs, and a blank here means the clause is unenforceable in practice.",
        },
      ],
    },

    {
      number: "Schedule C",
      heading: "Profit Calculation",
      blocks: [
        {
          kind: "paragraph",
          text: "Step 1 - Gross Customer Sales: Total amount received from completed paid customer transactions, excluding GST/other taxes collected on behalf of the Government.",
        },
        {
          kind: "paragraph",
          text: "Step 2 - Deduct Direct Variable Costs: Ingredient cost; cup/packaging cost; payment processing charges; refunds; applicable promotional discounts; and other specifically agreed direct variable costs.",
        },
        { kind: "paragraph", text: "Step 3 - Net Profit: Gross Sales - Direct Variable Costs." },
        {
          kind: "paragraph",
          text: "Step 4 - Profit Sharing: Cups 1-15,000 = 80% MuscleBoxPro / 20% Gym. Cup 15,001 onward = 50% MuscleBoxPro / 50% Gym.",
        },
        { kind: "paragraph", text: "Advertising: 80% MuscleBoxPro / 20% Gym." },
        {
          kind: "todo",
          id: "schedule-c-step4-conflicts-with-s6-1",
          severity: "blocks-send",
          problem:
            "Step 4 states a purely cup-based trigger and omits the ₹5,00,000 cumulative-gross test that §6.1 makes decisive. §43 makes the Schedules part of the entire agreement, so the two provisions conflict on the face of the document.",
          resolution:
            "Same fix as s6-milestone-ambiguity: pick the governing trigger and state it identically in §6.1, §6.2, §21.5, Schedule B and here.",
        },
      ],
    },

    {
      number: "Schedule D",
      heading: "Gym Responsibilities",
      blocks: [
        {
          kind: "bullets",
          items: [
            "provide suitable floor space;",
            "provide electricity;",
            "protect the Machine;",
            "provide reasonable Machine access;",
            "not modify the Machine;",
            "not move the Machine;",
            "not add/remove protein;",
            "not modify recipes;",
            "not perform unauthorized servicing;",
            "report damage immediately;",
            "report customer safety complaints;",
            "maintain cleanliness around the Machine;",
            "provide agreed water access;",
            "permit MuscleBoxPro personnel to refill ingredients and water;",
            "follow Machine operating instructions; and",
            "cooperate with Machine maintenance.",
          ],
        },
      ],
    },

    {
      number: "Schedule E",
      heading: "Maintenance & Service",
      blocks: [
        {
          kind: "bullets",
          lead: "MuscleBoxPro Responsibilities:",
          items: [
            "Preventive maintenance",
            "Machine inspection",
            "Mixer inspection",
            "Cleaning",
            "Software updates",
            "Payment-system checks",
            "Ingredient-system inspection",
            "Component replacement",
            "Troubleshooting",
          ],
        },
        {
          kind: "paragraph",
          text: "Damage caused by misuse, unauthorized modification, vandalism, theft, negligence, unauthorized servicing, electrical conditions outside specifications, physical impact or other Gym-attributable causes may be charged to the Gym.",
        },
      ],
    },

    {
      number: "Schedule F",
      heading: "Food Safety & Hygiene",
      blocks: [
        {
          kind: "paragraph",
          text: "MuscleBoxPro shall maintain procedures relating to approved ingredients, ingredient storage, batch tracking, expiry management, Machine cleaning, sanitation, water handling, ingredient replenishment, complaint handling, recall procedures and applicable food-safety requirements.",
        },
        {
          kind: "paragraph",
          text: "The Gym shall not independently handle, add, remove or modify Machine ingredients.",
        },
        {
          kind: "paragraph",
          text: "The Parties shall maintain registrations/licences applicable to their respective legal responsibilities. The final FSSAI/FBO allocation shall be confirmed before execution.",
        },
      ],
    },

    {
      number: "Schedule G",
      heading: "Advertising",
      blocks: [
        {
          kind: "paragraph",
          text: "MuscleBoxPro may display advertising on the Machine screen, Machine display area, approved physical Machine surfaces and other mutually agreed Machine advertising locations.",
        },
        {
          kind: "paragraph",
          text: "Advertising revenue shall be shared 80% MuscleBoxPro / 20% Gym. No minimum advertising revenue is guaranteed.",
        },
      ],
    },

    {
      number: "Schedule H",
      heading: "Machine Return Certificate",
      blocks: [
        {
          kind: "table",
          header: ["Item", "Details"],
          rows: [
            ["Machine ID", "__________________"],
            ["Serial Number", "__________________"],
            ["Return Date", "__________________"],
            [
              "Condition",
              "Normal wear and tear / No material damage / Physical damage / Missing components / Repair required / Cleaning required",
            ],
            ["Damage Details", "______________________________________________"],
            ["Repair/Replacement Cost", "₹________________"],
            ["Security Deposit Adjustment", "₹________________"],
            ["Balance Refund", "₹________________"],
          ],
        },
        {
          kind: "blanks",
          items: [
            { label: "Gym Representative", width: "long" },
            { label: "MuscleBoxPro Representative", width: "long" },
            { label: "Date", width: "short" },
          ],
        },
      ],
    },
  ],
};

/**
 * Human-readable summary of why v2.1 cannot be issued yet, for the dev banner and
 * for whoever chases legal. Kept next to the content so it is hard to forget.
 *
 * Do not hand-maintain a count here — `collectBlockers()` in render.ts derives the
 * live list from the document tree.
 */
export const AGREEMENT_V2_1_ISSUE_SUMMARY = `Version 2.1 is an execution draft. Six defects block issuing it to a gym:
an empty clause 4.4; clause 6.1 with no heading; clause 6.3 "Milestone
Interpretation" with no body; unlabelled profit-share rows in Schedule B; an
unfilled "[TO BE AGREED]" early-termination charge that §36.2 depends on; and a
§46 dispute clause that names no forum. Separately, §6.1 and Schedule C state
different triggers for the 50:50 step, which is a commercial decision rather than
a drafting fix. Five further items need legal, tax or food-law sign-off.
See docs/gym-onboarding.md §12.`;
