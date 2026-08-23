/**
 * A gym as `GET /admin/gyms/{gymId}` describes one, and a page of `GET /admin/gyms`.
 *
 * Hand-assembled from `toAdminGymView` in `mbp-backend`'s `lib/gymState.ts` — field by field,
 * because that function returns `Record<string, unknown>` and so there is nothing to generate
 * this from. **That makes the fixture a claim, not a proof.** It says "this is the shape we
 * believe the server sends"; only a credentialed request against the sandbox can confirm it,
 * and until that has been run a green suite here means the client agrees with itself.
 *
 * It lives under `client/src/test/` rather than in `shared/` on purpose. `shared/gym/fixtures.ts`
 * is imported by the dashboard at runtime and therefore ships; nothing renders this one, so it
 * has no business in the bundle.
 *
 * The gym described is deliberately **mid-flight and slightly awkward**: signed, deposit
 * deferred and waived, a machine that has already been replaced once, and a superseded invite.
 * A fully-happy fixture would exercise none of the branches this panel exists for — the whole
 * question it answers is "why is this gym stuck?".
 */

import type { AdminGymList, AdminGymView } from "@shared/admin/gyms";

/** A deep clone, so a test that mutates the fixture cannot reach another test. */
export function adminGymFixture(): AdminGymView {
  return structuredClone(ADMIN_GYM_VIEW);
}

export function adminGymListFixture(): AdminGymList {
  return structuredClone(ADMIN_GYM_LIST);
}

const ADMIN_GYM_VIEW: AdminGymView = {
  gymId: "gym_01HQZX9K2M4N6P8R",
  slug: "iron-house-gym",
  status: "signed",
  currentStep: 4,
  completedSteps: [1, 2, 3],
  timestamps: {
    invitedAt: "2026-07-01T09:30:00.000Z",
    firstOpenedAt: "2026-07-01T14:12:00.000Z",
    detailsSubmittedAt: "2026-07-02T05:40:00.000Z",
    partnershipAckAt: "2026-07-02T05:52:00.000Z",
    agreementViewedAt: "2026-07-02T06:01:00.000Z",
    signedAt: "2026-07-02T06:20:00.000Z",
    depositInitiatedAt: null,
    depositPaidAt: null,
    accountCreatedAt: "2026-07-02T06:25:00.000Z",
  },
  details: {
    legalEntityName: "Iron House Fitness Private Limited",
    entityType: "pvt_ltd",
    tradeName: "Iron House Gym",
    gstin: "07AABCU9603R1ZM",
    // Empty rather than absent: optional `GymDetails` fields arrive as "" (§24.5 leaves each
    // party to its own registrations), and the page has to render that as an em dash.
    fssaiLicenceNumber: "",
    registeredAddress: "14 Rajpur Road, Civil Lines, Delhi 110054",
    installationAddress: "Plot 8, Sector 18, Noida, Uttar Pradesh 201301",
    signatoryName: "Rohit Malhotra",
    signatoryDesignation: "Director",
    noticesEmail: "rohit@ironhousegym.in",
    noticesPhone: "+919812345678",
  },
  terms: {
    securityDepositInr: 50000,
    termMonths: 36,
    gymSharePctBeforeMilestone: 10,
    gymSharePctAfterMilestone: 20,
    milestoneCups: 15000,
    milestoneNetProfitInr: 1500000,
    advertisingGymSharePct: 20,
    electricityInrPerBlock: 1500,
    electricityCupsPerBlock: 1000,
    electricityReviewWindowMonths: 6,
    settlementDaysAfterMonthEnd: 15,
    // Zero, which is the standard term and is not the same answer as null.
    earlyTerminationChargeInr: 0,
  },
  termsUpdatedByEmail: "contact@muscleboxpro.com",
  machine: {
    model: "MBP-Pro-1",
    deviceNo: "MBP-000241",
    serialNumber: "SN-2026-000241",
    valueInr: 450000,
    accessories: "Cup dispenser, water filter, base cabinet",
    installationDate: "2026-07-10",
  },
  machines: [
    {
      deviceNo: "MBP-000188",
      model: "MBP-Pro-1",
      serialNumber: "SN-2025-000188",
      valueInr: 450000,
      accessories: "Cup dispenser, water filter",
      installationDate: "2026-07-04",
      status: "replaced",
      lastServiceAt: "2026-07-08T19:40:00.000Z",
      replacedByDeviceNo: "MBP-000241",
      replacedAt: "2026-07-10T04:00:00.000Z",
    },
    {
      deviceNo: "MBP-000241",
      model: "MBP-Pro-1",
      serialNumber: "SN-2026-000241",
      valueInr: 450000,
      accessories: "Cup dispenser, water filter, base cabinet",
      installationDate: "2026-07-10",
      status: "installed",
      lastServiceAt: null,
      replacedByDeviceNo: null,
      replacedAt: null,
    },
  ],
  depositStatus: "deferred",
  deposits: [
    {
      depositId: "dep_01HQZXA5B7C9D1E3",
      status: "pending",
      amountPaise: 5000000,
      linkId: "plink_QxYz1234abcd",
      paymentId: null,
      method: null,
      receiptNo: null,
      paidAt: null,
      createdAt: "2026-07-02T06:22:00.000Z",
      linkExpiresAt: "2026-07-09T06:22:00.000Z",
    },
  ],
  depositChoice: "pay_later",
  depositWaiver: {
    reason: "Deposit waived for the first ten partner gyms",
    byEmail: "contact@muscleboxpro.com",
    at: "2026-07-09T11:00:00.000Z",
  },
  signature: {
    agreementVersion: "2.2",
    contentHash: "9f2c4a1b6d8e0f3a5c7b9d1e2f4a6c8b0d2e4f6a8c0b2d4e6f8a0c2b4d6e8f0a",
    signatoryName: "Rohit Malhotra",
    signatoryDesignation: "Director",
    agreedToAgreement: true,
    authorisedToBind: true,
    ip: "49.36.180.22",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
    signedAt: "2026-07-02T06:20:00.000Z",
  },
  agreements: [
    {
      version: "2.2",
      effectiveDate: "2026-07-02",
      contentHash: "9f2c4a1b6d8e0f3a5c7b9d1e2f4a6c8b0d2e4f6a8c0b2d4e6f8a0c2b4d6e8f0a",
      length: 48213,
      viewedAt: "2026-07-02T06:01:00.000Z",
    },
  ],
  invite: {
    tokenId: "tok_01HQZX9M3N5P7Q9R",
    typ: "onboarding",
    invitedByName: "admin",
    issuedByEmail: "contact@muscleboxpro.com",
    createdAt: "2026-07-01T09:30:00.000Z",
    expiresAt: "2026-07-31T09:30:00.000Z",
    revokedAt: null,
    revokedReason: null,
    supersededByTokenId: null,
  },
  activatedAt: null,
  activatedByEmail: null,
};

const ADMIN_GYM_LIST: AdminGymList = {
  gyms: [
    {
      gymId: "gym_01HQZX9K2M4N6P8R",
      tradeName: "Iron House Gym",
      legalEntityName: "Iron House Fitness Private Limited",
      slug: "iron-house-gym",
      status: "signed",
      noticesEmail: "rohit@ironhousegym.in",
      noticesPhone: "+919812345678",
      createdAt: "2026-07-01T09:30:00.000Z",
      updatedAt: "2026-07-09T11:00:00.000Z",
    },
    {
      // Trade name equal to the legal name, which the list renders as one line rather than two.
      gymId: "gym_01HQZW7J1L3M5N7P",
      tradeName: "Peak Fitness",
      legalEntityName: "Peak Fitness",
      slug: "peak-fitness",
      status: "invited",
      noticesEmail: "owner@peakfitness.co.in",
      noticesPhone: "+919900112233",
      createdAt: "2026-06-28T04:15:00.000Z",
      updatedAt: "2026-06-28T04:15:00.000Z",
    },
    {
      gymId: "gym_01HQZV5H9K1L3M5N",
      tradeName: "Titan Strength Club",
      legalEntityName: "Titan Strength LLP",
      slug: "titan-strength-club",
      status: "active",
      noticesEmail: "hello@titanstrength.in",
      noticesPhone: "+919845001122",
      createdAt: "2026-06-11T10:05:00.000Z",
      updatedAt: "2026-07-15T08:30:00.000Z",
    },
  ],
  nextCursor: "eyJwayI6IkdZTSNneW1fMDFIUVpWNUg5SzFMM001TiJ9",
};
