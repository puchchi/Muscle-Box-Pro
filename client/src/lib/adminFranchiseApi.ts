/**
 * The single binding between the admin panel's franchise screens and their backend.
 *
 * [adminApi.ts](./adminApi.ts) for the franchise half of the dashboard, and the same rule holds:
 * nothing under `pages/admin/` talks to an API except through this file.
 *
 * ## Eight routes, on their own API
 *
 * These live in `MbpFranchiseAdmin-<env>` rather than in the onboarding stack, which had 484 of
 * CloudFormation's 500 resources when the franchise routes were written (docs/franchise-onboarding.md
 * §8.1). In production it is a second base path on one host; in sandbox it is a different
 * `execute-api` hostname, so `apiClient` needs `NEXT_PUBLIC_MBP_FRANCHISE_API_URL` to reach it and
 * says so in a console error rather than guessing. Hence `api: "franchiseAdmin"` on every call
 * below.
 *
 * ## Every read is validated
 *
 * `franchisesSchema.ts` parses each body, and the reason to keep doing that against a real API is
 * `parseAdminFranchiseView`'s own: the territory projection changed shape after the stack was last
 * deployed, and a schema failure names the field while a silent `undefined` renders an empty panel.
 *
 * ## The writes return `AdminReadResult` too
 *
 * [adminMailApi.ts](./adminMailApi.ts)'s reasoning, unchanged: these writes answer with the whole
 * franchise record rather than an acknowledgement, so a write can fail the schema the same way a
 * read can, and `issues` is the only thing that would tell an operator which of the two happened.
 */

import type { AdminReadResult } from "./adminApi";
import { apiRequest } from "./apiClient";
import {
  parseAdminFranchiseList,
  parseAdminFranchiseView,
} from "@shared/admin/franchisesSchema";
import type {
  AdminFranchiseApprovalBody,
  AdminFranchiseList,
  AdminFranchisePaymentRefuseBody,
  AdminFranchisePaymentVerifyBody,
  AdminFranchiseView,
} from "@shared/admin/franchises";
import type {
  AdminFranchiseInviteBody,
  AdminFranchiseInviteResult,
} from "@shared/admin/franchiseInvite";
import type { OnboardingError, OnboardingResult } from "@shared/onboarding/types";

/** Every route here is a second base path away from the gym routes. See the header. */
const FRANCHISE_ADMIN = { api: "franchiseAdmin" } as const;

const FRANCHISES = "/admin/franchises";

export const ADMIN_FRANCHISES_QUERY_KEY = ["admin", "franchises"] as const;
export const adminFranchiseQueryKey = (franchiseId: string) =>
  ["admin", "franchise", franchiseId] as const;

export type AdminFranchiseListQuery = {
  limit?: number;
  cursor?: string;
  /** `"review"` reads the sparse index: only what is waiting on us, oldest first, unpaged. */
  queue?: "review";
};

export async function fetchAdminFranchiseList(
  query: AdminFranchiseListQuery = {},
): Promise<AdminReadResult<AdminFranchiseList>> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  // The handler reads `queue=review` and then ignores `cursor` — the sparse index is unpaged. Both
  // are sent when both are given rather than resolved here, because which one wins is the server's
  // rule and a second copy of it would be the copy that drifts.
  if (query.queue) params.set("queue", query.queue);
  const encoded = params.toString();

  const result = await apiRequest<unknown>(
    "GET",
    `${FRANCHISES}${encoded.length > 0 ? `?${encoded}` : ""}`,
    FRANCHISE_ADMIN,
  );
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminFranchiseList(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_LIST, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

export async function fetchAdminFranchiseView(
  franchiseId: string,
): Promise<AdminReadResult<AdminFranchiseView>> {
  const result = await apiRequest<unknown>(
    "GET",
    `${FRANCHISES}/${encodeURIComponent(franchiseId)}`,
    FRANCHISE_ADMIN,
  );
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminFranchiseView(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_FRANCHISE, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * Create a franchise and mint its onboarding link.
 *
 * `createGym`'s division of labour: this trusts its caller to have run the form through
 * `adminFranchiseInviteFormSchema` and does not re-validate the input.
 *
 * The response is not schema-parsed, for `createInvite`'s reason: six flat fields, and the screen
 * shows `onboardingUrl` once. `emailed` may be either value — the handler does send a franchise
 * invite, and a delivery failure is reported rather than thrown, because nothing can reissue the
 * handle this call has already consumed.
 */
export async function createFranchise(
  body: AdminFranchiseInviteBody,
): Promise<OnboardingResult<AdminFranchiseInviteResult>> {
  return apiRequest<AdminFranchiseInviteResult>("POST", FRANCHISES, {
    ...FRANCHISE_ADMIN,
    body,
  });
}

/**
 * Step 4, all three outcomes — the write the wizard cannot proceed without.
 *
 * An approval carries the territory **being granted**, which is not necessarily the one that was
 * proposed: §3's case is approving three suburbs of five, and it is this string the term sheet
 * renders. The refusal of a second decision is the server's call and stays there.
 */
export async function decideFranchise(
  franchiseId: string,
  body: AdminFranchiseApprovalBody,
): Promise<AdminReadResult<AdminFranchiseView>> {
  return reparse(
    await apiRequest<unknown>(
      "POST",
      `${FRANCHISES}/${encodeURIComponent(franchiseId)}/approval`,
      { ...FRANCHISE_ADMIN, body },
    ),
  );
}

/**
 * Confirm the instalment against a bank statement — step 8.
 *
 * `receivedPaise` is what arrived, not what was expected, and the two differing is ordinary: a
 * ₹12,50,000 RTGS routinely lands a few hundred rupees short of the figure the franchisee typed
 * because their bank deducted charges (§7.3).
 */
export async function verifyFranchisePayment(
  franchiseId: string,
  instalmentNo: number,
  body: AdminFranchisePaymentVerifyBody,
): Promise<AdminReadResult<AdminFranchiseView>> {
  return reparse(await apiRequest<unknown>("POST", paymentPath(franchiseId, instalmentNo, "verify"), {
    ...FRANCHISE_ADMIN,
    body,
  }));
}

/**
 * Refuse a claim we could not find.
 *
 * `reason` is shown to the franchisee verbatim, unlike every other reason on this surface, because
 * it is a statement about a transfer rather than about a person and withholding it would leave
 * them resubmitting the same claim. The status does not move backwards (§7.3).
 */
export async function refuseFranchisePayment(
  franchiseId: string,
  instalmentNo: number,
  body: AdminFranchisePaymentRefuseBody,
): Promise<AdminReadResult<AdminFranchiseView>> {
  return reparse(await apiRequest<unknown>("POST", paymentPath(franchiseId, instalmentNo, "refuse"), {
    ...FRANCHISE_ADMIN,
    body,
  }));
}

/**
 * `instalmentNo` is a path segment, so it is stringified from a number the caller cannot make into
 * anything else. The handler answers 404 rather than 400 for a segment that does not parse.
 */
function paymentPath(franchiseId: string, instalmentNo: number, action: "verify" | "refuse"): string {
  return `${FRANCHISES}/${encodeURIComponent(franchiseId)}/payments/${instalmentNo}/${action}`;
}

function reparse(result: OnboardingResult<unknown>): AdminReadResult<AdminFranchiseView> {
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseAdminFranchiseView(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_AFTER_WRITE, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

const MALFORMED_LIST: OnboardingError = {
  code: "network",
  message: "The franchise list came back in a shape this page does not recognise.",
};

const MALFORMED_FRANCHISE: OnboardingError = {
  code: "network",
  message: "This franchise's record came back in a shape this page does not recognise.",
};

/** Deliberately says the write may have landed: it is a read failure after a successful write. */
const MALFORMED_AFTER_WRITE: OnboardingError = {
  code: "network",
  message:
    "The change may have been saved, but the record came back in a shape this page does not recognise. Reload before trying again.",
};
