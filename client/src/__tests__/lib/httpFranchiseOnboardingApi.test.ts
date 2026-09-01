import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpFranchiseOnboardingApi as api } from "@/lib/httpFranchiseOnboardingApi";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";

/**
 * `FranchiseOnboardingApi` mapped onto the fourteen wizard routes.
 *
 * `httpOnboardingApi.test.ts`'s brief, for the franchise half: what earns a test is not that a POST
 * reaches a URL, it is each place the sixteen-method contract and the fourteen routes disagree, plus
 * the three-call upload dance. Every one of those is somewhere a wrong guess stays invisible until
 * integration.
 *
 * `fetch` is mocked, so these pin what this repo *sends and accepts*. They do not claim the backend
 * agrees; the notes in `httpFranchiseOnboardingApi.ts` are what carry that.
 *
 * The base URL resolves to production here on purpose: vitest reads no `.env.local`, so
 * `NEXT_PUBLIC_MBP_API_URL` is unset, and `resolveBase` derives `<prod>/franchise-wizard`. That is
 * the composition the sandbox cannot do and prod can, so asserting on it is worth something.
 */

const BASE = "https://api.muscleboxpro.com/franchise-wizard";
const HANDLE = "3f7c9a1e5b2d4068a5c3e7f9b2d4068a";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function state(overrides: Partial<FranchiseOnboardingState> = {}): FranchiseOnboardingState {
  return {
    currentStep: 2,
    completedSteps: [1],
    status: "details_submitted",
    ...overrides,
  } as FranchiseOnboardingState;
}

/** Queue one response per expected request, in order. */
function queue(...bodies: unknown[]) {
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    });
  }
}

function fail(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
  });
}

function requests() {
  return fetchMock.mock.calls.map(([url, init]) => {
    const options = init as RequestInit;
    return {
      url: url as string,
      method: options.method,
      body: typeof options.body === "string" ? JSON.parse(options.body) : options.body,
      headers: options.headers as Record<string, string>,
      credentials: options.credentials,
    };
  });
}

describe("the handle is a header, never a path segment", () => {
  it("reads the whole state from one endpoint with the handle in Authorization", async () => {
    queue(state());
    const result = await api.getState(HANDLE);

    expect(result.ok).toBe(true);
    const [sent] = requests();
    expect(sent.url).toBe(`${BASE}/franchise/onboarding`);
    expect(sent.method).toBe("GET");
    expect(sent.headers.Authorization).toBe(`Bearer ${HANDLE}`);
  });

  it("keeps the handle out of every URL, so it cannot reach a log or a Referer", async () => {
    queue(state(), state(), state(), { savedAt: "2026-09-01T00:00:00.000Z" });
    await api.getState(HANDLE);
    await api.submitKyc(HANDLE);
    await api.removeDocument(HANDLE, "doc_1");
    await api.saveDraft(HANDLE, "details", { legalEntityName: "Northline" } as never);

    for (const sent of requests()) expect(sent.url).not.toContain(HANDLE);
  });
});

describe("the three methods that share one route", () => {
  /**
   * Both refreshes read `GET /franchise/onboarding`, because what they are waiting for is written by
   * somebody else and a state response already carries it.
   */
  it("polls e-sign and payment through the same read as getState", async () => {
    queue(state(), state(), state());
    await api.getState(HANDLE);
    await api.refreshEsignStatus(HANDLE);
    await api.refreshPaymentStatus(HANDLE);

    const urls = requests().map((sent) => `${sent.method} ${sent.url}`);
    expect(new Set(urls)).toEqual(new Set([`GET ${BASE}/franchise/onboarding`]));
  });

  /** The reason `readState` is a module function rather than `this.getState`. */
  it("survives being destructured off the object", async () => {
    const { refreshPaymentStatus } = api;
    queue(state());
    await expect(refreshPaymentStatus(HANDLE)).resolves.toMatchObject({ ok: true });
  });
});

describe("the writes the handlers unwrap by key", () => {
  it("nests details, territory and operations under the key each handler reads", async () => {
    queue(state(), state(), state());
    await api.submitDetails(HANDLE, { legalEntityName: "Northline" } as never);
    await api.submitTerritory(HANDLE, { state: "MH" } as never);
    await api.submitOperations(HANDLE, { hasSite: true } as never);

    expect(requests().map((sent) => sent.body)).toEqual([
      { details: { legalEntityName: "Northline" } },
      { territory: { state: "MH" } },
      { operations: { hasSite: true } },
    ]);
  });

  it("sends a draft as key and value, the pair `validateDraftFor` reads", async () => {
    queue({ savedAt: "2026-09-01T00:00:00.000Z" });
    const result = await api.saveDraft(HANDLE, "territory", { state: "MH" } as never);

    expect(result).toEqual({ ok: true, data: { savedAt: "2026-09-01T00:00:00.000Z" } });
    expect(requests()[0].body).toEqual({ key: "territory", value: { state: "MH" } });
  });

  /**
   * A bodyless POST still sends `{}` and a JSON content type. `apiClient` rule 3: the header is a
   * CSRF control, so dropping it on the calls that carry nothing would be the hole.
   */
  it("gives the four bodyless commits a JSON content type anyway", async () => {
    queue(state(), state(), state(), state());
    await api.submitKyc(HANDLE);
    await api.ackFranchise(HANDLE);
    await api.markTermSheetViewed(HANDLE);
    await api.claimPayment(HANDLE, {} as never);

    for (const sent of requests()) {
      expect(sent.method).toBe("POST");
      expect(sent.headers["Content-Type"]).toBe("application/json");
    }
  });

  /** Unlike the three above, a claim is the body. `validatePaymentClaim` reads the top level. */
  it("sends a payment claim unwrapped", async () => {
    queue(state());
    await api.claimPayment(HANDLE, {
      amountPaise: 125_000_000,
      utr: "SBIN123456789012",
      proofDocId: null,
    } as never);

    expect(requests()[0].body).toEqual({
      amountPaise: 125_000_000,
      utr: "SBIN123456789012",
      proofDocId: null,
    });
  });

  /**
   * `franchiseAccountCreate.ts` takes the login address from `details.noticesEmail` and ignores the
   * body. Echoing our own value back would suggest it is the client's to choose.
   */
  it("sends only the password when creating the login", async () => {
    queue(state({ status: "active" }));
    await api.createAccount(HANDLE, "correct horse battery staple", "someone@example.com");

    const [sent] = requests();
    expect(sent.url).toBe(`${BASE}/franchise/account`);
    expect(sent.body).toEqual({ password: "correct horse battery staple" });
  });
});

describe("uploading a document", () => {
  const PRESIGNED = {
    docId: "fdoc_9f2c",
    uploadUrl: "https://mbp-franchise-docs.s3.ap-south-1.amazonaws.com/franchise/f_1/pan/x.pdf?X-Amz-Signature=abc",
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    expiresInSeconds: 300,
  };

  function pdf(bytes = 1024): File {
    return new File([new Uint8Array(bytes)], "pan.pdf", { type: "application/pdf" });
  }

  it("presigns, PUTs the bytes to S3, then confirms by docId", async () => {
    queue(PRESIGNED);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "" });
    queue(state({ currentStep: 3 }));

    const file = pdf();
    const result = await api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "pan.pdf", file });
    expect(result.ok).toBe(true);

    const [presign, put, confirm] = requests();
    expect(presign.url).toBe(`${BASE}/franchise/onboarding/documents/upload-url`);
    expect(presign.body).toEqual({
      docType: "pan_card",
      fileName: "pan.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(put.url).toBe(PRESIGNED.uploadUrl);
    expect(put.method).toBe("PUT");
    expect(confirm.method).toBe("POST");
    expect(confirm.url).toBe(`${BASE}/franchise/onboarding/documents/fdoc_9f2c/confirm`);
  });

  /**
   * S3 will not answer a credentialed cross-origin request, so cookies here would fail the upload at
   * CORS while handing a session to a host with no business holding one.
   */
  it("sends no credentials and no Authorization to S3", async () => {
    queue(PRESIGNED);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "" });
    queue(state());
    await api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "pan.pdf", file: pdf() });

    const [, put] = requests();
    expect(put.credentials).toBe("omit");
    expect(put.headers).toEqual({ "Content-Type": "application/pdf" });
  });

  /** `Content-Type` is signed, so overriding it is a 403 from S3 rather than a different upload. */
  it("uses the server's signed headers rather than the file's own type", async () => {
    queue({ ...PRESIGNED, headers: { "Content-Type": "image/png" } });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "" });
    queue(state());
    await api.uploadDocument(HANDLE, {
      docType: "pan_card",
      fileName: "pan.pdf",
      file: pdf(),
    });

    expect(requests()[1].headers).toEqual({ "Content-Type": "image/png" });
  });

  it("does not PUT anything when the presign is refused, and reports the server's field error", async () => {
    fail(415, { code: "unsupported_document", message: "We can take a PDF, a JPEG or a PNG." });

    const result = await api.uploadDocument(HANDLE, {
      docType: "pan_card",
      fileName: "pan.heic",
      file: new File([new Uint8Array(8)], "pan.heic", { type: "image/heic" }),
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "unsupported_document", message: "We can take a PDF, a JPEG or a PNG." },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * The `pending` row the presign wrote is left behind deliberately: it is a request we have already
   * logged, `documentsOf` skips it, and a retry gets a fresh `docId`.
   */
  it("does not confirm a PUT that failed, and says the rest of the form is intact", async () => {
    queue(PRESIGNED);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, text: async () => "" });

    const result = await api.uploadDocument(HANDLE, {
      docType: "pan_card",
      fileName: "pan.pdf",
      file: pdf(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.code).toBe("network");
    expect(result.error.message).toContain("Nothing else you've filled in is lost");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a thrown PUT the same as a refused one", async () => {
    queue(PRESIGNED);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await api.uploadDocument(HANDLE, {
      docType: "pan_card",
      fileName: "pan.pdf",
      file: pdf(),
    });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("escapes a docId on both the confirm and the delete path", async () => {
    queue({ ...PRESIGNED, docId: "a/b?c" });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "" });
    queue(state(), state());
    await api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "pan.pdf", file: pdf() });
    await api.removeDocument(HANDLE, "a/b?c");

    const sent = requests();
    expect(sent[2].url).toBe(`${BASE}/franchise/onboarding/documents/a%2Fb%3Fc/confirm`);
    expect(sent[3].method).toBe("DELETE");
    expect(sent[3].url).toBe(`${BASE}/franchise/onboarding/documents/a%2Fb%3Fc`);
  });
});

describe("the method with no route", () => {
  /**
   * Step 7b hands off to Digio and needs credentials this account does not hold. Refusing is the
   * whole behaviour: a fabricated URL would send a franchisee to a signing session that does not
   * exist, having told them their term sheet was ready.
   */
  it("refuses e-sign without calling anything", async () => {
    const result = await api.requestEsign(HANDLE, {
      signType: "aadhaar",
      contentHash: "a".repeat(64),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toContain("nothing you've given us is lost");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("errors keep the franchise vocabulary", () => {
  /**
   * `invalid_handle`, not the gym flow's `invalid_token`. The two are separate vocabularies rather
   * than one superset, so a 401 mapped by status has to land in this one.
   *
   * The body is API Gateway's own authorizer answer, which carries no `code` of ours.
   */
  it("maps a 401 with no code of ours to invalid_handle rather than invalid_token", async () => {
    fail(401, { message: "Unauthorized" });

    const result = await api.getState(HANDLE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.code).toBe("invalid_handle");
  });

  /**
   * A non-JSON error body is a WAF or gateway page, and `rawRequest` calls that a network failure
   * before the status is consulted. Pinned because it is the one case where a real 401 does *not*
   * reach the terminal screen: "check your connection" is the honest answer when the thing that
   * answered was not us.
   */
  it("degrades an unparseable error body to a network failure, status notwithstanding", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "<html>403</html>" });

    const result = await api.getState(HANDLE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.code).toBe("network");
  });

  /** `currentStep` is how the wizard recovers from a stale tab, so it has to survive the mapping. */
  it("carries currentStep and fieldErrors off a wrong_step or a validation body", async () => {
    fail(409, {
      code: "wrong_step",
      message: "You've already sent us your territory.",
      currentStep: 3,
    });
    const conflict = await api.submitTerritory(HANDLE, { state: "MH" } as never);
    expect(conflict).toEqual({
      ok: false,
      error: {
        code: "wrong_step",
        message: "You've already sent us your territory.",
        currentStep: 3,
      },
    });

    fail(400, {
      code: "validation",
      message: "Check the transfer details.",
      fieldErrors: { utr: "That UTR doesn't look right." },
    });
    const invalid = await api.claimPayment(HANDLE, {} as never);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) throw new Error("unreachable");
    expect(invalid.error.fieldErrors).toEqual({ utr: "That UTR doesn't look right." });
  });

  it("returns a failure as a value rather than throwing", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.getPaymentInstructions(HANDLE)).resolves.toMatchObject({
      ok: false,
      error: { code: "network" },
    });
  });
});

describe("payment instructions", () => {
  it("reads the bank details from their own route", async () => {
    queue({ reference: "MBPF-1024", expectedPaise: 125_000_000, bankAccount: null });
    const result = await api.getPaymentInstructions(HANDLE);

    expect(result).toMatchObject({ ok: true, data: { reference: "MBPF-1024" } });
    expect(requests()[0]).toMatchObject({
      method: "GET",
      url: `${BASE}/franchise/onboarding/payment`,
    });
  });
});
