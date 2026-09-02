/**
 * A franchise as `GET /admin/franchises/{franchiseId}` describes one, and a page of
 * `GET /admin/franchises`.
 *
 * `adminGymFixture.ts`'s brief for the other half of the panel, and the same disclaimer applies with
 * the same force: hand-assembled from `toAdminFranchiseView` in `mbp-backend`'s
 * `lib/franchiseState.ts`, field by field, because that function returns `Record<string, unknown>`
 * and there is nothing to generate this from. **That makes the fixture a claim, not a proof.** Only
 * a credentialed request against the sandbox can confirm it.
 *
 * The franchise below is deliberately **mid-flight and awkward**, and every awkwardness is a real
 * branch of the detail page rather than decoration:
 *
 * - The grant is **narrower than the proposal** — five districts asked for, three given. §3's case,
 *   and the reason proposal and grant sit side by side instead of being merged.
 * - `currentStep` is **4** on a franchise that has signed and paid. Not a mistake: this view derives
 *   it from the *stored* `completedSteps`, and steps 4, 7 and 8 are never stored (`COMPLETED_ON_READ_STEPS`),
 *   so the number an admin sees here is lower than the one the franchisee sees. A fixture that
 *   smoothed this over would let a page that "fixed" it look right.
 * - The term sheet is on its **second issuance**, and `timestamps.termsheetViewedAt` is *earlier*
 *   than `termSheet.issuedAt` — the franchisee's first view was of a document that is no longer the
 *   pin.
 * - The first instalment is **claimed and not yet verified**, which is the state the panel's payment
 *   write exists to move out of.
 * - One document is withdrawn and one is still `pending`, so both filters have something to catch.
 *
 * ## Ids here are UUIDs, not the gym flow's ULID-ish strings
 *
 * `newFranchiseId` and `newFranchiseDocId` are both `randomUUID()`. A `frn_…` or `fdoc_…` fixture id
 * would read plausibly and be wrong, which is worse than either being right.
 *
 * `reference` is not invented either: `franchisePaymentReference` derives it deterministically from
 * the franchise id with SHA-256, so the value below was computed from `franchiseId` rather than
 * typed. Change one and the other stops matching what the server would send.
 *
 * ## The state is past what the deployed wizard can reach
 *
 * There is no e-sign route yet and nothing calls `createFranchiseInstalment`, so no live franchise
 * can currently be `payment_claimed`. It is still the right state to fixture: the payment
 * verify/refuse pair is the admin panel's own write, and it needs something to render before the
 * routes that feed it exist. That gap is the second half of the claim this file makes.
 */

import type { AdminFranchiseList, AdminFranchiseView } from "@shared/admin/franchises";

/** A deep clone, so a test that mutates the fixture cannot reach another test. */
export function adminFranchiseFixture(): AdminFranchiseView {
  return structuredClone(ADMIN_FRANCHISE_VIEW);
}

export function adminFranchiseListFixture(): AdminFranchiseList {
  return structuredClone(ADMIN_FRANCHISE_LIST);
}

/**
 * The review queue, which is a different shape rather than a filtered list.
 *
 * Separate because `queue: "review"` changes what the page may do: the sparse index is oldest-first,
 * ignores `cursor` and always answers `nextCursor: null`, so a "Load more" under it would be a
 * button that silently does nothing.
 */
export function adminFranchiseReviewQueueFixture(): AdminFranchiseList {
  return structuredClone(ADMIN_FRANCHISE_REVIEW_QUEUE);
}

const FRANCHISE_ID = "b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64";

const ADMIN_FRANCHISE_VIEW: AdminFranchiseView = {
  franchiseId: FRANCHISE_ID,
  slug: "northline-nutrition",
  status: "payment_claimed",
  currentStep: 4,
  completedSteps: [1, 2, 3, 5, 6],
  sourceApplicationId: "9c4d7e21-58ab-4f16-8d92-1e63b0af7c58",
  createdAt: "2026-07-28T06:40:00.000Z",
  updatedAt: "2026-08-21T12:40:00.000Z",

  details: {
    legalEntityName: "Northline Nutrition LLP",
    entityType: "llp",
    tradeName: "Northline Nutrition",
    // Empty rather than absent, and the pair is the point: an LLP has an LLPIN and no CIN, and the
    // page has to render the blank one as an em dash instead of hiding the row.
    cin: "",
    llpin: "AAB-8241",
    pan: "AAKFN4821K",
    gstin: "27AAKFN4821K1Z8",
    registeredAddress: "3rd Floor, Ganga Tower, Aundh Road, Pune 411020",
    signatoryName: "Meera Deshpande",
    signatoryDesignation: "Designated Partner",
    signatoryPan: "BQTPD7719L",
    signatoryAadhaarLast4: "4417",
    noticesEmail: "meera@northlinenutrition.in",
    noticesPhone: "+919822004417",
  },

  terms: {
    tier: "territory",
    investmentPaise: 250_000_000,
    machineAllocation: 5,
    paymentSchedule: [
      { pct: 50, trigger: "At franchise registration" },
      { pct: 50, trigger: "When machines are ready at the OEM" },
    ],
    capitalRecoveryPaise: 250_000_000,
    proteinSharePctDuringRecovery: 100,
    proteinSharePctAfterRecovery: 50,
    advertisingFranchiseeSharePct: 25,
    advertisingMbpSharePct: 75,
  },
  termsUpdatedAt: "2026-08-18T08:55:00.000Z",
  termsUpdatedByEmail: "contact@muscleboxpro.com",

  territory: {
    tier: "territory",
    proposedTerritory: "Maharashtra: Pune, Satara, Sangli, Kolhapur, Solapur",
    proposedState: "Maharashtra",
    proposedDistricts: ["Pune", "Satara", "Sangli", "Kolhapur", "Solapur"],
    proposedPincodes: ["411045", "411057"],
    // Empty, which is the common case: most applicants want whole districts and write nothing here.
    proposedBoundary: "",
    existingRelationships: "Two gyms in Baner already stock our shakers through a local distributor.",
    submittedAt: "2026-07-30T11:15:00.000Z",
    // Granted narrower than proposed, and at the tier that was asked for. `grantedTier` being equal
    // to `tier` is not the same as it being absent.
    grantedTier: "territory",
    grantedTerritory: "Maharashtra: Pune, Satara, Sangli",
    grantedBoundary: "Pune, Satara and Sangli districts in full. Kolhapur and Solapur are not included.",
    grantedExclusions: "Cult.fit and Anytime Fitness outlets inside the boundary stay with MuscleBox Pro.",
    grantedAt: "2026-08-10T07:30:00.000Z",
  },

  approval: {
    outcome: "approved",
    decidedAt: "2026-08-10T07:30:00.000Z",
    decidedByEmail: "contact@muscleboxpro.com",
    internalReason: "Funding evidence is thin for five districts. Approving three and revisiting after the first year.",
    approvedAt: "2026-08-10T07:30:00.000Z",
  },

  operations: {
    warehouseNotIdentified: false,
    warehouseAddress: "Unit 14, Nanded Phata Logistics Park, Sinhagad Road, Pune 411041",
    warehouseAreaSqft: 1800,
    temperatureControl: "yes",
    operationsContactName: "Sagar Kulkarni",
    operationsContactPhone: "+919730118842",
    deploymentPlan: "Four machines across Pune gyms by November, the fifth in Satara once the Karad site is signed.",
    logisticsArrangement: "undecided",
    submittedAt: "2026-08-12T10:20:00.000Z",
  },

  // In `docId` order, not upload order: the sort key is `DOCUMENT#<uuid>`, so the array a page
  // receives is shuffled with respect to time. Anything that renders "most recent first" has to sort.
  documents: [
    {
      docId: "1a5c9e02-3b74-4d18-9f26-8c07b5e14a93",
      docType: "address_proof",
      contentType: "image/jpeg",
      bytes: 1_842_113,
      originalFilename: "electricity-bill-aundh.jpg",
      uploadState: "uploaded",
      requestedAt: "2026-08-03T08:44:00.000Z",
      uploadedAt: "2026-08-03T08:45:00.000Z",
      removedAt: null,
    },
    {
      docId: "7c3d1a94-6e82-4b50-a173-9f28c5b06e11",
      docType: "pan_card",
      contentType: "application/pdf",
      bytes: 214_552,
      originalFilename: "northline-pan.pdf",
      uploadState: "uploaded",
      requestedAt: "2026-08-03T08:31:00.000Z",
      uploadedAt: "2026-08-03T08:32:00.000Z",
      removedAt: null,
    },
    {
      // Withdrawn and still here. The franchisee's own view drops this row; the admin view keeps it,
      // which is the whole reason `removeFranchiseDocument` sets a flag instead of deleting.
      docId: "a2f70b58-91d4-4e63-8c0a-5b1e37d928f6",
      docType: "entity_proof",
      contentType: "application/pdf",
      bytes: 98_204,
      originalFilename: "llp-agreement-page1-only.pdf",
      uploadState: "uploaded",
      requestedAt: "2026-08-03T08:36:00.000Z",
      uploadedAt: "2026-08-03T08:37:00.000Z",
      removedAt: "2026-08-03T08:51:00.000Z",
    },
    {
      docId: "d90a4c73-2f18-4e6b-95c2-8a03b7e15d64",
      docType: "entity_proof",
      contentType: "application/pdf",
      bytes: 1_106_930,
      originalFilename: "llp-agreement-full.pdf",
      uploadState: "uploaded",
      requestedAt: "2026-08-03T08:52:00.000Z",
      uploadedAt: "2026-08-03T08:53:00.000Z",
      removedAt: null,
    },
    {
      // A presign that was never followed by a PUT. Left behind on purpose: it is a request we
      // logged, the franchisee's view skips it, and a retry gets a fresh `docId`.
      docId: "f4b81d26-7a39-4c05-8e12-6d95c0a3b7e8",
      docType: "signatory_id",
      contentType: "image/png",
      bytes: 0,
      originalFilename: "aadhaar-front.png",
      uploadState: "pending",
      requestedAt: "2026-08-03T09:02:00.000Z",
      uploadedAt: null,
      removedAt: null,
    },
  ],

  payments: [
    {
      instalmentNo: 1,
      // Computed with `franchisePaymentReference(FRANCHISE_ID)`, not chosen.
      reference: "MBPF-U9R493NF",
      expectedPaise: 125_000_000,
      state: "pending",
      // Null because nobody has verified yet, which is not the same as ₹0 having arrived.
      receivedPaise: null,
      claim: {
        utr: "SBIN426390118742",
        // A few hundred rupees short of `expectedPaise`, which §7.3 treats as the ordinary case
        // rather than the exception: the sending bank deducted charges.
        amountPaise: 124_941_000,
        paidOn: "2026-08-21",
        proofDocId: null,
        claimedAt: "2026-08-21T12:40:00.000Z",
      },
      verifiedAt: null,
      verifiedByEmail: null,
      rejectedAt: null,
      reason: null,
    },
  ],

  termSheet: {
    seq: 2,
    issuedCount: 2,
    version: "1.0",
    effectiveDate: "2026-08-18",
    // `effectiveDate` plus `TERM_SHEET_VALIDITY_DAYS`, which is 45.
    validUntil: "2026-10-02",
    contentHash: "4b1f7a9c2e08d635a7c14b90e3f28d6a5019c74b3e8a2f60d95b1c73a08e4f26",
    length: 47_812,
    // Null until a PDF renderer exists, and deliberately not a plausible-looking hash before then.
    pdfHash: null,
    issuedAt: "2026-08-18T09:00:00.000Z",
  },
  esign: null,
  // Illustrative: the field carries whatever `sk` the loader had no branch for. An `ESIGN#` row is
  // the one we expect to be first, since `esign` above is pinned to null for want of a provider.
  unmodelledRows: ["ESIGN#01"],

  firstOpen: {
    at: "2026-07-28T13:05:00.000Z",
    ip: "103.21.244.19",
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile",
  },

  timestamps: {
    invitedAt: "2026-07-28T06:40:00.000Z",
    firstOpenedAt: "2026-07-28T13:05:00.000Z",
    detailsSubmittedAt: "2026-07-29T05:20:00.000Z",
    territorySubmittedAt: "2026-07-30T11:15:00.000Z",
    kycSubmittedAt: "2026-08-03T09:02:00.000Z",
    // Always null. Nothing writes it — `under_review` is a status with no timestamp behind it — and
    // the handler sends the key anyway so this response still parses.
    reviewStartedAt: null,
    approvedAt: "2026-08-10T07:30:00.000Z",
    // One field for all three outcomes, so on an approval it equals `approvedAt`.
    decidedAt: "2026-08-10T07:30:00.000Z",
    franchiseAckAt: "2026-08-11T04:45:00.000Z",
    operationsSubmittedAt: "2026-08-12T10:20:00.000Z",
    // Earlier than `termSheet.issuedAt`: the document was re-pinned after this view, so the two are
    // about different issuances.
    termsheetViewedAt: "2026-08-12T15:00:00.000Z",
    esignRequestedAt: "2026-08-19T06:10:00.000Z",
    signedAt: "2026-08-19T06:35:00.000Z",
    paymentClaimedAt: "2026-08-21T12:40:00.000Z",
    paymentVerifiedAt: null,
    accountCreatedAt: null,
    activatedAt: null,
  },

  invite: {
    tokenId: "e5147c02-8b6a-4d93-9f21-3c70a5e8b146",
    typ: "franchise_onboard",
    invitedByName: "admin",
    issuedByEmail: "contact@muscleboxpro.com",
    createdAt: "2026-07-28T06:40:00.000Z",
    expiresAt: "2026-08-27T06:40:00.000Z",
    revokedAt: null,
    revokedReason: null,
    supersededByTokenId: null,
  },
};

const ADMIN_FRANCHISE_LIST: AdminFranchiseList = {
  queue: null,
  franchises: [
    {
      franchiseId: FRANCHISE_ID,
      legalEntityName: "Northline Nutrition LLP",
      tradeName: "Northline Nutrition",
      slug: "northline-nutrition",
      status: "payment_claimed",
      entityType: "llp",
      noticesEmail: "meera@northlinenutrition.in",
      noticesPhone: "+919822004417",
      sourceApplicationId: "9c4d7e21-58ab-4f16-8d92-1e63b0af7c58",
      createdAt: "2026-07-28T06:40:00.000Z",
      updatedAt: "2026-08-21T12:40:00.000Z",
    },
    {
      // Invited and nothing more, which is what an invite alone can fill in: a trade name, an email
      // and a phone number. `legalEntityName` and `entityType` stay empty until step 1, and the row
      // has to render without them.
      franchiseId: "2d9a5c17-4b8e-4f21-9a63-0e7c5b81df42",
      legalEntityName: "",
      tradeName: "Coastline Wellness",
      slug: "coastline-wellness",
      status: "invited",
      entityType: "",
      noticesEmail: "founder@coastlinewellness.co.in",
      noticesPhone: "+919845220017",
      sourceApplicationId: null,
      createdAt: "2026-08-24T05:12:00.000Z",
      updatedAt: "2026-08-24T05:12:00.000Z",
    },
    {
      franchiseId: "6f1b8d30-72a4-4c95-b1e8-5d40a9c3e277",
      legalEntityName: "Highfield Sports Nutrition Private Limited",
      tradeName: "Highfield",
      slug: "highfield",
      status: "declined",
      entityType: "pvt_ltd",
      noticesEmail: "kabir@highfield.in",
      noticesPhone: "+919911447722",
      sourceApplicationId: null,
      createdAt: "2026-06-30T09:05:00.000Z",
      updatedAt: "2026-07-22T06:40:00.000Z",
    },
  ],
  nextCursor: "eyJwayI6IkZSQU5DSElTRSM2ZjFiOGQzMC03MmE0LTRjOTUtYjFlOC01ZDQwYTljM2UyNzcifQ==",
};

const ADMIN_FRANCHISE_REVIEW_QUEUE: AdminFranchiseList = {
  queue: "review",
  franchises: [
    {
      franchiseId: "83c05e14-9d27-4a68-b0f3-71e5c2a9d840",
      legalEntityName: "Sunrise Fitness Ventures LLP",
      tradeName: "Sunrise Fitness Ventures",
      slug: "sunrise-fitness-ventures",
      status: "under_review",
      entityType: "llp",
      noticesEmail: "ops@sunrisefitness.in",
      noticesPhone: "+919700332211",
      sourceApplicationId: null,
      createdAt: "2026-08-06T07:15:00.000Z",
      updatedAt: "2026-08-14T10:02:00.000Z",
    },
    {
      // `kyc_submitted` rather than `under_review`, because the queue is the set awaiting a decision
      // and a franchisee who has finished step 3 is in it before anyone opens the file.
      franchiseId: "c17a4b90-5e63-42d8-91f0-6a28d5b73e14",
      legalEntityName: "Deccan Protein Works",
      tradeName: "Deccan Protein Works",
      slug: "deccan-protein-works",
      status: "kyc_submitted",
      entityType: "proprietorship",
      noticesEmail: "anil@deccanprotein.in",
      noticesPhone: "+919440118293",
      sourceApplicationId: "5b28f70c-3a91-4d62-8e05-c47a916d3b28",
      createdAt: "2026-08-11T12:30:00.000Z",
      updatedAt: "2026-08-19T04:55:00.000Z",
    },
  ],
  // Always null on the queue. The sparse index is oldest-first and ignores `cursor` entirely.
  nextCursor: null,
};
