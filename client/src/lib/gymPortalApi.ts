/**
 * The single binding between the gym dashboard and its reporting backend.
 *
 * Same shape of seam as [onboardingApi.ts](./onboardingApi.ts), for the same reason: one
 * function body here decides whether the dashboard renders the fixture or `GET /gym/portal`,
 * and nothing in `pages/gym/` changes either way. If a component imports
 * `@shared/gym/fixtures` directly, that stops being true, so don't.
 *
 * Async even while it is a fixture. That is the whole point of doing this before the
 * endpoint exists: a synchronous `return DEMO_GYM_PORTAL` means the dashboard has no
 * pending state and no error state, so both get written for the first time on the day
 * the network is introduced — which is the day they are hardest to test. Making the
 * seam async now forces those two states into existence and under test while the data
 * source is still something we control.
 *
 * See docs/gym-onboarding.md §15.
 */

import { apiRequest } from "./apiClient";
import { DEMO_GYM_PORTAL } from "@shared/gym/fixtures";
import { parseGymPortalSnapshot } from "@shared/gym/portalSchema";
import type { GymPortalSnapshot } from "@shared/gym/portal";
import type { OnboardingErrorCode } from "@shared/onboarding/types";

/** Same build-time switch as the wizard's — see `onboardingApi.ts` for why it is opt-in. */
const USE_LIVE_API = process.env.NEXT_PUBLIC_MBP_API_MODE === "live";

/**
 * True while the dashboard is showing fixture figures, so the UI can say so.
 *
 * A demo dashboard that looks exactly like a real one is how a screenshot of made-up
 * revenue ends up in a deck.
 */
export const IS_MOCK_GYM_PORTAL = !USE_LIVE_API;

/**
 * A little latency in development on purpose — with an instant resolve the pending
 * state never gets looked at, so it ships broken. Zero under test, where waiting is
 * just flake.
 */
const latencyMs = process.env.NODE_ENV === "test" ? 0 : 400;

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
 * `credentials: "include"` and the `mbp_gym` cookie goes with it. The response is validated
 * whichever source it came from — see `validate`.
 */
export async function fetchGymPortalSnapshot(): Promise<GymPortalSnapshot> {
  if (USE_LIVE_API) {
    const result = await apiRequest<unknown>("GET", "/gym/portal");
    if (!result.ok) throw new GymPortalRequestError(result.error.code, result.error.message);
    return validate(result.data);
  }

  if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // Validated even though it is our own fixture. A fixture that cannot pass the
  // boundary check is a fixture that is lying about being the endpoint's response
  // shape, and finding that out now is the cheap version.
  return validate(DEMO_GYM_PORTAL);
}

function validate(payload: unknown): GymPortalSnapshot {
  const result = parseGymPortalSnapshot(payload);
  if (!result.ok) throw new GymPortalResponseError(result.issues);
  return result.snapshot;
}

/** The TanStack Query key. Exported so a sign-out can invalidate it. */
export const GYM_PORTAL_QUERY_KEY = ["gym-portal-snapshot"] as const;
