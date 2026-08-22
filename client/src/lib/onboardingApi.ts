/**
 * The single binding between the wizard and its backend.
 *
 * Phase 2 replaces the implementation here — an edge-function client instead of
 * `createMockOnboardingApi` — and nothing in `pages/onboarding/` changes. If a
 * component ever imports from `@shared/onboarding/mockApi` directly, that stops
 * being true, so don't. See docs/gym-onboarding.md §8.
 */

import { MOCK_OTP, createMockOnboardingApi } from "@shared/onboarding/mockApi";
import type { OnboardingApi } from "@shared/onboarding/types";

/**
 * A little latency in development on purpose: with an instant mock, the saving
 * indicator never appears and disabled-while-submitting states never get looked
 * at, so both ship broken. Zero under test, where waiting is just flake.
 */
const latencyMs = process.env.NODE_ENV === "test" ? 0 : 300;

export const onboardingApi: OnboardingApi = createMockOnboardingApi({ latencyMs });

/**
 * True while the wizard is running against the in-memory mock, so the UI can say
 * so rather than letting someone mistake a demo for a real onboarding record.
 */
export const IS_MOCK_ONBOARDING = true;

/**
 * The fixed code the mock accepts, re-exported here so no component has to import
 * from `mockApi` directly. It exists only so the preview flow can be walked
 * end-to-end; the real code is emailed and rate-limited (§7).
 */
export const PREVIEW_OTP = MOCK_OTP;
