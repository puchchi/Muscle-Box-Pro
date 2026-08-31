/**
 * Submitting a franchise enquiry from /franchise.
 *
 * `POST /franchise/applications` is live on `api.muscleboxpro.com` (verified against the
 * deployed prod and sandbox stages on 2026-08-31). `Franchise.tsx` still renders a mailto
 * fallback carrying the applicant's own answers whenever a submission fails, and that stays:
 * a franchise enquiry is a ₹25–50 lakh lead, so a failure has to hand the applicant a way
 * through rather than ask them to retype it.
 *
 * Not a Supabase edge function, unlike `demo-request` (`investor-request` went the same way as
 * this one on 2026-08-31, see [investorApi.ts](./investorApi.ts)). New backend work goes to the
 * AWS API, and it goes through
 * [apiClient.ts](./apiClient.ts) so the credentials, content-type and error-mapping
 * rules stay in the one place that documents them.
 *
 * What the endpoint answers:
 *
 *   - 202 with `{ reference }` on acceptance, including for a duplicate, where the reference
 *     is the earlier submission's. The reference is shown to the applicant so a follow-up
 *     email has something to quote.
 *   - 400 with `{ code: "validation", fieldErrors }` keyed by the field names in
 *     `franchiseApplicationSchema`, so the form can mark the input rather than show a
 *     banner about a field the applicant cannot see.
 */

import { apiRequest } from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";
import type { FranchiseApplicationInput } from "@shared/validation/franchise";

export type FranchiseApplicationReceipt = {
  /** Ours, for the applicant to quote. Optional so an unexpected body shape is not a failure. */
  reference?: string;
};

export function submitFranchiseApplication(
  input: FranchiseApplicationInput,
): Promise<OnboardingResult<FranchiseApplicationReceipt>> {
  return apiRequest<FranchiseApplicationReceipt>("POST", "/franchise/applications", {
    body: input,
  });
}
