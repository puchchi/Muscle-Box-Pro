import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import StepInstalment from "@/pages/franchise/onboarding/steps/StepInstalment";
import {
  FRANCHISE_DEMO_HANDLE,
  createMockFranchiseOnboardingApi,
  resetMockFranchiseOnboarding,
} from "@shared/franchise/onboarding/mockApi";
import type {
  BankAccount,
  FranchiseOnboardingState,
} from "@shared/franchise/onboarding/types";
import type { FranchiseStepViewProps } from "@/pages/franchise/onboarding/types";
import type { FranchiseOnboardingActions } from "@/pages/franchise/onboarding/useFranchiseOnboarding";

/**
 * Step 8's "Our account" box, which is transcribed into a bank's transfer form for ₹12,50,000.
 *
 * The route validates every field and refuses a half-filled parameter, so the component is not the
 * place that guards against a blank. What it does have to survive is an **API deployed before
 * `accountType` existed**, which sends four fields to a screen expecting five.
 */

vi.mock("@/lib/franchiseOnboardingApi", () => ({
  franchiseOnboardingApi: {
    saveDraft: async () => ({ ok: true, data: { savedAt: "2026-09-04T10:00:00.000Z" } }),
  },
}));

const ACCOUNT: BankAccount = {
  accountName: "Blendbox Innovations LLP",
  accountNumber: "8053462462",
  ifsc: "KKBK0005047",
  accountType: "Current",
  bankName: "Kotak Mahindra Bank, Noida Sector 12",
};

let state: FranchiseOnboardingState;

beforeEach(async () => {
  cleanup();
  resetMockFranchiseOnboarding();
  const api = createMockFranchiseOnboardingApi({ now: () => "2026-09-04T10:00:00.000Z" });
  const result = await api.getState(FRANCHISE_DEMO_HANDLE);
  if (!result.ok) throw new Error("the demo handle should open");
  state = result.data;
});

function renderStep(bankAccount: BankAccount) {
  const props: FranchiseStepViewProps = {
    handle: FRANCHISE_DEMO_HANDLE,
    state,
    readOnly: false,
    frozenReason: null,
    isSubmitting: false,
    fieldErrors: null,
    goToStep: () => {},
    actions: {
      loadPaymentInstructions: async () => ({
        bankAccount,
        reference: "MBPF-DNVGWU3S",
        expectedPaise: 12_50_000 * 100,
      }),
    } as unknown as FranchiseOnboardingActions,
  };
  render(<StepInstalment {...props} />);
}

describe("the bank details on step 8", () => {
  it("quotes every field of the account, account type included", async () => {
    renderStep(ACCOUNT);

    expect(await screen.findByTestId("bank-account-name")).toHaveTextContent(ACCOUNT.accountName);
    expect(screen.getByTestId("bank-account-number")).toHaveTextContent(ACCOUNT.accountNumber);
    expect(screen.getByTestId("bank-ifsc")).toHaveTextContent(ACCOUNT.ifsc);
    expect(screen.getByTestId("bank-account-type")).toHaveTextContent("Current");
    expect(screen.getByTestId("bank-name")).toHaveTextContent(ACCOUNT.bankName);
  });

  it("leaves the row out rather than labelling a blank when the API omits the type", async () => {
    const { accountType: _omitted, ...older } = ACCOUNT;
    renderStep(older as BankAccount);

    expect(await screen.findByTestId("bank-ifsc")).toHaveTextContent(ACCOUNT.ifsc);
    expect(screen.queryByTestId("bank-account-type")).not.toBeInTheDocument();
    expect(screen.queryByText("Account type")).not.toBeInTheDocument();
  });
});
