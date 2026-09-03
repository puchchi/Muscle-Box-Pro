import { beforeEach, describe, expect, it } from "vitest";

import { GOLDEN_TERM_SHEET_V1 } from "@shared/franchise/termsheet/goldenVector";
import {
  TERM_SHEET_VALIDITY_DAYS,
  WAREHOUSE_NOT_IDENTIFIED_DECLARATION,
  termSheetValidUntil,
} from "@shared/franchise/termsheet/fields";
// The same entry point the server issues through. A test that renders through its own copy of
// the render options and the field bridge proves nothing about the hash that gets stored.
import {
  canIssueTermSheet,
  renderIssuedTermSheetText,
} from "@shared/franchise/termsheet/issued";
import { sha256Hex } from "@shared/agreement/render";
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
  resetMockFranchiseOnboarding,
} from "@shared/franchise/onboarding/mockApi";
import {
  COMPLETED_ON_READ_STEPS,
  isForwardStatus,
} from "@shared/franchise/onboarding/status";
import type {
  FranchiseDetails,
  FranchiseOnboardingApi,
  FranchiseOnboardingState,
  OperationsReadiness,
  PaymentClaimInput,
  TerritoryProposal,
} from "@shared/franchise/onboarding/types";

/**
 * The franchise onboarding state machine.
 *
 * Aimed at the mock, but really the specification for the handlers in
 * docs/franchise-onboarding.md §8: every assertion here is a rule the backend has to enforce
 * too, and the mock exists so the rules can be pinned before the table does. When `mockApi.ts`
 * is swapped for HTTP this file should keep passing with only the constructor line changed.
 *
 * Three of the rules are ones the gym flow had no reason to have, and they are the ones worth
 * reading first: nothing a franchisee calls may complete step 4, 7 or 8; a hold reopens the
 * application; and a term sheet whose own record is incomplete cannot be issued at all.
 */

const VALID_DETAILS: FranchiseDetails = {
  legalEntityName: "Northline Ventures Private Limited",
  entityType: "pvt_ltd",
  tradeName: "Northline Ventures",
  // Fourth character C, because the entity is a company. See `PAN_CLASS`.
  pan: "AABCU9603R",
  gstin: "29AABCU9603R1ZM",
  cin: "U74999DL2019PTC123456",
  llpin: "",
  registeredAddress: "40 Sector 18, Noida, Uttar Pradesh 201301",
  signatoryName: "Rajesh Mehta",
  signatoryDesignation: "Director",
  // Fourth character P, because a signatory is a person.
  signatoryPan: "AAAPM1234A",
  signatoryAadhaarLast4: "4321",
  noticesEmail: "r.mehta@northline.example",
  noticesPhone: "+91 98450 12345",
};

const VALID_TERRITORY: TerritoryProposal = {
  tier: "territory",
  proposedState: "Karnataka",
  proposedDistricts: ["Bengaluru (Bangalore) Urban"],
  proposedPincodes: [],
  proposedBoundary: "",
  existingRelationships: "",
};

const VALID_OPERATIONS: OperationsReadiness = {
  warehouseNotIdentified: false,
  warehouseAddress: "Plot 22, Site IV Industrial Area, Sahibabad 201010",
  warehouseAreaSqft: 2400,
  temperatureControl: "yes",
  operationsContactName: "Priya Nair",
  operationsContactPhone: "+91 99100 45678",
  deploymentPlan:
    "Five machines placed across four gyms in Sector 18 and Sector 62 within eight weeks of delivery.",
  logisticsArrangement: "own_vehicle",
};

const VALID_CLAIM: PaymentClaimInput = {
  utr: "SBIN0123456789AB",
  amountPaise: 12_50_000 * 100,
  paidOn: "2026-09-05",
  proofDocId: null,
};

/** Well-formed and wrong. All `content_mismatch` needs is a hash that is not the pinned one. */
const WRONG_HASH = "a".repeat(64);

const HANDLE = FRANCHISE_DEMO_HANDLE;

let api: FranchiseOnboardingApi;

beforeEach(() => {
  resetMockFranchiseOnboarding();
  api = createMockFranchiseOnboardingApi({
    latencyMs: 0,
    now: () => "2026-09-01T10:00:00.000Z",
  });
});

/** Unwraps a successful result, failing loudly rather than returning null. */
async function expectState(
  promise: Promise<
    { ok: true; data: FranchiseOnboardingState } | { ok: false; error: unknown }
  >,
): Promise<FranchiseOnboardingState> {
  const result = await promise;
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.data;
}

async function expectError(
  promise: Promise<{ ok: true; data: unknown } | { ok: false; error: { code: string } }>,
) {
  const result = await promise;
  if (result.ok) throw new Error("expected an error, got a successful result");
  return result.error;
}

function pdf(bytes = 1024): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

/** Steps 1 and 2, which is as far as anyone gets before step 3 accepts an upload. */
async function throughTerritory(): Promise<FranchiseOnboardingState> {
  await expectState(api.getState(HANDLE));
  await expectState(api.submitDetails(HANDLE, VALID_DETAILS));
  return expectState(api.submitTerritory(HANDLE, VALID_TERRITORY));
}

async function uploadRequiredDocuments(): Promise<void> {
  for (const docType of ["pan_card", "entity_proof", "address_proof", "signatory_id"] as const) {
    await expectState(
      api.uploadDocument(HANDLE, { docType, fileName: `${docType}.pdf`, file: pdf() }),
    );
  }
}

/** Steps 1 to 3: everything a franchisee can do before we have decided anything. */
async function throughKyc(): Promise<FranchiseOnboardingState> {
  await throughTerritory();
  await uploadRequiredDocuments();
  return expectState(api.submitKyc(HANDLE));
}

/** Everything up to a pinned term sheet the franchisee has read. */
async function throughTermSheet(): Promise<FranchiseOnboardingState> {
  await throughKyc();
  previewApprove(HANDLE);
  await expectState(api.ackFranchise(HANDLE));
  await expectState(api.submitOperations(HANDLE, VALID_OPERATIONS));
  return expectState(api.markTermSheetViewed(HANDLE));
}

/** Requests and completes a signature over whatever term sheet is currently pinned. */
async function signCurrent(): Promise<FranchiseOnboardingState> {
  const viewed = await expectState(api.getState(HANDLE));
  const requested = await api.requestEsign(HANDLE, {
    signType: "aadhaar",
    contentHash: viewed.termSheet!.contentHash,
  });
  if (!requested.ok) throw new Error("expected the e-sign request to be accepted");
  const signed = previewCompleteEsign(HANDLE);
  if (!signed) throw new Error("expected the preview webhook to sign");
  return signed;
}

/** Everything up to and including a signature. */
async function throughSignature(): Promise<FranchiseOnboardingState> {
  await throughTermSheet();
  return signCurrent();
}

describe("handles", () => {
  it("serves a fresh record for the demo handle", async () => {
    const state = await expectState(api.getState(HANDLE));
    expect(state.currentStep).toBe(1);
    expect(state.completedSteps).toEqual([]);
    expect(state.status).toBe("opened");
    expect(state.isApproved).toBe(false);
    expect(state.isSigned).toBe(false);
  });

  it("distinguishes expired, revoked and unknown handles", async () => {
    expect((await expectError(api.getState(MOCK_FRANCHISE_HANDLES.expired))).code).toBe(
      "expired_handle",
    );
    expect((await expectError(api.getState(MOCK_FRANCHISE_HANDLES.revoked))).code).toBe(
      "revoked_handle",
    );
    expect((await expectError(api.getState(MOCK_FRANCHISE_HANDLES.invalid))).code).toBe(
      "invalid_handle",
    );
  });

  it("opens an unreserved handle as its own fresh application", async () => {
    const minted = "63aa562b4e5f40b2e4221abad9722275";
    const state = await expectState(api.getState(minted));
    expect(state.handleId).toBe(minted);
    expect(state.currentStep).toBe(1);
    expect(state.completedSteps).toEqual([]);

    // Its own record, so walking one minted link cannot move another.
    await expectState(api.submitDetails(minted, VALID_DETAILS));
    expect((await expectState(api.getState(HANDLE))).completedSteps).toEqual([]);
  });

  it("records first open once", async () => {
    const first = await expectState(api.getState(HANDLE));
    const second = await expectState(api.getState(HANDLE));
    expect(second.timestamps.firstOpenedAt).toBe(first.timestamps.firstOpenedAt);
  });

  it("seeds no bank details, because the flow never collects one", async () => {
    const state = await expectState(api.getState(HANDLE));
    expect(JSON.stringify(state)).not.toMatch(/ifsc/i);
  });
});

describe("the server owns the step", () => {
  it("derives currentStep rather than incrementing it", async () => {
    await expectState(api.submitDetails(HANDLE, VALID_DETAILS));
    const state = await expectState(api.submitTerritory(HANDLE, VALID_TERRITORY));
    expect(state.completedSteps).toEqual([1, 2]);
    expect(state.currentStep).toBe(3);
  });

  it("refuses a step the record has not reached", async () => {
    const error = await expectError(api.submitOperations(HANDLE, VALID_OPERATIONS));
    // Not `wrong_step`: step 6 exists only for an approved franchise, and telling them to
    // complete an earlier step would be untrue when the step they wait on is ours.
    expect(error.code).toBe("not_approved");
  });

  it("does not knock a franchisee backwards when they correct an earlier step", async () => {
    await throughKyc();
    previewHold(HANDLE);
    const corrected = await expectState(
      api.submitDetails(HANDLE, { ...VALID_DETAILS, tradeName: "Northline Nutrition" }),
    );
    expect(corrected.completedSteps).toContain(1);
    expect(corrected.currentStep).toBe(4);
  });
});

describe("drafts", () => {
  it("never advances a step and never moves the status", async () => {
    const before = await expectState(api.getState(HANDLE));
    const saved = await api.saveDraft(HANDLE, "details", { legalEntityName: "Half typed" });
    expect(saved.ok).toBe(true);

    const after = await expectState(api.getState(HANDLE));
    expect(after.currentStep).toBe(before.currentStep);
    expect(after.completedSteps).toEqual(before.completedSteps);
    expect(after.status).toBe(before.status);
    expect(after.drafts.details?.legalEntityName).toBe("Half typed");
    // The submitted value lives outside `drafts`, so a half-typed step cannot overwrite one.
    expect(after.details.legalEntityName).toBe("");
  });

  it("merges patches instead of replacing them", async () => {
    await api.saveDraft(HANDLE, "details", { legalEntityName: "Northline" });
    await api.saveDraft(HANDLE, "details", { pan: "AABCU9603R" });
    const state = await expectState(api.getState(HANDLE));
    expect(state.drafts.details).toEqual({ legalEntityName: "Northline", pan: "AABCU9603R" });
  });

  it("clears the draft once the step is submitted", async () => {
    await api.saveDraft(HANDLE, "details", { legalEntityName: "Half typed" });
    const state = await expectState(api.submitDetails(HANDLE, VALID_DETAILS));
    expect(state.drafts.details).toBeUndefined();
  });

  it("refuses a draft for a frozen step", async () => {
    await throughKyc();
    const result = await api.saveDraft(HANDLE, "details", { tradeName: "Too late" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("frozen");
  });
});

describe("validation", () => {
  it("reports field errors rather than a message", async () => {
    const error = await expectError(
      api.submitDetails(HANDLE, { ...VALID_DETAILS, legalEntityName: "" }),
    );
    expect(error.code).toBe("validation");
    expect((error as { fieldErrors?: Record<string, string> }).fieldErrors).toHaveProperty(
      "legalEntityName",
    );
  });

  // An applicant who has not incorporated anything signs on their own PAN, and the fourth
  // character of a PAN is the holder's class. Refusing `P` against a company would refuse them.
  it("accepts a personal PAN for a company", async () => {
    const state = await expectState(
      api.submitDetails(HANDLE, { ...VALID_DETAILS, pan: "AAAPM1234A" }),
    );
    expect(state.details.pan).toBe("AAAPM1234A");
  });

  it("does not require a CIN from a company", async () => {
    const state = await expectState(api.submitDetails(HANDLE, { ...VALID_DETAILS, cin: "" }));
    expect(state.details.cin).toBe("");
  });

  it("still refuses a CIN that is the wrong shape", async () => {
    const error = await expectError(api.submitDetails(HANDLE, { ...VALID_DETAILS, cin: "U749" }));
    expect((error as { fieldErrors?: Record<string, string> }).fieldErrors).toHaveProperty("cin");
  });
});

describe("documents", () => {
  // Uploads are a step-3 action, so every case here starts from a record that has reached it.
  beforeEach(async () => {
    await throughTerritory();
  });

  it("refuses a content type the presigned policy would not accept", async () => {
    const error = await expectError(
      api.uploadDocument(HANDLE, {
        docType: "pan_card",
        fileName: "scan.tiff",
        file: new Blob(["x"], { type: "image/tiff" }),
      }),
    );
    expect(error.code).toBe("unsupported_document");
  });

  it("refuses a file over the size bound", async () => {
    const error = await expectError(
      api.uploadDocument(HANDLE, {
        docType: "pan_card",
        fileName: "huge.pdf",
        file: pdf(9 * 1024 * 1024),
      }),
    );
    expect(error.code).toBe("document_too_large");
  });

  it("keeps one document per type, so nobody has to guess which is current", async () => {
    await expectState(
      api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "first.pdf", file: pdf() }),
    );
    const state = await expectState(
      api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "second.pdf", file: pdf() }),
    );
    const panCards = state.documents.filter((d) => d.docType === "pan_card");
    expect(panCards).toHaveLength(1);
    expect(panCards[0].fileName).toBe("second.pdf");
  });

  it("never hands the franchisee a URL for a document", async () => {
    const state = await expectState(
      api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "pan.pdf", file: pdf() }),
    );
    expect(Object.keys(state.documents[0])).not.toContain("url");
  });

  it("refuses to commit step 3 while a required document is missing", async () => {
    await expectState(
      api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "pan.pdf", file: pdf() }),
    );
    const error = await expectError(api.submitKyc(HANDLE));
    expect(error.code).toBe("validation");
    expect(Object.keys((error as { fieldErrors?: object }).fieldErrors ?? {})).toEqual([
      "entity_proof",
      "address_proof",
      "signatory_id",
    ]);
  });

  it("does not ask an unregistered franchisee for entity proof", async () => {
    await expectState(
      api.submitDetails(HANDLE, {
        ...VALID_DETAILS,
        entityType: "unregistered",
        pan: "AAAPM1234A",
        cin: "",
      }),
    );
    for (const docType of ["pan_card", "address_proof", "signatory_id"] as const) {
      await expectState(
        api.uploadDocument(HANDLE, { docType, fileName: `${docType}.pdf`, file: pdf() }),
      );
    }
    const state = await expectState(api.submitKyc(HANDLE));
    expect(state.completedSteps).toContain(3);
  });

  /* A proprietor has no registration certificate either, so the row that asked for "proof the
     business exists" was asking for a document nobody holds. */
  it("does not ask a proprietorship for entity proof", async () => {
    await expectState(
      api.submitDetails(HANDLE, {
        ...VALID_DETAILS,
        entityType: "proprietorship",
        pan: "AAAPM1234A",
        cin: "",
      }),
    );
    for (const docType of ["pan_card", "address_proof", "signatory_id"] as const) {
      await expectState(
        api.uploadDocument(HANDLE, { docType, fileName: `${docType}.pdf`, file: pdf() }),
      );
    }
    const state = await expectState(api.submitKyc(HANDLE));
    expect(state.completedSteps).toContain(3);
  });

  it("stops accepting uploads once step 3 is submitted", async () => {
    await throughKyc();
    const error = await expectError(
      api.uploadDocument(HANDLE, { docType: "address_proof", fileName: "new.pdf", file: pdf() }),
    );
    expect(error.code).toBe("frozen");
  });

  it("treats a repeated submitKyc as a no-op rather than a freeze error", async () => {
    await throughKyc();
    const state = await expectState(api.submitKyc(HANDLE));
    expect(state.completedSteps).toContain(3);
  });
});

describe("steps 4, 7 and 8 are ours", () => {
  it("is the set the domain module publishes", () => {
    expect(COMPLETED_ON_READ_STEPS).toEqual([4, 7, 8]);
  });

  it("completes step 4 from the approval record and nothing else", async () => {
    const beforeApproval = await throughKyc();
    expect(beforeApproval.completedSteps).not.toContain(4);
    expect(beforeApproval.currentStep).toBe(4);

    previewApprove(HANDLE);
    const after = await expectState(api.getState(HANDLE));
    expect(after.completedSteps).toContain(4);
    expect(after.currentStep).toBe(5);
    expect(after.isApproved).toBe(true);
  });

  it("completes step 7 from a signature, not from reading the term sheet", async () => {
    const viewed = await throughTermSheet();
    expect(viewed.completedSteps).not.toContain(7);
    expect(viewed.status).toBe("termsheet_viewed");

    const signed = await signCurrent();
    expect(signed.completedSteps).toContain(7);
  });

  it("completes step 8 from a verified payment, not from the franchisee's claim", async () => {
    await throughSignature();
    const claimed = await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    expect(claimed.completedSteps).not.toContain(8);
    expect(claimed.status).toBe("payment_claimed");

    previewVerifyPayment(HANDLE);
    const verified = await expectState(api.refreshPaymentStatus(HANDLE));
    expect(verified.completedSteps).toContain(8);
  });

  it("never stores 4, 7 or 8 through any franchisee-callable path", async () => {
    // Every method a browser can reach, run in order, with none of our own writes. If any of
    // them latched one of the three, the set would survive here.
    await expectState(api.getState(HANDLE));
    await api.saveDraft(HANDLE, "details", { tradeName: "x" });
    await api.submitDetails(HANDLE, VALID_DETAILS);
    await api.submitTerritory(HANDLE, VALID_TERRITORY);
    await api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "p.pdf", file: pdf() });
    await api.removeDocument(HANDLE, "doc_mock_1_pan_card");
    await api.submitKyc(HANDLE);
    await api.ackFranchise(HANDLE);
    await api.submitOperations(HANDLE, VALID_OPERATIONS);
    await api.markTermSheetViewed(HANDLE);
    await api.requestEsign(HANDLE, { signType: "aadhaar", contentHash: WRONG_HASH });
    await api.refreshEsignStatus(HANDLE);
    await api.claimPayment(HANDLE, VALID_CLAIM);
    await api.refreshPaymentStatus(HANDLE);
    await api.createAccount(HANDLE, "a-good-password", "r.mehta@northline.example");

    const state = await expectState(api.getState(HANDLE));
    for (const step of COMPLETED_ON_READ_STEPS) {
      expect(state.completedSteps).not.toContain(step);
    }
  });
});

describe("the ladder", () => {
  it("allows the one cycle and refuses the reverse of everything else", () => {
    expect(isForwardStatus("on_hold", "under_review")).toBe(true);
    expect(isForwardStatus("under_review", "on_hold")).toBe(true);
    expect(isForwardStatus("signed", "termsheet_viewed")).toBe(false);
    expect(isForwardStatus("approved", "on_hold")).toBe(false);
    expect(isForwardStatus("approved", "declined")).toBe(false);
  });

  it("absorbs at declined", () => {
    expect(isForwardStatus("declined", "under_review")).toBe(false);
    expect(isForwardStatus("declined", "approved")).toBe(false);
  });

  it("refuses to decline an approved franchise, because that is termination", async () => {
    await throughKyc();
    previewApprove(HANDLE);
    expect(previewDecline(HANDLE)).toBeNull();
    const state = await expectState(api.getState(HANDLE));
    expect(state.status).toBe("approved");
    expect(state.approval?.outcome).toBe("approved");
  });

  it("does not walk the status backwards when a franchisee corrects an earlier step", async () => {
    await throughKyc();
    previewHold(HANDLE);
    const corrected = await expectState(api.submitTerritory(HANDLE, VALID_TERRITORY));
    expect(corrected.status).toBe("on_hold");
  });
});

describe("declined", () => {
  it("still serves the state, so the screen can render", async () => {
    await throughKyc();
    previewDecline(HANDLE);
    const state = await expectState(api.getState(HANDLE));
    expect(state.approval?.outcome).toBe("declined");
  });

  it("carries no reason on the wire", async () => {
    await throughKyc();
    const state = previewDecline(HANDLE)!;
    expect(state.approval).toEqual({
      outcome: "declined",
      decidedAt: expect.any(String),
    });
  });

  it("refuses every mutating call with its own code", async () => {
    await throughKyc();
    previewDecline(HANDLE);
    expect((await expectError(api.submitDetails(HANDLE, VALID_DETAILS))).code).toBe("declined");
    expect((await expectError(api.ackFranchise(HANDLE))).code).toBe("declined");
    expect((await expectError(api.claimPayment(HANDLE, VALID_CLAIM))).code).toBe("declined");
    const draft = await api.saveDraft(HANDLE, "details", { tradeName: "x" });
    expect(draft.ok).toBe(false);
  });
});

describe("a hold reopens the application", () => {
  it("unfreezes steps 1 to 3", async () => {
    await throughKyc();
    // Frozen while the application is simply waiting.
    expect((await expectError(api.submitDetails(HANDLE, VALID_DETAILS))).code).toBe("frozen");

    previewHold(HANDLE, ["Your address proof was unreadable"]);
    const corrected = await expectState(
      api.submitDetails(HANDLE, { ...VALID_DETAILS, registeredAddress: "41 Sector 18, Noida 201301" }),
    );
    expect(corrected.details.registeredAddress).toBe("41 Sector 18, Noida 201301");
    await expectState(
      api.uploadDocument(HANDLE, { docType: "address_proof", fileName: "better.pdf", file: pdf() }),
    );
  });

  it("tells the franchisee what is outstanding and who is in touch", async () => {
    await throughKyc();
    const state = previewHold(HANDLE, ["A clearer boundary for the northern suburbs"])!;
    expect(state.approval).toMatchObject({
      outcome: "on_hold",
      outstanding: ["A clearer boundary for the northern suburbs"],
    });
    expect(state.status).toBe("on_hold");
  });

  it("does not open step 5 while the application is on hold", async () => {
    await throughKyc();
    previewHold(HANDLE);
    expect((await expectError(api.ackFranchise(HANDLE))).code).toBe("not_approved");
  });
});

describe("freeze points", () => {
  it("fixes the territory at approval", async () => {
    await throughKyc();
    previewApprove(HANDLE, { territory: "Noida only" });
    const error = await expectError(api.submitTerritory(HANDLE, VALID_TERRITORY));
    expect(error.code).toBe("frozen");
  });

  it("keeps the granted territory separate from what was proposed", async () => {
    await throughKyc();
    const state = previewApprove(HANDLE, {
      territory: "South Bengaluru",
      territoryBoundary: "Bengaluru Urban south of the Outer Ring Road only.",
    })!;
    expect(state.territory.proposedDistricts).toEqual(["Bengaluru (Bangalore) Urban"]);
    expect(state.approval).toMatchObject({ territory: "South Bengaluru" });
  });

  it("freezes everything the term sheet renders once it is signed", async () => {
    await throughSignature();
    // `submitKyc` is not in this list: once step 3 is submitted it is a no-op rather than a
    // mutation, so it answers a repeated click with the state rather than a freeze.
    for (const call of [
      () => api.submitDetails(HANDLE, VALID_DETAILS),
      () => api.submitTerritory(HANDLE, VALID_TERRITORY),
      () =>
        api.uploadDocument(HANDLE, { docType: "pan_card", fileName: "again.pdf", file: pdf() }),
      () => api.ackFranchise(HANDLE),
      () => api.submitOperations(HANDLE, VALID_OPERATIONS),
    ]) {
      expect((await expectError(call())).code).toBe("frozen");
    }
  });
});

describe("the term sheet", () => {
  it("cannot be issued for an unapproved franchise", async () => {
    await throughKyc();
    expect((await expectError(api.markTermSheetViewed(HANDLE))).code).toBe("not_approved");
  });

  it("issues a City franchise, now that the program document publishes its schedule", async () => {
    // **This assertion is inverted from what it used to be, and the inversion is the point.** §6 and
    // §21 deferred the City tier's payment schedule and recovery threshold, so a City franchise had
    // tokens with no value and could not be issued at all. §6 now publishes the City schedule outright,
    // and §57 makes the recovery threshold the recorded investment grossed up by GST — arithmetic rather
    // than a figure an admin sets. So both tokens resolve, and a City franchisee can reach a document.
    //
    // Kept as a test rather than deleted because it is the one place a regression would be silent: if
    // `program.ts` went back to `null` for either City field, the flow would refuse every City franchise
    // and the only symptom would be a franchisee stuck on step 7.
    await expectState(api.submitDetails(HANDLE, VALID_DETAILS));
    await expectState(api.submitTerritory(HANDLE, { ...VALID_TERRITORY, tier: "city" }));
    await uploadRequiredDocuments();
    await expectState(api.submitKyc(HANDLE));
    previewApprove(HANDLE);
    await expectState(api.ackFranchise(HANDLE));
    await expectState(api.submitOperations(HANDLE, VALID_OPERATIONS));

    const state = await expectState(api.markTermSheetViewed(HANDLE));
    expect(state.termSheet).not.toBeNull();
    expect(canIssueTermSheet(state, "2026-09-01")).toEqual({ ok: true });
  });

  it("refuses while the territory is unapproved, because that is what exclusivity attaches to", async () => {
    // The mechanism the City case used to demonstrate, on a token that can still legitimately be
    // absent. `territory` and `territoryBoundary` come from the approval record and never from the
    // franchisee's proposal, so before a decision there is nothing to render — and rendering the request
    // would grant whatever was asked for. An unresolved token is the whole gate; there is no second list
    // of preconditions.
    await throughKyc();
    const state = await expectState(api.getState(HANDLE));
    const check = canIssueTermSheet(state, "2026-09-01");
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.unresolvedTokens).toContain("territory");
      expect(check.unresolvedTokens).toContain("territoryBoundary");
    }
  });

  it("pins a hash the client can verify by rendering the state itself", async () => {
    const state = await throughTermSheet();
    const issued = state.termSheet!;
    const independent = await sha256Hex(
      renderIssuedTermSheetText(state, issued.effectiveDate),
    );
    expect(issued.contentHash).toBe(independent);
    expect(issued.length).toBeGreaterThan(0);
    // No PDF exists in this repo, and a plausible-looking hash would be one somebody trusts.
    expect(issued.pdfHash).toBeNull();
  });

  it("dates the document on the server's clock in Asia/Kolkata", async () => {
    const state = await throughTermSheet();
    expect(state.termSheet!.effectiveDate).toBe("2026-09-01");
  });

  it("computes validUntil the way the golden vector expects", async () => {
    expect(TERM_SHEET_VALIDITY_DAYS).toBe(45);
    expect(termSheetValidUntil("2026-09-01")).toBe("2026-10-16");
    // The vector renders the same two dates, so the constant and the pinned text agree.
    expect(GOLDEN_TERM_SHEET_V1.fields.validUntil).toBe("16 October 2026");
    const state = await throughTermSheet();
    expect(state.termSheet!.validUntil).toBe("2026-10-16");
  });

  it("re-pins when a correction changes what we would render", async () => {
    await throughKyc();
    previewApprove(HANDLE);
    await expectState(api.ackFranchise(HANDLE));
    await expectState(api.submitOperations(HANDLE, VALID_OPERATIONS));
    const first = (await expectState(api.markTermSheetViewed(HANDLE))).termSheet!;

    const rewarehoused = await expectState(
      api.submitOperations(HANDLE, {
        ...VALID_OPERATIONS,
        warehouseAddress: "Plot 90, Site IV Industrial Area, Sahibabad 201010",
      }),
    );
    expect(rewarehoused.termSheet!.contentHash).not.toBe(first.contentHash);
  });

  it("issues with a declaration where the franchisee has no warehouse yet", async () => {
    // The box on step 6 would be worthless if it left `warehouseAddress` unresolved: `canIssue()`
    // refuses on an unresolved token, so the franchisee it exists for would be the one franchisee
    // who could never reach a term sheet. What it renders instead is an undertaking, and it is
    // operative signed text.
    await throughKyc();
    previewApprove(HANDLE);
    await expectState(api.ackFranchise(HANDLE));
    await expectState(
      api.submitOperations(HANDLE, {
        ...VALID_OPERATIONS,
        warehouseNotIdentified: true,
        warehouseAddress: "",
        warehouseAreaSqft: null,
        temperatureControl: "",
      }),
    );

    const state = await expectState(api.markTermSheetViewed(HANDLE));
    expect(state.termSheet).not.toBeNull();
    const text = renderIssuedTermSheetText(state, state.termSheet!.effectiveDate);
    expect(text).toContain(WAREHOUSE_NOT_IDENTIFIED_DECLARATION);
  });

  it("is immutable once signed", async () => {
    const signed = await throughSignature();
    const pinned = signed.termSheet!;
    const again = await expectState(api.markTermSheetViewed(HANDLE));
    expect(again.termSheet).toEqual(pinned);
  });

  it("records the view without completing the step", async () => {
    const state = await throughTermSheet();
    expect(state.timestamps.termSheetViewedAt).toBe("2026-09-01T10:00:00.000Z");
    expect(state.completedSteps).not.toContain(7);
  });
});

describe("e-sign", () => {
  it("refuses a hash that is not the one we pinned, and signs nothing", async () => {
    await throughTermSheet();
    const error = await expectError(
      api.requestEsign(HANDLE, { signType: "aadhaar", contentHash: WRONG_HASH }),
    );
    expect(error.code).toBe("content_mismatch");
    const state = await expectState(api.getState(HANDLE));
    expect(state.esign.status).toBe("not_requested");
    expect(state.isSigned).toBe(false);
  });

  it("refuses to sign a document that was never issued", async () => {
    await throughKyc();
    previewApprove(HANDLE);
    await expectState(api.ackFranchise(HANDLE));
    await expectState(api.submitOperations(HANDLE, VALID_OPERATIONS));
    const error = await expectError(
      api.requestEsign(HANDLE, { signType: "aadhaar", contentHash: WRONG_HASH }),
    );
    expect(error.code).toBe("wrong_step");
  });

  it("keeps the signing URL off the state", async () => {
    const viewed = await throughTermSheet();
    const requested = await api.requestEsign(HANDLE, {
      signType: "aadhaar",
      contentHash: viewed.termSheet!.contentHash,
    });
    if (!requested.ok) throw new Error("expected the request to be accepted");
    expect(requested.data.handoff.signingUrl).toMatch(/^https:\/\//);
    expect(JSON.stringify(requested.data.state)).not.toContain(requested.data.handoff.signingUrl);
    const fetched = await expectState(api.getState(HANDLE));
    expect(JSON.stringify(fetched)).not.toMatch(/signingUrl/);
  });

  it("does not create a second Leegality request for a second click", async () => {
    const viewed = await throughTermSheet();
    const input = { signType: "aadhaar" as const, contentHash: viewed.termSheet!.contentHash };
    const first = await api.requestEsign(HANDLE, input);
    const second = await api.requestEsign(HANDLE, input);
    if (!first.ok || !second.ok) throw new Error("expected both requests to be accepted");
    expect(second.data.state.esign.request!.providerDocumentId).toBe(
      first.data.state.esign.request!.providerDocumentId,
    );
    // The document is idempotent; the handoff URL is not, because it is short-lived per click.
    expect(second.data.state.timestamps.esignRequestedAt).toBe(
      first.data.state.timestamps.esignRequestedAt,
    );
  });

  it("refuses a second signature", async () => {
    const signed = await throughSignature();
    const error = await expectError(
      api.requestEsign(HANDLE, {
        signType: "aadhaar",
        contentHash: signed.termSheet!.contentHash,
      }),
    );
    expect(error.code).toBe("already_signed");
  });

  it("marks a request expired once it is past its window", async () => {
    const viewed = await throughTermSheet();
    await api.requestEsign(HANDLE, {
      signType: "aadhaar",
      contentHash: viewed.termSheet!.contentHash,
    });
    const later = createMockFranchiseOnboardingApi({
      latencyMs: 0,
      now: () => "2026-10-01T10:00:00.000Z",
    });
    const state = await expectState(later.refreshEsignStatus(HANDLE));
    expect(state.esign.status).toBe("expired");
    expect(state.isSigned).toBe(false);
  });

  it("records the signature the webhook would write", async () => {
    const signed = await throughSignature();
    expect(signed.status).toBe("signed");
    expect(signed.esign.status).toBe("signed");
    expect(signed.esign.executed).toMatchObject({
      signerName: "Rajesh Mehta",
      signType: "aadhaar",
      signedPdfHash: null,
    });
    expect(signed.timestamps.signedAt).not.toBeNull();
  });

  it("cannot be completed by a webhook for a document nobody requested", async () => {
    await throughTermSheet();
    expect(previewCompleteEsign(HANDLE)).toBeNull();
  });
});

describe("the first instalment", () => {
  it("is not collectable before the term sheet is signed", async () => {
    await throughTermSheet();
    expect((await expectError(api.getPaymentInstructions(HANDLE))).code).toBe("wrong_step");
    expect((await expectError(api.claimPayment(HANDLE, VALID_CLAIM))).code).toBe("wrong_step");
  });

  it("expects half the investment, in paise, off the schedule", async () => {
    const signed = await throughSignature();
    const first = signed.payments.find((p) => p.instalment === 1)!;
    expect(first.expectedPaise).toBe(12_50_000 * 100);
    const instructions = await api.getPaymentInstructions(HANDLE);
    if (!instructions.ok) throw new Error("expected instructions");
    expect(instructions.data.expectedPaise).toBe(first.expectedPaise);
    expect(instructions.data.reference).toMatch(/^MBPF-[A-Z0-9]{8}$/);
  });

  it("keeps bank details off every state response", async () => {
    const signed = await throughSignature();
    expect(JSON.stringify(signed)).not.toMatch(/MOCK0000000/);
  });

  it("refuses a second claim while one is outstanding", async () => {
    await throughSignature();
    await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    const error = await expectError(
      api.claimPayment(HANDLE, { ...VALID_CLAIM, utr: "SBIN9999999999ZZ" }),
    );
    expect(error.code).toBe("already_claimed");
  });

  it("reopens the form after a refusal without moving the status backwards", async () => {
    await throughSignature();
    await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    const refused = previewRefusePayment(HANDLE)!;
    expect(refused.status).toBe("payment_claimed");
    expect(refused.payments[0].refusal).not.toBeNull();

    const reclaimed = await expectState(
      api.claimPayment(HANDLE, { ...VALID_CLAIM, utr: "SBIN9999999999ZZ" }),
    );
    expect(reclaimed.payments[0].claim!.utr).toBe("SBIN9999999999ZZ");
    expect(reclaimed.payments[0].refusal).toBeNull();
  });

  it("keeps what was claimed separate from what arrived", async () => {
    await throughSignature();
    await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    // A bank that deducted charges. The record's job is to make the shortfall visible.
    const verified = previewVerifyPayment(HANDLE, 12_49_500 * 100)!;
    expect(verified.payments[0].claim!.amountPaise).toBe(12_50_000 * 100);
    expect(verified.payments[0].receivedPaise).toBe(12_49_500 * 100);
    expect(verified.status).toBe("payment_verified");
  });

  it("does not simulate verification on refresh", async () => {
    await throughSignature();
    await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    for (let i = 0; i < 5; i += 1) {
      const state = await expectState(api.refreshPaymentStatus(HANDLE));
      expect(state.payments[0].verifiedAt).toBeNull();
    }
  });

  it("stores instalments as a list, so the second one is a screen and not a migration", async () => {
    const state = await expectState(api.getState(HANDLE));
    expect(state.payments).toHaveLength(1);
    expect(state.payments[0].instalment).toBe(1);
  });
});

describe("step 9", () => {
  it("opens on the signature, not on the payment", async () => {
    await throughSignature();
    const state = await expectState(
      api.createAccount(HANDLE, "a-good-password", "r.mehta@northline.example"),
    );
    expect(state.timestamps.accountCreatedAt).not.toBeNull();
    expect(state.completedSteps).toContain(9);
  });

  it("does not set active, because only the admin activate route does", async () => {
    await throughSignature();
    const state = await expectState(
      api.createAccount(HANDLE, "a-good-password", "r.mehta@northline.example"),
    );
    expect(state.status).not.toBe("active");
  });

  it("refuses a password the server would refuse", async () => {
    await throughSignature();
    const error = await expectError(api.createAccount(HANDLE, "short", "r@northline.example"));
    expect(error.code).toBe("validation");
    expect((error as { fieldErrors?: Record<string, string> }).fieldErrors).toHaveProperty(
      "password",
    );
  });

  it("is closed before the term sheet is signed", async () => {
    await throughTermSheet();
    const error = await expectError(
      api.createAccount(HANDLE, "a-good-password", "r.mehta@northline.example"),
    );
    expect(error.code).toBe("wrong_step");
  });
});

describe("the whole flow", () => {
  it("reaches every step and completes all nine", async () => {
    await throughSignature();
    await expectState(api.claimPayment(HANDLE, VALID_CLAIM));
    previewVerifyPayment(HANDLE);
    const state = await expectState(
      api.createAccount(HANDLE, "a-good-password", "r.mehta@northline.example"),
    );
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(state.currentStep).toBe(9);
    expect(state.status).toBe("payment_verified");
  });

  it("hands back a snapshot a caller cannot use to corrupt the store", async () => {
    const state = await expectState(api.getState(HANDLE));
    state.currentStep = 9;
    state.completedSteps.push(1, 2, 3);
    const fresh = await expectState(api.getState(HANDLE));
    expect(fresh.currentStep).toBe(1);
    expect(fresh.completedSteps).toEqual([]);
  });
});
