import { beforeEach, describe, expect, it } from "vitest";

import { findUnresolvedTokens, sha256Hex, renderPlainText } from "@shared/agreement/render";
import { ISSUED_AGREEMENT, ISSUED_AGREEMENT_VERSION } from "@shared/agreement/issued";
import { rupeesInWords } from "@shared/agreement/amountInWords";
import { formatInr } from "@shared/partnership/summary";
import { toAgreementFields } from "@shared/onboarding/agreementFields";
// The same entry point the server issues through. A test that renders through its own copy
// of the options and the field bridge proves nothing about the hash that gets stored.
import { issuanceDateInIndia, renderIssuedAgreementText } from "@shared/onboarding/issuedAgreement";
import {
  DEMO_TOKEN,
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

/**
 * Well-formed and wrong — 64 lowercase hex characters, which is all `signatureSchema`
 * checks, and not the hash of anything.
 *
 * It used to be what every signing test sent, and every one of them passed, because the
 * server stored whatever it was given. That is the defect the inversion fixes, so this
 * constant now exists to assert the opposite: sending it must be refused.
 */
const WRONG_HASH = "a".repeat(64);

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

/**
 * The hash an independent verifier arrives at for a record: rendered from state through
 * the shared entry point, not read off `state.agreement`.
 *
 * A real client echoes `state.agreement.contentHash` back — it stopped rendering the
 * document for itself (§22). These tests deliberately do not, because reading the value
 * off the record would compare the server's answer with itself and pass even if the
 * renderer were broken.
 */
async function clientHashFor(state: OnboardingState): Promise<string> {
  const issued = state.agreement;
  if (!issued) throw new Error("expected a document to have been issued");
  return sha256Hex(renderIssuedAgreementText(state, issued.effectiveDate));
}

/** Walks a fresh token to the point just after signing. */
async function signedState(): Promise<OnboardingState> {
  await api.getState(DEMO_TOKEN);
  await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
  const issued = await expectState(api.ackPartnership(DEMO_TOKEN));
  return expectState(
    api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: await clientHashFor(issued),
      // No `otpCode`. Signing ships before SES does, and the endpoint rejects the field
      // rather than ignoring it — see SIGNING_REQUIRES_OTP.
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

/**
 * The issued document.
 *
 * These pin the defects found while writing build item 9's migration, and they are the
 * reason `OnboardingState.agreement` is populated at step 2 rather than at signing. The
 * defects had one root cause — nobody owned the question "which document, dated when,
 * hashing to what" — and they broke the same thing: the ability to re-render a stored
 * agreement and reproduce its hash. A hash that cannot be reproduced is not evidence of
 * anything, and a hash the server never computed is not even a hash of anything it holds.
 */
describe("the issued document", () => {
  it("issues the version, the date and the hash together at step 2", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const state = await expectState(api.ackPartnership(DEMO_TOKEN));

    // All four at once, so there is no window in which a version exists without the hash
    // of the text it renders to. The hash arriving later — at signing, from the client —
    // is what made it unverifiable.
    expect(state.agreement).toEqual({
      version: ISSUED_AGREEMENT_VERSION,
      effectiveDate: "2026-08-22",
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      length: expect.any(Number),
    });
    expect(state.agreement?.length).toBeGreaterThan(10_000);
  });

  it("pins a hash that a second rendering of the record reproduces", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));

    const text = renderIssuedAgreementText(issued, issued.agreement!.effectiveDate);
    expect(await sha256Hex(text)).toBe(issued.agreement?.contentHash);
    expect(text.length).toBe(issued.agreement?.length);
  });

  it("records the version that was actually rendered and hashed", async () => {
    // The defect: the record said "2.1" while the client rendered and hashed v2.2. Both
    // now read from one module, so the two cannot disagree.
    const state = await signedState();
    expect(state.agreement?.version).toBe(ISSUED_AGREEMENT.version);
  });

  it("dates the agreement by the Indian calendar, not the UTC one", async () => {
    // 00:30 IST on the 23rd is 19:00 UTC on the 22nd. `nowIso.slice(0, 10)` answered
    // "2026-08-22" — off by one on the date that starts a 24-month term, printed on the
    // document and inside the hash.
    api = createMockOnboardingApi({ latencyMs: 0, now: () => "2026-08-22T19:00:00.000Z" });
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const state = await expectState(api.ackPartnership(DEMO_TOKEN));

    expect(issuanceDateInIndia("2026-08-22T19:00:00.000Z")).toBe("2026-08-23");
    expect(state.agreement?.effectiveDate).toBe("2026-08-23");
  });

  it("does not move the effective date when IST midnight passes before signing", async () => {
    // 23:58 IST on the 22nd. Midnight IST is 18:30 UTC, so the crossing this exercises is
    // a real one for a gym in India rather than one for a server in Virginia.
    let clock = "2026-08-22T18:28:00.000Z";
    api = createMockOnboardingApi({ latencyMs: 0, now: () => clock });

    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);
    const issued = await expectState(api.markAgreementViewed(DEMO_TOKEN));
    expect(issued.agreement?.effectiveDate).toBe("2026-08-22");

    // Four minutes to read and sign, which happens to cross midnight. The date the gym
    // read is the date that must stay on the record: the alternative is a stored hash of
    // a document dated the 22nd sitting beside a record claiming the 23rd.
    clock = "2026-08-22T18:32:00.000Z";
    const signed = await expectState(
      api.signAgreement(DEMO_TOKEN, {
        fullName: "Rohit Menon",
        designation: "Director",
        agreedToAgreement: true,
        authorisedToBind: true,
        contentHash: await clientHashFor(issued),
      }) as Promise<{ ok: true; data: OnboardingState } | { ok: false; error: unknown }>,
    );

    expect(signed.agreement?.effectiveDate).toBe("2026-08-22");
    // The signing timestamp is the real time and is free to differ — it is not part of
    // the hashed text, which is exactly why the two are separate fields.
    expect(signed.timestamps.signedAt).toBe("2026-08-22T18:32:00.000Z");
  });

  it("re-renders from the record to the hash it stored", async () => {
    const signed = await signedState();
    const record = signed.agreement;
    if (!record) throw new Error("expected a document to have been issued");

    // What a verifier does years later, holding nothing but the record: render the
    // version it names, with the date it carries, and compare. This is the whole point of
    // storing a version and a date alongside the hash, and it is what a hash computed on
    // the client's clock made impossible.
    const verifierHash = await sha256Hex(renderIssuedAgreementText(signed, record.effectiveDate));

    expect(verifierHash).toBe(record.contentHash);
    expect(verifierHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

/**
 * A pin that no longer describes the document.
 *
 * The defect these pin was reachable in one click: read step 3, go back to correct the
 * signatory name — which §47 prints and the sign panel invites — and the record went on
 * pinning a fingerprint of the old text. §47.2 promises the gym that fingerprint as
 * evidence of what it read, so a pin that describes something else is the one thing the
 * record must not be allowed to hold. Shipping an agreement version does the same thing to
 * every record in flight, which is the deployment half of it.
 */
describe("re-issuing a pin that has drifted", () => {
  it("re-pins after a correction at step 1, so the fingerprint describes what is on screen", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));

    // The signatory is rendered into §47 and therefore into the hash.
    const corrected = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, signatoryName: "Priya Menon" }),
    );

    expect(corrected.agreement?.contentHash).not.toBe(issued.agreement?.contentHash);
    expect(await clientHashFor(corrected)).toBe(corrected.agreement?.contentHash);
  });

  it("accepts the signature on the re-issued document and refuses the one first read", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));
    const hashAsFirstRead = await clientHashFor(issued);

    const corrected = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, signatoryName: "Priya Menon" }),
    );

    const stale = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Priya Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: hashAsFirstRead,
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("content_mismatch");

    const signed = await expectState(
      api.signAgreement(DEMO_TOKEN, {
        fullName: "Priya Menon",
        designation: "Director",
        agreedToAgreement: true,
        authorisedToBind: true,
        contentHash: await clientHashFor(corrected),
      }) as Promise<{ ok: true; data: OnboardingState } | { ok: false; error: unknown }>,
    );
    expect(signed.isSigned).toBe(true);
    expect(signed.agreement).toEqual(corrected.agreement);
  });

  it("does not re-date a document that has not moved, however late it is viewed", async () => {
    // Drift is asked at the pinned effective date, not today's. Asking it at today's would
    // make every view after midnight IST look like a drift and walk the Effective Date —
    // and the start of a 24-month term — forward a day at a time.
    let clock = "2026-08-22T10:00:00.000Z";
    api = createMockOnboardingApi({ latencyMs: 0, now: () => clock });
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));

    clock = "2026-09-04T10:00:00.000Z";
    const later = await expectState(api.markAgreementViewed(DEMO_TOKEN));

    expect(later.agreement).toEqual(issued.agreement);
    expect(later.agreement?.effectiveDate).toBe("2026-08-22");
  });

  it("dates a re-issued document today, not when the first one was issued", async () => {
    // A re-issued document is issued now. Keeping the old date would date a document to
    // before the details printed in it existed.
    let clock = "2026-08-22T10:00:00.000Z";
    api = createMockOnboardingApi({ latencyMs: 0, now: () => clock });
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);

    clock = "2026-09-04T10:00:00.000Z";
    const corrected = await expectState(
      api.submitDetails(DEMO_TOKEN, { ...VALID_DETAILS, signatoryName: "Priya Menon" }),
    );

    expect(corrected.agreement?.effectiveDate).toBe("2026-09-04");
    expect(await clientHashFor(corrected)).toBe(corrected.agreement?.contentHash);
  });

  it("issues nothing at step 1, where there is no document to re-issue", async () => {
    // Submitting details must not create a contract. It only refreshes one that exists.
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    expect(state.agreement).toBeNull();
  });

  it("leaves a signed record's pin untouched when it is opened again later", async () => {
    // Once signed the pin is the description of what was attested to. Re-describing it
    // would leave a signature attached to a document that no longer exists.
    let clock = "2026-08-22T10:00:00.000Z";
    api = createMockOnboardingApi({ latencyMs: 0, now: () => clock });
    const signed = await signedState();

    clock = "2026-09-04T10:00:00.000Z";
    const revisited = await expectState(api.markAgreementViewed(DEMO_TOKEN));

    expect(revisited.agreement).toEqual(signed.agreement);
  });
});

describe("signing", () => {
  it("records the signature and leaves the issued document exactly as it was", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));
    const state = await signedState();

    expect(state.isSigned).toBe(true);
    expect(state.status).toBe("signed");
    expect(state.completedSteps).toEqual([1, 2, 3]);
    expect(state.currentStep).toBe(4);
    // Byte-identical to what was issued. Signing attaches to the document; it does not
    // get to write to it, which is what the old `contentHash: parsed.data.contentHash`
    // write did on every signature.
    expect(state.agreement).toEqual(issued.agreement);
  });

  it("refuses a well-formed hash of the wrong text, and signs nothing", async () => {
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    await api.ackPartnership(DEMO_TOKEN);

    const result = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: WRONG_HASH,
    });

    // The assertion the old contract could not make: this used to be recorded as the
    // signed hash of the agreement, and nothing anywhere would have noticed.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("content_mismatch");
    expect((await expectState(api.getState(DEMO_TOKEN))).isSigned).toBe(false);
  });

  it("refuses a hash of the document as it read before the terms changed", async () => {
    // The realistic cause of `content_mismatch`, and the reason it is not a validation
    // error: an admin re-prices the deposit while the gym has the reader open. Nothing
    // the gym typed is wrong, so the recovery is "reload", not "fix your input".
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));
    const staleHash = await clientHashFor({
      ...issued,
      terms: { ...issued.terms, securityDepositInr: 25_000 },
    });

    const result = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: staleHash,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("content_mismatch");
  });

  it("rejects a signing code outright while OTP is off, rather than ignoring one", async () => {
    // A signature accepted alongside an unverified code is a signature whose audit trail
    // claims a check that never happened. Rejecting is what keeps the frontend and the
    // backend flipping `SIGNING_REQUIRES_OTP` in the right order — backend first.
    await api.getState(DEMO_TOKEN);
    await api.submitDetails(DEMO_TOKEN, VALID_DETAILS);
    const issued = await expectState(api.ackPartnership(DEMO_TOKEN));

    const result = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: await clientHashFor(issued),
      otpCode: "123456",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation");
    expect((await expectState(api.getState(DEMO_TOKEN))).isSigned).toBe(false);
  });

  it("refuses to sign a document that was never issued", async () => {
    // A client with no pinned agreement rendered nothing, so whatever hash it sent came
    // from somewhere else. Issuing one here to accommodate it would date the agreement at
    // the instant of signing — the exact bug the inversion removed.
    await api.getState(DEMO_TOKEN);
    const result = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      authorisedToBind: true,
      contentHash: WRONG_HASH,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong_step");
  });

  it("signs once, even if two tabs submit — the second gets already_signed", async () => {
    const first = await signedState();
    const second = await api.signAgreement(DEMO_TOKEN, {
      fullName: "Rohit Menon",
      designation: "Director",
      agreedToAgreement: true,
      // The correct hash, which is what a second tab would genuinely hold. The race has
      // to be lost on `signedAt`, not on the content check.
      authorisedToBind: true,
      contentHash: await clientHashFor(first),
    });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("already_signed");
    expect((await expectState(api.getState(DEMO_TOKEN))).timestamps.signedAt).toBe(
      first.timestamps.signedAt,
    );
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

  it("lets a deferred deposit still be paid after the account exists", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_later");
    await api.createAccount(DEMO_TOKEN, "a-long-enough-password", VALID_DETAILS.noticesEmail);

    // The whole point of "pay later": the gym is using its dashboard, and the deposit is
    // a receivable it can settle whenever its accounts team gets to it.
    const link = await api.chooseDeposit(DEMO_TOKEN, "pay_now");
    expect(link.ok).toBe(true);
    await api.refreshDepositStatus(DEMO_TOKEN);
    const state = await expectState(api.refreshDepositStatus(DEMO_TOKEN));

    expect(state.depositStatus).toBe("paid");
    expect(state.status).toBe("deposit_paid");
    expect(state.timestamps.accountCreatedAt).toBeTruthy();
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
  const EMAIL = VALID_DETAILS.noticesEmail;

  it("needs a signature first", async () => {
    await api.getState(DEMO_TOKEN);
    const result = await api.createAccount(DEMO_TOKEN, "a-long-enough-password", EMAIL);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong_step");
  });

  it("rejects a short password on a named field", async () => {
    await signedState();
    const result = await api.createAccount(DEMO_TOKEN, "short", EMAIL);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fieldErrors?.password).toMatch(/12 characters/);
  });

  /**
   * The address the account is created under has to be sent, and the mock has to say so.
   *
   * `POST /gym/account` requires `email` and answers a missing one with a 400 carrying
   * `fieldErrors.email`. The mock ignored the field, so the live client sending
   * `{ password }` alone passed every test here and failed against the deployed route — a
   * banner reading "Please check the highlighted fields." on a screen with no email input,
   * and no way for any gym to finish step 5.
   */
  it("refuses to create an account with no address to create it under", async () => {
    await signedState();
    const result = await api.createAccount(DEMO_TOKEN, "a-long-enough-password", "");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fieldErrors?.email).toMatch(/email address/);
  });

  it("creates the account with the deposit still deferred", async () => {
    await signedState();
    await api.chooseDeposit(DEMO_TOKEN, "pay_later");
    const state = await expectState(api.createAccount(DEMO_TOKEN, "a-long-enough-password", EMAIL));

    expect(state.depositStatus).toBe("deferred");
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5]);
    expect(state.timestamps.accountCreatedAt).toBe("2026-08-22T10:00:00.000Z");
    /*
      Still `signed`, and this is the assertion the old one got wrong. `active` is written by
      `POST /admin/gyms/{id}/activate` alone — `statusForStepCommit(5)` returns null — and
      `currentStep` stays 5 because the backend's `OnboardingStep` has no 6. Step 6 is
      `useOnboarding`'s derivation from `accountCreatedAt`, not the server's answer.
    */
    expect(state.status).toBe("signed");
    expect(state.currentStep).toBe(5);
  });
});

describe("the agreement rendered from onboarding state", () => {
  it("leaves no token unresolved once step 1 is submitted", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const fields = toAgreementFields(state, "2026-08-22T10:00:00.000Z");

    // The whole point of `agreementFields.ts`: every `{{token}}` in 47 sections and
    // 8 schedules has a value, so no gym ever sees a raw placeholder in its contract.
    expect(findUnresolvedTokens(ISSUED_AGREEMENT, fields)).toEqual([]);
  });

  it("puts that gym's own details into the rendered text", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const text = renderPlainText(
      ISSUED_AGREEMENT,
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
    expect(renderPlainText(ISSUED_AGREEMENT, fields)).toContain(
      `${fields.securityDeposit} - ${fields.securityDepositInWords}`,
    );
  });

  it("hashes identically for identical state, and differently for a changed name", async () => {
    await api.getState(DEMO_TOKEN);
    const state = await expectState(api.submitDetails(DEMO_TOKEN, VALID_DETAILS));
    const iso = "2026-08-22T10:00:00.000Z";

    const render = (s: OnboardingState) => renderPlainText(ISSUED_AGREEMENT, toAgreementFields(s, iso));
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
