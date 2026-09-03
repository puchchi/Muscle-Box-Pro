/**
 * Pinned inputs and outputs for the Franchise Term Sheet hash.
 *
 * Same job as `shared/agreement/goldenVector.ts` and the same warning, which is repeated
 * here rather than referenced because the thing it is warning against is a one-character
 * edit that makes a failing test pass:
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * DO NOT UPDATE A HASH OR LENGTH HERE TO MAKE A FAILING TEST PASS.
 *
 * It pins the exact bytes a signature attests to. If it fails, either the term sheet's
 * content changed, in which case the change belongs in a new version file, or
 * `renderPlainText`'s format changed, which moves every fingerprint already stored.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * `mbp-backend` computes the `contentHash` it stores at issuance from a verbatim copy of
 * `shared/agreement/` and `shared/franchise/termsheet/`, so this file is also the cross-repo
 * drift guard: both suites assert these bytes, and a copy that has drifted fails on its own
 * side in isolation (docs/franchise-onboarding.md §8.5, test 1).
 *
 * One property worth knowing before reading the vector: `todo` blocks are excluded from
 * `renderPlainText`, so resolving a marker in v1 does **not** move the hash below. That is
 * deliberate and is the same reason the gym agreement's markers are excluded. A signature is
 * against clauses, not against our internal notes about them.
 */

import type { AgreementGoldenVector } from "../../agreement/goldenVector";
import type { FranchiseTermSheetFields } from "./types";

export type FranchiseTermSheetGoldenVector = AgreementGoldenVector<FranchiseTermSheetFields>;

/**
 * The vector for 1.0 — the one version there is.
 *
 * Every field below is an input to the pinned bytes: unlike the gym vector, which carries
 * three values v2.3 has no token for, this document tokenises everything in
 * `FranchiseTermSheetFields`. Changing any single string here makes the hash wrong.
 *
 * The values are a Territory franchise because that is the tier whose payment schedule and
 * recovery threshold the program document fixes (§6, §17). A City vector would have to invent
 * both, and a golden vector containing invented commercials is a vector someone will later
 * read as a specimen.
 *
 * A future version gets its **own** literal below this one, not a spread of this one with
 * overrides, for the reason the gym vector states: a value edited to suit the new vector
 * silently moves this hash too.
 */
export const GOLDEN_TERM_SHEET_V1: FranchiseTermSheetGoldenVector = {
  version: "1.0",
  fields: {
    franchiseeLegalName: "Northline Ventures Private Limited",
    // Exactly `ENTITY_TYPE_LABELS.pvt_ltd`. A vector whose strings `toTermSheetFields` cannot
    // produce is a vector the backend can never match from a real record — and because the label
    // is the one constant duplicated in both repos, it is also the divergence this vector is most
    // likely to be asked to catch. Title-casing it here and re-pinning the hash below leaves both
    // repos green while pinning different hashes for the same document, which is the one failure
    // this file exists to make impossible.
    franchiseeEntityType: "Private limited company",
    franchiseePan: "AABCN1234C",
    registeredAddress: "402 Vasant Square, Sector 62, Noida, Uttar Pradesh 201309",
    signatoryName: "R. Mehta",
    signatoryDesignation: "Director",

    effectiveDate: "01 September 2026",
    validUntil: "16 October 2026",

    // The **old** spelling, and it stays. `FRANCHISE_TIERS[].name` now reads "MuscleBoxPro Territory
    // Franchise", because the program document spells the brand that way and 2.0 renders the tier name
    // onto its cover next to §1's own table. So this literal is no longer producible by
    // `toTermSheetFields`, which the note on `franchiseEntityType` above says is exactly what a vector
    // must not be — and it is the right answer here anyway, for the reason that note gives in reverse:
    // this string is in the bytes a franchisee signed. Correcting it would move a hash that is evidence.
    // v1 is frozen history; `GOLDEN_TERM_SHEET_V2` is where the current spelling is pinned.
    tierName: "MuscleBox Pro Territory Franchise",
    territory: "Noida and Greater Noida, Uttar Pradesh",
    territoryBoundary:
      "Sectors 1 to 168 of Noida, and Greater Noida West up to the Bisrakh Road boundary. Excludes Ghaziabad and Delhi.",
    machineAllocation: "5",

    investment: "₹25,00,000",
    investmentInWords: "Rupees Twenty Five Lakh Only",
    firstInstalment: "₹12,50,000",
    firstInstalmentTrigger: "At franchise registration",
    secondInstalment: "₹12,50,000",
    secondInstalmentTrigger: "When machines are ready at the OEM",
    capitalRecoveryThreshold: "₹25,00,000",

    proteinShareDuringRecovery: "100%",
    proteinShareAfterRecoveryFranchisee: "50%",
    proteinShareAfterRecoveryMbp: "50%",
    advertisingShareFranchisee: "25%",
    advertisingShareMbp: "75%",

    warehouseAddress: "Plot 14, Site IV Industrial Area, Sahibabad, Uttar Pradesh 201010",
    operationsContactName: "S. Iyer",
    operationsContactPhone: "+91 22222 22222",

    mbpNotices: {
      address: "BlendBox Innovations LLP, Bengaluru",
      email: "legal@muscleboxpro.com",
      phone: "+91 00000 00000",
    },
    franchiseeNotices: {
      address: "402 Vasant Square, Sector 62, Noida, Uttar Pradesh 201309",
      email: "r.mehta@northline.example",
      phone: "+91 33333 33333",
    },
  },
  contentHash: "e1fa01a93abb75a75d42d2c9332828820c5515813f31b2f55d584b8c5241349c",
  length: 20_818,
};

/**
 * The vector for 2.0 — the version this flow issues.
 *
 * **A separate literal, not a spread of `GOLDEN_TERM_SHEET_V1` with three overrides**, and this is the
 * case the warning at the top of v1's vector was written for. A spread would mean editing a field to
 * suit 2.0 silently moved 1.0's hash, and 1.0's hash is what a franchisee's Aadhaar signature attests
 * to. Two literals cost forty duplicated lines and make that impossible.
 *
 * Same Territory specimen as v1, for the reason v1's comment gives — the tier whose commercials the
 * program document fixes — with three values different:
 *
 *   - `tierName`, now "MuscleBoxPro", the spelling the document itself uses. See v1's note.
 *   - `capitalRecoveryThreshold`, ₹29,50,000 rather than ₹25,00,000. §57 makes the threshold the
 *     investment grossed up by the GST the franchisee bore, so it is arithmetic on the recorded
 *     investment rather than a published figure, and it is no longer equal to the investment.
 *     `program.ts`'s `capitalRecoveryPaise` is what produces it.
 *   - nothing else. Every other string is byte-identical to v1's, deliberately: two vectors that differ
 *     in more places than the version does make a hash change impossible to attribute.
 *
 * `length` is 68,304 against v1's 20,818 because 2.0 is the whole 72-section programme document rather
 * than a 17-clause term sheet. That ratio is the check worth doing by eye if this ever fails: a 2.0 hash
 * that moved with the length roughly unchanged is a wording change, and one whose length collapsed is a
 * generated file that lost sections.
 */
export const GOLDEN_TERM_SHEET_V2: FranchiseTermSheetGoldenVector = {
  version: "2.0",
  fields: {
    franchiseeLegalName: "Northline Ventures Private Limited",
    franchiseeEntityType: "Private limited company",
    franchiseePan: "AABCN1234C",
    registeredAddress: "402 Vasant Square, Sector 62, Noida, Uttar Pradesh 201309",
    signatoryName: "R. Mehta",
    signatoryDesignation: "Director",

    effectiveDate: "01 September 2026",
    validUntil: "16 October 2026",

    tierName: "MuscleBoxPro Territory Franchise",
    territory: "Noida and Greater Noida, Uttar Pradesh",
    territoryBoundary:
      "Sectors 1 to 168 of Noida, and Greater Noida West up to the Bisrakh Road boundary. Excludes Ghaziabad and Delhi.",
    machineAllocation: "5",

    investment: "₹25,00,000",
    investmentInWords: "Rupees Twenty Five Lakh Only",
    firstInstalment: "₹12,50,000",
    firstInstalmentTrigger: "At franchise registration",
    secondInstalment: "₹12,50,000",
    secondInstalmentTrigger: "When machines are ready at the OEM",
    // ₹25,00,000 plus 18% GST. Not the investment — see the header note.
    capitalRecoveryThreshold: "₹29,50,000",

    proteinShareDuringRecovery: "100%",
    proteinShareAfterRecoveryFranchisee: "50%",
    proteinShareAfterRecoveryMbp: "50%",
    advertisingShareFranchisee: "25%",
    advertisingShareMbp: "75%",

    warehouseAddress: "Plot 14, Site IV Industrial Area, Sahibabad, Uttar Pradesh 201010",
    operationsContactName: "S. Iyer",
    operationsContactPhone: "+91 22222 22222",

    mbpNotices: {
      address: "BlendBox Innovations LLP, Bengaluru",
      email: "legal@muscleboxpro.com",
      phone: "+91 00000 00000",
    },
    franchiseeNotices: {
      address: "402 Vasant Square, Sector 62, Noida, Uttar Pradesh 201309",
      email: "r.mehta@northline.example",
      phone: "+91 33333 33333",
    },
  },
  contentHash: "7d88048e25cb241465d9849408c9252c2ce9eba811bf7cf88f15e33a48ff0277",
  length: 68_304,
};
