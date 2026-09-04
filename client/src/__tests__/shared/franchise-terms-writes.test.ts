import { describe, it, expect } from "vitest";

/**
 * The three franchise admin writes, at the contract layer.
 *
 * `PATCH …/terms` is the one with real logic in front of it, and all of it exists to stop the panel
 * sending a patch nobody asked for: the route rewrites the term sheet pin for every field it
 * receives, so a key sent unchanged sends the franchisee back to re-read a document that did not
 * move. The diff is therefore not tidiness, and the two traps below are the reason it is not a copy
 * of `termsDiff`:
 *
 * 1. **The schedule needs a deep compare.** `useFieldArray` rebuilds the array on every render, so a
 *    reference check reports every save as a schedule change.
 * 2. **`null` and "absent" are different claims** on the two clearable fields. Absent means "leave
 *    it alone"; null means "not agreed", which makes the franchise unissuable on purpose.
 */

import {
  adminFranchiseResendFormSchema,
  adminFranchiseTermsFormSchema,
  franchiseTermsDiff,
  franchiseTermsFieldPath,
  franchiseTermsFormValues,
  toAdminFranchiseResendBody,
  FRANCHISE_PAYMENT_STAGES,
  type AdminFranchiseTermsForm,
} from "@shared/admin/franchiseWrites";
import { adminFranchiseFixture } from "@/test/adminFranchiseFixture";

function values(): AdminFranchiseTermsForm {
  return franchiseTermsFormValues(adminFranchiseFixture().terms);
}

describe("franchiseTermsFormValues", () => {
  it("divides the wire's paise into the rupees the form shows", () => {
    // `franchiseInvite.ts`'s convention: nobody types 250000000, and the term sheet prints rupees.
    expect(values().investmentInr).toBe(2_500_000);
    expect(values().capitalRecoveryInr).toBe(2_500_000);
  });

  it("keeps an unagreed recovery threshold as null rather than zero", () => {
    // Zero means "recovered from the first rupee", which is a term somebody could agree to. Null is
    // "not agreed", and a blank printing as ₹0 is how a placeholder becomes a term nobody chose.
    const terms = adminFranchiseFixture().terms;
    terms.capitalRecoveryPaise = null;
    expect(franchiseTermsFormValues(terms).capitalRecoveryInr).toBeNull();
  });

  it("copies the schedule rows rather than aliasing them", () => {
    // The `before` snapshot the diff is taken against. A shared reference would be mutated by
    // `useFieldArray` as the admin types, so every edit would compare equal and nothing would send.
    const terms = adminFranchiseFixture().terms;
    const before = franchiseTermsFormValues(terms);
    before.paymentSchedule![0].pct = 40;
    expect(terms.paymentSchedule![0].pct).toBe(50);
  });

  it("carries a null schedule through as null", () => {
    const terms = adminFranchiseFixture().terms;
    terms.paymentSchedule = null;
    expect(franchiseTermsFormValues(terms).paymentSchedule).toBeNull();
  });
});

describe("franchiseTermsDiff", () => {
  it("answers null when nothing moved", () => {
    // Not an empty object: the server refuses an empty patch with "send at least one term", and that
    // refusal reaching an admin who pressed Save on an untouched form reads as a rejected edit.
    expect(franchiseTermsDiff(values(), values())).toBeNull();
  });

  it("answers null when the schedule was rebuilt with the same rows", () => {
    // The `useFieldArray` trap, pinned. Identical values, different array and different objects.
    const after = values();
    after.paymentSchedule = after.paymentSchedule!.map((stage) => ({ ...stage }));
    expect(franchiseTermsDiff(values(), after)).toBeNull();
  });

  it("multiplies the changed rupee figures back into paise", () => {
    const after = values();
    after.investmentInr = 2_600_000;
    expect(franchiseTermsDiff(values(), after)).toEqual({ investmentPaise: 260_000_000 });
  });

  it("sends only what changed, leaving the rest for the server to keep", () => {
    const after = values();
    after.machineAllocation = 6;
    after.advertisingMbpSharePct = 60;
    after.advertisingFranchiseeSharePct = 40;
    expect(franchiseTermsDiff(values(), after)).toEqual({
      machineAllocation: 6,
      advertisingMbpSharePct: 60,
      advertisingFranchiseeSharePct: 40,
    });
  });

  it("sends an explicit null when the recovery threshold is cleared", () => {
    const after = values();
    after.capitalRecoveryInr = null;
    expect(franchiseTermsDiff(values(), after)).toEqual({ capitalRecoveryPaise: null });
  });

  it("sends an explicit null when the schedule is cleared", () => {
    const after = values();
    after.paymentSchedule = null;
    expect(franchiseTermsDiff(values(), after)).toEqual({ paymentSchedule: null });
  });

  it("treats a reordered schedule as a change, because the order is the schedule", () => {
    // Stage 1 is the booking amount and stage 2 is on OEM readiness. Two 50% rows swapped are two
    // different instalment plans even though the percentages are identical.
    const after = values();
    after.paymentSchedule = [after.paymentSchedule![1], after.paymentSchedule![0]];
    const patch = franchiseTermsDiff(values(), after);
    expect(patch?.paymentSchedule?.[0].trigger).toBe("When machines are ready at the OEM");
  });

  it("treats a reworded trigger as a change even when the percentages hold", () => {
    const after = values();
    after.paymentSchedule![0] = { pct: 50, trigger: "On signing the definitive agreement" };
    const patch = franchiseTermsDiff(values(), after);
    expect(patch?.paymentSchedule).toHaveLength(2);
    expect(patch?.paymentSchedule?.[0].trigger).toBe("On signing the definitive agreement");
  });

  it("sends the schedule whole when a stage is added, because the route replaces the list", () => {
    const after = values();
    after.paymentSchedule = [
      { pct: 25, trigger: "At franchise registration" },
      { pct: 25, trigger: "On site handover" },
      { pct: 50, trigger: "When machines are ready at the OEM" },
    ];
    expect(franchiseTermsDiff(values(), after)?.paymentSchedule).toHaveLength(3);
  });

  it("never puts a tier on the wire, since the route answers a field error for one", () => {
    const after = values();
    after.investmentInr = 2_600_000;
    expect(Object.keys(franchiseTermsDiff(values(), after) ?? {})).not.toContain("tier");
  });
});

describe("adminFranchiseTermsFormSchema", () => {
  it("accepts the franchise as it stands", () => {
    expect(adminFranchiseTermsFormSchema.safeParse(values()).success).toBe(true);
  });

  it("refuses a schedule that does not add up, naming the total it did reach", () => {
    // 10% of the consideration no instalment will ever ask for. §6 states the schedule as
    // percentages precisely so re-pricing cannot leave a stale amount, which makes the sum load
    // bearing rather than cosmetic.
    const form = values();
    form.paymentSchedule = [
      { pct: 50, trigger: "At franchise registration" },
      { pct: 40, trigger: "When machines are ready at the OEM" },
    ];
    const parsed = adminFranchiseTermsFormSchema.safeParse(form);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].message).toContain("add up to 90%");
  });

  it("refuses an empty schedule and points at clearing it instead", () => {
    // The two mean different things to the server: `[]` is refused, and `null` is "no schedule
    // agreed". Removing rows down to zero would send the refused one.
    const form = values();
    form.paymentSchedule = [];
    const parsed = adminFranchiseTermsFormSchema.safeParse(form);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].message).toContain("Remove the schedule entirely");
  });

  it("accepts a null schedule, which is a franchise that cannot be issued yet", () => {
    const form = values();
    form.paymentSchedule = null;
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(true);
  });

  it("refuses more stages than the route accepts", () => {
    const form = values();
    form.paymentSchedule = Array.from({ length: FRANCHISE_PAYMENT_STAGES.max + 1 }, () => ({
      pct: 1,
      trigger: "On something",
    }));
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(false);
  });

  it("refuses a stage with no trigger, because the term sheet renders the words", () => {
    const form = values();
    form.paymentSchedule = [{ pct: 100, trigger: "  " }];
    const parsed = adminFranchiseTermsFormSchema.safeParse(form);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].message).toContain("what triggers");
  });

  it("accepts a zero protein share and a zero advertising share", () => {
    // Zero is a real answer on all four: the franchisee taking nothing until recovery is a term §6
    // contemplates, and so is us funding all the advertising.
    const form = values();
    form.proteinSharePctAfterRecovery = 0;
    form.advertisingFranchiseeSharePct = 0;
    form.advertisingMbpSharePct = 100;
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(true);
  });

  it("refuses a share over 100", () => {
    const form = values();
    form.proteinSharePctDuringRecovery = 120;
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(false);
  });

  it("refuses an investment of zero, which is not a franchise", () => {
    const form = values();
    form.investmentInr = 0;
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(false);
  });

  it("accepts a recovery threshold of zero, which is not the same as unagreed", () => {
    const form = values();
    form.capitalRecoveryInr = 0;
    expect(adminFranchiseTermsFormSchema.safeParse(form).success).toBe(true);
  });
});

describe("franchiseTermsFieldPath", () => {
  it("renames the two paise keys to the rupee inputs they belong to", () => {
    expect(franchiseTermsFieldPath("investmentPaise")).toBe("investmentInr");
    expect(franchiseTermsFieldPath("capitalRecoveryPaise")).toBe("capitalRecoveryInr");
  });

  it("passes a key that names its own input straight through", () => {
    expect(franchiseTermsFieldPath("machineAllocation")).toBe("machineAllocation");
    expect(franchiseTermsFieldPath("advertisingMbpSharePct")).toBe("advertisingMbpSharePct");
  });

  it("rewrites a per-stage key from the route's brackets to react-hook-form's dots", () => {
    // The route says `paymentSchedule[1].pct` and the input is registered as
    // `paymentSchedule.1.pct`. Sent as-is, `setError` would create a field nobody is watching and
    // the message would vanish.
    expect(franchiseTermsFieldPath("paymentSchedule[1].pct")).toBe("paymentSchedule.1.pct");
    expect(franchiseTermsFieldPath("paymentSchedule[0].trigger")).toBe("paymentSchedule.0.trigger");
  });

  it("keeps a whole-schedule error on the array", () => {
    expect(franchiseTermsFieldPath("paymentSchedule")).toBe("paymentSchedule");
  });

  it("answers null for tier, which has no input to hang a message on", () => {
    // The key this function exists to reject. §3 finalises the tier with the territory, so the form
    // has no tier field, and the route's field error has to show in the banner instead of being
    // attached to whichever input sorts first.
    expect(franchiseTermsFieldPath("tier")).toBeNull();
  });

  it("answers null for a key it does not recognise", () => {
    expect(franchiseTermsFieldPath("proteinShare")).toBeNull();
    expect(franchiseTermsFieldPath("paymentSchedule[1].amount")).toBeNull();
  });
});

describe("the resend body", () => {
  it("omits invitedByName when it is blank, so the server inherits it", () => {
    const form = adminFranchiseResendFormSchema.parse({ invitedByName: "  ", sendInvite: true });
    expect(toAdminFranchiseResendBody(form)).toEqual({ sendInvite: true });
  });

  it("sends a trimmed name when one is given", () => {
    const form = adminFranchiseResendFormSchema.parse({
      invitedByName: "  Anurag  ",
      sendInvite: false,
    });
    expect(toAdminFranchiseResendBody(form)).toEqual({
      invitedByName: "Anurag",
      sendInvite: false,
    });
  });

  it("refuses a name longer than the route accepts", () => {
    const parsed = adminFranchiseResendFormSchema.safeParse({
      invitedByName: "a".repeat(121),
      sendInvite: true,
    });
    expect(parsed.success).toBe(false);
  });
});
