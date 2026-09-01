/**
 * An in-memory stand-in for the admin panel's franchise routes.
 *
 * The wizard has `shared/franchise/onboarding/mockApi.ts` for the franchisee's half of the same
 * flow, and this is the other half. It exists for two separate reasons, and both are worth stating
 * because they expire at different times:
 *
 *  1. **Three of the five routes exist but are not deployed.** `adminFranchisesList`,
 *     `adminFranchiseGet` and `adminFranchiseCreate` are written and tested in `mbp-backend` and
 *     sit in `UNROUTED_HANDLERS`: the onboarding stack is 18 CloudFormation resources short of the
 *     500 hard limit and these five methods cost 47 (docs/franchise-onboarding.md §8.1, open
 *     question 10).
 *  2. **Two of them have no handler at all.** Approval and payment verification are the writes that
 *     complete steps 4 and 8, which is to say no franchise can reach step 9 without them. What this
 *     file does with `AdminFranchiseApprovalBody` and `AdminFranchisePaymentVerifyBody` is the
 *     first description of their behaviour anywhere, in the same order §10 used for the wizard:
 *     frontend defines the contract, backend adopts it.
 *
 * ## It answers `unknown`
 *
 * Every read here returns its fixture as `unknown`, and `client/src/lib/adminFranchiseApi.ts` runs
 * it through `franchisesSchema.ts` exactly as it will run a real response body. A mock that handed
 * back a typed object would leave the validator unexercised until the day the seam flips, which is
 * the one day nobody is watching it.
 */

import type {
  AdminFranchiseApprovalBody,
  AdminFranchiseDocument,
  AdminFranchisePaymentRefuseBody,
  AdminFranchisePaymentVerifyBody,
  AdminFranchiseView,
} from "./franchises";
import type { AdminFranchiseInviteBody, AdminFranchiseInviteResult } from "./franchiseInvite";
import { FRANCHISE_REVIEW_STATUSES } from "./franchiseWrites";
import {
  franchiseTerritoryGrantDraft,
  franchiseTerritoryLabel,
} from "../franchise/onboarding/schema";
import type {
  FranchiseOnboardingStatus,
  FranchiseOnboardingStep,
} from "../franchise/onboarding/types";
import { FRANCHISE, franchiseTier, type FranchiseTierId } from "../franchise/program";
import type { EntityType, OnboardingError, OnboardingResult } from "../onboarding/types";

const ADMIN_EMAIL = "ops@muscleboxpro.com";
const ADMIN_NAME = "MuscleBox Pro Ops";

const DAY_MS = 86_400_000;

/** How long an onboarding link lives, matching the gym flow's TTL. */
const INVITE_TTL_MS = 30 * DAY_MS;

// ── Seeds ───────────────────────────────────────────────────────────────────

type Seed = {
  franchiseId: string;
  slug: string;
  tradeName: string;
  legalEntityName: string;
  entityType: EntityType;
  tier: FranchiseTierId;
  email: string;
  phone: string;
  pan: string;
  /** Six digits, the tail of the CIN or LLPIN this entity type implies. */
  regNo: string;
  city: string;
  proposedState: string;
  proposedDistricts: string[];
  /** Only the seeds that want part of a district rather than all of it. */
  proposedPincodes?: string[];
  /** Only where the districts left something unsaid, which is most of the time nothing. */
  proposedBoundary?: string;
  status: FranchiseOnboardingStatus;
  invitedDaysAgo: number;
  sourceApplicationId?: string;
  /** An `sk` prefix the admin view has no model for. One seed carries one, so the panel shows it. */
  unmodelledRows?: string[];
  /** Forces `invite.expiresAt` into the past without moving the record along the ladder. */
  inviteExpired?: boolean;
};

/**
 * Eleven franchises, chosen so that every screen the panel has is reachable from the list.
 *
 * Two of them are load-bearing rather than decorative: `fr_mock_0004` is the only record the
 * approval write can act on, and `fr_mock_0009` is the only one the payment write can. Deleting
 * either leaves a button with nothing to press it on.
 */
const SEEDS: readonly Seed[] = [
  {
    franchiseId: "fr_mock_0001",
    slug: "harbour-line-nutrition",
    tradeName: "Harbour Line Nutrition",
    legalEntityName: "",
    entityType: "pvt_ltd",
    tier: "territory",
    email: "d.almeida@harbourline.example",
    phone: "+91 98200 41122",
    pan: "AABCH4521K",
    regNo: "104471",
    city: "Navi Mumbai, Maharashtra",
    proposedState: "Maharashtra",
    // Navi Mumbai is not a district. It straddles two, which is the case the picker exists for.
    proposedDistricts: ["Raigad", "Thane"],
    proposedBoundary: "Vashi to Kharghar along the Sion Panvel Highway.",
    status: "invited",
    invitedDaysAgo: 6,
  },
  {
    franchiseId: "fr_mock_0002",
    slug: "peak-forty-two",
    tradeName: "Peak Forty Two",
    legalEntityName: "",
    entityType: "llp",
    tier: "territory",
    email: "founders@peak42.example",
    phone: "+91 99400 77310",
    pan: "AAGFP7781M",
    regNo: "221904",
    city: "Coimbatore, Tamil Nadu",
    proposedState: "Tamil Nadu",
    proposedDistricts: ["Coimbatore"],
    status: "opened",
    invitedDaysAgo: 4,
  },
  {
    franchiseId: "fr_mock_0003",
    slug: "greenlane-sports",
    tradeName: "Greenlane Sports",
    legalEntityName: "Greenlane Sports Nutrition LLP",
    entityType: "llp",
    tier: "territory",
    email: "ops@greenlane.example",
    phone: "+91 98330 20514",
    pan: "AAHFG2210J",
    regNo: "318822",
    city: "Kolkata, West Bengal",
    proposedState: "West Bengal",
    proposedDistricts: ["Kolkata"],
    // Half a city, which is the case the pin codes exist for.
    proposedPincodes: ["700019", "700029", "700032", "700033", "700034"],
    proposedBoundary: "Ballygunge, Jadavpur, Tollygunge and Behala.",
    status: "territory_submitted",
    invitedDaysAgo: 9,
  },
  {
    franchiseId: "fr_mock_0004",
    slug: "northline-ventures",
    tradeName: "Northline Ventures",
    legalEntityName: "Northline Ventures Private Limited",
    entityType: "pvt_ltd",
    tier: "territory",
    email: "r.mehta@northline.example",
    phone: "+91 98450 12345",
    pan: "AABCN1234C",
    regNo: "098765",
    city: "Noida, Uttar Pradesh",
    proposedState: "Uttar Pradesh",
    proposedDistricts: ["Gautam Buddha Nagar"],
    proposedBoundary:
      "Sectors 1 to 168 of Noida, and Greater Noida West up to the Bisrakh Road boundary.",
    status: "under_review",
    invitedDaysAgo: 11,
    sourceApplicationId: "fa_mock_7781",
  },
  {
    franchiseId: "fr_mock_0005",
    slug: "sixpoint-retail",
    tradeName: "Sixpoint Retail",
    legalEntityName: "Sixpoint Retail Ventures Private Limited",
    entityType: "pvt_ltd",
    tier: "city",
    email: "a.kulkarni@sixpoint.example",
    phone: "+91 98230 66401",
    pan: "AACCS9012D",
    regNo: "441209",
    city: "Pune, Maharashtra",
    proposedState: "Maharashtra",
    proposedDistricts: ["Pune"],
    proposedBoundary: "Pune Municipal Corporation and Pimpri Chinchwad.",
    status: "kyc_submitted",
    invitedDaysAgo: 5,
  },
  {
    franchiseId: "fr_mock_0006",
    slug: "waverly-wellness",
    tradeName: "Waverly Wellness",
    legalEntityName: "Waverly Wellness",
    entityType: "proprietorship",
    tier: "territory",
    email: "s.pillai@waverly.example",
    phone: "+91 98470 30092",
    pan: "AJKPP5567F",
    regNo: "000000",
    city: "Kochi, Kerala",
    proposedState: "Kerala",
    proposedDistricts: ["Ernakulam"],
    status: "on_hold",
    invitedDaysAgo: 21,
  },
  {
    franchiseId: "fr_mock_0007",
    slug: "castle-rock-fitness",
    tradeName: "Castle Rock Fitness",
    legalEntityName: "Castle Rock Fitness Partners",
    entityType: "partnership",
    tier: "city",
    email: "hello@castlerock.example",
    phone: "+91 90000 11223",
    pan: "AAJFC3390B",
    regNo: "000000",
    city: "Hyderabad, Telangana",
    proposedState: "Telangana",
    proposedDistricts: ["Hyderabad", "Medchal", "Rangareddy"],
    proposedBoundary: "GHMC limits, plus Shamshabad.",
    status: "declined",
    invitedDaysAgo: 34,
    sourceApplicationId: "fa_mock_6120",
  },
  {
    franchiseId: "fr_mock_0008",
    slug: "eastgate-supply",
    tradeName: "Eastgate Supply",
    legalEntityName: "Eastgate Supply Company Private Limited",
    entityType: "pvt_ltd",
    tier: "territory",
    email: "k.borah@eastgate.example",
    phone: "+91 94350 88120",
    pan: "AACCE1178G",
    regNo: "552031",
    city: "Guwahati, Assam",
    proposedState: "Assam",
    proposedDistricts: ["Kamrup", "Kamrup Metropolitan"],
    status: "operations_submitted",
    invitedDaysAgo: 18,
  },
  {
    franchiseId: "fr_mock_0009",
    slug: "silverline-distribution",
    tradeName: "Silverline Distribution",
    legalEntityName: "Silverline Distribution Private Limited",
    entityType: "pvt_ltd",
    tier: "territory",
    email: "v.rao@silverline.example",
    phone: "+91 99860 44127",
    pan: "AAECS6642H",
    regNo: "667712",
    city: "Mysuru, Karnataka",
    proposedState: "Karnataka",
    proposedDistricts: ["Mandya", "Mysuru (Mysore)"],
    status: "payment_claimed",
    invitedDaysAgo: 26,
  },
  {
    franchiseId: "fr_mock_0010",
    slug: "trailhead-sports",
    tradeName: "Trailhead Sports",
    legalEntityName: "Trailhead Sports Nutrition LLP",
    entityType: "llp",
    tier: "territory",
    email: "m.thapa@trailhead.example",
    phone: "+91 98680 55231",
    pan: "AAGFT4409N",
    regNo: "774102",
    city: "Dehradun, Uttarakhand",
    proposedState: "Uttarakhand",
    proposedDistricts: ["Dehradun"],
    proposedBoundary: "Excluding Mussoorie.",
    status: "active",
    invitedDaysAgo: 44,
    unmodelledRows: ["ESCALATION#2026-07-19"],
  },
  {
    franchiseId: "fr_mock_0011",
    slug: "brightpath-nutrition",
    tradeName: "Brightpath Nutrition",
    legalEntityName: "",
    entityType: "unregistered",
    tier: "territory",
    email: "j.fernandes@brightpath.example",
    phone: "+91 97400 21008",
    pan: "AKQPF1102L",
    regNo: "000000",
    city: "Mangaluru, Karnataka",
    proposedState: "Karnataka",
    proposedDistricts: ["Dakshina Kannada", "Udupi"],
    status: "invited",
    invitedDaysAgo: 38,
    inviteExpired: true,
  },
];

// ── Building a record ───────────────────────────────────────────────────────

/** The seed's territory in the shape the two label helpers take. */
function proposedArea(seed: Seed) {
  return {
    proposedState: seed.proposedState,
    proposedDistricts: seed.proposedDistricts,
    proposedPincodes: seed.proposedPincodes ?? [],
    proposedBoundary: seed.proposedBoundary ?? "",
  };
}

function firstInstalmentPaise(tier: FranchiseTierId): number {
  const published = franchiseTier(tier);
  const investmentPaise = published.investmentInr * 100;
  const first = published.paymentSchedule?.[0];
  // No published schedule means the whole investment is the only figure we hold, which is exactly
  // the City tier's problem: §6 leaves its schedule to the definitive agreement.
  return first ? Math.round((investmentPaise * first.pct) / 100) : investmentPaise;
}

function paymentReference(franchiseId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < franchiseId.length; i += 1) {
    hash ^= franchiseId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `MBPF-${hash.toString(36).toUpperCase().padStart(8, "0").slice(-8)}`;
}

function stateCodeFor(city: string): string {
  let sum = 0;
  for (let i = 0; i < city.length; i += 1) sum += city.charCodeAt(i);
  return String((sum % 36) + 1).padStart(2, "0");
}

function gstinFor(seed: Seed): string {
  return `${stateCodeFor(seed.city)}${seed.pan}1Z5`;
}

function document(
  franchiseId: string,
  docType: AdminFranchiseDocument["docType"],
  at: string,
  filename: string,
  bytes: number,
): AdminFranchiseDocument {
  return {
    docId: `doc_${franchiseId.slice(-4)}_${docType}`,
    docType,
    contentType: filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    bytes,
    originalFilename: filename,
    uploadState: "uploaded",
    requestedAt: at,
    uploadedAt: at,
  };
}

function emptyView(seed: Seed, invitedAt: string): AdminFranchiseView {
  const published = franchiseTier(seed.tier);
  const expiresAt = new Date(
    Date.parse(invitedAt) + (seed.inviteExpired ? -1 * DAY_MS : INVITE_TTL_MS),
  ).toISOString();

  return {
    franchiseId: seed.franchiseId,
    slug: seed.slug,
    status: "invited",
    currentStep: 1,
    completedSteps: [],
    sourceApplicationId: seed.sourceApplicationId ?? null,
    createdAt: invitedAt,
    updatedAt: invitedAt,

    details: {
      legalEntityName: seed.legalEntityName,
      entityType: "",
      tradeName: seed.tradeName,
      cin: "",
      llpin: "",
      pan: "",
      gstin: "",
      registeredAddress: "",
      signatoryName: "",
      signatoryDesignation: "",
      signatoryPan: "",
      signatoryAadhaarLast4: "",
      noticesEmail: seed.email,
      noticesPhone: seed.phone,
    },

    terms: {
      tier: seed.tier,
      investmentPaise: published.investmentInr * 100,
      machineAllocation: published.initialMachines,
      paymentSchedule: published.paymentSchedule
        ? published.paymentSchedule.map((s) => ({ ...s }))
        : null,
      capitalRecoveryPaise:
        published.capitalRecoveryInr === null ? null : published.capitalRecoveryInr * 100,
      proteinSharePctDuringRecovery: FRANCHISE.proteinProfitSharePct.duringRecovery,
      proteinSharePctAfterRecovery: FRANCHISE.proteinProfitSharePct.afterRecovery,
      advertisingFranchiseeSharePct: FRANCHISE.advertising.franchiseeSharePct,
      advertisingMbpSharePct: FRANCHISE.advertising.mbpSharePct,
    },
    termsUpdatedAt: invitedAt,
    termsUpdatedByEmail: ADMIN_EMAIL,

    territory: null,
    approval: null,
    operations: null,
    documents: [],
    payments: [],

    termSheet: null,
    esign: null,
    unmodelledRows: seed.unmodelledRows ? [...seed.unmodelledRows] : [],

    firstOpen: null,
    timestamps: {
      invitedAt,
      firstOpenedAt: null,
      detailsSubmittedAt: null,
      territorySubmittedAt: null,
      kycSubmittedAt: null,
      reviewStartedAt: null,
      approvedAt: null,
      decidedAt: null,
      franchiseAckAt: null,
      operationsSubmittedAt: null,
      termsheetViewedAt: null,
      esignRequestedAt: null,
      signedAt: null,
      paymentClaimedAt: null,
      paymentVerifiedAt: null,
      accountCreatedAt: null,
      activatedAt: null,
    },
    invite: {
      tokenId: `tok_${seed.franchiseId.slice(-4)}`,
      typ: "franchise_onboarding",
      invitedByName: ADMIN_NAME,
      issuedByEmail: ADMIN_EMAIL,
      createdAt: invitedAt,
      expiresAt,
      revokedAt: null,
      revokedReason: null,
      supersededByTokenId: null,
    },
  };
}

type Milestone = {
  status: FranchiseOnboardingStatus;
  /** The wizard step this milestone completes, where it completes one. */
  step: FranchiseOnboardingStep | null;
  apply(view: AdminFranchiseView, at: string, seed: Seed): void;
};

/**
 * The happy path, in order. `on_hold` and `declined` are not on it: both branch off
 * `under_review`, and a record that took one of them never rejoins.
 */
const LADDER: readonly Milestone[] = [
  {
    status: "opened",
    step: null,
    apply(view, at) {
      view.timestamps.firstOpenedAt = at;
      view.firstOpen = {
        at,
        ip: "203.0.113.42",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      };
    },
  },
  {
    status: "details_submitted",
    step: 1,
    apply(view, at, seed) {
      const surname = seed.email.split("@")[0].split(".").slice(-1)[0];
      const signatory = `${surname.charAt(0).toUpperCase()}${surname.slice(1)}`;
      view.details = {
        ...view.details,
        legalEntityName: seed.legalEntityName || seed.tradeName,
        entityType: seed.entityType,
        cin: seed.entityType === "pvt_ltd" ? `U47912KA2024PTC${seed.regNo}` : "",
        llpin: seed.entityType === "llp" ? `AAB-${seed.regNo.slice(0, 4)}` : "",
        pan: seed.pan,
        gstin: seed.entityType === "unregistered" ? "" : gstinFor(seed),
        registeredAddress: `${seed.regNo.slice(0, 3)} Ashwin Chambers, ${seed.city}`,
        signatoryName: signatory,
        signatoryDesignation:
          seed.entityType === "pvt_ltd"
            ? "Director"
            : seed.entityType === "llp"
              ? "Designated Partner"
              : "Proprietor",
        signatoryPan: seed.entityType === "unregistered" ? seed.pan : `AJKPS${seed.regNo.slice(-4)}Q`,
        signatoryAadhaarLast4: seed.regNo.slice(-4),
      };
      view.timestamps.detailsSubmittedAt = at;
    },
  },
  {
    status: "territory_submitted",
    step: 2,
    apply(view, at, seed) {
      const area = proposedArea(seed);
      view.territory = {
        tier: seed.tier,
        proposedTerritory: franchiseTerritoryLabel(area),
        proposedState: area.proposedState,
        proposedDistricts: area.proposedDistricts,
        proposedPincodes: area.proposedPincodes,
        proposedBoundary: area.proposedBoundary,
        existingRelationships: `Supplies four gyms in ${seed.city} on a wholesale basis.`,
        submittedAt: at,
        grantedTier: null,
        grantedTerritory: null,
        grantedBoundary: null,
        grantedExclusions: null,
        grantedAt: null,
      };
      view.timestamps.territorySubmittedAt = at;
    },
  },
  {
    status: "kyc_submitted",
    step: 3,
    apply(view, at, seed) {
      view.documents = [
        document(seed.franchiseId, "pan_card", at, "pan.pdf", 184_320),
        document(seed.franchiseId, "entity_proof", at, "incorporation.pdf", 921_600),
        document(seed.franchiseId, "address_proof", at, "electricity-bill.jpg", 412_900),
        document(seed.franchiseId, "signatory_id", at, "aadhaar-masked.pdf", 233_472),
      ];
      if (seed.tier === "city") {
        view.documents.push(
          document(seed.franchiseId, "financial_evidence", at, "bank-statement-6m.pdf", 1_884_160),
        );
      }
      view.timestamps.kycSubmittedAt = at;
    },
  },
  {
    status: "under_review",
    step: null,
    // Nothing to write. `reviewStartedAt` stays null because no handler sets it, and inventing a
    // value here would make the panel show a field the live route never fills.
    apply() {},
  },
  {
    status: "approved",
    step: 4,
    apply(view, at, seed) {
      const area = proposedArea(seed);
      if (view.territory) {
        view.territory.grantedTier = seed.tier;
        // What an admin gets if they take the draft the screen offers and approve it unchanged.
        view.territory.grantedTerritory = franchiseTerritoryLabel(area);
        view.territory.grantedBoundary = franchiseTerritoryGrantDraft(area);
        view.territory.grantedExclusions = "";
        view.territory.grantedAt = at;
      }
      view.approval = {
        outcome: "approved",
        decidedAt: at,
        decidedByEmail: ADMIN_EMAIL,
        internalReason: `Market check clear. ${franchiseTerritoryLabel(area)} has no existing franchise and the applicant already supplies gyms there.`,
        approvedAt: at,
      };
      view.timestamps.approvedAt = at;
      view.timestamps.decidedAt = at;
    },
  },
  {
    status: "franchise_ack",
    step: 5,
    apply(view, at) {
      view.timestamps.franchiseAckAt = at;
    },
  },
  {
    status: "operations_submitted",
    step: 6,
    apply(view, at, seed) {
      view.operations = {
        warehouseAddress: `Plot ${seed.regNo.slice(0, 2)}, Industrial Area Phase II, ${seed.city}`,
        warehouseAreaSqft: 1_800,
        temperatureControl: "yes",
        operationsContactName: `${seed.tradeName.split(" ")[0]} Operations`,
        operationsContactPhone: seed.phone,
        deploymentPlan: `Two machines in the first month at partner gyms already supplied, the rest across ${franchiseTerritoryLabel(proposedArea(seed))} by month four.`,
        logisticsArrangement: "own_vehicle",
        submittedAt: at,
      };
      view.timestamps.operationsSubmittedAt = at;
    },
  },
  {
    status: "termsheet_viewed",
    step: null,
    apply(view, at) {
      view.timestamps.termsheetViewedAt = at;
    },
  },
  {
    status: "esign_requested",
    step: null,
    apply(view, at) {
      view.timestamps.esignRequestedAt = at;
    },
  },
  {
    status: "signed",
    step: 7,
    apply(view, at, seed) {
      view.timestamps.signedAt = at;
      view.payments = [
        {
          instalmentNo: 1,
          reference: paymentReference(seed.franchiseId),
          expectedPaise: firstInstalmentPaise(seed.tier),
          state: "pending",
          receivedPaise: null,
          claim: null,
          verifiedAt: null,
          verifiedByEmail: null,
          rejectedAt: null,
          reason: null,
        },
      ];
    },
  },
  {
    status: "payment_claimed",
    step: null,
    apply(view, at, seed) {
      const payment = view.payments[0];
      if (!payment) return;
      const proof = document(seed.franchiseId, "payment_proof", at, "transfer.jpg", 298_112);
      view.documents.push(proof);
      payment.claim = {
        utr: `SBIN${seed.regNo}${at.slice(2, 4)}${at.slice(5, 7)}`,
        amountPaise: payment.expectedPaise,
        paidOn: at.slice(0, 10),
        proofDocId: proof.docId,
        claimedAt: at,
      };
      view.timestamps.paymentClaimedAt = at;
    },
  },
  {
    status: "payment_verified",
    step: 8,
    apply(view, at) {
      const payment = view.payments[0];
      if (!payment) return;
      payment.state = "verified";
      // ₹1,180 short: the sending bank's RTGS charge, which is the ordinary case rather than the
      // exception (§7.3) and the reason the detail page prints the difference.
      payment.receivedPaise = payment.expectedPaise - 118_000;
      payment.verifiedAt = at;
      payment.verifiedByEmail = ADMIN_EMAIL;
      view.timestamps.paymentVerifiedAt = at;
    },
  },
  {
    status: "active",
    step: 9,
    apply(view, at) {
      view.timestamps.accountCreatedAt = at;
      view.timestamps.activatedAt = at;
    },
  },
];

const BRANCHES: Record<"on_hold" | "declined", Milestone> = {
  on_hold: {
    status: "on_hold",
    step: null,
    apply(view, at, seed) {
      view.approval = {
        outcome: "on_hold",
        decidedAt: at,
        decidedByEmail: ADMIN_EMAIL,
        internalReason: `Address proof is a utility bill in a third party's name. Waiting on the ${seed.city} lease.`,
        approvedAt: null,
      };
      view.timestamps.decidedAt = at;
    },
  },
  declined: {
    status: "declined",
    step: null,
    apply(view, at, seed) {
      view.approval = {
        outcome: "declined",
        decidedAt: at,
        decidedByEmail: ADMIN_EMAIL,
        internalReason: `${franchiseTerritoryLabel(proposedArea(seed))} is committed to an existing City franchise discussion at a later stage than this one.`,
        approvedAt: null,
      };
      view.timestamps.decidedAt = at;
    },
  },
};

function currentStepFor(completed: readonly FranchiseOnboardingStep[]): FranchiseOnboardingStep {
  for (let step = 1; step <= 9; step += 1) {
    if (!completed.includes(step as FranchiseOnboardingStep)) {
      return step as FranchiseOnboardingStep;
    }
  }
  return 9;
}

function build(seed: Seed, nowMs: number): AdminFranchiseView {
  const invitedMs = nowMs - seed.invitedDaysAgo * DAY_MS;
  const view = emptyView(seed, new Date(invitedMs).toISOString());

  const branch = seed.status === "on_hold" || seed.status === "declined" ? seed.status : null;
  const walk: Milestone[] = [];
  if (seed.status !== "invited") {
    for (const milestone of LADDER) {
      walk.push(milestone);
      if (milestone.status === seed.status) break;
      if (branch && milestone.status === "under_review") break;
    }
    if (branch) walk.push(BRANCHES[branch]);
  }

  // A fixture that claims to have been signed tomorrow is worse than a boring one, so the gap
  // between milestones shrinks to fit the window rather than running past `now`.
  const gapMs = Math.min(18 * 3_600_000, (nowMs - invitedMs) / (walk.length + 1));

  const completed: FranchiseOnboardingStep[] = [];
  walk.forEach((milestone, index) => {
    const at = new Date(invitedMs + (index + 1) * gapMs).toISOString();
    milestone.apply(view, at, seed);
    if (milestone.step !== null) completed.push(milestone.step);
    view.status = milestone.status;
    view.updatedAt = at;
  });

  view.completedSteps = completed;
  view.currentStep = currentStepFor(completed);
  return view;
}

// ── The store ───────────────────────────────────────────────────────────────

const store = new Map<string, AdminFranchiseView>();
let created = 0;

/** Clears the store so the next read reseeds. Tests call this; nothing in the app should. */
export function resetMockAdminFranchises(): void {
  store.clear();
  created = 0;
}

function ensureSeeded(nowMs: number): void {
  if (store.size > 0) return;
  for (const seed of SEEDS) store.set(seed.franchiseId, build(seed, nowMs));
}

/** Newest first, matching the real handler's `gsi`-backed order. */
function byCreatedDesc(a: AdminFranchiseView, b: AdminFranchiseView): number {
  return String(b.createdAt).localeCompare(String(a.createdAt));
}

function row(view: AdminFranchiseView) {
  return {
    franchiseId: view.franchiseId,
    legalEntityName: view.details.legalEntityName,
    tradeName: view.details.tradeName,
    slug: view.slug,
    status: view.status,
    entityType: view.details.entityType,
    noticesEmail: view.details.noticesEmail,
    noticesPhone: view.details.noticesPhone,
    sourceApplicationId: view.sourceApplicationId,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

function fail(code: OnboardingError["code"], message: string, extra: Partial<OnboardingError> = {}) {
  return { ok: false as const, error: { code, message, ...extra } };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length > 0 ? base : "franchise";
}

/** Deterministic, so a test can assert a URL. Live, this is 16 bytes from the server's CSPRNG. */
function mockHandle(seed: string): string {
  let out = "";
  let hash = 0x811c9dc5;
  for (let round = 0; out.length < 32; round += 1) {
    const input = `${seed}:${round}`;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    out += hash.toString(16).padStart(8, "0");
  }
  return out.slice(0, 32);
}

/**
 * The origin the copied link points at.
 *
 * The real route builds this from server config. In the browser the current origin is the only
 * answer that is not a lie, and it also means the link an admin copies lands on this app's
 * `invalid_handle` screen rather than on production.
 */
function origin(): string {
  return typeof window !== "undefined" && window.location
    ? window.location.origin
    : "http://localhost:3000";
}

export type MockAdminFranchiseListQuery = {
  limit?: number;
  cursor?: string;
  queue?: "review";
};

export type MockAdminFranchiseOptions = {
  /** Simulated round-trip, so the panel's pending states are real. */
  latencyMs?: number;
  /** Injected clock, so tests get stable timestamps. */
  now?: () => string;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function createMockAdminFranchiseApi(options: MockAdminFranchiseOptions = {}) {
  const { latencyMs = 0, now = () => new Date().toISOString() } = options;

  const delay = () =>
    latencyMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
      : Promise.resolve();

  function load(franchiseId: string): AdminFranchiseView | null {
    ensureSeeded(Date.parse(now()));
    return store.get(franchiseId) ?? null;
  }

  function touch(view: AdminFranchiseView, at: string): OnboardingResult<unknown> {
    view.updatedAt = at;
    view.currentStep = currentStepFor(view.completedSteps as FranchiseOnboardingStep[]);
    return { ok: true, data: view as unknown };
  }

  return {
    async list(query: MockAdminFranchiseListQuery = {}): Promise<OnboardingResult<unknown>> {
      await delay();
      ensureSeeded(Date.parse(now()));
      const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const all = [...store.values()];

      if (query.queue === "review") {
        // Oldest first, no paging: the sparse index the real handler reads holds only what is
        // waiting on us, and a queue sorted newest-first would bury the one that has waited longest.
        const waiting = all
          .filter((view) => FRANCHISE_REVIEW_STATUSES.includes(view.status))
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        return {
          ok: true,
          data: {
            queue: "review",
            franchises: waiting.slice(0, limit).map(row),
            nextCursor: null,
          } as unknown,
        };
      }

      const sorted = all.sort(byCreatedDesc);
      const start = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
      if (Number.isNaN(start) || start < 0) return fail("validation", "That cursor is not valid.");
      const page = sorted.slice(start, start + limit);
      const end = start + page.length;

      return {
        ok: true,
        data: {
          queue: null,
          franchises: page.map(row),
          nextCursor: end < sorted.length ? String(end) : null,
        } as unknown,
      };
    },

    async get(franchiseId: string): Promise<OnboardingResult<unknown>> {
      await delay();
      const view = load(franchiseId);
      if (!view) return fail("invalid_token", "No franchise with that id.");
      return { ok: true, data: view as unknown };
    },

    async create(body: AdminFranchiseInviteBody): Promise<OnboardingResult<AdminFranchiseInviteResult>> {
      await delay();
      const at = now();
      ensureSeeded(Date.parse(at));

      const fieldErrors: Record<string, string> = {};
      if (body.legalEntityName.trim().length < 3) {
        fieldErrors.legalEntityName = "The legal entity name is required.";
      }
      if (!body.noticesEmail.includes("@")) {
        fieldErrors.noticesEmail = "A valid email address is required.";
      }
      if (!Number.isInteger(body.investmentPaise) || body.investmentPaise <= 0) {
        fieldErrors.investmentPaise = "The investment must be a whole number of paise above zero.";
      }
      if (!Number.isInteger(body.machineAllocation) || body.machineAllocation < 1) {
        fieldErrors.machineAllocation = "At least one machine.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        return fail("validation", "Some of those details need another look.", { fieldErrors });
      }

      created += 1;
      const franchiseId = `fr_mock_new_${String(created).padStart(2, "0")}`;
      const tradeName = body.tradeName.trim() || body.legalEntityName.trim();
      const slug = slugify(tradeName);
      const published = franchiseTier(body.tier);

      const view = emptyView(
        {
          franchiseId,
          slug,
          tradeName,
          legalEntityName: body.legalEntityName.trim(),
          entityType: body.entityType === "" ? "proprietorship" : body.entityType,
          tier: body.tier,
          email: body.noticesEmail,
          phone: body.noticesPhone,
          pan: "",
          regNo: "000000",
          city: "",
          proposedState: "",
          proposedDistricts: [],
          status: "invited",
          invitedDaysAgo: 0,
          sourceApplicationId: body.sourceApplicationId ?? undefined,
        },
        at,
      );
      // The two figures an admin may have overridden on the form. Everything else on `terms` is
      // the tier's published default, which `emptyView` already read from `program.ts`.
      view.terms.investmentPaise = body.investmentPaise;
      view.terms.machineAllocation = body.machineAllocation;
      view.terms.capitalRecoveryPaise =
        published.capitalRecoveryInr === null ? null : body.investmentPaise;
      store.set(franchiseId, view);

      const handle = mockHandle(franchiseId);
      return {
        ok: true,
        data: {
          franchiseId,
          slug,
          onboardingUrl: `${origin()}/franchise/onboarding/${slug}/${handle}`,
          tokenId: `tok_new_${String(created).padStart(2, "0")}`,
          expiresAt: new Date(Date.parse(at) + INVITE_TTL_MS).toISOString(),
          // There is no franchise invite sender. Open question 12.
          emailed: false,
        },
      };
    },

    async decide(
      franchiseId: string,
      body: AdminFranchiseApprovalBody,
    ): Promise<OnboardingResult<unknown>> {
      await delay();
      const at = now();
      const view = load(franchiseId);
      if (!view) return fail("invalid_token", "No franchise with that id.");

      // Step 3 has to be in before there is anything to decide, and a decision is not revisited:
      // both are the server's calls to make, so the mock makes them here rather than trusting a
      // disabled button.
      if (!FRANCHISE_REVIEW_STATUSES.includes(view.status)) {
        return fail(
          "wrong_step",
          view.approval
            ? "This franchise has already been decided."
            : "This franchise has not submitted its KYC yet.",
        );
      }

      if (body.outcome === "approved") {
        if (body.grantedTerritory.trim().length === 0) {
          return fail("validation", "An approval needs the territory being granted.", {
            fieldErrors: { grantedTerritory: "Required on an approval." },
          });
        }
        if (view.territory) {
          view.territory.grantedTier = body.grantedTier ?? view.territory.tier;
          view.territory.grantedTerritory = body.grantedTerritory;
          view.territory.grantedBoundary = body.grantedBoundary;
          view.territory.grantedExclusions = body.grantedExclusions;
          view.territory.grantedAt = at;
        }
        view.approval = {
          outcome: "approved",
          decidedAt: at,
          decidedByEmail: ADMIN_EMAIL,
          internalReason: body.internalReason,
          approvedAt: at,
        };
        view.status = "approved";
        view.timestamps.approvedAt = at;
        view.timestamps.decidedAt = at;
        if (!view.completedSteps.includes(4)) view.completedSteps = [...view.completedSteps, 4];
        return touch(view, at);
      }

      view.approval = {
        outcome: body.outcome,
        decidedAt: at,
        decidedByEmail: ADMIN_EMAIL,
        internalReason: body.internalReason,
        approvedAt: null,
      };
      view.status = body.outcome;
      view.timestamps.decidedAt = at;
      return touch(view, at);
    },

    async verifyPayment(
      franchiseId: string,
      instalmentNo: number,
      body: AdminFranchisePaymentVerifyBody,
    ): Promise<OnboardingResult<unknown>> {
      await delay();
      const at = now();
      const view = load(franchiseId);
      if (!view) return fail("invalid_token", "No franchise with that id.");

      const payment = view.payments.find((p) => p.instalmentNo === instalmentNo);
      if (!payment) return fail("validation", "No such instalment on this franchise.");
      if (payment.state === "verified") {
        return fail("wrong_step", "That instalment is already confirmed.");
      }
      if (!payment.claim) {
        return fail("wrong_step", "The franchisee has not claimed this instalment yet.");
      }
      if (!Number.isInteger(body.receivedPaise) || body.receivedPaise <= 0) {
        return fail("validation", "Enter the amount that arrived.", {
          fieldErrors: { receivedPaise: "A whole number of rupees above zero." },
        });
      }

      payment.state = "verified";
      payment.receivedPaise = body.receivedPaise;
      payment.verifiedAt = at;
      payment.verifiedByEmail = ADMIN_EMAIL;
      payment.rejectedAt = null;
      payment.reason = null;
      view.status = "payment_verified";
      view.timestamps.paymentVerifiedAt = at;
      if (!view.completedSteps.includes(8)) view.completedSteps = [...view.completedSteps, 8];
      return touch(view, at);
    },

    async refusePayment(
      franchiseId: string,
      instalmentNo: number,
      body: AdminFranchisePaymentRefuseBody,
    ): Promise<OnboardingResult<unknown>> {
      await delay();
      const at = now();
      const view = load(franchiseId);
      if (!view) return fail("invalid_token", "No franchise with that id.");

      const payment = view.payments.find((p) => p.instalmentNo === instalmentNo);
      if (!payment) return fail("validation", "No such instalment on this franchise.");
      if (payment.state === "verified") {
        return fail("wrong_step", "That instalment is already confirmed.");
      }
      if (body.reason.trim().length === 0) {
        return fail("validation", "The franchisee is shown this reason, so it cannot be blank.", {
          fieldErrors: { reason: "Required." },
        });
      }

      payment.state = "rejected";
      payment.rejectedAt = at;
      payment.reason = body.reason.trim();
      // The status deliberately does not move: §7.3's ladder is forward-only, and a refusal returns
      // the franchisee to the claim form rather than unwinding the record.
      return touch(view, at);
    },
  };
}

export type MockAdminFranchiseApi = ReturnType<typeof createMockAdminFranchiseApi>;

/** The two records the undeployed writes act on, so a test does not hunt for them. */
export const MOCK_ADMIN_FRANCHISE_TARGETS = {
  awaitingDecision: "fr_mock_0004",
  awaitingPayment: "fr_mock_0009",
} as const;
