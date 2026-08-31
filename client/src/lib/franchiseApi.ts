/**
 * Submitting a franchise enquiry from /franchise.
 *
 * **The endpoint does not exist yet.** `POST /franchise/applications` on
 * `api.muscleboxpro.com` is the shape this client assumes; until it is deployed every
 * submission fails as a `network` error, which is why `Franchise.tsx` renders a mailto
 * fallback carrying the applicant's own answers on failure. That is deliberate: a
 * franchise enquiry is a ₹25–50 lakh lead, and the alternative, resolving as success
 * against a mock, would drop those leads silently and look identical to working.
 *
 * Not a Supabase edge function, unlike `demo-request` (`investor-request` went the same way as
 * this one on 2026-08-31, see [investorApi.ts](./investorApi.ts)). New backend work goes to the
 * AWS API, and it goes through
 * [apiClient.ts](./apiClient.ts) so the credentials, content-type and error-mapping
 * rules stay in the one place that documents them.
 *
 * What the endpoint owes this client:
 *
 *   - 202 with `{ reference }` on acceptance. The reference is shown to the applicant
 *     so a follow-up email has something to quote.
 *   - 400 with `{ code: "validation", fieldErrors }` keyed by the field names in
 *     `franchiseApplicationSchema`, so the form can mark the input rather than show a
 *     banner about a field the applicant cannot see.
 */

import { apiRequest } from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";
import type { FranchiseApplicationInput } from "@shared/validation/franchise";

export type FranchiseApplicationReceipt = {
  /** Ours, for the applicant to quote. Absent until the endpoint returns one. */
  reference?: string;
};

export function submitFranchiseApplication(
  input: FranchiseApplicationInput,
): Promise<OnboardingResult<FranchiseApplicationReceipt>> {
  return apiRequest<FranchiseApplicationReceipt>("POST", "/franchise/applications", {
    body: input,
  });
}
