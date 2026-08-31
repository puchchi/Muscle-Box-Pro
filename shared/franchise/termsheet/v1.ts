/**
 * MuscleBox Pro Franchise Term Sheet, version 1.0.
 *
 * ── What this document is, and what it is not ────────────────────────────────
 * It is not the definitive franchise agreement. `docs/MuscleBox_Pro_Franchise_Program.md`
 * says of itself (§56) that it does not constitute a franchise agreement, and it defers
 * roughly a dozen substantive terms to one: the contractual term, governing law for the
 * franchise itself, the performance SLAs, the deployment deadlines, transfer, exit,
 * termination, renewal, and the treatment of death and insolvency. A renderer cannot fill
 * those in, and a document that quietly omitted them while calling itself an agreement
 * would be worse than one that says what it is.
 *
 * So this binds the commercial terms the program document actually fixes, states in its own
 * first person that the definitive agreement follows and prevails, and lists the deferred
 * terms in §17 rather than leaving a reader to notice they are missing. The definitive
 * agreement is a second signing event on the same machinery (docs/franchise-onboarding.md
 * §5).
 *
 * ── Rules, the same three the gym agreement runs under ───────────────────────
 *   - FROZEN the moment one franchisee signs against it. Any content change means v2.ts,
 *     not an edit here. `goldenVector.ts` pins the exact bytes and will fail if this file
 *     moves by a character.
 *   - Rupee amounts, dates, the territory and the parties are tokenised, never literal.
 *     The one exception is the franchise-level cost list in §10, which is the program
 *     document's own list and is not per-franchise.
 *   - Where something is unresolved, emit a `todo` rather than inventing or omitting a
 *     clause. Two markers are live below and one of them is `blocks-send`.
 *
 * ── Why the deferred terms are not `todo` markers ────────────────────────────
 * Because they are not holes in *this* document. A term sheet that carries the commercials
 * and defers the rest is complete as a term sheet, and §17 is where it says so. The thing
 * that stops an *incomplete* term sheet being issued is a different mechanism: a missing
 * field is an unresolved token and `canIssue()` refuses on one. A City franchise whose
 * payment schedule and recovery threshold have not been set by an admin (§6, §21 of the
 * program document defer both) therefore cannot reach a signature, without any marker.
 *
 * Section references in comments are to docs/MuscleBox_Pro_Franchise_Program.md.
 */

import type { Agreement } from "../../agreement/types";

export const FRANCHISE_TERM_SHEET_V1: Agreement = {
  version: "1.0",
  title: "Franchise Term Sheet",
  subtitle: "MUSCLEBOX PRO",
  runningFooter: "MuscleBox Pro - Franchise Term Sheet - Version 1.0",

  cover: [
    { kind: "paragraph", text: "FRANCHISE TERM SHEET" },
    {
      kind: "paragraph",
      text: "This Term Sheet records the commercial terms on which MuscleBox Pro and the Franchisee named below have agreed to establish a MuscleBox Pro franchise, and is signed in advance of the Definitive Franchise Agreement.",
    },
    {
      kind: "table",
      header: ["Particular", "Details"],
      rows: [
        ["MuscleBox Pro", "BlendBox Innovations LLP"],
        ["Franchisee", "{{franchiseeLegalName}}"],
        ["Constitution", "{{franchiseeEntityType}}"],
        ["PAN", "{{franchiseePan}}"],
        ["Franchise", "{{tierName}}"],
        ["Territory", "{{territory}}"],
        ["Machine Allocation", "{{machineAllocation}}"],
        ["Total Investment", "{{investment}}"],
        ["Effective Date", "{{effectiveDate}}"],
        ["Valid Until", "{{validUntil}}"],
      ],
    },
    // The counterpart of v2.3's cover marker, and it says less than that one has to: the
    // commercial substance here is the program document's, which is settled. What is
    // unreviewed is the drafting, the binding-as-to-commercials language in §2, and the
    // stamp position, which for a term sheet turns on the state and on how binding its
    // language is (docs/franchise-onboarding.md §6.6).
    {
      kind: "todo",
      id: "termsheet-v1-not-reviewed-by-counsel",
      severity: "needs-review",
      problem:
        "No Indian legal counsel has read this Term Sheet. Three parts carry the risk: §2, which asserts that the commercial terms bind while the rest is subject to the Definitive Franchise Agreement; §19, which carries over the governing law and forum settled in-house for the gym agreement v2.3; and the stamp position, since this instrument is issued unstamped and an unstamped instrument can be inadmissible in evidence until stamped with penalty.",
      resolution:
        "Have counsel review §2, §5, §18 and §19 and confirm the stamp position for the state of execution. Then either delete this marker or issue v2.ts with their wording. This is a needs-review marker and so does not block issuing: proceeding is a knowing decision to carry the risk, not an oversight.",
    },
    // The one hole that the money makes unavoidable. Drafted text exists in §5.6 so the
    // document is readable and reviewable, and this marker is `blocks-send` anyway: the
    // Franchisee pays ₹12,50,000 under this Term Sheet, and what happens to that money if
    // the Definitive Franchise Agreement is never executed is a commercial decision nobody
    // has signed off. Deleting this marker is the sign-off, and it is one line.
    {
      kind: "todo",
      id: "termsheet-v1-first-instalment-if-no-definitive-agreement",
      severity: "blocks-send",
      problem:
        "§5.6 states what happens to amounts paid under this Term Sheet if the Definitive Franchise Agreement is never executed: applied against the total investment, non-refundable on the Franchisee's default or on failure of due diligence, refundable without interest less committed OEM procurement cost where MuscleBox Pro does not proceed for any other reason. The program document nowhere addresses this and the wording was drafted in-house against a ₹12,50,000 first instalment. It has not been approved commercially or legally.",
      resolution:
        "Have the refund position decided commercially and reviewed by counsel. If §5.6 is right as drafted, delete this marker. If it is not, issue v2.ts with the agreed wording. Until then no Term Sheet can be issued, which is the intended behaviour.",
    },
  ],

  sections: [
    {
      number: "1",
      heading: "Parties and Purpose",
      blocks: [
        {
          kind: "clause",
          number: "1.1",
          text: "MuscleBox Pro is the brand under which BlendBox Innovations LLP operates automated protein shake vending machines and the technology, supply and payment ecosystem around them.",
        },
        {
          kind: "clause",
          number: "1.2",
          text: "The Franchisee is {{franchiseeLegalName}}, a {{franchiseeEntityType}} holding PAN {{franchiseePan}}, with its registered address at {{registeredAddress}}.",
        },
        {
          kind: "clause",
          number: "1.3",
          text: "MuscleBox Pro will appoint the Franchisee to develop and operate the MuscleBox Pro network in the Territory described in Schedule 1, on the terms recorded in this Term Sheet.",
        },
        {
          kind: "clause",
          number: "1.4",
          text: "The MuscleBox Pro franchise is not a machine resale programme. It is a long term operating partnership in which MuscleBox Pro retains ownership and control of the machines, the technology, the brand and the central ecosystem, and the Franchisee develops and operates the local network.",
        },
      ],
    },

    // The section the whole document turns on. §56 of the program document already says
    // the definitive agreement prevails; 2.1 to 2.5 say it in the first person, and 2.4
    // gives the Term Sheet an expiry because a binding offer with none is an offer forever.
    {
      number: "2",
      heading: "Status of this Term Sheet",
      blocks: [
        {
          kind: "clause",
          number: "2.1",
          text: "This Term Sheet is binding on both Parties as to the commercial terms it states.",
        },
        {
          kind: "clause",
          number: "2.2",
          text: "It is subject to the execution of a Definitive Franchise Agreement between the Parties, which will carry the full contractual terms of the franchise. Clause 17 lists what that agreement will settle.",
        },
        {
          kind: "clause",
          number: "2.3",
          text: "In the event of any conflict or inconsistency between this Term Sheet and the Definitive Franchise Agreement, the Definitive Franchise Agreement will prevail.",
        },
        {
          kind: "clause",
          number: "2.4",
          text: "This Term Sheet lapses if the Definitive Franchise Agreement has not been executed by {{validUntil}}, unless the Parties extend it in writing. On lapse, neither Party is obliged to proceed, and clause 5.6 governs any amount already paid.",
        },
        {
          kind: "clause",
          number: "2.5",
          text: "This Term Sheet is not a guarantee of returns, of profitability or of business performance. Actual results depend on machine utilisation, gym locations, customer demand, pricing, operating costs, local market conditions, advertising demand, product and logistics costs, and the Franchisee's own performance.",
        },
        {
          kind: "clause",
          number: "2.6",
          text: "The Franchisee confirms that it has been advised to obtain independent legal, tax and financial advice before signing, and has had the opportunity to do so.",
        },
      ],
    },

    {
      number: "3",
      heading: "The Franchise",
      blocks: [
        {
          kind: "table",
          header: ["Particular", "Details"],
          rows: [
            ["Franchise", "{{tierName}}"],
            ["Total Investment", "{{investment}}"],
            ["Machine Allocation", "{{machineAllocation}} machines"],
            ["Capital Recovery Threshold", "{{capitalRecoveryThreshold}}"],
          ],
        },
        {
          kind: "clause",
          number: "3.1",
          text: "The investment stated above entitles the Franchisee to the rights recorded in this Term Sheet in respect of the machine allocation stated above. It does not purchase the machines. Clause 6 governs their ownership.",
        },
        {
          kind: "clause",
          number: "3.2",
          text: "MuscleBox Pro will provide, as part of the franchise: access to the MuscleBox Pro technology platform, machine monitoring and management, centralised payment infrastructure, the protein supply pipeline, machine delivery to the agreed location, protein delivery to the Franchisee's warehouse, OEM coordination, technical support, software updates, gym leads generated by MuscleBox Pro, advertising participation, and the franchise financial dashboard.",
        },
      ],
    },

    // §4 and Schedule 1 are the same fact in two places by design: the schedule is the
    // record exclusivity attaches to, and 4.1 is the clause that points at it. §5 of the
    // program document is the reserved-accounts carve out and it belongs next to the grant,
    // not in a schedule a reader reaches last.
    {
      number: "4",
      heading: "Territory and Exclusivity",
      blocks: [
        {
          kind: "clause",
          number: "4.1",
          text: "The Territory is as described in Schedule 1. That description is the record of what has been granted, and it prevails over any map, drawing or summary of it.",
        },
        {
          kind: "clause",
          number: "4.2",
          text: "Within the Territory, and subject to clauses 4.3, 4.4 and 15, the Franchisee has the exclusive right to develop MuscleBox Pro gym locations.",
        },
        {
          kind: "clause",
          number: "4.3",
          text: "Exclusivity does not extend to reserved accounts. MuscleBox Pro may reserve national gym chains, strategic corporate partnerships, national and large institutional accounts, national advertising partnerships, partnerships it negotiates directly, and other accounts it designates as reserved. Reserved accounts are handled by MuscleBox Pro directly or under a separately agreed arrangement.",
        },
        {
          kind: "clause",
          number: "4.4",
          text: "Exclusivity and continued franchise rights are conditional on the minimum performance requirements in clause 15.",
        },
        {
          kind: "clause",
          number: "4.5",
          text: "Every gym location must be approved by MuscleBox Pro before a machine is deployed to it. MuscleBox Pro may provide gym leads, existing network opportunities and the standard gym commercial framework; the Franchisee may identify, approach and recommend gyms within the Territory and recommend replacements.",
        },
      ],
    },

    {
      number: "5",
      heading: "Investment and Payment Schedule",
      blocks: [
        {
          kind: "clause",
          number: "5.1",
          text: "The total franchise investment is {{investment}} ({{investmentInWords}}), payable in the instalments below.",
        },
        {
          kind: "table",
          header: ["Instalment", "Amount", "When it falls due"],
          rows: [
            ["First", "{{firstInstalment}}", "{{firstInstalmentTrigger}}"],
            ["Second", "{{secondInstalment}}", "{{secondInstalmentTrigger}}"],
          ],
        },
        {
          kind: "clause",
          number: "5.2",
          text: "Each instalment is paid by bank transfer to the MuscleBox Pro account notified to the Franchisee, quoting the payment reference MuscleBox Pro provides. Payment is treated as made when it is credited to that account.",
        },
        {
          kind: "clause",
          number: "5.3",
          text: "The second instalment falls due on the trigger stated above and is not conditional on the deployment of any machine.",
        },
        {
          kind: "clause",
          number: "5.4",
          text: "MuscleBox Pro will place the OEM order for the Franchisee's machine allocation after the first instalment is received, and will give the Franchisee visibility of order information, machine specifications, manufacturing status, dispatch status and the relevant procurement documentation. Providing that information does not transfer ownership of any machine.",
        },
        {
          kind: "clause",
          number: "5.5",
          text: "Taxes applicable to the investment are payable in addition, at the rate in force when each instalment falls due.",
        },
        // Drafted in-house. The `blocks-send` marker on the cover is what stops this
        // reaching a signature before it is approved, and it names this clause.
        {
          kind: "clause",
          number: "5.6",
          text: "If the Definitive Franchise Agreement is not executed, amounts already paid are dealt with as follows. Where MuscleBox Pro does not proceed for any reason other than the Franchisee's default or the failure of due diligence, the amount paid is refunded without interest, less any cost MuscleBox Pro has already committed to OEM procurement for the Franchisee's allocation, which is evidenced to the Franchisee. Where the Franchisee does not proceed, or where due diligence fails, the amount paid is not refundable. In every other case the amount paid is applied against the total investment under the Definitive Franchise Agreement.",
        },
      ],
    },

    // §8 of the program document, and the single most important thing in this document for
    // a franchisee to have read before paying: the investment buys an operating right, not
    // five machines. The may and may-not lists are kept apart for the reason
    // `MACHINE_RIGHTS` in shared/franchise/program.ts keeps them apart.
    {
      number: "6",
      heading: "Machine Ownership",
      blocks: [
        {
          kind: "clause",
          number: "6.1",
          text: "All MuscleBox Pro machines remain the exclusive property of MuscleBox Pro. This Term Sheet does not sell, transfer or assign any machine to the Franchisee.",
        },
        {
          kind: "clause",
          number: "6.2",
          text: "The Franchisee receives the contractual right to operate the machines allocated to it within the MuscleBox Pro ecosystem and the Territory.",
        },
        {
          kind: "bullets",
          lead: "The Franchisee may:",
          items: [
            "Operate assigned machines at approved gym locations",
            "Move machines between approved locations",
            "Replace an underperforming gym, subject to MuscleBox Pro's approval of the replacement",
            "Coordinate local machine deployment",
          ],
        },
        {
          kind: "bullets",
          lead: "The Franchisee may not:",
          items: [
            "Sell a machine or transfer machine ownership",
            "Independently commercialise a machine",
            "Use a machine outside the MuscleBox Pro ecosystem",
            "Modify or reverse engineer the machine",
            "Remove or alter MuscleBox Pro technology or branding",
            "Use a machine for a competing business",
          ],
        },
        {
          kind: "clause",
          number: "6.3",
          text: "On expiry or termination of the franchise, all machines remain the property of MuscleBox Pro.",
        },
      ],
    },

    // §17, §18 and §19 of the program document, in one section because the separation
    // between them is the term most often misread: advertising income never reduces the
    // recovery balance. The callout says it rather than a clause, so it survives skimming.
    {
      number: "7",
      heading: "Capital Recovery",
      blocks: [
        {
          kind: "clause",
          number: "7.1",
          text: "Until the Franchisee has received cumulative eligible protein business distributable profit of {{capitalRecoveryThreshold}}, {{proteinShareDuringRecovery}} of that profit is allocated to the Franchisee.",
        },
        {
          kind: "clause",
          number: "7.2",
          text: "That allocation is a capital recovery mechanism and not a permanent profit share. It continues until the threshold in clause 7.1 is reached and then stops.",
        },
        {
          kind: "callout",
          lines: [
            "Advertising income does not count toward capital recovery.",
            "Advertising is shared {{advertisingShareFranchisee}} to the Franchisee and {{advertisingShareMbp}} to MuscleBox Pro, before and after recovery alike, and no part of it reduces the remaining recovery amount.",
          ],
        },
        {
          kind: "clause",
          number: "7.3",
          text: "Where a distribution of eligible protein business profit would take the cumulative total past the threshold, the part that completes recovery is paid to the Franchisee in full and the remainder is shared under clause 8.",
        },
        {
          kind: "clause",
          number: "7.4",
          text: "Capital recovery progress and the remaining amount are shown on the franchise dashboard.",
        },
      ],
    },

    {
      number: "8",
      heading: "Profit Share After Capital Recovery",
      blocks: [
        {
          kind: "clause",
          number: "8.1",
          text: "Once the threshold in clause 7.1 is reached, eligible protein business distributable profit is shared {{proteinShareAfterRecoveryFranchisee}} to the Franchisee and {{proteinShareAfterRecoveryMbp}} to MuscleBox Pro.",
        },
        {
          kind: "clause",
          number: "8.2",
          text: "Advertising continues to be shared {{advertisingShareFranchisee}} to the Franchisee and {{advertisingShareMbp}} to MuscleBox Pro, subject to the applicable advertising terms.",
        },
        {
          kind: "clause",
          number: "8.3",
          text: "The Franchisee therefore continues to participate in the economics of the network after recovering the investment.",
        },
      ],
    },

    {
      number: "9",
      heading: "Advertising",
      blocks: [
        {
          kind: "clause",
          number: "9.1",
          text: "MuscleBox Pro operates the advertising network across the machine estate and may place advertising on machines in the Territory.",
        },
        {
          kind: "clause",
          number: "9.2",
          text: "Advertising profit is calculated after the applicable advertising related costs and expenses, and is then shared {{advertisingShareFranchisee}} to the Franchisee and {{advertisingShareMbp}} to MuscleBox Pro.",
        },
        {
          kind: "clause",
          number: "9.3",
          text: "This participation is permanent for as long as the franchise subsists, and is separate from capital recovery in the manner stated in clause 7.",
        },
      ],
    },

    // §15 and §16. The cost list is the program document's own and is not per-franchise,
    // so it is literal rather than tokenised. It is here because the difference between the
    // gym-level and franchise-level calculations is what makes the profit figure honest,
    // and a franchisee who has not seen the list will read "profit" as revenue.
    {
      number: "10",
      heading: "How Franchise Profit is Calculated",
      blocks: [
        {
          kind: "clause",
          number: "10.1",
          text: "The Franchisee participates in the profit generated by the MuscleBox Pro machines allocated to its franchise. The franchise level calculation is not the same as the calculation used for an individual gym partnership.",
        },
        {
          kind: "bullets",
          lead: "Franchise distributable profit is calculated after the costs of operating the local network, which may include:",
          items: [
            "Protein cost",
            "Cup and consumable cost",
            "Transportation",
            "Warehousing",
            "Loading and unloading",
            "Machine movement",
            "Payment processing charges",
            "Direct operational expenses",
            "Product wastage or spoilage",
            "Other directly attributable operating costs",
          ],
        },
        {
          kind: "clause",
          number: "10.2",
          text: "The gym's own share is calculated separately, after protein and consumable cost, under the gym agreement applicable to that location.",
        },
        {
          kind: "clause",
          number: "10.3",
          text: "MuscleBox Pro may apply different gym commercial arrangements at different locations, and determines which applies. The Franchisee cannot commit MuscleBox Pro to a different gym profit sharing structure.",
        },
      ],
    },

    {
      number: "11",
      heading: "Payment Collection, Dashboard and Records",
      blocks: [
        {
          kind: "clause",
          number: "11.1",
          text: "All customer and machine related payments are processed through the MuscleBox Pro controlled payment and accounting infrastructure. The Franchisee may not circumvent it.",
        },
        {
          kind: "clause",
          number: "11.2",
          text: "MuscleBox Pro calculates and pays the Franchisee's share from that infrastructure, and maintains the records relating to the Franchisee's machines and the associated revenue.",
        },
        {
          kind: "bullets",
          lead: "The Franchisee receives dashboard access showing, for its own franchise:",
          items: [
            "Machine wise sales and shake volume",
            "Gross revenue",
            "Protein and cup consumption",
            "Gym share",
            "Transportation, warehouse and other applicable operating costs",
            "Advertising income",
            "Franchise distributable profit and payouts",
            "Capital recovery progress and the remaining amount",
            "Machine status and operational alerts",
          ],
        },
        {
          kind: "clause",
          number: "11.3",
          text: "The Franchisee's audit and information review rights in respect of its machines and franchise revenue, and the procedure for exercising them, will be specified in the Definitive Franchise Agreement.",
        },
      ],
    },

    {
      number: "12",
      heading: "Protein Supply and the Warehouse",
      blocks: [
        {
          kind: "clause",
          number: "12.1",
          text: "MuscleBox Pro maintains the central protein supply pipeline and delivers approved protein products to the Franchisee's designated warehouse, which is the address recorded in Schedule 2.",
        },
        {
          kind: "clause",
          number: "12.2",
          text: "After delivery to that warehouse, storage conditions, inventory management, local movement and stock control are the Franchisee's responsibility.",
        },
        {
          kind: "clause",
          number: "12.3",
          text: "Only MuscleBox Pro approved protein products and formulations may be used with MuscleBox Pro machines, unless MuscleBox Pro authorises otherwise in writing.",
        },
        {
          kind: "clause",
          number: "12.4",
          text: "MuscleBox Pro coordinates delivery of machines to the agreed delivery location. Local transportation and movement of machines after that delivery are the Franchisee's responsibility unless otherwise agreed.",
        },
      ],
    },

    {
      number: "13",
      heading: "Product and Pricing Control",
      blocks: [
        {
          kind: "clause",
          number: "13.1",
          text: "MuscleBox Pro controls the shake formulations, protein specifications, approved ingredients, product configuration, consumer pricing, promotional pricing, product changes and brand presentation.",
        },
        {
          kind: "clause",
          number: "13.2",
          text: "The Franchisee may not modify the MuscleBox Pro product or pricing structure without MuscleBox Pro's written authorisation.",
        },
      ],
    },

    // §27 and §28. 14.4 is the clause that exists because the model fails quietly without
    // it: a franchisee who hands refilling to gym staff has moved the obligation to someone
    // with no contract with us and no stake in machine uptime.
    {
      number: "14",
      heading: "Local Operations and the Franchisee's Operational Responsibilities",
      blocks: [
        {
          kind: "clause",
          number: "14.1",
          text: "MuscleBox Pro provides the central technology, the supply chain and the technical ecosystem. It does not provide local operational or logistics management on the Franchisee's behalf.",
        },
        {
          kind: "clause",
          number: "14.2",
          text: "The Franchisee is responsible for the day to day operation and upkeep of every machine allocated to its franchise, and must keep those machines operational, adequately stocked and available to customers during each gym's agreed operating hours.",
        },
        {
          kind: "bullets",
          lead: "The Franchisee is specifically responsible for:",
          items: [
            "Regularly checking the operational status of each machine",
            "Monitoring protein and consumable inventory and refilling before stock runs out",
            "Refilling cups and other approved consumables",
            "Moving protein and consumables from its warehouse to each machine location",
            "Maintaining appropriate storage conditions",
            "Monitoring expiry dates and preventing the use of expired product",
            "Keeping each machine and its operating area reasonably clean",
            "Responding to machine and inventory alerts raised on the MuscleBox Pro platform",
            "Reporting technical issues to MuscleBox Pro promptly",
            "Coordinating machine access with the gym",
            "Local transportation, warehousing, manpower, deployment and business development",
          ],
        },
        {
          kind: "clause",
          number: "14.3",
          text: "The operations contact for these responsibilities is the person named in Schedule 2. The Franchisee will tell MuscleBox Pro when that person changes.",
        },
        {
          kind: "clause",
          number: "14.4",
          text: "The Franchisee may not transfer or delegate responsibility for stocking, refilling, inventory or the day to day operation of a machine to a gym owner, gym employee or any third party without MuscleBox Pro's prior approval. A gym may provide reasonable access and cooperation, and the Franchisee remains responsible for the machine being stocked and operational. MuscleBox Pro may approve a different arrangement for a particular location, and such an approval does not extend to any other location.",
        },
        {
          kind: "clause",
          number: "14.5",
          text: "MuscleBox Pro provides technical support for the machines and the platform, including remote diagnostics, troubleshooting, software support and updates, OEM coordination and technical escalation, and coordinates warranty claims, repair and replacement with the OEM. The Franchisee must report machine issues through the designated support process.",
        },
      ],
    },

    {
      number: "15",
      heading: "Performance Requirements",
      blocks: [
        {
          kind: "clause",
          number: "15.1",
          text: "The Franchisee is expected to actively deploy its machine allocation of {{machineAllocation}} machines within the period the Definitive Franchise Agreement specifies.",
        },
        {
          kind: "bullets",
          lead: "Territorial exclusivity and continued franchise rights are subject to minimum performance requirements, which may include:",
          items: [
            "A minimum number of machines deployed",
            "Deployment deadlines",
            "Minimum active machine requirements",
            "Minimum territory development",
            "Timely replacement of non-performing locations",
            "Operational compliance with MuscleBox Pro standards",
          ],
        },
        {
          kind: "clause",
          number: "15.2",
          text: "Repeated failure to keep machines operational and adequately stocked may affect franchise performance status, territorial exclusivity, eligibility for additional machines and expansion opportunities.",
        },
        {
          kind: "clause",
          number: "15.3",
          text: "The specific requirements, the deployment deadlines and the service levels applicable to this franchise will be set out in the Definitive Franchise Agreement.",
        },
      ],
    },

    {
      number: "16",
      heading: "Confidentiality and Ecosystem Protection",
      blocks: [
        {
          kind: "clause",
          number: "16.1",
          text: "The Franchisee will keep confidential the information it receives relating to protein formulations, pricing, suppliers, OEMs, technology, software, business processes, gym economics, customer data, advertising arrangements, financial information and expansion strategy, and will use it only to operate the franchise.",
        },
        {
          kind: "bullets",
          lead: "The Franchisee will not:",
          items: [
            "Reverse engineer a MuscleBox Pro machine",
            "Copy MuscleBox Pro software",
            "Replicate proprietary recipes",
            "Circumvent MuscleBox Pro payment systems",
            "Use confidential supplier information for a competing business",
            "Recreate the MuscleBox Pro franchise model using confidential information",
            "Remove or alter proprietary technology",
            "Represent itself as the owner of MuscleBox Pro technology",
          ],
        },
        {
          kind: "clause",
          number: "16.2",
          text: "These obligations survive the lapse of this Term Sheet and the expiry or termination of the franchise.",
        },
      ],
    },

    // The honest counterpart to §2. A term sheet that defers a dozen terms should list
    // them, so the reader is not left to discover which ones by their absence. Every line
    // here is something the program document itself defers.
    {
      number: "17",
      heading: "What the Definitive Franchise Agreement Will Settle",
      blocks: [
        {
          kind: "bullets",
          lead: "The following are not settled by this Term Sheet and will be settled by the Definitive Franchise Agreement:",
          items: [
            "The contractual term of the franchise and the renewal provisions",
            "The deployment deadlines and the minimum performance requirements applicable to this franchise",
            "The service levels for technical support and warranty response",
            "The audit and information review procedure",
            "Franchise transfer, exit and termination, and their consequences",
            "The treatment of death, insolvency and change of ownership",
            "Governing law, jurisdiction and dispute resolution for the franchise",
            "The gym agreement structure for locations in the Territory",
            "Territory expansion, additional machines and priority expansion rights",
            "Insurance, indemnities and the limitation of liability",
          ],
        },
        {
          kind: "clause",
          number: "17.1",
          text: "Neither Party is obliged to agree to any particular term in the Definitive Franchise Agreement by reason of this Term Sheet, except the commercial terms this Term Sheet states.",
        },
      ],
    },

    {
      number: "18",
      heading: "Notices",
      blocks: [
        {
          kind: "clause",
          number: "18.1",
          text: "Notices under this Term Sheet are given in writing to the addresses below, and a notice sent by email to the address below is validly given.",
        },
        {
          kind: "table",
          header: ["Party", "Address", "Email", "Phone"],
          rows: [
            [
              "MuscleBox Pro",
              "{{mbpNotices.address}}",
              "{{mbpNotices.email}}",
              "{{mbpNotices.phone}}",
            ],
            [
              "{{franchiseeLegalName}}",
              "{{franchiseeNotices.address}}",
              "{{franchiseeNotices.email}}",
              "{{franchiseeNotices.phone}}",
            ],
          ],
        },
        {
          kind: "clause",
          number: "18.2",
          text: "Either Party may change its notice details by written notice to the other.",
        },
      ],
    },

    // Carried over from gym agreement v2.3 §46, including the reasoning recorded there:
    // for deals of this size arbitration machinery costs more than the amounts in dispute,
    // and an arbitration clause with no institution, seat or appointment procedure is worse
    // than none. This governs the Term Sheet only. The franchise's own forum is §17's.
    {
      number: "19",
      heading: "Governing Law and Disputes under this Term Sheet",
      blocks: [
        {
          kind: "clause",
          number: "19.1",
          text: "This Term Sheet is governed by and construed in accordance with the laws of India.",
        },
        {
          kind: "clause",
          number: "19.2",
          text: "The Parties will first attempt to resolve any dispute amicably between their authorised representatives. Either Party may escalate a dispute by written notice to the other.",
        },
        {
          kind: "clause",
          number: "19.3",
          text: "If a dispute under this Term Sheet is not resolved within 30 days of that written escalation, it is subject to the exclusive jurisdiction of the competent courts at Gautam Buddha Nagar, Uttar Pradesh.",
        },
        {
          kind: "clause",
          number: "19.4",
          text: "The Parties have not agreed to refer disputes under this Term Sheet to arbitration.",
        },
      ],
    },

    // The counterpart of v2.3 §47, and it differs in one way that matters: the gym signs by
    // confirming in our own flow, so our record is the whole evidence. The Franchisee signs
    // through an electronic signature provider, so the provider's audit trail is evidence
    // too, and 20.3 says which record answers what. See docs/franchise-onboarding.md §6.1.
    {
      number: "20",
      heading: "Execution",
      blocks: [
        {
          kind: "clause",
          number: "20.1",
          text: "This Term Sheet is executed electronically and binds both Parties without a handwritten signature or seal. MuscleBox Pro executes it by issuing it to the Franchisee through the MuscleBox Pro onboarding process. The Franchisee executes it by its authorised signatory named below signing it through the electronic signature provider MuscleBox Pro nominates, using an Aadhaar based electronic signature or a digital signature certificate.",
        },
        {
          kind: "clause",
          number: "20.2",
          text: "The signatory named below confirms, in signing, that the Franchisee has read this Term Sheet and agrees to it, and that the signatory is authorised to bind the Franchisee.",
        },
        {
          kind: "clause",
          number: "20.3",
          text: "MuscleBox Pro records the SHA-256 fingerprint of the text of this Term Sheet as issued, the fingerprint of the document file presented for signature, and the fingerprint of the signed file it receives back, together with the date and time of signature. The Franchisee receives the signed file and those fingerprints with its copy. The electronic signature provider's audit trail is the record of how the signature was affixed and to which identity. Together they are the Parties' evidence of what was executed and when, and either Party may rely on them.",
        },
        {
          kind: "signatures",
          parties: [
            {
              heading: "FOR BLEND BOX INNOVATIONS LLP / MUSCLEBOX PRO",
              lines: [
                "BlendBox Innovations LLP, by its authorised signatory.",
                "Executed electronically on issue of this Term Sheet.",
              ],
            },
            {
              heading: "FOR {{franchiseeLegalName}}",
              lines: [
                "Name: {{signatoryName}}",
                "Designation: {{signatoryDesignation}}",
                "Executed electronically under clause 20.1.",
              ],
            },
          ],
        },
      ],
    },
  ],

  schedules: [
    // The territory in its own schedule because this is the text exclusivity attaches to,
    // and it is the one part of the document a reader is most likely to need to quote.
    {
      number: "Schedule 1",
      heading: "The Territory",
      blocks: [
        {
          kind: "paragraph",
          text: "The Territory granted under clause 4 is:",
        },
        { kind: "callout", lines: ["{{territory}}"] },
        {
          kind: "paragraph",
          text: "Its extent, as agreed between the Parties:",
        },
        { kind: "paragraph", text: "{{territoryBoundary}}" },
        {
          kind: "paragraph",
          text: "Where this description and any map, drawing or summary of the Territory differ, this description prevails.",
        },
      ],
    },
    {
      number: "Schedule 2",
      heading: "Operations Readiness, as declared by the Franchisee",
      blocks: [
        {
          kind: "paragraph",
          text: "The Franchisee has declared the following in support of its obligations under clauses 12 and 14. MuscleBox Pro relies on these details, and the Franchisee will tell MuscleBox Pro when any of them changes.",
        },
        {
          kind: "table",
          header: ["Particular", "Details"],
          rows: [
            ["Designated warehouse", "{{warehouseAddress}}"],
            ["Operations contact", "{{operationsContactName}}"],
            ["Operations contact phone", "{{operationsContactPhone}}"],
          ],
        },
      ],
    },
  ],
};
