import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHttpOnboardingApi } from "@/lib/httpOnboardingApi";
import type { OnboardingState, SignatureInput } from "@shared/onboarding/types";

/**
 * `OnboardingApi` mapped onto the real routes.
 *
 * What is worth testing here is not that a POST reaches a URL — it is the handful of places
 * where the interface the wizard was built against and the endpoints as designed do not line
 * up, because each of those is somewhere a wrong guess is invisible until integration:
 * which route the deposit poll uses, what a write is allowed to return, what the account
 * call is allowed to send, and what happens to a payment URL we would otherwise put in an
 * `href`.
 *
 * `fetch` is mocked, so these tests pin what this repo *sends and accepts*. They cannot and
 * do not claim the backend agrees — that is what the notes in `httpOnboardingApi.ts` are
 * for.
 */

const HANDLE = "3f7c9a1e5b2d4068a5c3e7f9b2d4068a";

const fetchMock = vi.fn();
const api = createHttpOnboardingApi();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Enough of a state to be recognised as one. `isOnboardingState` checks three fields. */
function state(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    currentStep: 2,
    completedSteps: [1],
    status: "details_submitted",
    ...overrides,
  } as OnboardingState;
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

function requests() {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: url as string,
    method: (init as RequestInit).method,
    body: (init as RequestInit).body ? JSON.parse((init as RequestInit).body as string) : undefined,
    headers: (init as RequestInit).headers as Record<string, string>,
  }));
}

const SIGNATURE: SignatureInput = {
  fullName: "Rohit Malhotra",
  designation: "Director",
  agreedToAgreement: true,
  authorisedToBind: true,
  contentHash: "a".repeat(64),
};

describe("route mapping", () => {
  it("reads the whole state from one endpoint", async () => {
    // Under Supabase the page queried tables directly and RLS decided what it could see.
    // There is no equivalent here — the browser holds no AWS credentials — so this single
    // response is the whole of what the wizard knows.
    queue(state());
    const result = await api.getState(HANDLE);
    expect(result.ok).toBe(true);
    expect(requests()).toEqual([
      expect.objectContaining({
        url: "https://api.muscleboxpro.com/onboarding",
        method: "GET",
        headers: expect.objectContaining({ Authorization: `Bearer ${HANDLE}` }),
      }),
    ]);
  });

  it("names the draft by key, not by step number", async () => {
    // `StepDrafts` is keyed by name so that renumbering the wizard cannot silently repoint
    // a draft at the wrong step. Sending `1` here would reintroduce exactly that coupling
    // at the network boundary, where it is hardest to see.
    queue({ savedAt: "2026-08-23T10:00:00.000Z" });
    await api.saveDraft(HANDLE, "details", { gstin: "29ABCDE1234F1Z5" });
    expect(requests()[0]).toMatchObject({
      url: "https://api.muscleboxpro.com/onboarding/draft",
      method: "PUT",
      body: { step: "details", data: { gstin: "29ABCDE1234F1Z5" } },
    });
  });

  it("polls the deposit through the wizard's own read", async () => {
    // Not `GET /gym/deposit/status`, which answers with a deposit record because its other
    // caller is a logged-in gym with no onboarding state. The wizard needs the whole state
    // back — `depositStatus` reaching `paid` is what advances step 4 — so one request that
    // returns what the caller needs beats two that have to be stitched together.
    queue(state({ depositStatus: "paid" }));
    const result = await api.refreshDepositStatus(HANDLE);
    expect(result.ok && result.data.depositStatus).toBe("paid");
    expect(requests()[0].url).toBe("https://api.muscleboxpro.com/onboarding");
  });

  it("sends the email as well as the password when creating the account", async () => {
    /*
      This sent only the password, on the argument that the address is the gym's §41 notices
      email and the route should read it from the profile the handle is scoped to. The
      deployed route does not: it answers a missing `email` with a 400 and
      `fieldErrors.email`, and step 5 has no email input to highlight — so what a gym saw was
      "Please check the highlighted fields." with nothing highlighted, and no way to finish.

      Reported on 2026-08-25. Both callers of `POST /gym/account` were affected; see
      `setPortalPassword`, which has no address to send and is still broken.
    */
    queue(state({ status: "active" }));
    await api.createAccount(HANDLE, "correct-horse-battery", "notices@irontemple.in");
    expect(requests()[0].body).toEqual({
      email: "notices@irontemple.in",
      password: "correct-horse-battery",
    });
  });

  it("sends no otpCode while signing ships without one", async () => {
    // The endpoint *rejects* a payload carrying the field rather than ignoring it (§8.1):
    // a signature record that reads as OTP-verified when no code was checked is worse
    // evidence than one that never claimed to be. So the key must be absent, not empty.
    queue(state({ isSigned: true }));
    await api.signAgreement(HANDLE, SIGNATURE);
    expect(requests()[0].body).not.toHaveProperty("otpCode");
    expect(requests()[0].body).toMatchObject({ contentHash: "a".repeat(64) });
  });

  it("sends the four acknowledgements the ack route requires", async () => {
    /*
      This used to post `{}`, per the frontend doc's "step 2 — no input", and the deployed
      route requires four affirmative booleans (`REQUIRED_ACKS` in the backend's
      `onboardingAck.ts`). The mismatch showed up as a 400 — "Please check the highlighted
      fields." — at the top of a screen with no fields on it.

      Pinned here because they are hard-coded, which is a debt with a real cost: the row they
      write is the evidence of acceptance. This assertion is what the four checkboxes on step
      2 have to replace, and a passing test that still names `PLACEHOLDER_ACKS` is the
      reminder.
    */
    queue(state({ completedSteps: [1, 2] }));
    await api.ackPartnership(HANDLE);
    expect(requests()[0]).toMatchObject({
      method: "POST",
      body: {
        understandsRevenueShare: true,
        understandsDeposit: true,
        understandsElectricity: true,
        understandsTerm: true,
      },
    });
  });

  it("does not call an endpoint that does not exist", async () => {
    // Signing ships without OTP because it needs SES. `SIGNING_REQUIRES_OTP` is false so
    // nothing calls this; failing rather than throwing keeps that true if something ever
    // does, and a request to a 404 would surface as an unexplained network error instead.
    const result = await api.requestSigningOtp(HANDLE);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("folding a write's response into state", () => {
  it("uses the response when the route returns the state", async () => {
    queue(state({ currentStep: 2, completedSteps: [1] }));
    const result = await api.submitDetails(HANDLE, {} as never);
    expect(result.ok && result.data.currentStep).toBe(2);
    // One request. The re-read below is a shim, not the path.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-reads when the route returns only what it wrote", async () => {
    // `POST /onboarding/agreement/view` is specified to answer with the pinned document
    // rather than the state. Folding that into `state` would blank the step; re-reading
    // keeps the wizard working against either shape.
    queue({ version: "2.2", effectiveDate: "2026-08-23", contentHash: "b".repeat(64), length: 8_412 }, state());
    const result = await api.markAgreementViewed(HANDLE);
    expect(result.ok).toBe(true);
    expect(requests().map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      "POST /onboarding/agreement/view",
      "GET /onboarding",
    ]);
  });

  it("returns the write's own failure rather than re-reading over it", async () => {
    // A `frozen` on step 1 is the answer. Re-reading would replace it with a successful
    // state read and the wizard would show no error at all for a refused edit.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ code: "frozen", message: "Locked once signed." }),
    });
    const result = await api.submitDetails(HANDLE, {} as never);
    expect(result.ok === false && result.error.code).toBe("frozen");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("the deposit", () => {
  const LINK = {
    paymentUrl: "https://rzp.io/i/abcd1234",
    linkId: "plink_ABC123",
    amountPaise: 50_00_000,
  };

  it("never tells the server what the deposit is worth", async () => {
    // The amount comes from that gym's `TERMS.securityDepositPaise`, written by an
    // admin-authenticated call. That is what makes "a gym cannot influence its own deposit"
    // a property rather than an intention, and it holds only if nothing here sends one.
    queue({ state: state(), link: LINK });
    await api.chooseDeposit(HANDLE, "pay_now");
    expect(requests()[0].body).toEqual({ choice: "pay_now" });
  });

  it("takes the link from either response shape", async () => {
    queue({ state: state(), link: LINK });
    const wrapped = await api.chooseDeposit(HANDLE, "pay_now");
    expect(wrapped.ok && wrapped.data.link).toEqual(LINK);

    fetchMock.mockReset();
    // The bare link the route is specified to return today, plus the re-read it forces.
    queue(LINK, state());
    const bare = await api.chooseDeposit(HANDLE, "pay_now");
    expect(bare.ok && bare.data.link).toEqual(LINK);
    expect(bare.ok && bare.data.state.currentStep).toBe(2);
  });

  it("treats pay_later as an answer with no link", async () => {
    // `pay_later` is a real choice, not the absence of one — the deposit is skippable and
    // `POST /admin/gyms/{id}/activate` consults what was chosen.
    queue({ state: state({ depositStatus: "deferred" }), link: null });
    const result = await api.chooseDeposit(HANDLE, "pay_later");
    expect(result.ok && result.data.link).toBeNull();
    expect(result.ok && result.data.state.depositStatus).toBe("deferred");
  });

  it.each([
    ["javascript:alert(document.cookie)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["http://rzp.io/i/abcd1234"],
    ["not a url"],
  ])("refuses to hand %j to an href", async (paymentUrl) => {
    // `StepDeposit` renders this as `href={link.paymentUrl}` on a page mid-onboarding, so a
    // `javascript:` scheme is script execution — the same reasoning that makes
    // `portalSchema.ts` check the dashboard's copy of this field. Plain `http` goes too:
    // this is a payment redirect, and there is no version of it that should be downgradeable.
    queue({ state: state(), link: { ...LINK, paymentUrl } });
    const result = await api.chooseDeposit(HANDLE, "pay_now");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("network");
  });

  it("refuses a link missing the fields the panel renders", async () => {
    queue({ state: state(), link: { paymentUrl: LINK.paymentUrl, linkId: LINK.linkId } });
    const result = await api.chooseDeposit(HANDLE, "pay_now");
    expect(result.ok).toBe(false);
  });
});
