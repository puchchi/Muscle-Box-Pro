/**
 * The link that carries an enquiry into the invite form, and the reading of it.
 *
 * One module because it is one contract: five query parameters, written by the enquiry list and read
 * by `AdminInviteFranchise`. Split across the two files they would drift, and a renamed parameter is
 * silent — the form simply opens blank and an admin retypes what we already knew.
 *
 * **What is deliberately not filled in: the legal entity name.** The only candidate is the applicant's
 * free-text `company`, and that name is what the term sheet identifies its counterparty by and what
 * Leegality binds a signature against. `AdminFranchiseActions` makes the same call about a granted
 * territory: a field arriving pre-filled with what somebody asked for is a value nobody chose the
 * moment they click past it. What was written is shown beside the field instead, so `company` is here
 * for that panel and not for any input.
 *
 * `applicant` does fill `contactName`, and the distinction is the point. It is the person's own name
 * from their own submission, it reaches an email greeting and a list heading rather than a signed
 * document, and there is no second source for it. Asking an admin to retype what the enquiry already
 * told us would be the retyping this module exists to prevent.
 */

import { FRANCHISE_TIERS, type FranchiseTierId } from "@shared/franchise/program";
import {
  inviteDefaults,
  type AdminFranchiseInviteFormInput,
} from "@shared/admin/franchiseInvite";

const PARAM = {
  application: "application",
  email: "email",
  phone: "phone",
  tier: "tier",
  applicant: "applicant",
  company: "company",
} as const;

export type ConvertibleApplication = {
  applicationId: string;
  email: string;
  mobile: string;
  tier: string;
  name: string;
  /** `null` when the applicant left it blank, which is what the enquiry row carries. */
  company?: string | null;
};

export function inviteHrefForApplication(row: ConvertibleApplication): string {
  const params = new URLSearchParams({
    [PARAM.application]: row.applicationId,
    [PARAM.email]: row.email,
    [PARAM.phone]: row.mobile,
    [PARAM.tier]: row.tier,
    [PARAM.applicant]: row.name,
  });
  if (row.company?.trim()) params.set(PARAM.company, row.company.trim());
  return `/admin/franchises/new?${params.toString()}`;
}

/** What the invite form shows about where its values came from. Null when this is a fresh invite. */
export type InviteSource = {
  applicationId: string;
  applicantName: string;
  company: string | null;
};

export type InvitePrefill = {
  defaults: AdminFranchiseInviteFormInput;
  source: InviteSource | null;
};

/**
 * Read the link, falling back to a blank Territory invite.
 *
 * The tier is checked against `FRANCHISE_TIERS` rather than trusted: it selects which set of
 * commercials the two prefilled figures come from, and an id that no longer exists would put a
 * franchise on numbers from nowhere. An unrecognised one is dropped, not defaulted quietly to
 * something adjacent.
 *
 * `application` is what makes this a conversion. Without it the other parameters are ignored, so a
 * hand-edited URL cannot half-prefill a form whose `sourceApplicationId` is empty.
 */
export function invitePrefillFrom(params: URLSearchParams | null): InvitePrefill {
  const applicationId = params?.get(PARAM.application)?.trim() ?? "";
  if (applicationId === "") return { defaults: inviteDefaults("territory"), source: null };

  const tier = params?.get(PARAM.tier)?.trim() ?? "";
  const known = FRANCHISE_TIERS.some((entry) => entry.id === tier);
  const defaults = inviteDefaults(known ? (tier as FranchiseTierId) : "territory");
  const company = params?.get(PARAM.company)?.trim() ?? "";
  const applicantName = params?.get(PARAM.applicant)?.trim() ?? "";

  return {
    defaults: {
      ...defaults,
      contactName: applicantName,
      noticesEmail: params?.get(PARAM.email)?.trim() ?? "",
      noticesPhone: params?.get(PARAM.phone)?.trim() ?? "",
      sourceApplicationId: applicationId,
    },
    source: {
      applicationId,
      applicantName,
      company: company === "" ? null : company,
    },
  };
}
