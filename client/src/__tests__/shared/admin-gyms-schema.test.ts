import { describe, it, expect } from "vitest";
import { parseAdminGymList, parseAdminGymView } from "@shared/admin/gymsSchema";
import { adminGymFixture, adminGymListFixture } from "@/test/adminGymFixture";
import { isPendingDeviceNo, type AdminGymView } from "@shared/admin/gyms";

/**
 * The boundary check on the two admin read endpoints.
 *
 * Written from the direction of harm rather than of coverage. `toAdminGymView` returns
 * `Record<string, unknown>`, so the failure this guards is not "the server sent nonsense" — it
 * is "the server renamed a field and nothing anywhere noticed". For each field the question is
 * what the *page* does with a bad value:
 *
 * - A renamed `signedAt` reads as "not signed yet" for every gym at once, which looks like a
 *   data problem rather than a bug.
 * - A missing `securityDepositInr` renders "₹NaN" beside a figure someone is about to quote.
 * - An `installationDate` carrying a time component is a different value from the calendar date
 *   §4.1 dates the term from.
 *
 * The other half is just as important and is the part a validator usually gets wrong: the
 * expensive failure is **rejecting a true response**. A gym that is `signed` with no signature,
 * a `₹0` early-termination charge, a deposit still pending on an already-active gym — all real,
 * all parse, and each has a test saying so, because those are exactly the states someone opens
 * this panel to look at.
 */

/** The field paths that failed, for asserting *why* a response was rejected. */
function rejectView(payload: unknown): string[] {
  const result = parseAdminGymView(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function rejectList(payload: unknown): string[] {
  const result = parseAdminGymList(payload);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

/** Mutate the fixture as an untyped bag, which is how a wrong server response arrives. */
function corrupt(mutate: (gym: Record<string, any>) => void): unknown {
  const gym = adminGymFixture() as unknown as Record<string, any>;
  mutate(gym);
  return gym;
}

describe("the admin gym view boundary", () => {
  it("accepts the fixture", () => {
    // Not a formality. The fixture is our written claim about what the server sends, typed as
    // `AdminGymView` — so if it cannot pass this, either the claim is wrong or the schema is.
    const result = parseAdminGymView(adminGymFixture());
    expect(result.ok).toBe(true);
  });

  it("names the field that went missing", () => {
    // The whole reason `issues` is carried through to the screen: one line, and it is the
    // answer to "what changed on the backend?".
    const issues = rejectView(corrupt((gym) => delete gym.terms.securityDepositInr));
    expect(issues).toContain("terms.securityDepositInr: Required");
  });

  it("names every field that went missing, not just the first", () => {
    const issues = rejectView(
      corrupt((gym) => {
        delete gym.terms.termMonths;
        delete gym.details.gstin;
      }),
    );
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toContain("terms.termMonths");
    expect(issues.join(" ")).toContain("details.gstin");
  });

  it("refuses a renamed transition timestamp", () => {
    // `signedAt` renamed, not removed — the shape stays plausible and the funnel silently
    // reports every gym as unsigned. This is the case that motivates spelling the nine
    // timestamps out instead of accepting a record of nullable strings.
    const issues = rejectView(
      corrupt((gym) => {
        gym.timestamps.signed_at = gym.timestamps.signedAt;
        delete gym.timestamps.signedAt;
      }),
    );
    expect(issues).toContain("timestamps.signedAt: Required");
  });

  it("refuses a money field that is a string", () => {
    // Would render as a plausible-looking figure and then produce NaN in any arithmetic
    // downstream. JSON makes this a one-character mistake on the server.
    const paths = rejectView(corrupt((gym) => (gym.terms.securityDepositInr = "50000")));
    expect(paths.join(" ")).toContain("terms.securityDepositInr");
  });

  it("refuses a non-finite amount", () => {
    // `formatInr(NaN)` is the literal string "₹NaN". JSON cannot carry NaN, but this response
    // is `unknown` from the panel's point of view and nothing stops a future caller passing a
    // hand-built object.
    expect(rejectView(corrupt((gym) => (gym.terms.milestoneNetProfitInr = Number.NaN))).length).toBeGreaterThan(0);
  });

  it("refuses a share above 100 per cent", () => {
    expect(rejectView(corrupt((gym) => (gym.terms.gymSharePctAfterMilestone = 120))).length).toBeGreaterThan(0);
  });

  it("refuses a step number that does not exist", () => {
    // Range-checked because it drives rendering: `STEP_LABEL[9]` is undefined and the detail
    // page prints "On step 9 — undefined".
    expect(rejectView(corrupt((gym) => (gym.currentStep = 9))).length).toBeGreaterThan(0);
  });

  it("refuses an unknown status", () => {
    // `STATUS_LABEL` and `STATUS_CLASS` are exhaustive records. A status outside the union
    // renders an unstyled blank badge, which reads as "no status" rather than "unknown status".
    expect(rejectView(corrupt((gym) => (gym.status = "onboarding"))).length).toBeGreaterThan(0);
  });

  it("refuses an installation date carrying a time component", () => {
    // §4.1 dates the term from a calendar date, and the value renders into Schedule A. A
    // timestamp here is a different value from the one that was agreed.
    const issues = rejectView(corrupt((gym) => (gym.machine.installationDate = "2026-07-10T00:00:00.000Z")));
    expect(issues.join(" ")).toContain("machine.installationDate");
  });

  it("refuses a timestamp that is only a date", () => {
    // The mirror image, and it matters for `lastServiceAt` specifically: truncating an instant
    // to a date in UTC dates a 01:00 IST service call to the previous day.
    const issues = rejectView(corrupt((gym) => (gym.machines[1].lastServiceAt = "2026-07-08")));
    expect(issues.join(" ")).toContain("machines.1.lastServiceAt");
  });

  it("strips fields it does not know about", () => {
    // The right direction for a read: the backend adding a field must not break the panel.
    const result = parseAdminGymView(corrupt((gym) => (gym.somethingNew = { nested: true })));
    expect(result.ok).toBe(true);
    expect(result.ok && "somethingNew" in result.data).toBe(false);
  });

  // ── Real states that must not be rejected ────────────────────────────────

  it("accepts a signed gym with no signature record", () => {
    // Contradictory, and precisely the "why is this gym stuck?" question. Refusing it would
    // hide the bug being investigated behind a validation error — the one outcome worse than
    // rendering it.
    const result = parseAdminGymView(corrupt((gym) => (gym.signature = null)));
    expect(result.ok).toBe(true);
  });

  it("accepts a gym with no unit allocated", () => {
    // `machineOf(null)`'s zero-valued projection: `model: ""`, `valueInr: 0`, `deviceNo: null`.
    // Every one of those would fail a naive `label`/positive-number schema.
    const result = parseAdminGymView(
      corrupt((gym) => {
        gym.machine = {
          model: "",
          deviceNo: null,
          serialNumber: null,
          valueInr: 0,
          accessories: "",
          installationDate: null,
        };
        gym.machines = [];
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.machine.deviceNo).toBeNull();
  });

  it("accepts a zero early-termination charge and a null one, and keeps them apart", () => {
    const zero = parseAdminGymView(corrupt((gym) => (gym.terms.earlyTerminationChargeInr = 0)));
    const unagreed = parseAdminGymView(corrupt((gym) => (gym.terms.earlyTerminationChargeInr = null)));
    expect(zero.ok && zero.data.terms.earlyTerminationChargeInr).toBe(0);
    expect(unagreed.ok && unagreed.data.terms.earlyTerminationChargeInr).toBeNull();
  });

  it("accepts an empty FSSAI licence number", () => {
    // §24.5 leaves each party to its own registrations, so this is genuinely optional and
    // arrives as `""` rather than absent.
    const result = parseAdminGymView(corrupt((gym) => (gym.details.fssaiLicenceNumber = "")));
    expect(result.ok).toBe(true);
  });

  it("accepts a gym with no invite", () => {
    // Voided, or never issued. Null is the answer, and the page says which.
    const result = parseAdminGymView(corrupt((gym) => (gym.invite = null)));
    expect(result.ok).toBe(true);
  });

  it("accepts a waived deposit alongside a still-pending deposit record", () => {
    // Both are true at once for a gym activated without paying, and the pair is the audit
    // trail: `depositWaiver` is what keeps a waived deposit distinguishable from one nobody
    // chased.
    const gym = adminGymFixture();
    const result = parseAdminGymView(gym);
    expect(result.ok).toBe(true);
    const parsed = (result as { ok: true; data: AdminGymView }).data;
    expect(parsed.depositStatus).toBe("deferred");
    expect(parsed.deposits[0].status).toBe("pending");
    expect(parsed.depositWaiver?.byEmail).toBe("contact@muscleboxpro.com");
  });

  it("accepts a replaced unit still on the record", () => {
    // Replacement marks the old row rather than deleting it, because §4.1 dates the term from
    // installation and which unit was in that gym when has to stay readable.
    const result = parseAdminGymView(adminGymFixture());
    expect(result.ok).toBe(true);
    const parsed = (result as { ok: true; data: AdminGymView }).data;
    expect(parsed.machines.map((unit) => unit.status)).toEqual(["replaced", "installed"]);
    expect(parsed.machines[0].replacedByDeviceNo).toBe("MBP-000241");
  });
});

describe("the admin gym list boundary", () => {
  it("accepts the fixture", () => {
    const result = parseAdminGymList(adminGymListFixture());
    expect(result.ok).toBe(true);
  });

  it("accepts an empty page with no cursor", () => {
    // The first thing a fresh environment returns. It must not read as an error.
    const result = parseAdminGymList({ gyms: [], nextCursor: null });
    expect(result.ok).toBe(true);
  });

  it("refuses a row with no createdAt", () => {
    // `createdAt` is the `gsi4-gymlist` sort key, so a row without one could not have been
    // returned by the query that found it — and the list is ordered by it.
    const list = adminGymListFixture() as unknown as Record<string, any>;
    delete list.gyms[1].createdAt;
    expect(rejectList(list)).toContain("gyms.1.createdAt: Required");
  });

  it("refuses a missing cursor field, rather than reading it as the last page", () => {
    // Absence and null are different answers here: null means "no more pages" and would stop
    // paging silently, hiding every gym past the first page.
    const list = adminGymListFixture() as unknown as Record<string, any>;
    delete list.nextCursor;
    expect(rejectList(list)).toContain("nextCursor: Required");
  });

  it("refuses gyms being an object rather than an array", () => {
    expect(rejectList({ gyms: {}, nextCursor: null }).join(" ")).toContain("gyms");
  });
});

describe("isPendingDeviceNo", () => {
  it("recognises the placeholder mbp-backend's newPendingDeviceNo mints", () => {
    // Same prefix, same 8 hex characters — see this function's own docstring on why the two
    // sides have to agree byte-for-byte rather than each inventing a convention.
    expect(isPendingDeviceNo("PENDING-A1B2C3D4")).toBe(true);
  });

  it("does not mistake a real device number for a placeholder", () => {
    expect(isPendingDeviceNo("MBP-000241")).toBe(false);
  });

  it("treats null as not pending, same as any other real answer", () => {
    // `machine === null` never happens (`machineOf(null)`'s zero-valued projection), but
    // `deviceNo` itself can be null on that projection, and this function has to say "no" to it
    // rather than throw.
    expect(isPendingDeviceNo(null)).toBe(false);
  });

  it("is a byte-for-byte prefix check, not a fuzzy one", () => {
    expect(isPendingDeviceNo("pending-lowercase")).toBe(false);
    expect(isPendingDeviceNo("MBP-PENDING-0001")).toBe(false);
  });
});
