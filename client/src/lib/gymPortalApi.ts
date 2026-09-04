/**
 * The single binding between the gym dashboard and its reporting backend.
 *
 * Same shape of seam as [onboardingApi.ts](./onboardingApi.ts), for the same reason: one
 * function body here decides how the dashboard gets its figures, and nothing in `pages/gym/`
 * changes if that ever moves. `@shared/gym/fixtures` used to be servable from here behind
 * `NEXT_PUBLIC_MBP_API_MODE`, and it is a test fixture only now — a demo dashboard that looks
 * exactly like a real one is how a screenshot of made-up revenue ends up in a deck.
 *
 * See docs/gym-onboarding.md §15.
 */

import { apiRequest } from "./apiClient";
import { parseGymPortalSnapshot } from "@shared/gym/portalSchema";
import type { GymPortalSnapshot } from "@shared/gym/portal";
import type { OnboardingErrorCode } from "@shared/onboarding/types";

/** Thrown when the response is not a shape the dashboard can render. */
export class GymPortalResponseError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    // The message is for a log, not a gym owner. `GymDashboard` renders its own copy
    // and never surfaces this string, so it is free to name fields.
    super(`Reporting response failed validation: ${issues.join("; ")}`);
    this.name = "GymPortalResponseError";
    this.issues = issues;
  }
}

/**
 * Thrown when the request itself failed — no session, no network, a 500.
 *
 * Distinct from `GymPortalResponseError`, which means a response arrived and was the wrong
 * shape. It carries the code so a route guard can tell "sign in again" from "try again in a
 * moment": those are different instructions, and a gym given the wrong one either retries
 * forever or re-authenticates for nothing.
 */
export class GymPortalRequestError extends Error {
  readonly code: OnboardingErrorCode;

  constructor(code: OnboardingErrorCode, message: string) {
    super(message);
    this.name = "GymPortalRequestError";
    this.code = code;
  }
}

/**
 * Fetch this gym's snapshot.
 *
 * **No `gymId` parameter, and there must never be one.** The gym is resolved from the
 * session cookie inside the handler. A gym identifier on this call would be an
 * authorisation decision made in the browser — the same class of mistake as reading
 * business state out of `user_metadata` (TODO A2). The URL is a constant for that reason.
 *
 * Cookie-authenticated, so nothing is passed for auth either: `apiRequest` sends
 * `credentials: "include"` and the `mbp_gym` cookie goes with it.
 */
export async function fetchGymPortalSnapshot(): Promise<GymPortalSnapshot> {
  const result = await apiRequest<unknown>("GET", "/gym/portal");
  if (!result.ok) throw new GymPortalRequestError(result.error.code, result.error.message);
  return validate(result.data);
}

function validate(payload: unknown): GymPortalSnapshot {
  const result = parseGymPortalSnapshot(payload);
  if (!result.ok) throw new GymPortalResponseError(result.issues);
  return result.snapshot;
}

/** The TanStack Query key. Exported so a sign-out can invalidate it. */
export const GYM_PORTAL_QUERY_KEY = ["gym-portal-snapshot"] as const;
