import { describe, expect, it } from "vitest";
import {
  allocationNote,
  checkPlacement,
  franchiseChangeNote,
  ownerLine,
  ownershipProblem,
  plainOwnershipMessage,
} from "@/pages/admin/machines/ownerRules";
import { machineFilters } from "@/pages/admin/AdminMachines";
import { machineOwnerSchema, parseOwnership } from "@shared/admin/ownership";

const draft = { gymId: "gym_1", model: "MBP Pro", serialNumber: "", valueInr: "2,50,000", accessories: "", installationDate: "" };

describe("checkPlacement", () => {
  it("builds a placement and drops the empty optional fields", () => {
    expect(checkPlacement(draft)).toEqual({ errors: {}, placement: { gymId: "gym_1", model: "MBP Pro", valueInr: 250000 } });
  });

  it("asks for a gym, a model and whole rupees", () => {
    const { errors, placement } = checkPlacement({ ...draft, gymId: "", model: " ", valueInr: "12.50" });
    expect(placement).toBeNull();
    expect(errors).toEqual({ gymId: "Choose a gym.", model: "Required.", valueInr: "Whole rupees, no paise." });
  });

  it("caps the value and the text lengths the server caps", () => {
    const { errors } = checkPlacement({ ...draft, valueInr: "100000001", serialNumber: "x".repeat(121), accessories: "a".repeat(2001) });
    expect(Object.keys(errors).sort()).toEqual(["accessories", "serialNumber", "valueInr"]);
  });

  it("keeps a typed installation date", () => {
    expect(checkPlacement({ ...draft, installationDate: "2026-10-15" }).placement?.installationDate).toBe("2026-10-15");
  });
});

describe("ownerLine", () => {
  const none = { gymId: null, gymName: null, franchiseId: null, franchiseName: null };
  it("names each of the three states", () => {
    expect(ownerLine(null)).toBe("MBP stock");
    expect(ownerLine(none)).toBe("MBP stock");
    expect(ownerLine({ ...none, franchiseId: "fr_1", franchiseName: "Northline" })).toBe("Northline, not placed");
    expect(ownerLine({ ...none, gymId: "gym_1", gymName: "Titan" })).toBe("Titan");
    expect(ownerLine({ gymId: "gym_1", gymName: "Titan", franchiseId: "fr_1", franchiseName: "Northline" })).toBe("Titan (Northline)");
  });

  it("falls back to the id when a name is missing", () => {
    expect(ownerLine({ ...none, gymId: "gym_1" })).toBe("gym_1");
  });
});

describe("ownershipProblem", () => {
  it("reads a version conflict as stale", () => {
    const found = ownershipProblem(
      { code: "already_signed", message: "This machine or gym changed since you loaded it. Reload and try again.", fieldErrors: { expectedVersion: "Stale." } },
      "sn",
    );
    expect(found.kind).toBe("stale");
  });

  it("reads a machine-key conflict as unmigrated, in plain words", () => {
    const message = "This machine is on a gym but has no ownership record yet. Run the ownership migration first.";
    const found = ownershipProblem({ code: "already_signed", message, fieldErrors: { deviceNo: message } }, "deviceNo");
    expect(found.kind).toBe("unmigrated");
    expect(found.message).not.toMatch(/migration first/);
  });

  it("never shows a route path to the admin", () => {
    const message = "That machine is placed at another gym. Move it with PUT /admin/machines/{sn}/owner.";
    const found = ownershipProblem({ code: "validation", message, fieldErrors: { deviceNo: message } }, "deviceNo");
    expect(found.kind).toBe("refused");
    expect(found.message).not.toMatch(/PUT|\/admin/);
    expect(found.fieldErrors.deviceNo).not.toMatch(/PUT|\/admin/);
    expect(plainOwnershipMessage("This gym has no allocated machine. Place one with PUT /admin/machines/{sn}/owner.")).not.toMatch(/PUT/);
  });

  it("passes other refusals through", () => {
    const message = "That franchise is not active, so it cannot receive gyms or machines.";
    expect(ownershipProblem({ code: "validation", message, fieldErrors: { franchiseId: message } }, "sn")).toEqual({
      kind: "refused",
      message,
      fieldErrors: { franchiseId: message },
    });
  });
});

describe("franchiseChangeNote", () => {
  const north = { franchiseId: "fr_1", franchiseName: "Northline" };
  const south = { franchiseId: "fr_2", franchiseName: "Southgate" };
  const direct = { franchiseId: null, franchiseName: null };

  it("says nothing when the franchise stays the same", () => {
    expect(franchiseChangeNote(north, north)).toBeNull();
    expect(franchiseChangeNote(direct, direct)).toBeNull();
  });

  it("says the machine follows the gym's franchise", () => {
    expect(franchiseChangeNote(north, south)).toBe("This gym isn't in Northline. The machine leaves Northline and joins Southgate, the gym's franchise.");
    expect(franchiseChangeNote(north, direct)).toBe("This gym isn't in Northline. The machine leaves Northline and becomes an MBP-direct machine.");
    expect(franchiseChangeNote(direct, south)).toBe("The machine joins Southgate, the gym's franchise.");
  });
});

describe("allocationNote", () => {
  const network = { franchiseId: "fr_1", franchiseName: "Northline", machineAllocation: 3, machineCount: 3 };

  it("warns past the allocation, without blocking", () => {
    expect(allocationNote(network, 1)).toBe("Northline will hold 4 machines. Its agreement allows 3. You can still go ahead.");
  });

  it("stays quiet within it, or with no allocation set", () => {
    expect(allocationNote({ ...network, machineCount: 2 }, 1)).toBeNull();
    expect(allocationNote({ ...network, machineAllocation: null }, 1)).toBeNull();
  });
});

describe("machineFilters", () => {
  it("sends the owner state only when one is picked", () => {
    expect(machineFilters("all", "name", "", "", "", false, "placed").ownerState).toBe("placed");
    expect(machineFilters("all", "name", "", "", "", false).ownerState).toBeUndefined();
  });
});

describe("machineOwnerSchema", () => {
  it("parses the owner route's reply", () => {
    const parsed = parseOwnership(machineOwnerSchema, {
      sn: "MBP-000241",
      migrated: true,
      owner: { ownerState: "placed", franchiseId: null, franchiseName: null, gymId: "gym_1", gymName: "Titan", since: "2026-09-30T10:00:00.000Z", version: 2 },
      history: [
        {
          version: 2,
          at: "2026-09-30T10:00:00.000Z",
          by: "ops@musclebox.pro",
          reason: "assign",
          from: { franchiseId: null, franchiseName: null, gymId: null, gymName: null },
          to: { franchiseId: null, franchiseName: null, gymId: "gym_1", gymName: "Titan" },
        },
      ],
    });
    expect(parsed.ok).toBe(true);
  });
});
