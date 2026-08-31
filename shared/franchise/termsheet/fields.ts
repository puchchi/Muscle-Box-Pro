/**
 * Bridge from franchise onboarding state to term sheet template fields.
 *
 * The counterpart of `shared/onboarding/agreementFields.ts`, and everything that file says
 * about being copied into `mbp-backend` applies here: the rendered text depends on this
 * module as much as on the renderer, and a server that formats `₹12,50,000` where another
 * formats `₹ 12,50,000` produces a well-formed hash of a different document.
 *
 * ## Absence is a mechanism here, not an oversight
 *
 * The gym bridge returns a complete `AgreementFields`. This one returns a `Partial`, because
 * three sets of values legitimately do not exist yet and the term sheet must refuse to be
 * issued rather than invent them:
 *
 *   - the **approved territory**, which exists only once we have approved something. A term
 *     sheet for an unapproved franchise therefore has no territory to render and cannot be
 *     issued at all;
 *   - the **City tier's payment schedule and recovery threshold**, deferred by the program
 *     document (§6, §21) and set per franchise by an admin;
 *   - the **warehouse and operations contact**, until step 6 is submitted.
 *
 * Each missing value is an unresolved token, and `canIssue()` refuses on one. That is the
 * whole check — there is no second list of preconditions to keep in step with this function
 * (docs/franchise-onboarding.md §5).
 */

import { rupeesInWords } from "../../agreement/amountInWords";
import { MBP_NOTICES, formatAgreementDate } from "../../onboarding/agreementFields";
import { ENTITY_TYPE_LABELS } from "../../onboarding/schema";
import type { FranchiseOnboardingState } from "../onboarding/types";
import { formatInr, franchiseTier } from "../program";
import type { FranchiseTermSheetFields } from "./types";

/**
 * How long a term sheet stays open.
 *
 * Open question 3 in the plan, answered here at six weeks and change so that it *is* answered:
 * a binding term sheet with no expiry is a binding offer forever, and territory availability
 * moves. Long enough for counsel to read it and a bank transfer to clear, short enough that a
 * territory is not held indefinitely by somebody who has stopped replying.
 */
export const TERM_SHEET_VALIDITY_DAYS = 45;

/**
 * The date a term sheet issued on `effectiveDateIso` lapses, as an ISO date.
 *
 * Arithmetic in UTC on a date with no time in it, so the answer does not depend on the machine
 * — the same reason `formatAgreementDate` formats in UTC. The result is rendered into the
 * hashed text, so two servers disagreeing about it would be two different documents.
 */
export function termSheetValidUntil(effectiveDateIso: string): string {
  const start = Date.parse(`${effectiveDateIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start)) return effectiveDateIso;
  return new Date(start + TERM_SHEET_VALIDITY_DAYS * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Paise to whole rupees.
 *
 * Rounded rather than refused: every amount in this document is agreed, invoiced and
 * transferred in whole rupees, and a percentage of an investment can leave a sub-rupee
 * remainder that nobody could pay exactly. Rounding at the one point that formats is better
 * than a term sheet stating ₹12,50,000.005.
 */
function rupees(paise: number): number {
  return Math.round(paise / 100);
}

function formatPaise(paise: number): string {
  return formatInr(rupees(paise));
}

/**
 * State → fields, for a given effective date.
 *
 * The date is a parameter rather than read off `state.termSheet`, because the server has to
 * render this *before* there is a pinned document to read it from — that call is what creates
 * one.
 */
export function toTermSheetFields(
  state: FranchiseOnboardingState,
  effectiveDateIso: string,
): Partial<FranchiseTermSheetFields> {
  const { details, terms, approval, operations } = state;

  const fields: Partial<FranchiseTermSheetFields> = {
    franchiseeLegalName: details.legalEntityName,
    franchiseeEntityType: ENTITY_TYPE_LABELS[details.entityType],
    franchiseePan: details.pan,
    registeredAddress: details.registeredAddress,
    signatoryName: details.signatoryName,
    signatoryDesignation: details.signatoryDesignation,

    effectiveDate: formatAgreementDate(effectiveDateIso),
    validUntil: formatAgreementDate(termSheetValidUntil(effectiveDateIso)),

    tierName: franchiseTier(terms.tier).name,
    machineAllocation: String(terms.machineAllocation),

    investment: formatPaise(terms.investmentPaise),
    // Both from the same integer, so the investment cannot be stated as one amount in figures
    // and a different one in words. See shared/agreement/amountInWords.ts.
    investmentInWords: rupeesInWords(rupees(terms.investmentPaise)),

    proteinShareDuringRecovery: `${terms.proteinSharePctDuringRecovery}%`,
    proteinShareAfterRecoveryFranchisee: `${terms.proteinSharePctAfterRecovery}%`,
    proteinShareAfterRecoveryMbp: `${100 - terms.proteinSharePctAfterRecovery}%`,
    advertisingShareFranchisee: `${terms.advertisingFranchiseeSharePct}%`,
    advertisingShareMbp: `${terms.advertisingMbpSharePct}%`,

    mbpNotices: { ...MBP_NOTICES },
    franchiseeNotices: {
      // Notices go to the registered address the franchisee nominated, not to a warehouse.
      address: details.registeredAddress,
      email: details.noticesEmail,
      phone: details.noticesPhone,
    },
  };

  if (approval?.outcome === "approved") {
    fields.territory = approval.territory;
    fields.territoryBoundary = approval.territoryBoundary;
  }

  if (terms.capitalRecoveryPaise !== null) {
    fields.capitalRecoveryThreshold = formatPaise(terms.capitalRecoveryPaise);
  }

  const schedule = terms.paymentSchedule;
  if (schedule && schedule.length >= 2) {
    fields.firstInstalment = formatPaise((terms.investmentPaise * schedule[0].pct) / 100);
    fields.firstInstalmentTrigger = schedule[0].trigger;
    fields.secondInstalment = formatPaise((terms.investmentPaise * schedule[1].pct) / 100);
    fields.secondInstalmentTrigger = schedule[1].trigger;
  }

  if (operations) {
    fields.warehouseAddress = operations.warehouseAddress;
    fields.operationsContactName = operations.operationsContactName;
    fields.operationsContactPhone = operations.operationsContactPhone;
  }

  return fields;
}
