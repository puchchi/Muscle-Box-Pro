/**
 * The admin panel's reads, behind one seam.
 *
 * Two routes so far — `GET /admin/gyms` and `GET /admin/gyms/{gymId}` — with the nine write
 * routes (§2.1) to follow. Nothing under `app/admin/` talks to `apiClient` directly; the same
 * rule [adminSession.ts](./adminSession.ts) follows, and for the same reason.
 *
 * ## Why this validates and `adminSession` does not
 *
 * `apiClient` casts response bodies rather than validating them — its own docstring says so,
 * and calls that a real gap. For `GET /admin/me` the gap is small: four fields, and
 * `asSession` checks the two that decide anything. For these two routes it is not small.
 * `toAdminGymView` in `mbp-backend` returns `Record<string, unknown>`, assembled by hand
 * across sixty-odd fields, so a rename type-checks on both sides and lands as a blank cell on
 * the page someone is reading to decide whether a gym is stuck. So every response here goes
 * through `shared/admin/gymsSchema.ts` before a component sees it.
 *
 * ## A parse failure is its own outcome, and it is loud
 *
 * `AdminReadResult` carries `issues` alongside the error because the audience for this panel
 * is us. A gym owner gets told "figures unavailable" and nothing about our field names; an
 * operator staring at a broken detail page wants `terms.securityDepositInr: Required`, which
 * is the whole answer to "what changed on the backend?" in one line. Hiding it would mean
 * reading the network tab to learn something the client already knows.
 */

import { apiRequest } from "./apiClient";
import {
  parseAdminGymList,
  parseAdminGymView,
} from "@shared/admin/gymsSchema";
import type { AdminGymList, AdminGymView } from "@shared/admin/gyms";
import type { AdminInviteBody, AdminInviteResult } from "@shared/admin/invite";
import type { OnboardingError, OnboardingResult } from "@shared/onboarding/types";

/**
 * The outcome of an admin read.
 *
 * Three states collapsed into two, deliberately: a transport failure and a schema failure
 * both mean "there is nothing to render", so both are `ok: false` and the page has one error
 * branch. `issues` is what distinguishes them — non-empty means the request succeeded and the
 * *shape* was wrong, which is a different thing to go and fix.
 */
export type AdminReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: OnboardingError; issues: string[] };

/** TanStack Query keys. Exported so a write can invalidate the reads it affects. */
export const ADMIN_GYMS_QUERY_KEY = ["admin", "gyms"] as const;
export const adminGymQueryKey = (gymId: string) => ["admin", "gym", gymId] as const;

/**
 * A page of gyms, newest first.
 *
 * `cursor` comes from the previous page's `nextCursor` and is opaque — it is DynamoDB's
 * `LastEvaluatedKey`, so nothing here may interpret or construct one.
 *
 * `limit` is clamped server-side rather than validated: the handler answers a malformed
 * `?limit=abc` with the default rather than a 400, because refusing costs an admin their page
 * for a parameter the UI sets. Left as a number here so a caller cannot send one at all.
 */
export async function fetchAdminGymList(
  options: { limit?: number; cursor?: string } = {},
): Promise<AdminReadResult<AdminGymList>> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.cursor) query.set("cursor", options.cursor);
  // `toString()` rather than `.size`, which is recent enough to be a compatibility question
  // this file has no reason to ask.
  const encoded = query.toString();
  const suffix = encoded.length > 0 ? `?${encoded}` : "";

  const result = await apiRequest<unknown>("GET", `/admin/gyms${suffix}`);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminGymList(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_LIST, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * One gym, in full — the "why is this gym stuck?" read.
 *
 * A 404 arrives as the `invalid_token` code, because `codeForStatus` in `apiClient` has no
 * mapping for 404 and 401/403 is the closest thing it does map. That is worth knowing rather
 * than working around: the panel does not distinguish "no such gym" from "your session
 * lapsed" on this route, and it does not need to, since both mean the page cannot render and
 * the guard will bounce a lapsed session on its next probe anyway.
 */
export async function fetchAdminGymView(
  gymId: string,
): Promise<AdminReadResult<AdminGymView>> {
  const result = await apiRequest<unknown>("GET", `/admin/gyms/${encodeURIComponent(gymId)}`);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminGymView(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_GYM, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * Create a gym and mint its onboarding link — §2.7, `POST /admin/gyms`.
 *
 * Five items, one transaction, all or nothing (the handler's own words), so there is no
 * partial outcome to represent: this either returns the new gym or it returns nothing at all.
 *
 * Unlike the two reads above, the response here is **not** run through a full
 * `gymsSchema`-style parse. Five flat fields is a small enough surface that a hand check
 * (`asInviteResult`, mirroring `adminSession.ts`'s `asSession`) catches the failure that
 * matters — a 2xx that does not describe an invite — without a second schema file for five
 * lines. What must not be re-validated here is anything about `input`: this function trusts
 * its caller to have already run it through `adminInviteFormSchema`, the same division of
 * labour as every other write in this panel.
 *
 * `fieldErrors` on a `validation` error are namespaced by the server (`details.gstin`,
 * `terms.termMonths`, `machine.deviceNo`, or bare `invitedByName`) because the handler
 * validates all four blocks before reporting any of them — an admin filling one long form
 * should see everything wrong with it at once, not fix one typo per round trip.
 */
export async function createGym(
  input: AdminInviteBody,
): Promise<OnboardingResult<AdminInviteResult>> {
  const result = await apiRequest<Partial<AdminInviteResult>>("POST", "/admin/gyms", {
    body: input,
  });
  if (!result.ok) return result;

  const invite = asInviteResult(result.data);
  if (!invite) return { ok: false, error: MALFORMED_INVITE };
  return { ok: true, data: invite };
}

const MALFORMED_INVITE: OnboardingError = {
  code: "network",
  message: "The gym may have been created, but the response did not include its link. Check the gyms list.",
};

/**
 * An invite result, or null if the body was not one.
 *
 * `onboardingUrl` is the field that decides: everything else is diagnostic, but a response
 * without the link is one this screen cannot do the one thing it exists to do — hand an admin
 * something to send. Reload the gyms list rather than retry, since a retry would create a
 * second gym for the same form.
 */
function asInviteResult(body: Partial<AdminInviteResult> | undefined): AdminInviteResult | null {
  if (
    typeof body?.gymId !== "string" ||
    body.gymId.length === 0 ||
    typeof body.onboardingUrl !== "string" ||
    body.onboardingUrl.length === 0
  ) {
    return null;
  }
  return {
    gymId: body.gymId,
    slug: typeof body.slug === "string" ? body.slug : "",
    onboardingUrl: body.onboardingUrl,
    tokenId: typeof body.tokenId === "string" ? body.tokenId : "",
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : "",
  };
}

/**
 * The two schema-failure messages.
 *
 * Coded `network` because that is what `OnboardingErrorCode` has for "this request did not
 * usefully complete", which is true — nothing renderable arrived. The wording says what
 * actually happened rather than blaming the connection, because an operator who is told to
 * check their connection will check their connection.
 */
const MALFORMED_LIST: OnboardingError = {
  code: "network",
  message: "The gym list came back in a shape this page does not recognise.",
};

const MALFORMED_GYM: OnboardingError = {
  code: "network",
  message: "This gym's record came back in a shape this page does not recognise.",
};
