/**
 * The fixture the gym dashboard runs on until the reporting endpoint exists (§15).
 *
 * Every number here is a *raw input* — cups, gross, cost total, opening counters.
 * Not one derived figure is typed out, because a hand-written "₹3,380 payout" beside
 * a computed one is how a fixture and the maths start disagreeing, and the fixture
 * always wins the argument in a demo. If you want to see a different payout, change
 * the cups.
 *
 * The state it depicts is chosen to exercise the screen rather than to flatter it:
 * a gym four months in, **not yet** at the milestone but close enough that the
 * step-up is the interesting number (§13 calls that the most motivating figure a gym
 * owner can see), with an ad-revenue month, a part-finished electricity window whose
 * cups will lapse if it stalls (§10.6), two settled statements behind it, and a paid
 * deposit. `PARTNERSHIP` supplies the commercials so this cannot drift from
 * `summary.ts`.
 */

import { PARTNERSHIP } from "../partnership/summary";
import { MACHINE_SPEC } from "../machine/spec";
import type { GymPortalSnapshot } from "./portal";

/** The standard terms row, as admin would seed `gym_terms` for a gym with no negotiations. */
const STANDARD_TERMS: GymPortalSnapshot["terms"] = {
  securityDepositInr: PARTNERSHIP.securityDepositInr,
  termMonths: PARTNERSHIP.initialTermMonths,
  gymSharePctBeforeMilestone: PARTNERSHIP.gymNetProfitSharePct.beforeMilestone,
  gymSharePctAfterMilestone: PARTNERSHIP.gymNetProfitSharePct.afterMilestone,
  milestoneCups: PARTNERSHIP.milestone.cups,
  milestoneNetProfitInr: PARTNERSHIP.milestone.cumulativeNetProfitInr,
  advertisingGymSharePct: PARTNERSHIP.advertisingGymSharePct,
  electricityInrPerBlock: PARTNERSHIP.electricity.inrPerBlock,
  electricityCupsPerBlock: PARTNERSHIP.electricity.cupsPerBlock,
  electricityReviewWindowMonths: PARTNERSHIP.electricity.reviewWindowMonths,
  settlementDaysAfterMonthEnd: PARTNERSHIP.settlementDaysAfterMonthEnd,
  // Nil, conditional on §36.1's notice — Schedule B's `[TO BE AGREED]` is settled.
  earlyTerminationChargeInr: PARTNERSHIP.earlyTerminationChargeInr,
};

export const DEMO_GYM_PORTAL: GymPortalSnapshot = {
  gymDisplayName: "Iron Temple Fitness",

  machine: {
    model: MACHINE_SPEC.model,
    deviceNo: "MBP-BLR-0142",
    serialNumber: "MBX1-2026-0142",
    status: "installed",
    installationDate: "2026-05-04",
    // A timestamp, matching what `GET /gym/portal` actually sends. It was a date until
    // the contract was read against the deployed handler.
    lastServiceAt: "2026-08-05T09:20:00.000Z",
  },

  terms: STANDARD_TERMS,

  // All four reporting sections available, which is the *end* state rather than the one
  // `GET /gym/portal` returns today. That is deliberate: the fixture's job is to exercise
  // every card, and a fixture that mirrored the endpoint's current partial response would
  // leave the figures nobody has checked since they were written untested. The absent
  // states are covered by the dashboard's own tests, which override this.
  sales: {
    available: true,
    data: {
      // Trading history behind it: 7,000 cups, ₹8,40,000 of gross and ₹4,55,000 of §7
      // net profit — ₹65 a cup on the indicative economics. That leaves the ₹5,00,000
      // profit milestone close but not reached, and the cup test still 7,740 cups away,
      // so the demo shows the profit test binding and the share still at 20%.
      opening: {
        openingPaidCups: 7_000,
        openingGrossExTaxInr: 8_40_000,
        openingNetProfitInr: 4_55_000,
      },
      currentPeriod: {
        period: "2026-08",
        paidCups: 260,
        grossExTaxInr: 31_200,
        directVariableCostsInr: 14_300,
      },
    },
  },

  adRevenue: { available: true, data: { period: "2026-08", revenueExTaxInr: 4_000 } },

  // Opened in July, so August is its second month and the third is still to come.
  // 1,180 cups is one completed block with 180 cups sitting in an incomplete one.
  electricity: {
    available: true,
    data: { label: "Jul–Sep 2026", paidCups: 1_180, endsOn: "2026-09-30" },
  },

  statements: {
    available: true,
    data: [
      { period: "2026-07", settledOn: "2026-08-11", gymPayoutInr: 5_870, electricityInr: 0, documentUrl: null },
      { period: "2026-06", settledOn: "2026-07-12", gymPayoutInr: 4_420, electricityInr: 2_000, documentUrl: null },
    ],
  },

  deposit: {
    status: "paid",
    receipt: {
      receiptNo: "MBP-DEP-0142",
      amountPaise: PARTNERSHIP.securityDepositInr * 100,
      method: "UPI",
      paidAt: "2026-04-28T09:12:00.000Z",
    },
    paymentUrl: null,
  },

  agreement: {
    // 2.2 because that is the first version the flow ever issues: v2.1 is the frozen
    // transcription of the source PDF and had eight blocking holes in it, so no gym
    // could have signed one. A fixture claiming otherwise describes a state that cannot
    // exist.
    version: "2.2",
    signedAt: "2026-04-27T11:42:00.000Z",
    // A real 64-hex digest is not required for a fixture, but the *length* is: the
    // card truncates it, and a short string would hide a rendering bug. This was 65
    // characters until `portalSchema.ts` started checking — which is the whole argument
    // for validating a fixture against the same rules as a live response.
    contentHash: "3f9a1c7e2b4d6081a5c3e7f9b2d4068a1c5e3f7b9d2046a8c1e5f3b7d9024a68",
  },

  asOf: "2026-08-22T06:30:00.000Z",
  // Fifteen minutes behind `asOf`, because that is the state the header has to render
  // honestly: the response is new and the cup count it carries is not.
  dataSyncedAt: "2026-08-22T06:15:00.000Z",
};

/**
 * What `GET /gym/portal` actually returns today.
 *
 * The endpoint ships partial: profile, terms, machine, agreement and deposit are all held
 * in our own table, and the four trading sections are not built (`mbp-backend`
 * `docs/gym-onboarding-api-design.md` §2.6, gated on §9.4). This is here rather than only
 * in a test override because it is the response every real gym will get on day one, and a
 * repo where the only checked-in example is the fully-populated end state is a repo where
 * the partial screen is first looked at in production.
 *
 * Same gym as `DEMO_GYM_PORTAL` on purpose, so the two can be swapped in
 * `gymPortalApi.ts` to see the same dashboard with and without the trading feeds.
 */
export const PARTIAL_GYM_PORTAL: GymPortalSnapshot = {
  ...DEMO_GYM_PORTAL,
  sales: { available: false, reason: "not_implemented" },
  adRevenue: { available: false, reason: "not_implemented" },
  electricity: { available: false, reason: "not_implemented" },
  statements: { available: false, reason: "not_implemented" },
  // Nothing has been read from the machine, because nothing reads it yet.
  dataSyncedAt: null,
};
