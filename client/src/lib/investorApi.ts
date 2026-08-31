/**
 * Submitting an investor enquiry from /invest.
 *
 * `POST /investor/enquiries` on the AWS API, which took over from the `investor-request`
 * Supabase edge function on 2026-08-31 (mbp-backend `f08a35c`, design §12). That function is
 * still deployed and nothing calls it any more: Supabase is frozen, so it is left in place
 * rather than removed. The 19 rows it wrote were copied into DynamoDB, not moved, which is
 * why `/admin/leads/investor` still shows enquiries made before the cutover.
 *
 * Goes through [apiClient.ts](./apiClient.ts) for the reasons that file documents, the same
 * as [franchiseApi.ts](./franchiseApi.ts).
 *
 * Three things about the responses are worth knowing before reading the caller:
 *
 *   - **Every accepted outcome is a 202, including a duplicate and a rate-limited one.** A
 *     resubmission inside ten minutes, or a fourth in a day, answers with the reference the
 *     *earlier* submission was given and no `emailed` key. So this client cannot distinguish
 *     those from a fresh acceptance and deliberately does not try — the enquirer is told the
 *     truth either way, because we do have their enquiry under that reference.
 *   - **`emailed` reports the enquirer's own acknowledgement**, which is the mail carrying the
 *     deck. `false` means the enquiry is stored but nothing was sent, and that is the one case
 *     where the success copy must not promise an email.
 *   - **400 carries every field problem at once**, keyed by the names in `InvestorEnquiryInput`,
 *     so a form with two mistakes in it is one round trip.
 */

import { apiRequest } from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";

/**
 * What the form sends. The three optional fields are omitted rather than sent as `""`:
 * absent and blank mean the same thing to the endpoint, and omitting them keeps that true
 * here rather than relying on it there.
 */
export type InvestorEnquiryInput = {
  name: string;
  email: string;
  firm?: string;
  investorType?: string;
  message?: string;
};

/** The field names a 400 can mark, which is every field the endpoint reads. */
export const INVESTOR_ENQUIRY_FIELDS = ["name", "email", "firm", "investorType", "message"] as const;

export type InvestorEnquiryField = (typeof INVESTOR_ENQUIRY_FIELDS)[number];

export type InvestorEnquiryReceipt = {
  /** `MBP-IN-…`, for the enquirer to quote. */
  reference?: string;
  /** Absent on a duplicate or a throttled submission — see the note above. */
  emailed?: boolean;
  emailReason?: string;
};

export function submitInvestorEnquiry(
  input: InvestorEnquiryInput,
): Promise<OnboardingResult<InvestorEnquiryReceipt>> {
  return apiRequest<InvestorEnquiryReceipt>("POST", "/investor/enquiries", { body: input });
}
