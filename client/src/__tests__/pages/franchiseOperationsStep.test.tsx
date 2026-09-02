import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StepOperations from "@/pages/franchise/onboarding/steps/StepOperations";
import {
  FRANCHISE_DEMO_HANDLE,
  createMockFranchiseOnboardingApi,
  resetMockFranchiseOnboarding,
} from "@shared/franchise/onboarding/mockApi";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";
import type { FranchiseStepViewProps } from "@/pages/franchise/onboarding/types";
import type { FranchiseOnboardingActions } from "@/pages/franchise/onboarding/useFranchiseOnboarding";

/**
 * The step 6 warehouse box, in the component rather than in the schema.
 *
 * `franchise-operations-schema.test.ts` pins what the server will accept, and it is the reason
 * this file exists: the schema **refuses** an address that is still on the record under a ticked
 * box, and react-hook-form keeps the value of a field it has unmounted. So the box hiding three
 * inputs is not enough. It has to clear them, or a franchisee who typed half an address and then
 * ticked would be told to clear a field they can no longer see.
 */

// The step autosaves its draft on a debounce, and the real module posts to the deployed API.
vi.mock("@/lib/franchiseOnboardingApi", () => ({
  franchiseOnboardingApi: {
    saveDraft: async () => ({ ok: true, data: { savedAt: "2026-09-02T10:00:00.000Z" } }),
  },
}));

let state: FranchiseOnboardingState;
const submitOperations = vi.fn(async () => {});

beforeEach(async () => {
  cleanup();
  submitOperations.mockClear();
  resetMockFranchiseOnboarding();
  const api = createMockFranchiseOnboardingApi({ now: () => "2026-09-02T10:00:00.000Z" });
  const result = await api.getState(FRANCHISE_DEMO_HANDLE);
  if (!result.ok) throw new Error("the demo handle should open");
  state = result.data;
});

function renderStep() {
  const props: FranchiseStepViewProps = {
    handle: FRANCHISE_DEMO_HANDLE,
    state,
    readOnly: false,
    frozenReason: null,
    isSubmitting: false,
    fieldErrors: null,
    goToStep: () => {},
    actions: { submitOperations } as unknown as FranchiseOnboardingActions,
  };
  render(<StepOperations {...props} />);
}

describe("the warehouse box on step 6", () => {
  it("hides the three storage fields when ticked, and brings them back", async () => {
    const user = userEvent.setup();
    renderStep();

    expect(screen.getByTestId("input-warehouseAddress")).toBeInTheDocument();

    await user.click(screen.getByTestId("input-warehouseNotIdentified"));
    expect(screen.queryByTestId("input-warehouseAddress")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-warehouseAreaSqft")).not.toBeInTheDocument();
    expect(screen.getByText(/before your first consignment leaves/)).toBeInTheDocument();

    await user.click(screen.getByTestId("input-warehouseNotIdentified"));
    expect(screen.getByTestId("input-warehouseAddress")).toBeInTheDocument();
  });

  it("clears a half-typed address rather than keeping it hidden on the record", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.type(screen.getByTestId("input-warehouseAddress"), "Plot 22, Sahibabad");
    await user.click(screen.getByTestId("input-warehouseNotIdentified"));
    await user.click(screen.getByTestId("input-warehouseNotIdentified"));

    expect(screen.getByTestId("input-warehouseAddress")).toHaveValue("");
  });
});
