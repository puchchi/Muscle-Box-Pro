/**
 * The single binding between the wizard and its backend.
 *
 * One implementation, chosen here and nowhere else: [httpOnboardingApi.ts](./httpOnboardingApi.ts).
 * Nothing in `pages/onboarding/` changes if that is ever replaced — which is the point of the
 * seam. If a component imports `./apiClient` directly it stops being true, so don't. See
 * docs/gym-onboarding.md §8.
 *
 * `@shared/onboarding/mockApi` is a test double rather than a second runtime behaviour:
 * `client/src/__tests__/shared/onboarding-mock-api.test.ts` exercises it as the executable
 * statement of the flow's rules, and no build serves it to a browser. It was selectable behind
 * `NEXT_PUBLIC_MBP_API_MODE` while the endpoints were being written, and that flag came off once
 * they were live, because from then on the dangerous mistake reversed: a build that quietly fell
 * back to the mock would take a real gym's details into memory, tell it the agreement was signed,
 * and lose all of it on reload. Sandbox is where the flow is walked now.
 */

import { createHttpOnboardingApi } from "./httpOnboardingApi";
import type { OnboardingApi } from "@shared/onboarding/types";

export const onboardingApi: OnboardingApi = createHttpOnboardingApi();
