/**
 * MuscleBoxPro Machine Placement & Profit Sharing Agreement, version 2.3.
 *
 * This is the version that gets issued, and the only one in the repository. The version
 * string is part of the record stored with a signature, so a changed clause means a new
 * version file, not a correction to this one.
 *
 * ── What 2.3 is ──────────────────────────────────────────────────────────────
 * 2.3 changes no commercial term and resolves no marker. It is one change, made in four
 * places: **the document no longer prints a blank form for something that has not
 * happened yet.**
 *
 * 2.2 was a faithful paper contract rendered on a screen, and paper carries its own
 * completion apparatus: §47 offered each party a Name, Designation, Signature, Date and
 * Seal to write on, Schedule A printed an installation certificate with ten empty
 * checkboxes and three signature rules, and Schedule H printed a return certificate with
 * eight `__________` cells. Twenty-six blank rules in total, of which twenty-three
 * belonged to two events that happen months apart from signing — installation, and the
 * return of the Machine at the end of the term. A gym reading it on a screen it cannot
 * write on reasonably concluded it was looking at a form both parties were meant to be
 * filling in together, and went looking for its half.
 *
 * So:
 *   - **§2** drops the Machine ID, Serial Number and Installation Date rows. The unit is
 *     not built or allocated when this is signed, and those three rendered as "To be
 *     completed at installation" inside a table of settled particulars. They are recorded
 *     on the Installation Certificate under §17, which is where they are actually known.
 *   - **§47** states how the Agreement is executed — electronically, by the gym's
 *     authorised signatory confirming in the onboarding flow, evidenced by the recorded
 *     SHA-256 fingerprint and timestamp — and prints the gym's signatory from the record
 *     via {{signatoryName}} and {{signatoryDesignation}} instead of offering a blank rule
 *     for them. MuscleBoxPro's block names the LLP and its authorised signatory without a
 *     personal name: which of our people issued a given agreement is on our own record,
 *     and a name printed in the document would be a second place for it to be wrong.
 *   - **Schedules A and H** describe what their certificates record and when they are
 *     signed, instead of printing them. The certificates themselves are separate
 *     documents completed on site, which is what §17.2 and §37 always said.
 *
 * Nothing a gym owes or is owed moves. What moves is who the document appears to be
 * addressed to at the moment it is read.
 *
 * ── Rules (unchanged from 2.1) ───────────────────────────────────────────────
 *   - FROZEN the moment one gym signs against it. Any content change means v2_4.ts.
 *   - Rupee amounts and per-gym details are tokenised, never literal.
 *   - Where something is unresolved, emit a `todo` block rather than quietly omitting
 *     or inventing a clause. `collectBlockers()` finds them; `canIssue()` refuses to
 *     send while any of them blocks.
 *
 * The commercial figures come from shared/partnership/summary.ts by way of the review
 * in that file's docstring, but they are written out as literals here for the same
 * reason v2.1's are: a signed document says what it says, and a later change to our
 * standard terms must not rewrite the text a gym signed. The test file asserts the two
 * agree at the moment of writing, which is the only place the check belongs.
 */

import type { Agreement } from "./types";

export const AGREEMENT_V2_3: Agreement = {
  version: "2.3",
  title: "Machine Placement & Profit Sharing Agreement",
  subtitle: "MUSCLEBOXPRO",
  runningFooter: "MuscleBoxPro - Machine Placement & Profit Sharing Agreement - Version 2.3",

  // ── Cover ──────────────────────────────────────────────────────────────────
  cover: [
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
    // 2.1's cover carried an "Important execution note" deferring stamp duty, tax,
    // FSSAI/FBO allocation, arbitration and jurisdiction to advisors. All five are now
    // settled in the body (§§5.9, 24.6, 34, 46) and the note is gone: a document that
    // tells its own reader which of its clauses are provisional is a document that
    // invites an argument about every one of them.
    {
      kind: "todo",
      id: "v2-3-not-reviewed-by-counsel",
      severity: "needs-review",
      problem:
        "The clauses that 2.2 resolved — §5.9 (GST on the deposit), §6.1 and §6.3 (the milestone, its interpretation and the one-way ratchet), §24.6 (MuscleBoxPro as FSSAI Food Business Operator), §34 (liability, deliberately uncapped), §36.2 with Schedule B (early termination at Nil), and §46 (courts at Gautam Buddha Nagar, no arbitration) — were settled as commercial decisions and drafted in-house, and 2.3 adds §47's electronic execution clauses to that list. No Indian legal counsel, CA or food-law consultant has read any of it. Separately, this Agreement is issued unstamped by decision: removing the stamp-duty note removed the reminder, not the liability, and an unstamped instrument can be inadmissible in evidence until stamped with penalty.",
      resolution:
        "Have counsel review §§33, 34, 36, 46 and 47; a CA confirm §5.9 and the stamp position for the state of execution; a food-law consultant confirm §24.6 and Schedule F. Then either delete this marker or issue v2_4.ts with their wording. This is a needs-review marker and so does not block issuing — proceeding is a knowing decision to carry the risk, not an oversight.",
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
    // Three rows out: the Machine ID, serial number and installation date of a unit that
    // has not been built when this is signed. They belong on the Installation Certificate
    // under §17, and printing them here as "To be completed at installation" put three
    // holes in the middle of the table of settled particulars.
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
            ["Machine Value", "{{machineValue}}"],
            ["Installation Location", "{{installationAddress}}"],
            ["Accessories", "{{accessories}}"],
          ],
        },
        {
          kind: "paragraph",
          text: "The Machine ID, serial number and installation date of the unit actually installed are recorded on the Installation Certificate under clause 17, described in Schedule A. Those particulars are not known when this Agreement is executed, and this Agreement applies to the unit so recorded.",
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
    // 2.1 had a bare "4.4" with no text at all. Deleted rather than invented: there is
    // nothing in the source document to indicate what it was meant to say, and 4.4 was
    // the last clause in the section so nothing renumbers.
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
        // Figure and words from the same integer — see shared/agreement/amountInWords.ts.
        { kind: "callout", lines: ["{{securityDeposit}} - {{securityDepositInWords}}"] },
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
        {
          kind: "clause",
          number: "5.9",
          text: "The security deposit is refundable and is not consideration for a supply of goods or services. No GST is therefore charged on it at the time of collection, and MuscleBoxPro shall issue the Gym a deposit receipt rather than a tax invoice. Where any part of the deposit is subsequently applied or forfeited toward a taxable supply or toward a liability of the Gym, MuscleBoxPro shall issue the appropriate tax document for that amount at that time.",
        },
      ],
    },

    // ── 6 ────────────────────────────────────────────────────────────────────
    // The section 2.1 could not issue. Four defects closed here: 6.1 had no heading and
    // a callout titled "UPDATED COMMERCIAL MILESTONE" in place of clause text; the
    // second test was cumulative gross, which at a ₹120 cup fired at ~4,167 cups and
    // made the 15,000-cup test dead letter; 6.3 was a heading with an empty body; and
    // Schedules B and C stated the cup test alone. The milestone is now the earlier of
    // 15,000 cups or ₹5,00,000 of Net Profit as §7 defines it, stated identically here,
    // in §21.5, in Schedule B and in Schedule C.
    {
      number: "6",
      heading: "Profit-Sharing Model",
      blocks: [
        { kind: "clause", number: "6.1", text: "Profit-Sharing Milestone" },
        {
          kind: "paragraph",
          text: 'Profit sharing shall be 80% MuscleBoxPro / 20% Gym until the Milestone is reached. The "Milestone" is reached on the earlier of (a) 15,000 completed paid cups, or (b) ₹5,00,000 of cumulative Net Profit, Net Profit having the meaning given in Section 7.',
        },
        { kind: "callout", lines: ["Before the Milestone", "80% - MuscleBoxPro | 20% - Gym"] },
        { kind: "clause", number: "6.2", text: "After the Milestone" },
        {
          kind: "paragraph",
          text: "From the cup at which the Milestone is reached, profit sharing on protein shake sales shall be 50% MuscleBoxPro / 50% Gym for the remainder of the term.",
        },
        { kind: "callout", lines: ["After the Milestone", "50% - MuscleBoxPro | 50% - Gym"] },
        { kind: "clause", number: "6.3", text: "Milestone Interpretation" },
        {
          kind: "clause",
          number: "6.3.1",
          text: "Both tests in 6.1 are assessed cumulatively from the commencement date in respect of the Machine placed with the Gym under this Agreement. Neither test is reset by relocation of the Machine, by replacement of the Machine with another unit, or by renewal of this Agreement.",
        },
        {
          kind: "clause",
          number: "6.3.2",
          text: "For the purposes of 6.1(b), cumulative Net Profit means the aggregate Net Profit calculated under Section 7 before any division between the Parties. It is not the Gym's share of Net Profit, and it is not gross customer sales.",
        },
        {
          kind: "clause",
          number: "6.3.3",
          text: "Where the Milestone is reached part-way through a month, cups sold before the Milestone shall be shared at 80:20 and cups sold from the Milestone onward at 50:50, and the monthly statement shall show both amounts separately. The point at which the Milestone was reached shall be determined from the Machine's transaction records; where a monthly figure must be apportioned between the two ratios, it shall be apportioned at that month's average selling price and average direct variable cost per cup.",
        },
        {
          kind: "clause",
          number: "6.3.4",
          text: "Once the Milestone has been reached, the 50:50 ratio applies for the remainder of the term and does not revert. In particular, it does not revert if cumulative Net Profit subsequently falls below ₹5,00,000, whether because a later period records a loss or for any other reason.",
        },
        {
          kind: "clause",
          number: "6.3.5",
          text: "MuscleBoxPro shall record the date and the cumulative cup number at which the Milestone was reached, and shall make that record available to the Gym through the partner dashboard and the monthly statement.",
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
    // 2.1's table stopped at 4,000-4,999, which read as a ₹4,000 ceiling. Confirmed as
    // illustrative, not a cap: the rule is ₹1,000 per completed block and continues.
    // The final row and the words in 10.3 say so, so a gym selling 6,000 cups in a
    // quarter has no literal reading available to it that pays less than the rule.
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
        {
          kind: "clause",
          number: "10.3",
          text: "The calculation shall therefore be as set out below. The table illustrates the rule in 10.1 and 10.4 and does not cap the reimbursement:",
        },
        {
          kind: "table",
          header: ["Cups sold in 3-month period", "Electricity reimbursement"],
          rows: [
            ["0-999", "₹1,000"],
            ["1,000-1,999", "₹1,000"],
            ["2,000-2,999", "₹2,000"],
            ["3,000-3,999", "₹3,000"],
            ["4,000-4,999", "₹4,000"],
            ["5,000 and above", "₹1,000 for each completed block of 1,000 paid cups"],
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
          // 2.1 preserved "the cumulative cup count or the 15,000-cup milestone" and was
          // silent on the second test, so a strict reading reset it on relocation.
          kind: "clause",
          number: "21.5",
          text: "Unless otherwise agreed in writing, relocation of the Machine does not reset the cumulative cup count, the cumulative Net Profit figure, or the Milestone in clause 6.1, each of which continues to be assessed as provided in clause 6.3.1.",
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
    // 24.6 deferred the FBO allocation to a consultant "before execution", which left
    // neither party knowing who held the licence for the food being dispensed. Settled:
    // MuscleBoxPro is the FBO, which follows from §§14, 15, 24.3 and 25.1 — we control
    // every food-handling step, and the licence should sit with the party that does.
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
          text: "MuscleBoxPro is the Food Business Operator in respect of the food dispensed by the Machine, and shall obtain and maintain the FSSAI registration or licence applicable to that activity at its own cost. The Gym is not required to hold an FSSAI registration in respect of the Machine and shall not hold itself out as the Food Business Operator for it. Where the Gym's own licence or registration requires the presence of the Machine to be recorded, the Parties shall cooperate to provide the particulars needed.",
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
    // 2.1's 33.3 read "Final indemnity language shall be reviewed by legal counsel."
    // Deleted: a clause that advertises its own provisional status is a poor thing to
    // ask a gym to sign and a poor thing to enforce. The internal note about counsel
    // review lives on the cover marker instead, where the gym never reads it.
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
          text: "MuscleBoxPro shall be responsible for losses arising from its own negligence, willful misconduct or material breach, subject to applicable law. Without limiting that responsibility, MuscleBoxPro shall indemnify the Gym against third-party claims arising from the composition, quality or safety of the food dispensed by the Machine, except to the extent the claim arises from an act or omission of the Gym in breach of this Agreement.",
        },
      ],
    },

    // ── 34 ───────────────────────────────────────────────────────────────────
    // Self-contained, and deliberately uncapped in both directions. 2.1 left the cap
    // "to be determined by legal counsel" inside the operative clause, which meant §34
    // had no cap and a sentence promising one.
    {
      number: "34",
      heading: "Limitation of Liability",
      blocks: [
        {
          kind: "clause",
          number: "34.1",
          text: "To the maximum extent permitted by applicable law, neither Party shall be liable to the other for indirect, incidental, special or consequential losses, or for loss of anticipated profit, loss of business opportunity or loss of goodwill, arising out of or in connection with this Agreement.",
        },
        {
          kind: "clause",
          number: "34.2",
          text: "No monetary cap applies to either Party's liability for direct loss under this Agreement. Each Party's liability for direct loss is as provided by applicable law and by the other provisions of this Agreement, including the security deposit provisions in Section 5 and the indemnities in Section 33.",
        },
        {
          kind: "clause",
          number: "34.3",
          text: "For the avoidance of doubt, amounts payable to the Gym under Sections 6 to 10 are a direct contractual entitlement and are not excluded or limited by 34.1.",
        },
        {
          kind: "clause",
          number: "34.4",
          text: "Nothing in this Section shall exclude or limit any liability that cannot lawfully be excluded or limited, including liability arising from fraud, willful misconduct, or death or personal injury caused by negligence.",
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
    // 2.1's 36.2 pointed at a Schedule B row reading "[TO BE AGREED]", so the exit
    // price was undefined while 36.1 granted the right to exit. Settled at Nil: the
    // gym's exit price is the notice, not a payment. Where the notice is not given,
    // 37.6's actual-cost recovery applies, so the obligation still has a consequence
    // without needing a liquidated figure nobody chose.
    {
      number: "36",
      heading: "Termination by Gym",
      blocks: [
        {
          kind: "clause",
          number: "36.1",
          text: "The Gym may terminate this Agreement early for convenience by giving MuscleBoxPro 30 days' written notice.",
        },
        {
          kind: "clause",
          number: "36.2",
          text: "No early-termination charge is payable by the Gym where it gives the notice required by 36.1, whether or not the {{termMonths}}-month term has expired. Schedule B records that charge as Nil. Where the Gym requires the Machine to be removed without giving that notice, MuscleBoxPro may recover its reasonable transportation and retrieval costs under 37.6 in addition to any amounts otherwise outstanding.",
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
          text: "Where termination or recovery is attributable to the Gym's breach, or where the Gym requires removal of the Machine without the notice required by 36.1, MuscleBoxPro may recover reasonable transportation and retrieval costs.",
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
    // Address and email only. 2.1 carried a "Phone:" row for both parties; we do not
    // staff a number for notices, and a channel a party cannot actually reach is worse
    // than one the clause never offered, because a notice attempted down it and missed
    // is still arguably served. The gym's number stays in the document as an
    // operational contact and is expressly not a notice channel.
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
          ],
        },
        {
          kind: "paragraph",
          text: "Formal notices under this Agreement shall be given by email to the address above, or in writing delivered by hand or by registered post to the postal address above, and shall take effect on delivery. Telephone contact is not a channel for formal notice. The Gym's operational contact number is {{gymNotices.phone}}, which MuscleBoxPro may use for day-to-day service and replenishment matters.",
        },
        {
          kind: "todo",
          id: "s41-mbp-address-incomplete",
          severity: "needs-review",
          problem:
            "MuscleBoxPro's notice address has the sector and PIN but no building or street line. Post addressed to it will plausibly arrive and email is the primary channel, so this does not stop a send — but it is not the registered office as it reads on the LLP incorporation certificate.",
          resolution:
            "Replace MBP_NOTICES.address in shared/onboarding/agreementFields.ts with the registered office exactly as stated on the LLP incorporation certificate, before the first agreement is executed. No agreement content changes, so this does not need a new version.",
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
    // 2.1 referred disputes to "the mechanism agreed by the Parties" — a mechanism it
    // never specified — and deferred seat, venue and jurisdiction to counsel, so there
    // was no forum at all. Settled as courts rather than arbitration: for a deal of
    // this size, arbitration machinery costs more than the amounts in dispute, and an
    // arbitration clause with no institution, seat or appointment procedure is worse
    // than none. Gautam Buddha Nagar is where MuscleBoxPro is based.
    {
      number: "46",
      heading: "Governing Law and Dispute Resolution",
      blocks: [
        {
          kind: "clause",
          number: "46.1",
          text: "This Agreement shall be governed by and construed in accordance with the laws of India.",
        },
        {
          kind: "clause",
          number: "46.2",
          text: "The Parties shall first attempt to resolve any dispute amicably between their authorised representatives. Either Party may escalate a dispute by written notice to the other.",
        },
        {
          kind: "clause",
          number: "46.3",
          text: "If a dispute is not resolved within 30 days of that written escalation, it shall be subject to the exclusive jurisdiction of the competent courts at Gautam Buddha Nagar, Uttar Pradesh.",
        },
        {
          kind: "clause",
          number: "46.4",
          text: "The Parties have not agreed to refer disputes to arbitration, and no arbitration provision applies to this Agreement.",
        },
      ],
    },

    // ── 47 ───────────────────────────────────────────────────────────────────
    // 2.2 gave each party five blank rules — Name, Designation, Signature, Date, Seal —
    // on a document that is executed by clicking a button in a browser. Ten rules nobody
    // can write on, above a paragraph asserting the Parties had already signed.
    //
    // 47.1 to 47.3 say how execution actually works, and the party blocks state what is
    // known rather than asking for it. MuscleBoxPro's block carries no personal name by
    // decision: the individual who issued a given agreement is on our own record, and a
    // name printed into the hashed text is a second copy of that fact, free to be wrong.
    {
      number: "47",
      heading: "Execution",
      blocks: [
        {
          kind: "clause",
          number: "47.1",
          text: "This Agreement is executed electronically and is binding on both Parties without a handwritten signature or seal. MuscleBoxPro executes it by issuing it to the Gym through the MuscleBoxPro onboarding process. The Gym executes it by its authorised signatory named below confirming, in that process, that the Gym has read and agrees to this Agreement and that the signatory is authorised to bind the Gym.",
        },
        {
          kind: "clause",
          number: "47.2",
          text: "At the moment of the Gym's confirmation MuscleBoxPro records the SHA-256 fingerprint of the text of this Agreement as executed, together with the date and time of that confirmation, and provides both to the Gym with its copy. That record is the Parties' evidence of what was executed and when, and either Party may rely on it.",
        },
        {
          kind: "clause",
          number: "47.3",
          text: "Schedule A and Schedule H are completed and signed separately, at installation and on return of the Machine respectively, by a representative of each Party. Neither is completed at the time this Agreement is executed, and neither affects the fingerprint recorded under clause 47.2.",
        },
        {
          kind: "signatures",
          parties: [
            {
              heading: "FOR BLEND BOX INNOVATIONS LLP / MUSCLEBOXPRO",
              lines: [
                "BlendBox Innovations LLP, by its authorised signatory.",
                "Executed electronically on issue of this Agreement.",
              ],
            },
            {
              heading: "FOR {{gymLegalName}}",
              lines: [
                "Name: {{signatoryName}}",
                "Designation: {{signatoryDesignation}}",
                "Executed electronically on confirmation under clause 47.1.",
              ],
            },
          ],
        },
      ],
    },
  ],

  // ── Schedules ──────────────────────────────────────────────────────────────
  schedules: [
    // Described rather than printed. 2.2 rendered the certificate itself — a table with
    // two "[to be completed at installation]" cells, ten empty checkboxes and three
    // signature rules — inside a document signed weeks before installation day.
    {
      number: "Schedule A",
      heading: "Machine Details & Installation Certificate",
      blocks: [
        {
          kind: "paragraph",
          text: "The Installation Certificate is the certificate required by clause 17.2. It is completed on the day the Machine is installed, at the Gym's premises, and signed by a representative of each Party present. Once signed it forms part of this Agreement and is the record of which unit was installed and in what condition.",
        },
        {
          kind: "bullets",
          lead: "The Installation Certificate records:",
          items: [
            "the Machine ID, serial number, model and Machine Value of the unit installed;",
            "the installation date and the installation address;",
            "that the Machine and its accessories were received and their physical condition inspected;",
            "that the serial number on the unit was verified against this Agreement;",
            "that power, touchscreen, payment system and dispensing were tested and working;",
            "that the Gym accepted the location the Machine was placed in;",
            "photographs of the Machine at handover, as provided in clause 17.4; and",
            "the name, designation and signature of the representative of each Party present.",
          ],
        },
        {
          kind: "paragraph",
          text: "Nothing in this Schedule is completed at the time this Agreement is executed. The particulars above are not known until the unit is allocated and installed, and clause 47.3 applies to them.",
        },
        {
          kind: "todo",
          id: "schedule-a-second-signing",
          severity: "needs-review",
          problem:
            "The Installation Certificate is signed at installation, days or weeks after the agreement itself, by whoever is physically present. The onboarding flow captures one signature, and step 6 shows the gym the installation record read-only rather than collecting a second one.",
          resolution:
            "Treat the Installation Certificate as a separate signing event against the same agreement record — see docs/gym-onboarding.md §6. Do not fold it into step 3. Step 6 is where it surfaces to the gym when it exists.",
        },
      ],
    },

    {
      number: "Schedule B",
      heading: "Commercial Terms",
      blocks: [
        // 2.1 had "Initial Profit Share" followed by three rows with an empty label
        // column, so which ratio attached to which band was left to the reader, and the
        // second milestone test was absent. Explicit rows now, and the same milestone
        // wording as §6.1.
        {
          kind: "table",
          header: ["Commercial Item", "Agreed Term"],
          rows: [
            ["Machine Ownership", "MuscleBoxPro"],
            ["Security Deposit", "{{securityDeposit}}"],
            ["Agreement Term", "{{termMonths}} months"],
            ["Profit Share, before the Milestone", "80% MuscleBoxPro / 20% Gym"],
            ["Profit Share, after the Milestone", "50% MuscleBoxPro / 50% Gym"],
            [
              "Milestone (clause 6.1)",
              "Earlier of 15,000 completed paid cups or ₹5,00,000 cumulative Net Profit as defined in Section 7",
            ],
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
            [
              "Early Termination Charges",
              "Nil, where the Gym gives the 30 days' written notice in clause 36.1",
            ],
            ["FSSAI Food Business Operator", "MuscleBoxPro"],
            ["Governing Law and Forum", "India; courts at Gautam Buddha Nagar, Uttar Pradesh"],
          ],
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
          // 2.1's step 4 stated a cup-only trigger, which §43 made part of the entire
          // agreement and therefore a conflict on the face of the document.
          kind: "paragraph",
          text: "Step 4 - Profit Sharing: 80% MuscleBoxPro / 20% Gym until the Milestone in clause 6.1 is reached, being the earlier of 15,000 completed paid cups or ₹5,00,000 cumulative Net Profit; and 50% MuscleBoxPro / 50% Gym thereafter, applied as provided in clause 6.3.",
        },
        {
          kind: "paragraph",
          text: "Worked example. A month in which the Machine sells 400 cups at ₹120 with ₹55 of direct variable cost per cup produces gross sales of ₹48,000, direct variable costs of ₹22,000 and Net Profit of ₹26,000. Before the Milestone the Gym's share is ₹5,200; after it, ₹13,000. Where the Milestone falls inside the month, clause 6.3.3 applies and the statement shows both ratios.",
        },
        { kind: "paragraph", text: "Advertising: 80% MuscleBoxPro / 20% Gym." },
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
          text: "MuscleBoxPro is the Food Business Operator in respect of the food dispensed by the Machine and holds the FSSAI registration or licence applicable to that activity, as provided in clause 24.6. Each Party shall maintain the registrations and licences applicable to its own legal responsibilities.",
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

    // Described rather than printed, for the same reason as Schedule A — and this one is
    // further away still: the return of the Machine is at least the end of a 24-month
    // term. 2.2 asked a gym to read eight `__________` cells about a refund calculation
    // that cannot be performed for two years.
    {
      number: "Schedule H",
      heading: "Machine Return Certificate",
      blocks: [
        {
          kind: "paragraph",
          text: "The Return Certificate is completed when the Machine is returned to MuscleBoxPro on expiry or earlier termination of this Agreement, following the inspection in clause 37.2, and is signed by a representative of each Party present.",
        },
        {
          kind: "bullets",
          lead: "The Return Certificate records:",
          items: [
            "the Machine ID, serial number and the date the Machine was returned;",
            "the condition of the Machine, as one or more of normal wear and tear, no material damage, physical damage, missing components, repair required and cleaning required;",
            "the details of any damage, and the actual reasonable repair or replacement cost of it;",
            "any amount adjusted against the security deposit under clauses 5.4 to 5.7, and the reason for it;",
            "the balance of the security deposit refundable to the Gym, which clause 5.8 requires MuscleBoxPro to settle within 30 days; and",
            "the name, designation and signature of the representative of each Party present.",
          ],
        },
        {
          kind: "paragraph",
          text: "A copy of the completed Return Certificate shall be given to the Gym. Nothing in this Schedule is completed at the time this Agreement is executed, and clause 47.3 applies to it.",
        },
      ],
    },
  ],
};

/**
 * What changed from 2.2, keyed by where.
 *
 * Keyed by location rather than by `todo` marker id, because 2.3 closes no marker: 2.2 did
 * not think its blank forms were a defect, so there was nothing in the tree flagging them.
 * The list was exhaustive when it was written — every difference in the hashed text between
 * 2.2 and 2.3 is one of these four entries — and it stays as the record of why this document
 * reads the way it does, now that 2.2 itself is no longer in the repository (§22).
 */
export const AGREEMENT_V2_3_CHANGES: Readonly<Record<string, string>> = {
  "s2-machine-identifiers":
    "The Machine ID, Serial Number and Installation Date rows are out of the §2 table, which now lists only particulars known at execution. A paragraph points at the Installation Certificate under §17 for the three that are not.",
  "s47-execution":
    '§47 is headed "Execution" rather than "Signatures" and states how the Agreement is executed: electronically, by the gym\'s authorised signatory confirming in the onboarding flow (47.1), evidenced by the recorded SHA-256 fingerprint and timestamp (47.2), with Schedules A and H signed separately (47.3). The ten blank rules are gone; the gym\'s block prints {{signatoryName}} and {{signatoryDesignation}}, and MuscleBoxPro\'s names the LLP and its authorised signatory without a personal name.',
  "schedule-a-described-not-printed":
    "Schedule A describes what the Installation Certificate records and when it is signed, in place of the printed certificate — the two placeholder cells, the ten-item checklist and the three signature rules are gone. The `schedule-a-second-signing` marker stays, and now says step 6 is where the record surfaces.",
  "schedule-h-described-not-printed":
    "Schedule H describes what the Return Certificate records, in place of eight `__________` cells and three signature rules, and cites §§5.4-5.8 and 37.2 for the deposit adjustment and the inspection it follows.",
} as const;
