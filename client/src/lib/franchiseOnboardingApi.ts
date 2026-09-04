/**
 * The single binding between the franchise wizard and its backend.
 *
 * Same seam as [onboardingApi.ts](./onboardingApi.ts) and the same rule: nothing in
 * `pages/franchise/onboarding/` may import from `@shared/franchise/onboarding/mockApi` or from
 * `./apiClient` directly, or the swap stops being one file. See docs/franchise-onboarding.md
 * §10.
 *
 * There is one implementation now. [httpFranchiseOnboardingApi.ts](./httpFranchiseOnboardingApi.ts) talks to
 * `MbpFranchiseWizard-<env>`, and the in-memory mock is a test double rather than a second runtime
 * behaviour: `client/src/__tests__/shared/franchise-onboarding-mock.test.ts` exercises it as the executable
 * statement of the flow's rules, and no build serves it to a browser. A franchisee typing a PAN and a
 * registered address into an in-memory store, being told a ₹25 lakh term sheet was signed, and losing all of
 * it on refresh is the failure this file used to have a flag for.
 */

import { httpFranchiseOnboardingApi } from "./httpFranchiseOnboardingApi";
import type { FranchiseOnboardingApi } from "@shared/franchise/onboarding/types";

export const franchiseOnboardingApi: FranchiseOnboardingApi = httpFranchiseOnboardingApi;
