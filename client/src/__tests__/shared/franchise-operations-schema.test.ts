import { describe, it, expect } from "vitest";
import {
  operationsReadinessSchema,
  OPERATIONS_FIELD_NAMES,
} from "@shared/franchise/onboarding/schema";
import type { OperationsReadiness } from "@shared/franchise/onboarding/types";

/**
 * Step 6's two conditional rules, and the one place the answer becomes signed text.
 *
 * `warehouseNotIdentified` is the only field in this flow that makes three others change from
 * required to forbidden, and the rule is duplicated in `mbp-backend`'s
 * `domain/franchise/operations.ts` by hand. What is worth pinning is therefore the shape of the
 * disagreement a drift would produce:
 *
 * - **Ticked with the three fields empty must pass**, because the box exists so that a franchisee
 *   without a warehouse can reach a term sheet at all.
 * - **Ticked with an address still in the box must fail**, because a stored address under a ticked
 *   box is an address no screen would ever show and the term sheet would not render.
 * The declaration the ticked box renders into Schedule 2 is pinned in
 * `franchise-onboarding-mock.test.ts`, where a walk to an issued term sheet already exists.
 */

const TICKED: OperationsReadiness = {
  warehouseNotIdentified: true,
  warehouseAddress: "",
  warehouseAreaSqft: null,
  temperatureControl: "",
  operationsContactName: "Ritu Shah",
  operationsContactPhone: "+91 98450 12345",
  deploymentPlan: "NA",
  logisticsArrangement: "undecided",
};

const UNTICKED: OperationsReadiness = {
  warehouseNotIdentified: false,
  warehouseAddress: "Plot 22, Site IV Industrial Area, Sahibabad 201010",
  warehouseAreaSqft: 2400,
  temperatureControl: "yes",
  operationsContactName: "Ritu Shah",
  operationsContactPhone: "+91 98450 12345",
  deploymentPlan: "Four machines in gyms we already supply, the rest by December.",
  logisticsArrangement: "own_vehicle",
};

function errors(input: unknown): Record<string, string> {
  const result = operationsReadinessSchema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

describe("the warehouse box", () => {
  it("passes with the three storage fields empty", () => {
    expect(errors(TICKED)).toEqual({});
  });

  it("passes on the ordinary answer too", () => {
    expect(errors(UNTICKED)).toEqual({});
  });

  it("requires all three when the box is clear", () => {
    expect(errors({ ...UNTICKED, warehouseAddress: "", warehouseAreaSqft: null, temperatureControl: "" }))
      .toEqual({
        warehouseAddress: "Include the full address of the warehouse the protein will be delivered to",
        warehouseAreaSqft: "Enter the area in square feet",
        temperatureControl: "Tell us whether the warehouse is temperature controlled",
      });
  });

  it("refuses all three when the box is ticked", () => {
    expect(errors({ ...UNTICKED, warehouseNotIdentified: true })).toEqual({
      warehouseAddress: "Clear the address, or untick the box above",
      warehouseAreaSqft: "Clear the area, or untick the box above",
      temperatureControl: "Clear the storage answer, or untick the box above",
    });
  });

  it("defaults to clear, so a client that predates the field still parses", () => {
    const { warehouseNotIdentified: _omitted, ...withoutTheField } = UNTICKED;
    const parsed = operationsReadinessSchema.parse(withoutTheField);
    expect(parsed.warehouseNotIdentified).toBe(false);
  });

  it("is in the field-name list the wizard routes server errors by", () => {
    expect(OPERATIONS_FIELD_NAMES).toContain("warehouseNotIdentified");
  });
});

describe("the deployment plan", () => {
  it("takes NA", () => {
    expect(errors({ ...UNTICKED, deploymentPlan: "NA" })).toEqual({});
  });

  it("still refuses a blank", () => {
    expect(errors({ ...UNTICKED, deploymentPlan: "  " })).toEqual({
      deploymentPlan: "Tell us how you plan to place your machines. Write NA if it is not decided yet.",
    });
  });
});
