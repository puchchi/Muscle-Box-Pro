/**
 * The single binding between the wizard and its backend.
 *
 * Two implementations of one interface, chosen here and nowhere else: the in-memory mock,
 * and [httpOnboardingApi.ts](./httpOnboardingApi.ts) against `api.muscleboxpro.com`. Nothing
 * in `pages/onboarding/` changes when the switch flips — that is the whole point of the
 * seam. If a component ever imports from `@shared/onboarding/mockApi` or `./apiClient`
 * directly, it stops being true, so don't. See docs/gym-onboarding.md §8.
 */

import { MOCK_OTP, createMockOnboardingApi } from "@shared/onboarding/mockApi";
import { createHttpOnboardingApi } from "./httpOnboardingApi";
import type { OnboardingApi } from "@shared/onboarding/types";

/**
 * Which backend the wizard talks to. `"live"` opts in; anything else is the mock.
 *
 * Opt-*in* while the endpoints are being built, because the alternative default sends every
 * preview deploy at a host that answers 404 and makes the wizard untestable by anyone
 * without the backend running. Flip the trigger the other way — mock behind an explicit
 * flag — on the day `GET /onboarding` is live, because from then on the dangerous mistake
 * reverses: a production build that quietly fell back to the mock would accept a real gym's
 * details into memory, tell it the agreement was signed, and lose all of it on refresh.
 *
 * Read at module scope on purpose. `NEXT_PUBLIC_*` is inlined at build time, so this is a
 * build-time constant and not something a running page can be talked into changing.
 */
const USE_LIVE_API = process.env.NEXT_PUBLIC_MBP_API_MODE === "live";

/**
 * A little latency in development on purpose: with an instant mock, the saving
 * indicator never appears and disabled-while-submitting states never get looked
 * at, so both ship broken. Zero under test, where waiting is just flake.
 */
const latencyMs = process.env.NODE_ENV === "test" ? 0 : 300;

export const onboardingApi: OnboardingApi = USE_LIVE_API
  ? createHttpOnboardingApi()
  : createMockOnboardingApi({ latencyMs });

/**
 * True while the wizard is running against the in-memory mock, so the UI can say
 * so rather than letting someone mistake a demo for a real onboarding record.
 */
export const IS_MOCK_ONBOARDING = !USE_LIVE_API;

/**
 * The fixed code the mock accepts, re-exported here so no component has to import
 * from `mockApi` directly. It exists only so the preview flow can be walked
 * end-to-end; the real code is emailed and rate-limited (§7).
 */
export const PREVIEW_OTP = MOCK_OTP;
