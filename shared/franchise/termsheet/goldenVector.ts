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
 *   - `capitalRecoveryThreshold`, ₹29,50,000 rather than ₹25,00,000, and **as of 2026-09-04 this value
 *     no longer reaches the 2.0 hash at all**. The document states the threshold as the investment plus
 *     the levies borne on it rather than as an amount — `v2.ts`'s header has the argument — so the field
 *     is here because `FranchiseTermSheetFields` requires it and 1.0 renders it, not because 2.0 does.
 *     Editing it cannot move `contentHash` below, which is worth knowing before trusting it as a probe.
 *   - nothing else. Every other string is byte-identical to v1's, deliberately: two vectors that differ
 *     in more places than the version does make a hash change impossible to attribute.
 *
 * `length` is 70,675 against v1's 20,818 because 2.0 is the whole 72-section programme document rather
 * than a 17-clause term sheet. That ratio is the check worth doing by eye if this ever fails: a 2.0 hash
 * that moved with the length roughly unchanged is a wording change, and one whose length collapsed is a
 * generated file that lost sections.
 *
 * ## This hash has been re-pinned twice, and both times only because nothing had signed 2.0
 *
 * ### 2026-09-04, the Capital Recovery Threshold and §45
 *
 * 69,798 / `a38aedfa…` → 70,675 / `86860f19…`. Two wording changes, both in the source markdown and
 * therefore through `programToAgreement.ts`, plus the two Schedule 1 and cover rows in `v2.ts`:
 *
 *   - the threshold stops being a rupee figure anywhere in the instrument. `v2.ts`'s header has the whole
 *     argument; the short version is that ₹29,50,000 hard-codes an 18% GST rate into a document that will
 *     outlive it, and §57 already defined the threshold as what the franchisee actually bore. §20's worked
 *     example now assumes a round ₹30,00,000 and says so, because an example needs arithmetic and a
 *     realistic-looking figure there is a figure somebody will quote back at us;
 *   - §45's "for reasons including:" becomes "for these reasons, and for no others:". §58 keys both the
 *     capital-protection exclusion and the qualifying cases to "any ground listed in Section 45", so an
 *     open-ended list left the boundary of a franchisee's capital protection undefined by construction.
 *
 * **The freeze check said nothing had signed 2.0, and it was wrong — because it asked our record rather
 * than the provider.** Sandbox held an `ESIGN#` row against a 2.0 `contentHash` with `providerStatus: SENT`
 * and `outcome: pending`, and that is what the check read. Leegality's own answer for the same document
 * (`01M1M9N6P43Z7T9D3KR46BKVQS`) is `COMPLETED`, one invitee `signed: true`, `signDate 04-09-2026 00:21:14`
 * IST, certificate present. It was signed **three hours before** this re-pin. Our row still said pending
 * only because every signing callback 500'd on the `content-type` bug in `providers/leegality.ts` — so the
 * stale field the freeze check trusted was stale *for a reason that had nothing to do with signing*.
 *
 * The lesson is narrower than "check the data", which is what the 2026-09-03 note already said. It is that
 * an `outcome` we write from a webhook is our record of a signature and not the signature, so a freeze
 * check against a *signed* document must ask the provider. `getDocument` is one call.
 *
 * What was signed: `TERMSHEET#001` of franchise `7fcb79be…`, version 2.0, length 69,747,
 * `contentHash 8b836189…` — 2.0's **pre-edit** bytes, which no version file now reproduces. So the repo
 * cannot re-render that instrument; the signed PDF Leegality holds, plus the `contentHash` and `pdfHash` on
 * the row, are its record. Whether that forces a v3 is a decision and not a fact, and it is open in TODO.md:
 * the franchise is the `test-franchise-3` entity, and `v2.ts`'s rule exists to keep a *franchisee's* signed
 * text renderable rather than to freeze the document against a test. Nothing else has signed 2.0.
 *
 * ### 2026-09-03, §58's scope
 *
 * It was 68,304 / `7d88048e…` for the first day of 2.0's life. §58 (Capital Protection After 24 Months)
 * said the protection applied "where the franchise is terminated for any reason, whether by MuscleBoxPro,
 * by the franchisee, or by mutual agreement" — so a franchisee we terminated for **fraud**, and a
 * franchisee who simply walked away under §44, both qualified for a machine transfer or a cash refund of
 * unrecovered capital with 18% interest. The amendment restricts it to endings that are not the
 * franchisee's own fault or choice, and it is a wording change of the kind the ratio note above describes:
 * +1,494 characters, no section added or lost.
 *
 * **Re-pinning here was legitimate only because nothing had signed 2.0 yet**, and that was checked against
 * the data rather than assumed: the single live Aadhaar invite in sandbox is against `TERMSHEET#001` at
 * **1.0** (its `ESIGN#` row carries 1.0's `contentHash`), and no `ESIGN#` row anywhere names a 2.0 hash.
 * `v2.ts`'s header states the trigger precisely — *once a franchisee signs against 2.0*, a document change
 * means v3 — and that had not happened. It has to be checked, not reasoned about, because the whole point
 * of the banner at the top of this file is that the failing test looks identical either way.
 *
 * One consequence that is data rather than code: sandbox holds a `TERMSHEET#002` row pinned at version
 * 2.0 with the **old** `contentHash`, issued before the amendment and never sent for signature. It is left
 * alone deliberately (it sits in a real franchisee's partition), and it is now a row whose stored hash no
 * version file can reproduce. Re-issuing writes a fresh row; nothing reads that one.
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
    // 2.0 does not render this. Kept because the type requires it and 1.0 prints it twice. Header note.
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
  contentHash: "86860f193f06eae4e8f7e61c578ff1b339a7147df0c0ba55cfc71feb8dda03c8",
  length: 70_675,
};
