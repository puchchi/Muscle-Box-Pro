import { describe, it, expect } from "vitest";
import { adminInviteFormSchema, toAdminInviteBody, type AdminInviteFormInput } from "@shared/admin/invite";

/**
 * The invite form's client-side gate.
 *
 * These rules are copied from `domain/adminInput.ts` and `domain/details.ts` on purpose — see
 * the module docstring on why a courtesy check is still worth having even though the server
 * re-validates everything. The cases below are chosen from the same two angles as the read-side
 * schema tests: what a bad value would do on screen (a fractional deposit that the agreement
 * renderer would later throw on), and what a real, awkward-but-valid submission looks like (no
 * early termination charge agreed yet, and — since 2026-08-23 — none of the seven details
 * fields the gym now supplies at step 1, nor the four machine logistics fields it supplies once
 * a physical unit is chosen).
 */

function valid(): AdminInviteFormInput {
  return {
    details: {
      legalEntityName: "Iron Temple Fitness Private Limited",
      entityType: "pvt_ltd",
      tradeName: "Iron Temple Fitness",
      gstin: "29AABCU9603R1ZM",
      registeredAddress: "14 Rajpur Road, Civil Lines, Delhi 110054",
      installationAddress: "Plot 8, Sector 18, Noida, Uttar Pradesh 201301",
      signatoryName: "Rohit Malhotra",
      signatoryDesignation: "Director",
      noticesEmail: "rohit@irontemple.in",
      noticesPhone: "+919812345678",
    },
    terms: {
      securityDepositInr: 50000,
      termMonths: 36,
      gymSharePctBeforeMilestone: 10,
      gymSharePctAfterMilestone: 20,
      milestoneCups: 15000,
      milestoneNetProfitInr: 1500000,
      advertisingGymSharePct: 20,
      electricityInrPerBlock: 1500,
      electricityCupsPerBlock: 1000,
      electricityReviewWindowMonths: 6,
      settlementDaysAfterMonthEnd: 15,
      earlyTerminationChargeInr: 0,
    },
    machine: {
      model: "MuscleBoxPro MBP-1",
      valueInr: 450000,
    },
    invitedByName: "",
  };
}

/** The seven fields the gym now fills in at step 1 — left blank, the way this form actually submits them. */
function withDeferredFieldsBlank(): AdminInviteFormInput {
  const form = valid();
  form.details.legalEntityName = "";
  form.details.entityType = "";
  form.details.gstin = "";
  form.details.registeredAddress = "";
  form.details.installationAddress = "";
  form.details.signatoryName = "";
  form.details.signatoryDesignation = "";
  return form;
}

function issuePaths(form: unknown): string[] {
  const result = adminInviteFormSchema.safeParse(form);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("the invite form schema", () => {
  it("accepts a fully filled, valid form", () => {
    expect(adminInviteFormSchema.safeParse(valid()).success).toBe(true);
  });

  it("accepts the seven deferred fields all blank at once", () => {
    // The form this codebase actually submits since 2026-08-23: nothing rendered for legal
    // entity name, entity type, GSTIN, either address or the signatory — the gym supplies all
    // seven for real at onboarding step 1.
    expect(adminInviteFormSchema.safeParse(withDeferredFieldsBlank()).success).toBe(true);
  });

  it("still requires trade name, notices email and notices phone even with everything else blank", () => {
    for (const field of ["tradeName", "noticesEmail", "noticesPhone"] as const) {
      const form = withDeferredFieldsBlank();
      form.details[field] = "";
      const paths = issuePaths(form);
      expect(paths.some((p) => p === `details.${field}`), field).toBe(true);
    }
  });

  it("still refuses a GSTIN that is present and malformed, even though blank is allowed", () => {
    const form = withDeferredFieldsBlank();
    form.details.gstin = "NOT-A-GSTIN";
    expect(issuePaths(form)).toContain("details.gstin");
  });

  it("still refuses an entity type that is present and invalid, rather than treating it as blank", () => {
    const form = withDeferredFieldsBlank();
    // @ts-expect-error — exactly the invalid value this test exists to refuse.
    form.details.entityType = "opc";
    expect(issuePaths(form)).toContain("details.entityType");
  });

  it("still enforces a length floor on a deferred field that is present, not blank", () => {
    // Typing four characters into "registered address" and stopping is not "leaving it blank" —
    // it is a value nobody should mistake for a real one.
    const form = withDeferredFieldsBlank();
    form.details.registeredAddress = "abcd";
    expect(issuePaths(form)).toContain("details.registeredAddress");
  });

  it("has no field for an FSSAI number at all", () => {
    // Dropped rather than deferred — it was already optional server-side, so there was nothing
    // for an admin to usefully enter.
    expect("fssaiLicenceNumber" in valid().details).toBe(false);
  });

  it("has no field for device number, serial number, accessories or installation date", () => {
    // Deferred to the machine-assignment action, not this form — see the module docstring on
    // `adminInviteMachineSchema` in `shared/admin/invite.ts`.
    const machine = valid().machine;
    for (const field of ["deviceNo", "serialNumber", "accessories", "installationDate"]) {
      expect(field in machine, field).toBe(false);
    }
  });

  it("refuses a fractional machine value", () => {
    const form = valid();
    form.machine.valueInr = 450000.25;
    expect(issuePaths(form)).toContain("machine.valueInr");
  });

  it("requires a machine model", () => {
    const form = valid();
    form.machine.model = "";
    expect(issuePaths(form)).toContain("machine.model");
  });

  it("accepts an unagreed early-termination charge", () => {
    const form = valid();
    form.terms.earlyTerminationChargeInr = null;
    expect(adminInviteFormSchema.safeParse(form).success).toBe(true);
  });

  it("accepts a nonzero early-termination charge", () => {
    const form = valid();
    form.terms.earlyTerminationChargeInr = 25000;
    expect(adminInviteFormSchema.safeParse(form).success).toBe(true);
  });

  it("refuses a fractional security deposit", () => {
    // The case `inrToPaise`/`isWholeRupees` refuse server-side, and the reason it matters:
    // `depositPaiseToInr` in the agreement renderer throws on exactly this rather than print a
    // rounded figure into a contract. Catching it here is a form error instead of a 500 later.
    const form = valid();
    form.terms.securityDepositInr = 50000.5;
    expect(issuePaths(form)).toContain("terms.securityDepositInr");
  });

  it("refuses a negative amount", () => {
    const form = valid();
    form.terms.milestoneNetProfitInr = -1;
    expect(issuePaths(form)).toContain("terms.milestoneNetProfitInr");
  });

  it("refuses a share above 100 per cent", () => {
    const form = valid();
    form.terms.gymSharePctAfterMilestone = 120;
    expect(issuePaths(form)).toContain("terms.gymSharePctAfterMilestone");
  });

  it("refuses a term of zero months", () => {
    const form = valid();
    form.terms.termMonths = 0;
    expect(issuePaths(form)).toContain("terms.termMonths");
  });

  it("refuses a malformed notices email", () => {
    const form = valid();
    form.details.noticesEmail = "not-an-email";
    expect(issuePaths(form)).toContain("details.noticesEmail");
  });

  it("refuses an invitedByName of a single character", () => {
    const form = valid();
    form.invitedByName = "A";
    expect(issuePaths(form)).toContain("invitedByName");
  });

  it("accepts a blank invitedByName", () => {
    // Blank means "default to my own name" — a real, common choice, not an error.
    const form = valid();
    form.invitedByName = "";
    expect(adminInviteFormSchema.safeParse(form).success).toBe(true);
  });
});

describe("toAdminInviteBody", () => {
  it("sends only model and value for the machine, nothing else", () => {
    const body = toAdminInviteBody(valid());
    expect(body.machine).toEqual({ model: "MuscleBoxPro MBP-1", valueInr: 450000 });
  });

  it("omits invitedByName entirely when blank, rather than sending an empty string", () => {
    // `undefined`, `null` and blank are all "not provided" server-side, but only `undefined`
    // (an absent key) is what `validateInvitedByName` was written against being handed
    // directly — this is the translation that keeps the two in step.
    const body = toAdminInviteBody(valid());
    expect("invitedByName" in body).toBe(false);
  });

  it("sends a trimmed invitedByName when one was given", () => {
    const form = valid();
    form.invitedByName = "  Priya Nair  ";
    const body = toAdminInviteBody(form);
    expect(body.invitedByName).toBe("Priya Nair");
  });

  it("passes terms straight through, since the wire is already rupees", () => {
    const body = toAdminInviteBody(valid());
    expect(body.terms).toEqual(valid().terms);
  });

  it("preserves a null early-termination charge rather than coercing it to zero", () => {
    const form = valid();
    form.terms.earlyTerminationChargeInr = null;
    const body = toAdminInviteBody(form);
    expect(body.terms.earlyTerminationChargeInr).toBeNull();
  });

  it("sends a blank entity type as the same baseline the server defaults to", () => {
    // Sending `"proprietorship"` explicitly rather than `""` produces the identical stored row
    // either way — this just keeps the two in step rather than leaving it to the server alone.
    const body = toAdminInviteBody(withDeferredFieldsBlank());
    expect(body.details.entityType).toBe("proprietorship");
  });

  it("sends the other six deferred fields through as blank strings, unresolved", () => {
    // Unlike `entityType`, `GymDetails` already types these as plain `string`, and
    // `validateInviteDetails` reads `""` directly as "the gym will supply this" — there is no
    // baseline to resolve to.
    const body = toAdminInviteBody(withDeferredFieldsBlank());
    expect(body.details.legalEntityName).toBe("");
    expect(body.details.gstin).toBe("");
    expect(body.details.registeredAddress).toBe("");
    expect(body.details.installationAddress).toBe("");
    expect(body.details.signatoryName).toBe("");
    expect(body.details.signatoryDesignation).toBe("");
  });

  it("keeps a chosen entity type rather than overwriting it with the baseline", () => {
    const body = toAdminInviteBody(valid());
    expect(body.details.entityType).toBe("pvt_ltd");
  });

  it("always sends an empty FSSAI licence number, since the form never collects one", () => {
    const body = toAdminInviteBody(valid());
    expect(body.details.fssaiLicenceNumber).toBe("");
  });
});
