/**
 * The single binding between the admin panel's franchise screens and their backend.
 *
 * [adminApi.ts](./adminApi.ts) for the franchise half of the dashboard, and the same rule holds:
 * nothing under `pages/admin/` may import `@shared/admin/franchisesMock` directly, or the swap
 * stops being one file. When the routes are deployed, the six functions below lose their `mock.`
 * bodies and gain `apiRequest` calls; every caller stays as it is.
 *
 * ## Why this is a mock and the gym side is not
 *
 * `GET /admin/franchises`, `GET /admin/franchises/{id}` and `POST /admin/franchises` are written
 * and tested in `mbp-backend` but **unrouted**: the onboarding stack has 484 of CloudFormation's
 * 500 resources and these methods cost 47 (docs/franchise-onboarding.md §8.1, open question 10).
 * The approval and payment-verification routes do not exist at all, and `franchisesMock.ts` is the
 * first description of what they do.
 *
 * ## The responses are still validated
 *
 * The mock answers `unknown` and every read here runs it through `franchisesSchema.ts`, exactly as
 * it will run a real body. Validating our own fixture sounds like theatre; it is the only way the
 * validator is exercised before the day it matters, which is the day the seam flips and nobody is
 * watching it.
 *
 * ## The writes return `AdminReadResult` too
 *
 * [adminMailApi.ts](./adminMailApi.ts)'s reasoning, unchanged: these writes answer with the whole
 * franchise record rather than an acknowledgement, so a write can fail the schema the same way a
 * read can, and `issues` is the only thing that would tell an operator which of the two happened.
 */

import type { AdminReadResult } from "./adminApi";
import { FIXTURES_ALLOWED } from "./apiClient";
import {
  createMockAdminFranchiseApi,
  MOCK_ADMIN_FRANCHISE_TARGETS,
  resetMockAdminFranchises,
} from "@shared/admin/franchisesMock";
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

const mock = createMockAdminFranchiseApi({
  latencyMs: process.env.NODE_ENV === "test" ? 0 : 300,
});

/**
 * Whether these screens are reading fixtures — everywhere except the production API.
 *
 * Two things this must not do, and one it must.
 *
 * It must not put fixtures in front of an operator on `api.muscleboxpro.com`: approving a ₹25
 * lakh territory against an in-memory store records a decision that vanishes on refresh. So the
 * production host gets `NOT_DEPLOYED` from every function below and the pages render their
 * ordinary error state, which says exactly that.
 *
 * It must not be `NEXT_PUBLIC_MBP_API_MODE`. An earlier version threw at module scope when that
 * flag read `live`, which is how a developer running against the sandbox — the ordinary local
 * setup, since the gym flow needs it — got a runtime error page from a nav link on every admin
 * screen. The flag says which *gym* seam to use and says nothing about franchise routes that are
 * not deployed under either value.
 *
 * And it must be visible: every screen shows a fixture notice while this is true.
 *
 * When the routes land, this becomes `false` and the six functions below take `apiRequest`.
 */
export const IS_MOCK_ADMIN_FRANCHISE = FIXTURES_ALLOWED;

/** Not a network failure, but `code` is what the error panels understand. */
const NOT_DEPLOYED: OnboardingError = {
  code: "network",
  message:
    "The franchise admin routes are not deployed yet, so there is nothing here to read. See docs/franchise-onboarding.md §8.1 and open question 10.",
};

export { MOCK_ADMIN_FRANCHISE_TARGETS, resetMockAdminFranchises };

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
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED, issues: [] };

  const result = await mock.list(query);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminFranchiseList(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_LIST, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

export async function fetchAdminFranchiseView(
  franchiseId: string,
): Promise<AdminReadResult<AdminFranchiseView>> {
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED, issues: [] };

  const result = await mock.get(franchiseId);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminFranchiseView(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_FRANCHISE, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * Create a franchise and mint its onboarding link.
 *
 * `createGym`'s division of labour: this trusts its caller to have run the form through
 * `adminFranchiseInviteFormSchema` and does not re-validate the input. What it does not share is
 * the delivery — `emailed` comes back `false` because there is no franchise invite sender, so the
 * screen has to hand the link to a human (open question 12).
 */
export async function createFranchise(
  body: AdminFranchiseInviteBody,
): Promise<OnboardingResult<AdminFranchiseInviteResult>> {
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED };

  return mock.create(body);
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
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED, issues: [] };

  return reparse(await mock.decide(franchiseId, body));
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
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED, issues: [] };

  return reparse(await mock.verifyPayment(franchiseId, instalmentNo, body));
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
  if (!IS_MOCK_ADMIN_FRANCHISE) return { ok: false, error: NOT_DEPLOYED, issues: [] };

  return reparse(await mock.refusePayment(franchiseId, instalmentNo, body));
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
