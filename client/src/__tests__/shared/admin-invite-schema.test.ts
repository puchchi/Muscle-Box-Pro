import { describe, it, expect } from "vitest";
import { adminInviteFormSchema, toAdminInviteBody, type AdminInviteFormInput } from "@shared/admin/invite";

/**
 * The invite form's client-side gate.
 *
 * These rules are copied from `domain/adminInput.ts` and `domain/details.ts` on purpose — see
 * the module docstring on why a courtesy check is still worth having even though the server
 * re-validates everything. The cases below are chosen from the same two angles as the read-side
 * schema tests: what a bad value would do on screen (a fractional deposit that the agreement
 * renderer would later throw on; a device number with a stray space that silently never
 * matches a payment), and what a real, awkward-but-valid submission looks like (no early
 * termination charge agreed yet, no FSSAI number, no serial number).
 */

function valid(): AdminInviteFormInput {
  return {
    details: {
      legalEntityName: "Iron Temple Fitness Private Limited",
      entityType: "pvt_ltd",
      tradeName: "Iron Temple Fitness",
      gstin: "29AABCU9603R1ZM",
      fssaiLicenceNumber: "",
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
      deviceNo: "MBP-000512",
      model: "MuscleBoxPro MBP-1",
      serialNumber: "",
      accessories: "",
      valueInr: 450000,
      installationDate: "",
    },
    invitedByName: "",
  };
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

  it("accepts a gym with no FSSAI number, no serial number and no installation date", () => {
    // All genuinely optional — §24.5 for the FSSAI number, and the machine may not be
    // physically installed at invite time.
    const form = valid();
    expect(adminInviteFormSchema.safeParse(form).success).toBe(true);
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

  it("refuses a device number with a space in it", () => {
    // The join key to `gsi1-device`. A stray space produces a machine row that no payment ever
    // matches, and the symptom shows up months later as a gym with no revenue.
    const form = valid();
    form.machine.deviceNo = "MBP 000512";
    expect(issuePaths(form)).toContain("machine.deviceNo");
  });

  it("refuses a device number that is only whitespace", () => {
    const form = valid();
    form.machine.deviceNo = "   ";
    expect(issuePaths(form)).toContain("machine.deviceNo");
  });

  it("refuses a fractional machine value", () => {
    const form = valid();
    form.machine.valueInr = 450000.25;
    expect(issuePaths(form)).toContain("machine.valueInr");
  });

  it("refuses an installation date that is not YYYY-MM-DD", () => {
    const form = valid();
    form.machine.installationDate = "10/07/2026";
    expect(issuePaths(form)).toContain("machine.installationDate");
  });

  it("refuses a GSTIN that does not match the 15-character shape", () => {
    // The checksum digit is a documented, deliberate gap (see the module docstring) — this
    // schema catches the shape, not the check digit.
    const form = valid();
    form.details.gstin = "NOT-A-GSTIN";
    expect(issuePaths(form)).toContain("details.gstin");
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
  it("turns blank machine fields into null, not empty strings", () => {
    const body = toAdminInviteBody(valid());
    expect(body.machine.serialNumber).toBeNull();
    expect(body.machine.installationDate).toBeNull();
  });

  it("keeps a filled serial number and installation date", () => {
    const form = valid();
    form.machine.serialNumber = "SN-2026-000512";
    form.machine.installationDate = "2026-08-23";
    const body = toAdminInviteBody(form);
    expect(body.machine.serialNumber).toBe("SN-2026-000512");
    expect(body.machine.installationDate).toBe("2026-08-23");
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
});
