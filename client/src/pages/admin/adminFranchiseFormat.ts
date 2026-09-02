/**
 * Display helpers and derived counts for the panel's franchise screens.
 *
 * [adminFormat.ts](./adminFormat.ts) and [adminFunnel.ts](./adminFunnel.ts) in one file rather than
 * two, because the franchise side of both is small and the interesting part is shared between them:
 * seventeen statuses is too many to put on a page as either labels or funnel rows, so almost
 * everything here is about **grouping** them. Formatting helpers proper (`formatIstDateTime`,
 * `formatPaiseAsInr`, `ENTITY_TYPE_LABEL`) are imported from `adminFormat.ts`; there is no franchise
 * copy of them.
 *
 * The counts have `adminFunnel.ts`'s constraint and it is tighter here. `AdminFranchiseListRow`
 * carries eleven fields and **neither the tier nor the investment** — both live on `TERMS`, which
 * the list handler does not read — so nothing on this surface can total what the pipeline is worth.
 * Every figure below is a count of records, over the rows actually fetched, and the page says so.
 */

import type { AdminFranchiseListRow } from "@shared/admin/franchises";
import type {
  FranchiseDocumentType,
  FranchiseOnboardingStatus,
  FranchiseOnboardingStep,
} from "@shared/franchise/onboarding/types";
import type { EntityType } from "@shared/onboarding/types";
import { franchiseTier, type FranchiseTierId } from "@shared/franchise/program";
import { ENTITY_TYPE_LABEL } from "./adminFormat";
import {
  FRANCHISE_PHASES,
  franchisePhaseOf,
  franchiseStepMeta,
  type FranchisePhaseId,
} from "@shared/franchise/onboarding/steps";

/**
 * The seventeen rungs, in words.
 *
 * States rather than events, matching `STATUS_LABEL` on the gym side. Two are phrased against the
 * grain on purpose: `under_review` says "with us" because the whole point of the review queue is
 * that the franchisee cannot move it, and `payment_claimed` says "claimed" rather than "paid"
 * because nobody has looked at a bank statement yet.
 */
export const FRANCHISE_STATUS_LABEL: Record<FranchiseOnboardingStatus, string> = {
  invited: "Invited",
  opened: "Opened the link",
  details_submitted: "Details submitted",
  territory_submitted: "Territory proposed",
  kyc_submitted: "KYC submitted",
  under_review: "Under review with us",
  approved: "Approved",
  on_hold: "On hold",
  declined: "Declined",
  franchise_ack: "Terms acknowledged",
  operations_submitted: "Operations submitted",
  termsheet_viewed: "Term sheet viewed",
  esign_requested: "Out for signature",
  signed: "Signed",
  payment_claimed: "Instalment claimed",
  payment_verified: "Instalment verified",
  active: "Active",
};

/**
 * Tailwind classes per status, coloured by **who owes the next move**.
 *
 * Not by progress, which is what `STATUS_CLASS` does on the gym side and what would be wrong here:
 * a franchise at `esign_requested` is further along than one at `kyc_submitted`, but only the second
 * is a job on someone's desk. So amber means us, grey means them, blue means signed and waiting on
 * mechanics, green is the finish line, and red is the one terminal rung.
 */
export const FRANCHISE_STATUS_CLASS: Record<FranchiseOnboardingStatus, string> = {
  invited: "bg-gray-100 text-gray-700",
  opened: "bg-gray-100 text-gray-700",
  details_submitted: "bg-gray-100 text-gray-700",
  territory_submitted: "bg-gray-100 text-gray-700",
  kyc_submitted: "bg-amber-50 text-amber-800",
  under_review: "bg-amber-50 text-amber-800",
  approved: "bg-gray-100 text-gray-700",
  on_hold: "bg-orange-50 text-orange-700",
  declined: "bg-red-50 text-red-700",
  franchise_ack: "bg-gray-100 text-gray-700",
  operations_submitted: "bg-gray-100 text-gray-700",
  termsheet_viewed: "bg-gray-100 text-gray-700",
  esign_requested: "bg-gray-100 text-gray-700",
  signed: "bg-blue-50 text-blue-700",
  payment_claimed: "bg-amber-50 text-amber-800",
  payment_verified: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
};

/**
 * The happy path, in order.
 *
 * `on_hold` and `declined` are not on it, and that is not an omission: both branch off
 * `under_review`, `declined` is terminal, and a ladder that listed them between `approved` and
 * `franchise_ack` would sort a declined franchise into the middle of the pipeline.
 */
export const FRANCHISE_STATUS_LADDER: readonly FranchiseOnboardingStatus[] = [
  "invited",
  "opened",
  "details_submitted",
  "territory_submitted",
  "kyc_submitted",
  "under_review",
  "approved",
  "franchise_ack",
  "operations_submitted",
  "termsheet_viewed",
  "esign_requested",
  "signed",
  "payment_claimed",
  "payment_verified",
  "active",
];

/**
 * The step a franchise at this status is **on**, not the one it last finished.
 *
 * The list row has no `currentStep` — only the detail read derives one — so this is how a status
 * becomes a place in the nine-step flow. It is the same answer the wizard would give: a franchise at
 * `details_submitted` is looking at step 2.
 */
export const FRANCHISE_STATUS_STEP: Record<FranchiseOnboardingStatus, FranchiseOnboardingStep> = {
  invited: 1,
  opened: 1,
  details_submitted: 2,
  territory_submitted: 3,
  kyc_submitted: 4,
  under_review: 4,
  approved: 5,
  on_hold: 4,
  declined: 4,
  franchise_ack: 6,
  operations_submitted: 7,
  termsheet_viewed: 7,
  esign_requested: 7,
  signed: 8,
  payment_claimed: 8,
  payment_verified: 9,
  active: 9,
};

/** "Step 4 · Approval", for a row that has no room for a sentence. */
export function franchiseStepLabel(status: FranchiseOnboardingStatus): string {
  const step = FRANCHISE_STATUS_STEP[status];
  return `Step ${step} · ${franchiseStepMeta(step).shortTitle}`;
}

// ── Groups ──────────────────────────────────────────────────────────────────

export type FranchiseGroupId = "waiting" | "moving" | "committed" | "active" | "attention";

/**
 * Which group each status falls in — an exhaustive `Record`, so a new status cannot be added to the
 * ladder without landing in one of these buckets or failing the build.
 *
 * The split that matters is `waiting` against `moving`: **`waiting` is every status where the next
 * action is ours.** Three of them, and each has a button on the detail page — `kyc_submitted` and
 * `under_review` need a decision, `payment_claimed` needs a bank statement checked. A franchise
 * sitting in `moving` may be just as stuck, but chasing it is a phone call rather than a task.
 */
export const FRANCHISE_GROUP_OF: Record<FranchiseOnboardingStatus, FranchiseGroupId> = {
  invited: "moving",
  opened: "moving",
  details_submitted: "moving",
  territory_submitted: "moving",
  kyc_submitted: "waiting",
  under_review: "waiting",
  approved: "moving",
  on_hold: "attention",
  declined: "attention",
  franchise_ack: "moving",
  operations_submitted: "moving",
  termsheet_viewed: "moving",
  esign_requested: "moving",
  signed: "committed",
  payment_claimed: "waiting",
  payment_verified: "committed",
  active: "active",
};

export const FRANCHISE_GROUPS: readonly {
  id: FranchiseGroupId;
  label: string;
  /** One line, shown where the group is the heading rather than a chip. */
  note: string;
}[] = [
  { id: "waiting", label: "With us", note: "A decision or a bank check is ours to make." },
  { id: "moving", label: "With them", note: "Somewhere in the nine steps, and it is their move." },
  { id: "committed", label: "Signed", note: "A binding term sheet, not yet an active franchise." },
  { id: "active", label: "Active", note: "Signed, funded and live." },
  { id: "attention", label: "Held or declined", note: "On hold, or declined and terminal." },
];

export function franchiseStatusesInGroup(group: FranchiseGroupId): FranchiseOnboardingStatus[] {
  return (Object.keys(FRANCHISE_GROUP_OF) as FranchiseOnboardingStatus[]).filter(
    (status) => FRANCHISE_GROUP_OF[status] === group,
  );
}

// ── Derived counts ──────────────────────────────────────────────────────────

export type FranchisePhaseRow = {
  phase: FranchisePhaseId;
  title: string;
  count: number;
  /** Share of the counted rows, 0–100. Rounded for display only; never summed. */
  pct: number;
};

export type FranchiseFunnelSummary = {
  /** Four rows, one per phase of the wizard. Seventeen status rows would not be read. */
  phases: FranchisePhaseRow[];
  counts: Record<FranchiseGroupId, number>;
  counted: number;
  /**
   * Whether `counted` is every franchise there is.
   *
   * False means the list paged out, and every figure above is a floor. `adminFunnel.ts`'s reasoning
   * for why this travels with the numbers rather than being assumed.
   */
  complete: boolean;
};

export function summariseFranchises(
  rows: AdminFranchiseListRow[],
  complete: boolean,
): FranchiseFunnelSummary {
  const counts: Record<FranchiseGroupId, number> = {
    waiting: 0,
    moving: 0,
    committed: 0,
    active: 0,
    attention: 0,
  };
  const phaseCounts = new Map<FranchisePhaseId, number>(
    FRANCHISE_PHASES.map((phase) => [phase.id, 0]),
  );

  for (const row of rows) {
    // `?? "moving"` rather than trusting the map: the status enum is validated on the way in, so an
    // unmapped value means a rung was added and this file was not updated. Counting it as in-flight
    // keeps the totals honest; the status chip beside it will read as unknown either way.
    const group = FRANCHISE_GROUP_OF[row.status] ?? "moving";
    counts[group] += 1;
    const phase = franchisePhaseOf(FRANCHISE_STATUS_STEP[row.status] ?? 1).id;
    phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
  }

  const counted = rows.length;
  return {
    phases: FRANCHISE_PHASES.map((phase) => {
      const count = phaseCounts.get(phase.id) ?? 0;
      return {
        phase: phase.id,
        title: phase.title,
        count,
        pct: counted === 0 ? 0 : Math.round((count / counted) * 100),
      };
    }),
    counts,
    counted,
    complete,
  };
}

/**
 * How long a franchise has sat where it is, in whole days, or null where the question does not
 * apply.
 *
 * Null at `active` because it is finished, and null at `declined` because it is over. **Not null at
 * `on_hold`**, which is the case this exists for: a hold is a franchise we asked something of and
 * nothing has come back, and it is the one rung where "quiet for eleven days" is the whole problem.
 *
 * `updatedAt` carries `stalledFor`'s caveat unchanged: it is the row's last write of any kind, so an
 * admin editing terms bumps it without the franchisee doing anything.
 */
export function franchiseStalledFor(row: AdminFranchiseListRow, now: number): number | null {
  if (row.status === "active" || row.status === "declined") return null;
  const at = Date.parse(row.updatedAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / 86_400_000));
}

export type StalledFranchise = { row: AdminFranchiseListRow; days: number };

/**
 * The franchises worth chasing: unfinished, and quiet for at least `thresholdDays`.
 *
 * Longest-quiet first, capped rather than paged, for `stalledGyms`'s reasons. The threshold is five
 * days rather than the gym flow's three, and the difference is the flow: a franchisee is filling in
 * a nine-step form with a warehouse address and six months of bank statements in it, and three days
 * of quiet in the middle of that is not yet a problem.
 */
export function stalledFranchises(
  rows: AdminFranchiseListRow[],
  now: number,
  { thresholdDays = 5, limit = 8 }: { thresholdDays?: number; limit?: number } = {},
): StalledFranchise[] {
  return rows
    .map((row) => ({ row, days: franchiseStalledFor(row, now) }))
    .filter((entry): entry is StalledFranchise => entry.days !== null && entry.days >= thresholdDays)
    .sort((a, b) => b.days - a.days)
    .slice(0, limit);
}

/**
 * What to call a franchise on screen.
 *
 * The trade name, because that is the only name the invite requires and the legal entity name is
 * empty until step 1 lands. Falling back the other way round would leave the earliest rows in the
 * list — the ones most likely to need chasing — showing an id.
 */
export function franchiseNameOf(row: AdminFranchiseListRow): string {
  return row.tradeName || row.legalEntityName || row.franchiseId;
}

// ── Labels the detail page needs ────────────────────────────────────────────

/** The four KYC types plus the payment screenshot, which is a document of a different kind. */
export const FRANCHISE_DOC_TYPE_LABEL: Record<FranchiseDocumentType, string> = {
  pan_card: "PAN card",
  entity_proof: "Entity proof",
  address_proof: "Address proof",
  signatory_id: "Signatory ID",
  payment_proof: "Transfer proof",
};

export const FRANCHISE_PAYMENT_STATE_LABEL: Record<"pending" | "verified" | "rejected", string> = {
  pending: "Not yet confirmed",
  verified: "Confirmed against the bank",
  rejected: "Claim refused",
};

export const FRANCHISE_PAYMENT_STATE_CLASS: Record<"pending" | "verified" | "rejected", string> = {
  pending: "bg-amber-50 text-amber-800",
  verified: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export const LOGISTICS_LABEL: Record<"own_vehicle" | "contracted" | "undecided", string> = {
  own_vehicle: "Their own vehicle",
  contracted: "A contracted carrier",
  undecided: "Not decided yet",
};

export const APPROVAL_OUTCOME_LABEL: Record<"approved" | "on_hold" | "declined", string> = {
  approved: "Approved",
  on_hold: "On hold",
  declined: "Declined",
};

/** The tier's own short name, so one string is not maintained in two places. */
export function franchiseTierLabel(tier: FranchiseTierId): string {
  return franchiseTier(tier).shortName;
}

/** `ENTITY_TYPE_LABEL` cannot be indexed by `""`, and `""` means "they have not told us yet". */
export function franchiseEntityLabel(entityType: EntityType | ""): string {
  return entityType === "" ? "" : ENTITY_TYPE_LABEL[entityType];
}
