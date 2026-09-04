import { describe, expect, it } from "vitest";

import {
  INDIA_PINCODE,
  INDIA_STATES,
  INDIA_STATE_NAMES,
  districtsOf,
  isKnownState,
} from "@shared/geo/india";
import {
  franchiseTerritoryGrantDraft,
  franchiseTerritoryLabel,
  territoryProposalSchema,
} from "@shared/franchise/onboarding/schema";

/**
 * Step 2 asks for districts, and the two label helpers turn that back into words.
 *
 * The reason these are worth tests rather than eyeballing: `franchiseTerritoryGrantDraft` produces
 * the sentence an admin is offered as the granted boundary, and the granted boundary is rendered
 * into the term sheet under a signature hash. It is the one function here whose output ends up in
 * something somebody signs.
 */

const VALID = {
  tier: "territory" as const,
  proposedState: "Karnataka",
  proposedDistricts: ["Bengaluru (Bangalore) Urban"],
  proposedPincodes: [],
  proposedBoundary: "",
  existingRelationships: "",
};

describe("shared/geo/india", () => {
  it("holds every state and union territory once", () => {
    expect(INDIA_STATES).toHaveLength(36);
    expect(new Set(INDIA_STATE_NAMES).size).toBe(36);
  });

  it("holds no state without districts, and no district twice within one", () => {
    for (const entry of INDIA_STATES) {
      expect(entry.districts.length, entry.state).toBeGreaterThan(0);
      expect(new Set(entry.districts).size, entry.state).toBe(entry.districts.length);
    }
  });

  it("lists districts alphabetically, because the picker does not sort them itself", () => {
    for (const entry of INDIA_STATES) {
      const sorted = [...entry.districts].sort((a, b) => a.localeCompare(b));
      expect(entry.districts, entry.state).toEqual(sorted);
    }
  });

  it("answers with nothing for a state it does not hold", () => {
    expect(districtsOf("Karnataka").length).toBeGreaterThan(20);
    expect(districtsOf("Bavaria")).toEqual([]);
    expect(isKnownState("Karnataka")).toBe(true);
    expect(isKnownState("KARNATAKA")).toBe(false);
    expect(isKnownState("")).toBe(false);
  });

  it("takes six digits and refuses a leading zero", () => {
    expect(INDIA_PINCODE.test("560001")).toBe(true);
    expect(INDIA_PINCODE.test("056001")).toBe(false);
    expect(INDIA_PINCODE.test("56001")).toBe(false);
    expect(INDIA_PINCODE.test("5600011")).toBe(false);
    expect(INDIA_PINCODE.test("56000a")).toBe(false);
  });
});

describe("territoryProposalSchema", () => {
  it("accepts a state with one of its own districts", () => {
    expect(territoryProposalSchema.safeParse(VALID).success).toBe(true);
  });

  it("refuses a state that is not on the list", () => {
    const result = territoryProposalSchema.safeParse({ ...VALID, proposedState: "Bavaria" });
    expect(result.success).toBe(false);
  });

  it("refuses an empty district list, because a state alone is not a territory", () => {
    const result = territoryProposalSchema.safeParse({ ...VALID, proposedDistricts: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Choose the district you want to develop");
    }
  });

  /*
    The picker is single-choice, so this is the stale-payload case rather than something the form can
    send. It is here because the rule is a commercial one and the schema is where it is stated: an
    application asks for one district, and more than one is a decision taken at approval.
  */
  it("refuses a second district", () => {
    const result = territoryProposalSchema.safeParse({
      ...VALID,
      proposedDistricts: ["Bengaluru (Bangalore) Urban", "Ramanagara"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "One district per application. Ask for the rest in the box below",
      );
    }
  });

  /*
    The case the picker cannot produce but a stale form can: the state changes, the districts are
    still the old state's. `StepTerritory` clears them on change, and this is what catches it if
    that effect ever stops firing.
  */
  it("names the district that is not in the chosen state", () => {
    const result = territoryProposalSchema.safeParse({ ...VALID, proposedState: "Kerala" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "proposedDistricts");
      expect(issue?.message).toBe("Not in Kerala: Bengaluru (Bangalore) Urban");
    }
  });

  it("refuses a pin code that is not six digits", () => {
    const result = territoryProposalSchema.safeParse({
      ...VALID,
      proposedPincodes: ["560001", "56001"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts no pin codes at all, which is the ordinary case", () => {
    const result = territoryProposalSchema.safeParse({ ...VALID, proposedPincodes: [] });
    expect(result.success).toBe(true);
  });

  it("accepts an empty boundary note, unlike the free-text version it replaced", () => {
    const result = territoryProposalSchema.safeParse({ ...VALID, proposedBoundary: "" });
    expect(result.success).toBe(true);
  });
});

describe("franchiseTerritoryLabel", () => {
  it("reads as a place for one district", () => {
    expect(
      franchiseTerritoryLabel({ proposedState: "Kerala", proposedDistricts: ["Ernakulam"] }),
    ).toBe("Ernakulam, Kerala");
  });

  it("joins two with 'and' rather than a comma", () => {
    expect(
      franchiseTerritoryLabel({
        proposedState: "Maharashtra",
        proposedDistricts: ["Raigad", "Thane"],
      }),
    ).toBe("Raigad and Thane, Maharashtra");
  });

  it("uses commas up to the last one for three or more", () => {
    expect(
      franchiseTerritoryLabel({
        proposedState: "Telangana",
        proposedDistricts: ["Hyderabad", "Medchal", "Rangareddy"],
      }),
    ).toBe("Hyderabad, Medchal and Rangareddy, Telangana");
  });

  it("falls back to the state when no district is chosen yet", () => {
    expect(franchiseTerritoryLabel({ proposedState: "Goa", proposedDistricts: [] })).toBe("Goa");
  });
});

describe("franchiseTerritoryGrantDraft", () => {
  it("writes a sentence an admin can sign off on", () => {
    expect(
      franchiseTerritoryGrantDraft({
        proposedState: "Kerala",
        proposedDistricts: ["Ernakulam"],
        proposedPincodes: [],
        proposedBoundary: "",
      }),
    ).toBe("The district of Ernakulam, Kerala.");
  });

  it("pluralises the noun for more than one district", () => {
    expect(
      franchiseTerritoryGrantDraft({
        proposedState: "Maharashtra",
        proposedDistricts: ["Raigad", "Thane"],
        proposedPincodes: [],
        proposedBoundary: "",
      }),
    ).toBe("The districts of Raigad and Thane, Maharashtra.");
  });

  it("narrows the grant to the pin codes when they asked for part of a district", () => {
    expect(
      franchiseTerritoryGrantDraft({
        proposedState: "West Bengal",
        proposedDistricts: ["Kolkata"],
        proposedPincodes: ["700019", "700029"],
        proposedBoundary: "Ballygunge and Jadavpur.",
      }),
    ).toBe(
      "The district of Kolkata, West Bengal. Limited to the pin codes 700019, 700029. Ballygunge and Jadavpur.",
    );
  });

  it("is the boundary note alone when there is no district to name", () => {
    expect(
      franchiseTerritoryGrantDraft({
        proposedState: "",
        proposedDistricts: [],
        proposedPincodes: [],
        proposedBoundary: "  Whatever they typed.  ",
      }),
    ).toBe("Whatever they typed.");
  });
});
