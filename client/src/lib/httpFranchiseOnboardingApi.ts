/**
 * `FranchiseOnboardingApi` over the franchise wizard API.
 *
 * The live half of the seam described in [franchiseOnboardingApi.ts](./franchiseOnboardingApi.ts). Fourteen
 * routes in `MbpFranchiseWizard-<env>` back sixteen methods, and the three places the count does not line up
 * are the interesting part of this file:
 *
 * - `refreshEsignStatus` and `refreshPaymentStatus` are both `GET /franchise/onboarding`. Neither has a route
 *   of its own because neither reads anything a state response does not already carry, and the thing they are
 *   waiting for is written by somebody else: the e-sign webhook, and an admin verifying a bank statement.
 * - `uploadDocument` is three calls. §9 keeps the presigned PUT out of the components, so the dance lives
 *   here.
 * - `requestEsign` has no route at all. See the method.
 *
 * Every response body is the payload itself rather than an envelope, so `franchiseApiRequest<T>` casts
 * straight to the contract type. Nothing here re-validates the shape: the server builds these responses from
 * `toFranchiseOnboardingState`, which is the same projection the contract describes, and a client-side parse
 * would be a second opinion with no way to act on a disagreement.
 */

import { franchiseApiRequest } from "./apiClient";
import type {
  DocumentUploadInput,
  FranchiseDraftKey,
  FranchiseDraftSaveResult,
  FranchiseOnboardingApi,
  FranchiseOnboardingError,
  FranchiseOnboardingState,
  FranchiseStateResult,
  FranchiseStepDrafts,
  PaymentInstructions,
} from "@shared/franchise/onboarding/types";

const ONBOARDING = "/franchise/onboarding";

/**
 * Long, because this one carries a file. `apiClient`'s 20 seconds is right for a JSON round trip and would
 * abort an 8 MB scan on a phone connection at about the point it was going to succeed.
 */
const UPLOAD_TIMEOUT_MS = 120_000;

type PresignedUpload = {
  docId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
};

const UPLOAD_FAILED: FranchiseOnboardingError = {
  code: "network",
  message:
    "We couldn't finish sending that file. Nothing else you've filled in is lost. Check your connection and try the upload again.",
};

const NO_ESIGN_PROVIDER: FranchiseOnboardingError = {
  code: "network",
  message:
    "Signing isn't switched on yet. We'll email you the moment your term sheet is ready to sign, and nothing you've given us is lost.",
};

function state(path: string, handle: string, body?: unknown): Promise<FranchiseStateResult> {
  return franchiseApiRequest<FranchiseOnboardingState>("POST", `${ONBOARDING}${path}`, {
    handle,
    body,
  });
}

/**
 * Named at module scope rather than reached through `this`, because three methods are one read and a
 * destructured `api.refreshPaymentStatus` must keep working.
 */
function readState(handle: string): Promise<FranchiseStateResult> {
  return franchiseApiRequest<FranchiseOnboardingState>("GET", ONBOARDING, { handle });
}

export const httpFranchiseOnboardingApi: FranchiseOnboardingApi = {
  getState: readState,

  saveDraft<K extends FranchiseDraftKey>(
    handle: string,
    key: K,
    value: NonNullable<FranchiseStepDrafts[K]>,
  ): Promise<FranchiseDraftSaveResult> {
    return franchiseApiRequest<{ savedAt: string }>("PUT", `${ONBOARDING}/draft`, {
      handle,
      body: { key, value },
    });
  },

  submitDetails(handle, input) {
    return state("/details", handle, { details: input });
  },

  submitTerritory(handle, input) {
    return state("/territory", handle, { territory: input });
  },

  /**
   * Presign, PUT, confirm — and the order is the point. The row that records the upload is written by the
   * first call, so an upload abandoned between the PUT and the confirm is a `pending` row somebody can see,
   * rather than bytes in a bucket nothing points at.
   *
   * A failed PUT therefore leaves that row behind on purpose. It is not shown to the franchisee
   * (`documentsOf` skips it), retrying gets them a fresh `docId`, and the alternative — deleting the row from
   * here — would be a client asking us to forget a request we have already logged.
   */
  async uploadDocument(handle: string, input: DocumentUploadInput): Promise<FranchiseStateResult> {
    const presigned = await franchiseApiRequest<PresignedUpload>(
      "POST",
      `${ONBOARDING}/documents/upload-url`,
      {
        handle,
        body: {
          docType: input.docType,
          fileName: input.fileName,
          contentType: input.file.type,
          sizeBytes: input.file.size,
        },
      },
    );
    if (!presigned.ok) return presigned;

    const upload = presigned.data;
    try {
      // No `credentials`, and that is not an oversight. This request goes to S3, which does not answer a
      // credentialed cross-origin request, so sending our cookies would fail the upload at CORS while also
      // handing a session to a host that has no business with one. The signature is the whole authorisation.
      //
      // The headers are the server's: `Content-Type` is signed, so a value of our own choosing here is a 403
      // from S3 rather than a different upload.
      const response = await fetch(upload.uploadUrl, {
        method: upload.method,
        headers: upload.headers,
        body: input.file,
        credentials: "omit",
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
      if (!response.ok) return { ok: false, error: UPLOAD_FAILED };
    } catch {
      return { ok: false, error: UPLOAD_FAILED };
    }

    return state(`/documents/${encodeURIComponent(upload.docId)}/confirm`, handle);
  },

  removeDocument(handle, docId) {
    return franchiseApiRequest<FranchiseOnboardingState>(
      "DELETE",
      `${ONBOARDING}/documents/${encodeURIComponent(docId)}`,
      { handle },
    );
  },

  submitKyc(handle) {
    return state("/kyc", handle);
  },

  ackFranchise(handle) {
    return state("/ack", handle);
  },

  submitOperations(handle, input) {
    return state("/operations", handle, { operations: input });
  },

  markTermSheetViewed(handle) {
    return state("/termsheet/view", handle);
  },

  /**
   * There is no route behind this, and until there is, it must refuse rather than fabricate a URL.
   *
   * The wizard's step 7b hands off to Digio, and the handoff needs Digio sandbox credentials that this
   * account does not hold yet. Nothing else in the flow is blocked on it in practice: the term sheet's own
   * `blocks-send` marker means `markTermSheetViewed` answers `not_issuable`, so `state.termSheet` is null and
   * `useFranchiseOnboarding` returns before it reaches this method.
   */
  async requestEsign() {
    return { ok: false, error: NO_ESIGN_PROVIDER };
  },

  /** Our own record. The webhook is the only thing that may mark a term sheet signed. */
  refreshEsignStatus: readState,

  getPaymentInstructions(handle) {
    return franchiseApiRequest<PaymentInstructions>("GET", `${ONBOARDING}/payment`, { handle });
  },

  claimPayment(handle, input) {
    return state("/payment/claim", handle, input);
  },

  /** Our own record again. `verifiedAt` is written by an admin reading a bank statement. */
  refreshPaymentStatus: readState,

  /**
   * The `email` argument is deliberately not sent.
   *
   * `franchiseAccountCreate.ts` takes the login address from `details.noticesEmail` and ignores the body,
   * because a thirty-day onboarding link that could name its own address is a link that mints a franchise
   * login for somebody else. The argument survives on the contract because the mock validates it; here the
   * value would be our own, echoed back, and echoing it would suggest it is the client's to choose.
   */
  createAccount(handle, password) {
    return franchiseApiRequest<FranchiseOnboardingState>("POST", "/franchise/account", {
      handle,
      body: { password },
    });
  },
};
