/**
 * The single binding between the franchise wizard and its backend.
 *
 * Same seam as [onboardingApi.ts](./onboardingApi.ts) and the same rule: nothing in
 * `pages/franchise/onboarding/` may import from `@shared/franchise/onboarding/mockApi` or from
 * `./apiClient` directly, or the swap stops being one file. See docs/franchise-onboarding.md
 * §10.
 *
 * There is only one implementation today. `httpFranchiseOnboardingApi.ts` arrives with the
 * routes in §11 phase 7, and lands here as a ternary on the same `NEXT_PUBLIC_MBP_API_MODE`
 * flag the gym flow reads.
 */

import {
  FRANCHISE_DEMO_HANDLE,
  MOCK_FRANCHISE_HANDLES,
  createMockFranchiseOnboardingApi,
  previewApprove,
  previewCompleteEsign,
  previewDecline,
  previewHold,
  previewRefusePayment,
  previewVerifyPayment,
} from "@shared/franchise/onboarding/mockApi";
import type { FranchiseOnboardingApi } from "@shared/franchise/onboarding/types";

/**
 * A live build must fail rather than quietly serve the mock.
 *
 * The gym seam's docstring names the mistake this guards: a production bundle falling back to
 * an in-memory implementation would take a real franchisee's PAN and registered address, tell
 * them a ₹25 lakh term sheet was signed, and lose all of it on refresh. Thrown at module scope
 * so the failure is a build-and-load failure rather than something a franchisee discovers on
 * step 7. Delete this the moment the HTTP implementation exists.
 */
if (process.env.NEXT_PUBLIC_MBP_API_MODE === "live") {
  throw new Error(
    "Franchise onboarding has no live implementation yet: httpFranchiseOnboardingApi.ts arrives with the routes in docs/franchise-onboarding.md §11 phase 7.",
  );
}

const latencyMs = process.env.NODE_ENV === "test" ? 0 : 300;

export const franchiseOnboardingApi: FranchiseOnboardingApi =
  createMockFranchiseOnboardingApi({ latencyMs });

/** So the UI can say so, rather than letting anyone mistake a demo for a real record. */
export const IS_MOCK_FRANCHISE_ONBOARDING = true;

export { FRANCHISE_DEMO_HANDLE, MOCK_FRANCHISE_HANDLES };

/**
 * The writes that belong to us rather than to the franchisee, re-exported so no component
 * imports from `mockApi` at the call site.
 *
 * Every caller must be behind `IS_MOCK_FRANCHISE_ONBOARDING`: against the live API there is no
 * store to move, and each of these stands in for an admin route or a webhook.
 */
export const previewFranchise = {
  approve: previewApprove,
  hold: previewHold,
  decline: previewDecline,
  completeEsign: previewCompleteEsign,
  verifyPayment: previewVerifyPayment,
  refusePayment: previewRefusePayment,
} as const;
