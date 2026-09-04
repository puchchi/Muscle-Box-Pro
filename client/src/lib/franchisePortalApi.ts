/**
 * The single binding between the franchise dashboard and its record.
 *
 * [gymPortalApi.ts](./gymPortalApi.ts)'s shape of seam, for the same reason: one function body
 * decides how the dashboard gets its figures, and nothing in `pages/franchise/` changes if that
 * ever moves. There is no fixture behind it and there must not be one — a demo dashboard that
 * looks exactly like a real one is how a screenshot of made-up money ends up in a deck.
 */

import { franchiseApiRequest } from "./apiClient";
import { parseFranchisePortalSnapshot } from "@shared/franchise/portalSchema";
import type { FranchisePortalSnapshot } from "@shared/franchise/portal";
import type { FranchiseOnboardingErrorCode } from "@shared/franchise/onboarding/types";

/** Thrown when the response is not a shape the dashboard can render. */
export class FranchisePortalResponseError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    // The message is for a log, not a franchisee. `FranchiseDashboard` renders its own copy and
    // never surfaces this string, so it is free to name fields.
    super(`Franchise portal response failed validation: ${issues.join("; ")}`);
    this.name = "FranchisePortalResponseError";
    this.issues = issues;
  }
}

/**
 * Thrown when the request itself failed — no session, no network, a 500.
 *
 * Distinct from `FranchisePortalResponseError`, which means a response arrived and was the wrong
 * shape. It carries the code so the page can tell "sign in again" from "try again in a moment":
 * those are different instructions, and a franchisee given the wrong one either retries forever
 * or re-authenticates for nothing.
 */
export class FranchisePortalRequestError extends Error {
  readonly code: FranchiseOnboardingErrorCode;

  constructor(code: FranchiseOnboardingErrorCode, message: string) {
    super(message);
    this.name = "FranchisePortalRequestError";
    this.code = code;
  }
}

/**
 * Fetch this franchise's snapshot.
 *
 * **No `franchiseId` parameter, and there must never be one.** The franchise is resolved from
 * the session cookie inside the handler; an identifier on this call would be an authorisation
 * decision made in the browser. The URL is a constant for that reason.
 *
 * Cookie-authenticated, so nothing is passed for auth either: `franchiseApiRequest` sends
 * `credentials: "include"` and the `mbp_franchise` cookie goes with it.
 */
export async function fetchFranchisePortalSnapshot(): Promise<FranchisePortalSnapshot> {
  const result = await franchiseApiRequest<unknown>("GET", "/franchise/portal");
  if (!result.ok) throw new FranchisePortalRequestError(result.error.code, result.error.message);
  return validate(result.data);
}

function validate(payload: unknown): FranchisePortalSnapshot {
  const result = parseFranchisePortalSnapshot(payload);
  if (!result.ok) throw new FranchisePortalResponseError(result.issues);
  return result.snapshot;
}

/** The TanStack Query key. Exported so a sign-out can drop it. */
export const FRANCHISE_PORTAL_QUERY_KEY = ["franchise-portal-snapshot"] as const;
