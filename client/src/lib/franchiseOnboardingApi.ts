/**
 * The single binding between the franchise wizard and its backend.
 *
 * Same seam as [onboardingApi.ts](./onboardingApi.ts) and the same rule: nothing in
 * `pages/franchise/onboarding/` may import from `@shared/franchise/onboarding/mockApi` or from
 * `./apiClient` directly, or the swap stops being one file. See docs/franchise-onboarding.md
 * §10.
 *
 * There is no HTTP implementation yet. `httpFranchiseOnboardingApi.ts` arrives with the routes
 * in §11 phase 7 and replaces the refusal below; until then the two implementations here are the
 * mock and a flat no.
 */

import { FIXTURES_ALLOWED } from "./apiClient";
import {
  FRANCHISE_DEMO_HANDLE,
  MOCK_FRANCHISE_HANDLES,
  createMockFranchiseOnboardingApi,
  previewApprove,
  previewCompleteEsign,
  previewDecline,
  previewHold,
  previewRefusePayment,
  previewVerifyPayment,
} from "@shared/franchise/onboarding/mockApi";
import type { FranchiseOnboardingApi } from "@shared/franchise/onboarding/types";

const latencyMs = process.env.NODE_ENV === "test" ? 0 : 300;

/**
 * So the UI can say so, rather than letting anyone mistake a demo for a real record.
 *
 * The production API must never reach the mock: an in-memory implementation would take a real
 * franchisee's PAN and registered address, tell them a ₹25 lakh term sheet was signed, and lose
 * all of it on refresh. That is what `FIXTURES_ALLOWED` is for, and being derived from the API
 * host it cannot be turned off by a typo in an env var.
 *
 * It replaces a module-scope `throw` on `NEXT_PUBLIC_MBP_API_MODE === "live"`. The throw was
 * aimed at the same mistake and caught the wrong people: `.env.local` reads `live` because the
 * gym flow integrates against the sandbox, so a developer opening a franchise onboarding link
 * locally got a 500 from the module rather than the wizard. A refusal that the wizard renders is
 * the same guarantee without the crash.
 */
export const IS_MOCK_FRANCHISE_ONBOARDING = FIXTURES_ALLOWED;

export const franchiseOnboardingApi: FranchiseOnboardingApi = IS_MOCK_FRANCHISE_ONBOARDING
  ? createMockFranchiseOnboardingApi({ latencyMs })
  : notDeployedApi();

/**
 * Every call refused, for the production API.
 *
 * Neither the mock nor HTTP, because there is no franchise onboarding backend to call yet. The
 * only method that matters is `getState`: it fails before any form renders, and the wizard's
 * `HandleProblem` screen turns `network` into "something went wrong, try again in a moment",
 * which is what a franchisee should read. The rest are here because the interface has them.
 *
 * `message` is for a log rather than a screen. Delete this whole function in phase 7.
 */
function notDeployedApi(): FranchiseOnboardingApi {
  const refuse = async () => ({
    ok: false as const,
    error: {
      code: "network" as const,
      message:
        "Franchise onboarding has no live implementation yet: httpFranchiseOnboardingApi.ts arrives with the routes in docs/franchise-onboarding.md §11 phase 7.",
    },
  });

  return {
    getState: refuse,
    saveDraft: refuse,
    submitDetails: refuse,
    submitTerritory: refuse,
    uploadDocument: refuse,
    removeDocument: refuse,
    submitKyc: refuse,
    ackFranchise: refuse,
    submitOperations: refuse,
    markTermSheetViewed: refuse,
    requestEsign: refuse,
    refreshEsignStatus: refuse,
    getPaymentInstructions: refuse,
    claimPayment: refuse,
    refreshPaymentStatus: refuse,
    createAccount: refuse,
  };
}

export { FRANCHISE_DEMO_HANDLE, MOCK_FRANCHISE_HANDLES };

/**
 * The writes that belong to us rather than to the franchisee, re-exported so no component
 * imports from `mockApi` at the call site.
 *
 * Every caller must be behind `IS_MOCK_FRANCHISE_ONBOARDING`: against the live API there is no
 * store to move, and each of these stands in for an admin route or a webhook.
 */
export const previewFranchise = {
  approve: previewApprove,
  hold: previewHold,
  decline: previewDecline,
  completeEsign: previewCompleteEsign,
  verifyPayment: previewVerifyPayment,
  refusePayment: previewRefusePayment,
} as const;
