/**
 * A page of `GET /admin/franchise-applications`.
 *
 * `adminFranchiseFixture.ts`'s disclaimer applies unchanged: hand-assembled from the response literal in
 * `adminFranchiseApplicationsList.ts`, field by field, so this is a claim about the wire and not a proof of it.
 *
 * The four rows are one per status, because the status is the axis the whole screen turns on and each value
 * means something different about what may be done to the row:
 *
 * - **`new`** carries `triage: null`. Not a missing decision: the absence of a triage row *is* `new`, and it is
 *   the only status that is never stored.
 * - **`reviewed`** has a note and no `franchiseId`, which is the state an invite is sent from.
 * - **`rejected`** has a note that nobody outside the company will ever read, which is why the form insists on
 *   one.
 * - **`converted`** carries a `franchiseId`, and it is terminal. The route refuses to write over it, so this row
 *   exists to prove the screen offers no decision on it.
 *
 * The `new` row also omits `company` and `background` entirely rather than sending them as null, because both are
 * optional on the public form and an absent DynamoDB attribute is an absent JSON key.
 *
 * `reference` is derived, not typed: `franchiseReference` is `MBP-FR-` plus the first ten hex characters of the
 * uuid, uppercased. Change an `applicationId` here and its reference stops matching what the server would send.
 */

import type { FranchiseApplicationPage } from "@shared/admin/franchiseApplications";

export function franchiseApplicationPageFixture(): FranchiseApplicationPage {
  return structuredClone(PAGE);
}

const PAGE: FranchiseApplicationPage = {
  statuses: ["new", "reviewed", "rejected", "converted"],
  applications: [
    {
      applicationId: "3f7c9a1e-5b2d-4068-a5c3-e7f9b2d40681",
      reference: "MBP-FR-3F7C9A1E5B",
      name: "Rhea Menon",
      email: "rhea.menon@gmail.com",
      mobile: "+919845110023",
      targetMarket: "Kochi and Thrissur",
      tier: "city",
      tierName: "MuscleBox Pro City Franchise",
      investmentPaise: 500_000_000,
      initialMachines: 10,
      createdAt: "2026-08-28T04:41:00.000Z",
      status: "new",
      triage: null,
    },
    {
      applicationId: "a2d51c60-7e94-4b13-9f28-6c05a7e3b149",
      reference: "MBP-FR-A2D51C607E",
      name: "Vikram Shetty",
      email: "vikram@shettyfitness.in",
      mobile: "+919632440118",
      targetMarket: "Mangaluru",
      tier: "territory",
      tierName: "MuscleBox Pro Territory Franchise",
      investmentPaise: 250_000_000,
      initialMachines: 5,
      company: "Shetty Fitness Ventures",
      background: "Two gyms in Mangaluru since 2019, both owner-operated.",
      createdAt: "2026-08-21T11:02:00.000Z",
      status: "reviewed",
      triage: {
        note: "Spoke on 24 Aug. Funding is in place. Sending an invite once the second district is confirmed.",
        decidedByEmail: "anurag@muscleboxpro.com",
        decidedAt: "2026-08-24T09:15:00.000Z",
        franchiseId: null,
      },
    },
    {
      applicationId: "c94b0e73-1a68-42f5-8d07-b3e6c1f90224",
      reference: "MBP-FR-C94B0E731A",
      name: "Sandeep Rao",
      email: "sandeep.rao1988@yahoo.co.in",
      mobile: "+918800912274",
      targetMarket: "Anywhere in South India",
      /**
       * A tier id no longer in `FRANCHISE_TIERS`, with `tierName: null` beside it. The handler resolves the name
       * from the live table and the money from the row, so a retired tier arrives exactly like this. The schema
       * takes `tier` as a plain string for this reason.
       */
      tier: "metro",
      tierName: null,
      investmentPaise: 100_000_000,
      initialMachines: 2,
      background: "Looking for a business to run alongside a job.",
      createdAt: "2026-07-09T17:38:00.000Z",
      status: "rejected",
      triage: {
        note: "No capital evidence after two asks, and the target market is the whole region. Not a fit.",
        decidedByEmail: "anurag@muscleboxpro.com",
        decidedAt: "2026-07-14T06:20:00.000Z",
        franchiseId: null,
      },
    },
    {
      applicationId: "e5147c02-8b6a-4d93-9f21-3c70a5e8b146",
      reference: "MBP-FR-E5147C028B",
      name: "Coastline Wellness LLP",
      email: "founder@coastlinewellness.co.in",
      mobile: "+919845220017",
      targetMarket: "Pune, Satara, Sangli",
      tier: "territory",
      tierName: "MuscleBox Pro Territory Franchise",
      investmentPaise: 250_000_000,
      initialMachines: 5,
      company: "Coastline Wellness LLP",
      background: "Runs three studios in Pune.",
      createdAt: "2026-06-02T08:10:00.000Z",
      status: "converted",
      triage: {
        note: "Invited 5 Jun.",
        decidedByEmail: "anurag@muscleboxpro.com",
        decidedAt: "2026-06-05T05:44:00.000Z",
        franchiseId: "b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64",
      },
    },
  ],
  scanned: 61,
  capped: false,
};
