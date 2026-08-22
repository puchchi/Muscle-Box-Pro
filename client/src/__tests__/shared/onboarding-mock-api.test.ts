import { beforeEach, describe, expect, it } from "vitest";

import { findUnresolvedTokens, sha256Hex, renderPlainText } from "@shared/agreement/render";
import { AGREEMENT_V2_1 } from "@shared/agreement/v2_1";
import { AGREEMENT_V2_2 } from "@shared/agreement/v2_2";
import { rupeesInWords } from "@shared/agreement/amountInWords";
import { formatInr } from "@shared/partnership/summary";
import { toAgreementFields } from "@shared/onboarding/agreementFields";
import {
  DEMO_TOKEN,
  MOCK_OTP,
  MOCK_TOKENS,
  createMockOnboardingApi,
  resetMockOnboarding,
} from "@shared/onboarding/mockApi";
import type { GymDetails, OnboardingApi, OnboardingState } from "@shared/onboarding/types";

/**
 * The onboarding state machine.
 *
 * These tests are aimed at the mock, but they are really a specification for the
 * edge functions in build item 9: every assertion here is a rule the real backend
 * has to enforce too, and the mock exists so the rules can be pinned before the
 * database does. When `mockApi.ts` is replaced, this file should keep passing
 * against the replacement with only the constructor line changed.
 */

const VALID_DETAILS: GymDetails = {
  legalEntityName: "Iron Temple Fitness Private Limited",
  entityType: "pvt_ltd",
  tradeName: "Iron Temple Fitness",
  gstin: "29AABCU9603R1ZM",
  fssaiLicenceNumber: "12345678901234",
  registeredAddress: "12 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
  installationAddress: "12 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
  signatoryName: "Rohit Menon",
  signatoryDesignation: "Director",
  noticesEmail: "owner@irontemple.example",
  noticesPhone: "+91 98450 12345",
};

/** A 64-hex string, which is all `signatureSchema` requires of the hash. */
const HASH = "a".repeat(64);

let api: OnboardingApi;

beforeEach(() => {
  resetMockOnboarding();
  api = createMockOnboardingApi({ latencyMs: 0, now: () => "2026-08-22T10:00:00.000Z" });
});

/** Unwraps a successful result, failing the test loudly rather than returning null. */
async function expectState(
  promise: Promise<{ ok: true; data: OnboardingState } | { ok: false; error: unknown }>,
): Promise<OnboardingState> {
  const result = await promise;
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.data;
}

/** Walks a fresh token to the point just after signing. */
async function signedState(): Promise<OnboardingState> {
  await api.getState(DEMO_TOKEN);
  await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
  await api.ackPartnership(DEMO_TOKEN);
  await api.requestSigningOtp(DEMO_TOKEN);
  return expectState(
    api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: HASH,
      otpCode: MOCK_OTP,
    }) as Promise<{ ok: true; data: OnboardingState } | { ok: false; error: unknown }>,
  );
}

describe("token resolution", () => {
  it("seeds a fresh record on first open and records the open once", async () => {
    const first = await expectState(api.getState(DEMO_TOKEN));
    expect(first.currentStep).toBe(1);
    expect(first.completedSteps).toEqual([]);
    expect(first.status).toBe("opened");
    expect(first.timestamps.firstOpenedAt).toBe("2026-08-22T10:00:00.000Z");

    const second = await expectState(api.getState(DEMO_TOKEN));
    expect(second.timestamps.firstOpenedAt).toBe(first.timestamps.firstOpenedAt);
  });

  it.each([
    [MOCK_TOKENS.expired, "expired_token"],
    [MOCK_TOKENS.revoked, "revoked_token"],
    ["not-a-real-token", "invalid_token"],
  ])("maps %s to %s", async (token, code) => {
    const result = await api.getState(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  it("hands back a snapshot, so a caller cannot mutate the store", async () => {
    const state = await expectState(api.getState(DEMO_TOKEN));
    state.currentStep = 5;
    state.details.legalEntityName = "Tampered";

    const again = await expectState(api.getState(DEMO_TOKEN));
    expect(again.currentStep).toBe(1);
    expect(again.details.legalEntityName).toBe("");
  });
});

describe("step 1 — details", () => {
  it("rejects an invalid GSTIN with a field error and does not advance", async () => {
    await api.getState(DEMO_TOKEN);
    const result = await api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, gstin: "NOPE" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation");
      expect(result.error.fieldErrors?.gstin).toMatch(/15-character GSTIN/);
    }
    expect((await expectState(api.getState(DEMO_TOKEN))).currentStep).toBe(1);
  });

  it("accepts a blank FSSAI number, because not every gym holds one", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, fssaiLicenceNumber: "" }),
    );
    expect(state.currentStep).toBe(2);
  });

  it("advances to step 2 and renames the gym from its trade name", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, tradeName: "Iron Temple Whitefield" }),
    );

    expect(state.completedSteps).toEqual([1]);
    expect(state.currentStep).toBe(2);
    expect(state.status).toBe("details_submitted");
    expect(state.gymDisplayName).toBe("Iron Temple Whitefield");
    expect(state.timestamps.detailsSubmittedAt).toBe("2026-08-22T10:00:00.000Z");
  });

  it("falls back to the legal name when there is no trade name", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, tradeName: "" }));
    expect(state.gymDisplayName).toBe("Iron Temple Fitness Private Limited");
  });
});

describe("drafts", () => {
  it("merges partial saves instead of replacing them", async () => {
    await api.getState(DEMO_TOKEN);
    await api.saveDraft(DEMO_TOKEN, "details", { legalEntityName: "Iron Temple Fitness Pvt" });
    await api.saveDraft(DEMO_TOKEN, "details", { gstin: "29AABCU9603R1ZM" });

    const state = await expectState(api.getState(DEMO_TOKEN));
    expect(state.drafts.details).toEqual({
      legalEntityName: "Iron Temple Fitness Pvt",
      gstin: "29AABCU9603R1ZM",
    });
  });

  it("clears the draft on submit, so a resume shows what was submitted", async () => {
    await api.getState(DEMO_TOKEN);
    await api.saveDraft(DEMO_TOKEN, "details", { legalEntityName: "Half typed nam" });
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));

    expect(state.drafts.details).toBeUndefined();
    expect(state.details.legalEntityName).toBe("Iron Temple Fitness Private Limited");
  });

  it("refuses detail drafts once the agreement is signed", async () => {
    await signedState();
    const result = await api.saveDraft(DEMO_TOKEN, "details", { legalEntityName: "New name" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("frozen");
  });
});

describe("step advancement", () => {
  it("refuses a step ahead of the current one and says where the gym actually is", async () => {
    await api.getState(DEMO_TOKEN);
    const result = await api.ackPartnership(DEMO_TOKEN);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("wrong_step");
      expect(result.error.currentStep).toBe(1);
    }
  });

  it("does not knock a gym backwards when it re-submits an earlier step", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);
    expect((await expectState(api.getState(DEMO_TOKEN))).currentStep).toBe(3);

    // A correction made from step 3, before signing — allowed, and it must leave
    // the gym on 3 rather than resetting it to 2.
    const state = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, signatoryName: "Priya Menon" }),
    );
    expect(state.currentStep).toBe(3);
    expect(state.completedSteps).toEqual([1, 2]);
    expect(state.details.signatoryName).toBe("Priya Menon");
  });

  it("treats viewing the agreement as an audit fact, not as completing step 3", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);

    const state = await expectState(api.markAgreementViewed(DEMO_TOKEN));
    expect(state.timestamps.agreementViewedAt).toBe("2026-08-22T10:00:00.000Z");
    expect(state.status).toBe("agreement_viewed");
    expect(state.completedSteps).not.toContain(3);
    expect(state.currentStep).toBe(3);
  });
});

describe("signing", () => {
  it("records the signature, the version and the content hash", async () => {
    const state = await signedState();

    expect(state.isSigned).toBe(true);
    expect(state.status).toBe("signed");
    expect(state.completedSteps).toEqual([1, 2, 3]);
    expect(state.currentStep).toBe(4);
    expect(state.agreement).toEqual({ version: "2.1", contentHash: HASH });
  });

  it("refuses a wrong OTP", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);
    await api.requestSigningOtp(DEMO_TOKEN);

    const result = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: HASH,
      otpCode: "000000",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("otp_invalid");
    expect((await expectState(api.getState(DEMO_TOKEN))).isSigned).toBe(false);
  });

  it("signs once, even if two tabs submit — the second gets already_signed", async () => {
    await signedState();
    const second = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: "b".repeat(64),
      otpCode: MOCK_OTP,
    });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("already_signed");
    // The first hash stands. A second signature must not overwrite what was signed.
    expect((await expectState(api.getState(DEMO_TOKEN))).agreement?.contentHash).toBe(HASH);
  });

  it("freezes steps 1 and 2 after signing", async () => {
    await signedState();

    for (const call of [
      () => api.submitDetails(DEMO_TOKEN, VALID_DETAILS),
      () => api.ackPartnership(DEMO_TOKEN),
    ]) {
      const result = await call();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("frozen");
    }
  });
});

describe("step 4 — deposit", () => {
  it("cannot be started before signing, because §5.1 makes it an obligation of the agreement", async () => {
    await api.getState(DEMO_TOKEN);
    const result = await api.chooseDeposit(DEMO_TOKEN, "pay_now");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong_step");
  });

  it("issues a link priced from the terms row, in paise, and leaves the step open", async () => {
    const signed = await signedState();
    const result = await api.chooseDeposit(DEMO_TOKEN, "pay_now");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.link?.amountPaise).toBe(signed.terms.securityDepositInr * 100);
    expect(result.data.state.depositStatus).toBe("pending");
    // Not complete: only our own record of the money completes step 4.
    expect(result.data.state.completedSteps).not.toContain(4);
    expect(result.data.state.currentStep).toBe(4);
  });

  it("reports the money as not yet seen while the webhook is in flight", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_now");
    // The common case in reality: a gym clicks "check now" seconds after paying, and
    // settlement has not reached our record yet. The UI has to have this state, so the
    // mock has to be able to produce it.
    const state = await expectState(api.refreshDepositStatus(DEMO_TOKEN));

    expect(state.depositStatus).toBe("pending");
    expect(state.depositReceipt).toBeNull();
    expect(state.currentStep).toBe(4);
  });

  it("completes the step when the payment is confirmed, with a receipt", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_now");
    await api.refreshDepositStatus(DEMO_TOKEN);
    const state = await expectState(api.refreshDepositStatus(DEMO_TOKEN));

    expect(state.depositStatus).toBe("paid");
    expect(state.status).toBe("deposit_paid");
    expect(state.currentStep).toBe(5);
    // The receipt is written server-side from the amount the gateway settled, in paise.
    expect(state.depositReceipt?.amountPaise).toBe(state.terms.securityDepositInr * 100);
    expect(state.depositReceipt?.receiptNo).toBeTruthy();
    expect(state.depositReceipt?.paidAt).toBe(state.timestamps.depositPaidAt);
  });

  it("lets a deferred deposit still be paid, without regressing an active gym", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_later");
    await api.createAccount(DEMO_TOKEN, "a-long-enough-password");

    // The whole point of "pay later": the gym is live, and the deposit is a
    // receivable it can settle whenever its accounts team gets to it.
    const link = await api.chooseDeposit(DEMO_TOKEN, "pay_now");
    expect(link.ok).toBe(true);
    await api.refreshDepositStatus(DEMO_TOKEN);
    const state = await expectState(api.refreshDepositStatus(DEMO_TOKEN));

    expect(state.depositStatus).toBe("paid");
    // `deposit_paid` sits behind `active` on the lifecycle; writing it here would
    // demote a gym that is already trading.
    expect(state.status).toBe("active");
    expect(state.completedSteps).toContain(5);
  });

  it("lets a signed gym defer the deposit and carry on", async () => {
    await signedState();
    const result = await api.chooseDeposit(DEMO_TOKEN, "pay_later");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.link).toBeNull();
    expect(result.data.state.depositStatus).toBe("deferred");
    expect(result.data.state.currentStep).toBe(5);
  });
});

describe("step 5 — account", () => {
  it("needs a signature first", async () => {
    await api.getState(DEMO_TOKEN);
    const result = await api.createAccount(DEMO_TOKEN, "a-long-enough-password");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong_step");
  });

  it("rejects a short password on a named field", async () => {
    await signedState();
    const result = await api.createAccount(DEMO_TOKEN, "short");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fieldErrors?.password).toMatch(/8 characters/);
  });

  it("activates the gym with the deposit still deferred", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_later");
    const state = await expectState(api.createAccount(DEMO_TOKEN, "a-long-enough-password"));

    expect(state.status).toBe("active");
    expect(state.depositStatus).toBe("deferred");
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5]);
    expect(state.timestamps.accountCreatedAt).toBe("2026-08-22T10:00:00.000Z");
  });
});

describe("the agreement rendered from onboarding state", () => {
  /**
   * Both versions, deliberately.
   *
   * v2.2 is what the flow issues, so a missing token there is a blank in a live
   * contract. v2.1 is frozen and has signatures against it in principle, so it has to
   * keep rendering from current state too — a field removed for 2.2's benefit would
   * make an already-signed 2.1 record unreproducible, and the hash is only evidence
   * while the text can be re-rendered.
   */
  it.each([
    ["2.1", AGREEMENT_V2_1],
    ["2.2", AGREEMENT_V2_2],
  ])("leaves no token unresolved in v%s once step 1 is submitted", async (_version, agreement) => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const fields = toAgreementFields(state, "2026-08-22T10:00:00.000Z");

    // The whole point of `agreementFields.ts`: every `{{token}}` in 47 sections and
    // 8 schedules has a value, so no gym ever sees a raw placeholder in its contract.
    expect(findUnresolvedTokens(agreement, fields)).toEqual([]);
  });

  it("puts that gym's own details into the rendered text", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const text = renderPlainText(
      AGREEMENT_V2_2,
      toAgreementFields(state, "2026-08-22T10:00:00.000Z"),
    );

    expect(text).toContain("Iron Temple Fitness Private Limited");
    expect(text).toContain("22 August 2026");
    expect(text).not.toContain("{{");
  });

  it("writes §5.1's deposit words from the same figure the terms row carries", async () => {
    // The one field derived rather than copied. If these disagree, §5.1 states two
    // different amounts and the lower one is arguable.
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const fields = toAgreementFields(state, "2026-08-22T10:00:00.000Z");

    expect(fields.securityDeposit).toBe(formatInr(state.terms.securityDepositInr));
    expect(fields.securityDepositInWords).toBe(rupeesInWords(state.terms.securityDepositInr));
    expect(renderPlainText(AGREEMENT_V2_2, fields)).toContain(
      `${fields.securityDeposit} - ${fields.securityDepositInWords}`,
    );
  });

  it("hashes identically for identical state, and differently for a changed name", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const iso = "2026-08-22T10:00:00.000Z";

    const render = (s: OnboardingState) => renderPlainText(AGREEMENT_V2_2, toAgreementFields(s, iso));
    const first = await sha256Hex(render(state));
    const again = await sha256Hex(render(state));
    const renamed = await sha256Hex(
      render({ ...state, details: { ...state.details, legalEntityName: "Iron Fortress LLP" } }),
    );

    expect(again).toBe(first);
    // If this ever stops holding, the hash has stopped covering the parties and is
    // no longer evidence of what was signed.
    expect(renamed).not.toBe(first);
  });
});
