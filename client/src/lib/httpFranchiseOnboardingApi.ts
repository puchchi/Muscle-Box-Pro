/**
 * `FranchiseOnboardingApi` over the franchise wizard API.
 *
 * The live half of the seam described in [franchiseOnboardingApi.ts](./franchiseOnboardingApi.ts). Sixteen
 * routes in `MbpFranchiseWizard-<env>` back sixteen methods, and the count lines up by coincidence rather
 * than by design — three places it does not correspond:
 *
 * - `refreshEsignStatus` and `refreshPaymentStatus` are both `GET /franchise/onboarding`. Neither has a route
 *   of its own because neither reads anything a state response does not already carry, and the thing they are
 *   waiting for is written by somebody else: the e-sign webhook, and an admin verifying a bank statement.
 * - `uploadDocument` is three calls. §9 keeps the presigned PUT out of the components, so the dance lives
 *   here.
 * - `POST /franchise/esign/webhook` has no method here and must never get one. It is Leegality's route,
 *   authenticated by a MAC over the document id, and it is the only thing in the system that may mark a term
 *   sheet signed. A client-side call to it would be a browser claiming a signature.
 *
 * Every response body is the payload itself rather than an envelope, so `franchiseApiRequest<T>` casts
 * straight to the contract type. Nothing here re-validates the shape: the server builds these responses from
 * `toFranchiseOnboardingState`, which is the same projection the contract describes, and a client-side parse
 * would be a second opinion with no way to act on a disagreement.
 */

import { franchiseApiRequest } from "./apiClient";
import type {
  DocumentUploadInput,
  EsignHandoff,
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
   * Step 7b, and the only method whose success value is not a state on its own.
   *
   * `{ state, handoff }`, because the signing URL has nowhere else to go: it authorises an Aadhaar eSign in one
   * named person's identity, so it is not on `EsignState`, not written to any row, not logged at either end and
   * not emailed. It is returned once per call and forgotten — the hook folds the state in and hands the URL
   * straight to a navigation.
   *
   * **Safe to call twice, because the server is idempotent in the document rather than in the URL.** Leegality's
   * create endpoint has no idempotency key, so calling it twice would make two real documents with two live
   * invites in the same person's name. The route decides between reusing and creating *before* anything reaches
   * the provider, and a reuse re-reads the existing document's URL. That is what makes the waiting panel's
   * "open the signing page again" honest.
   *
   * Three attempts in total, then the refusal is `frozen` and its message promises a person rather than another
   * button — the workflow is configured "Reject if failed", so one fumbled Aadhaar OTP is terminal at the
   * provider and owning the retry is the other half of that choice.
   *
   * `contentHash` is echoed rather than chosen. The server checks it against the term sheet row it pinned *and*
   * re-renders the PDF to check its hash too, and answers `content_mismatch` for either — so a term sheet
   * re-priced between the reader loading and the button being pressed cannot be the one that gets signed.
   */
  requestEsign(handle, input) {
    return franchiseApiRequest<{ state: FranchiseOnboardingState; handoff: EsignHandoff }>(
      "POST",
      `${ONBOARDING}/esign`,
      { handle, body: input },
    );
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
