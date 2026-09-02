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
    // produce is a vector the backend can never match from a real record.
    franchiseeEntityType: "Private limited company",
    franchiseePan: "AABCN1234C",
    registeredAddress: "402 Vasant Square, Sector 62, Noida, Uttar Pradesh 201309",
    signatoryName: "R. Mehta",
    signatoryDesignation: "Director",

    effectiveDate: "01 September 2026",
    validUntil: "16 October 2026",

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
