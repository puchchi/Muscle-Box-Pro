/**
 * The invite-a-franchise form, and what it sends.
 *
 * `shared/admin/invite.ts` for the franchise side, and much smaller than it — nine fields against
 * eighteen. The reason is the same argument that stripped eleven fields off the gym invite, applied
 * from the start: `validateFranchiseInvite` writes **nine identity fields as `""` and ignores them
 * if an admin sends values**, because they are what the term sheet identifies its counterparty by
 * and what Digio binds a signature against. PAN, GSTIN, CIN, LLPIN, the registered address and the
 * whole signatory block come from the franchisee's own step 1 or from nowhere.
 *
 * ## The form is in rupees; the wire is in paise
 *
 * `investmentPaise` on the wire, `investmentInr` on the form, and `toAdminFranchiseInviteBody`
 * multiplies. Nobody types 250000000 into a box, and the handler's own error message ("so
 * ₹12,50,000 is 125000000") is evidence of what happens when they try. The conversion lives here
 * rather than in the component for the reason the wizard's money fields give: one place that knows
 * the factor of 100.
 *
 * The gym form does the opposite — it sends `securityDepositInr` and the *server* multiplies. Two
 * conventions across two forms in one dashboard is open question 11 in
 * `docs/franchise-onboarding.md`. This file takes the franchise route's side because that is the
 * side that matches `mbp-backend`'s money rule.
 *
 * ## Field errors arrive bare
 *
 * Unlike `POST /admin/gyms`, which namespaces them (`details.gstin`, `terms.termMonths`),
 * `validateFranchiseInvite` reports flat keys: `tier`, `investmentPaise`, `machineAllocation`,
 * `legalEntityName`, `entityType`, `noticesEmail`, `noticesPhone`. `investmentPaise` is the one
 * that does not name a field on this form, so `INVITE_FIELD_FOR_WIRE` maps it.
 */

import * as z from "zod";
import { FRANCHISE_TIERS, franchiseTier, type FranchiseTierId } from "../franchise/program";
import type { EntityType } from "../onboarding/types";

/** The handler's ceiling, in rupees. A typo guard, not a policy. */
export const MAX_INVESTMENT_INR = 100_000_000;

/** Matching `MACHINE_ALLOCATION` in `adminInput.ts`. One is the load-bearing end. */
export const MACHINE_ALLOCATION = { min: 1, max: 200 } as const;

const tierIds = FRANCHISE_TIERS.map((t) => t.id) as [FranchiseTierId, ...FranchiseTierId[]];

/**
 * What the form holds.
 *
 * `entityType` is `""`-able because it is genuinely optional: the handler defaults an omitted one
 * to `proprietorship` and the franchisee overwrites it at step 1 regardless. An admin who does not
 * know should not have to guess, and the select says so.
 */
export const adminFranchiseInviteFormSchema = z.object({
  tier: z.enum(tierIds, { errorMap: () => ({ message: "Choose the franchise tier" }) }),
  /**
   * Rupees, whole. The wire's `investmentPaise` refuses a fraction of a rupee, so refusing it here
   * too keeps the error on the field the admin is looking at rather than after a round trip.
   */
  investmentInr: z
    .number({ invalid_type_error: "The investment is required" })
    .int("Whole rupees only")
    .positive("Must be more than zero")
    .max(MAX_INVESTMENT_INR, `Must be at most ₹${MAX_INVESTMENT_INR.toLocaleString("en-IN")}`),
  machineAllocation: z
    .number({ invalid_type_error: "The machine count is required" })
    .int("A whole number of machines")
    .min(MACHINE_ALLOCATION.min, "A franchise with no machines is not a franchise")
    .max(MACHINE_ALLOCATION.max, `At most ${MACHINE_ALLOCATION.max}`),
  legalEntityName: z
    .string()
    .trim()
    .min(3, "The legal entity name is required")
    .max(200, "Must be at most 200 characters"),
  tradeName: z.string().trim().max(200, "Must be at most 200 characters"),
  entityType: z.union([
    z.enum(["proprietorship", "partnership", "llp", "pvt_ltd", "unregistered"]),
    z.literal(""),
  ]),
  noticesEmail: z
    .string()
    .trim()
    .min(1, "An email address is required. It is where the invite goes.")
    .max(254)
    .email("That does not look like an email address"),
  noticesPhone: z.string().trim().max(20, "Must be at most 20 characters"),
  /** Set when converting an application. Not a field the admin types. */
  sourceApplicationId: z.string().trim(),
});

export type AdminFranchiseInviteFormInput = z.input<typeof adminFranchiseInviteFormSchema>;
export type AdminFranchiseInviteForm = z.output<typeof adminFranchiseInviteFormSchema>;

/** The wire shape. Flat, matching `validateFranchiseInvite`. */
export type AdminFranchiseInviteBody = {
  tier: FranchiseTierId;
  investmentPaise: number;
  machineAllocation: number;
  legalEntityName: string;
  tradeName: string;
  entityType: EntityType | "";
  noticesEmail: string;
  noticesPhone: string;
  sourceApplicationId: string | null;
};

export function toAdminFranchiseInviteBody(
  form: AdminFranchiseInviteForm,
): AdminFranchiseInviteBody {
  return {
    tier: form.tier,
    // Integer in, integer out: `investmentInr` is already `.int()`, so this cannot produce a
    // fractional paise value the handler would refuse.
    investmentPaise: form.investmentInr * 100,
    machineAllocation: form.machineAllocation,
    legalEntityName: form.legalEntityName,
    tradeName: form.tradeName,
    entityType: form.entityType,
    noticesEmail: form.noticesEmail,
    noticesPhone: form.noticesPhone,
    sourceApplicationId: form.sourceApplicationId === "" ? null : form.sourceApplicationId,
  };
}

/**
 * Where a server field error lands on this form.
 *
 * Only one entry, and it is the whole reason this exists: an `investmentPaise` error has no input
 * to attach to, so without the mapping it would be dropped and the admin would see a banner about
 * a field they cannot find. Every other key the handler reports is already a field name here.
 */
export const INVITE_FIELD_FOR_WIRE: Record<string, keyof AdminFranchiseInviteForm> = {
  investmentPaise: "investmentInr",
};

/**
 * A fresh form, at the chosen tier's published figures.
 *
 * Prefilled and editable rather than blank, for `AdminInviteGym`'s reason: nothing is hidden behind
 * a click and the number an admin needs to check is already the one on screen. The figures come
 * from `program.ts`, which is what that module is for — a new record's defaults and nothing else.
 * Everything downstream reads `state.terms`, so an edit here is the franchise's real number.
 */
export function inviteDefaults(tier: FranchiseTierId): AdminFranchiseInviteFormInput {
  const published = franchiseTier(tier);
  return {
    tier,
    investmentInr: published.investmentInr,
    machineAllocation: published.initialMachines,
    legalEntityName: "",
    tradeName: "",
    entityType: "",
    noticesEmail: "",
    noticesPhone: "",
    sourceApplicationId: "",
  };
}

/**
 * What `POST /admin/franchises` answers with.
 *
 * `emailed` is either value. The route does mail the link to `noticesEmail` unless `sendInvite` is
 * an explicit `false`, but `deliver` never throws, because nothing can reissue a handle this call
 * has already consumed: a mail failure has to be reported next to a URL the admin can still copy,
 * not turned into an error that loses it. So the screen shows `onboardingUrl` on both paths and
 * reads `emailed` to decide whether to ask for a manual send.
 */
export type AdminFranchiseInviteResult = {
  franchiseId: string;
  slug: string;
  /** `<base>/franchise/onboarding/<slug>/<32-hex handle>`. Shown exactly once. */
  onboardingUrl: string;
  tokenId: string;
  expiresAt: string;
  emailed: boolean;
};
