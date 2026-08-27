import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

/**
 * The one card on the gym portal that writes.
 *
 * Mocked at the seam, not at `fetch`: the three functions are `gymPayoutAccountApi.test.ts`'s
 * subject, and the module holds an in-memory store whose state would otherwise leak from one
 * test in this file to the next. The real error classes are kept, because which class was
 * thrown is exactly what decides whether a message lands on a field or in the banner.
 *
 * What these tests are about is money going to the wrong account. Three of them are the ones
 * worth keeping: the confirmation must block a save rather than warn about it, a change must
 * not prefill the account number it cannot know, and a removal must not be one click.
 */

const { mockFetch, mockSave, mockRemove } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockSave: vi.fn(),
  mockRemove: vi.fn(),
}));
vi.mock("@/lib/gymPayoutAccountApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gymPayoutAccountApi")>();
  return {
    ...actual,
    fetchPayoutAccount: mockFetch,
    savePayoutAccount: mockSave,
    removePayoutAccount: mockRemove,
  };
});

import PayoutAccountCard from "@/pages/gym/PayoutAccountCard";
import { PayoutAccountRequestError } from "@/lib/gymPayoutAccountApi";
import type { PayoutAccount } from "@shared/gym/payoutAccount";

const ACCOUNT: PayoutAccount = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumberLast4: "4417",
  ifsc: "HDFC0001234",
  bankName: "HDFC Bank",
  accountType: "current",
  updatedAt: "2026-04-29T10:05:00.000Z",
};

/**
 * The dialog's open state lives in the dashboard, so a test needs the same holder.
 *
 * `initialFormOpen` stands in for the prompt on the figures tab, which switches tab and opens
 * the form in one click.
 */
function Harness({ initialFormOpen = false }: { initialFormOpen?: boolean }) {
  const [open, setOpen] = useState(initialFormOpen);
  return <PayoutAccountCard formOpen={open} onFormOpenChange={setOpen} />;
}

function renderCard(props: { initialFormOpen?: boolean } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

/**
 * Radix marks the page behind an open dialog `pointer-events: none`, which userEvent honours
 * and jsdom computes for the whole subtree. Without this every click inside the dialog is
 * refused for a reason that has nothing to do with the component.
 */
const user = () => userEvent.setup({ pointerEventsCheck: 0 });

const FILLED = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumber: "50100234564417",
  confirmAccountNumber: "50100234564417",
  ifsc: "HDFC0001234",
};

/**
 * Type a whole form, with whatever a test wants to change about it.
 *
 * An empty override means "leave this one as the form found it", which is how the change tests
 * assert on the prefill — `type("")` is a keyboard descriptor error, not a no-op.
 */
async function fillForm(overrides: Partial<typeof FILLED> = {}) {
  const values = { ...FILLED, ...overrides };
  const u = user();
  for (const [testId, value] of [
    ["input-account-holder", values.accountHolderName],
    ["input-account-number", values.accountNumber],
    ["input-confirm-account-number", values.confirmAccountNumber],
    ["input-ifsc", values.ifsc],
  ] as const) {
    if (value !== "") await u.type(screen.getByTestId(testId), value);
  }
  return u;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(ACCOUNT);
  mockSave.mockResolvedValue(ACCOUNT);
  mockRemove.mockResolvedValue(undefined);
});

describe("the account on file", () => {
  it("shows what we hold, masked to the four characters a passbook can be checked against", async () => {
    renderCard();

    const summary = within(await screen.findByTestId("payout-account-summary"));
    expect(summary.getByText("HDFC Bank")).toBeInTheDocument();
    expect(summary.getByText("Iron Temple Fitness Pvt Ltd")).toBeInTheDocument();
    expect(summary.getByText("••••4417")).toBeInTheDocument();
    expect(summary.getByText("HDFC0001234")).toBeInTheDocument();
    expect(summary.getByText("Current")).toBeInTheDocument();
    // The date of the write, in IST. 10:05Z is still the 29th in Kolkata, so this one is not
    // the boundary case — it is here because a stamp nobody checks is a stamp that silently
    // drifts to UTC.
    expect(summary.getByText(/Updated 29 April 2026/)).toBeInTheDocument();
  });

  it("holds a place while it loads rather than flashing the add form", async () => {
    // The empty state invites a gym to enter details it has already given us, so it must not
    // be what the card shows while the answer is in flight.
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderCard();

    expect(await screen.findByTestId("payout-account-loading")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByTestId("payout-account-empty")).toBeNull();
    expect(screen.queryByTestId("payout-account-summary")).toBeNull();
  });

  it("says it could not load rather than that there is no account, and recovers", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValue(new PayoutAccountRequestError("network", "No connection."));
    renderCard();

    await screen.findByTestId("payout-account-error");
    expect(screen.queryByTestId("payout-account-empty")).toBeNull();

    mockFetch.mockResolvedValue(ACCOUNT);
    await user().click(screen.getByTestId("button-retry-payout-account"));

    await screen.findByTestId("payout-account-summary");
    consoleError.mockRestore();
  });

  it("offers a form when there is nothing on file", async () => {
    mockFetch.mockResolvedValue(null);
    renderCard();

    const empty = within(await screen.findByTestId("payout-account-empty"));
    expect(empty.getByText(/no account on file/i)).toBeInTheDocument();
    await user().click(screen.getByTestId("button-add-payout-account"));

    await screen.findByTestId("input-account-number");
    expect(screen.getByRole("heading", { name: "Add bank account" })).toBeInTheDocument();
  });

  it("opens with the form already up when the dashboard's prompt sent us here", async () => {
    // One click from the prompt on the figures tab: switch tab and open the form. Two would
    // mean the gym has to find the card the prompt was pointing at.
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });

    expect(await screen.findByTestId("input-account-number")).toBeInTheDocument();
  });
});

describe("adding an account", () => {
  it("saves what was typed and shows it back", async () => {
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });
    await screen.findByTestId("input-account-number");

    const u = await fillForm();
    await u.click(screen.getByTestId("radio-account-type-current"));
    mockFetch.mockResolvedValue(ACCOUNT);
    await u.click(screen.getByTestId("button-save-payout-account"));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0]).toEqual({ ...FILLED, accountType: "current" });
    // The dialog closes and the card is refetched, so the gym sees the account rather than
    // the form it just submitted.
    await screen.findByTestId("payout-account-summary");
    expect(screen.queryByTestId("input-account-number")).toBeNull();
  });

  /**
   * The check that catches the mistake that actually happens.
   *
   * No format rule can: a mistyped digit in a fourteen-digit number is still a well-formed
   * fourteen-digit number, and the money reaches whoever holds it. So this has to *block* the
   * save, not warn beside it.
   */
  it("refuses to send an account number that was typed differently twice", async () => {
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });
    await screen.findByTestId("input-account-number");

    const u = await fillForm({ confirmAccountNumber: "50100234564418" });
    await u.click(screen.getByTestId("button-save-payout-account"));

    expect(await screen.findByText(/have to match/i)).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("will not send a malformed IFSC", async () => {
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });
    await screen.findByTestId("input-account-number");

    // The MICR code printed beside it on the same cheque, which is the slip the fifth-position
    // zero exists to catch.
    const u = await fillForm({ ifsc: "400240001" });
    await u.click(screen.getByTestId("button-save-payout-account"));

    expect(await screen.findByText(/looks like HDFC0001234/i)).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("marks the field the server objected to instead of only saying something went wrong", async () => {
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });
    await screen.findByTestId("input-account-number");
    mockSave.mockRejectedValue(
      new PayoutAccountRequestError("validation", "Please check your details.", {
        ifsc: "No branch with that IFSC",
      }),
    );

    const u = await fillForm();
    await u.click(screen.getByTestId("button-save-payout-account"));

    expect(await screen.findByText("No branch with that IFSC")).toBeInTheDocument();
    // Not both. A banner repeating a message that is already on the field is a second thing
    // to read for no extra information.
    expect(screen.queryByTestId("payout-form-error")).toBeNull();
  });

  it("keeps the dialog and the typed values when a save fails", async () => {
    // Closing on failure would lose fourteen digits someone has just read off a passbook, and
    // leave the card showing no account with no explanation.
    mockFetch.mockResolvedValue(null);
    renderCard({ initialFormOpen: true });
    await screen.findByTestId("input-account-number");
    mockSave.mockRejectedValue(new PayoutAccountRequestError("network", "No connection."));

    const u = await fillForm();
    await u.click(screen.getByTestId("button-save-payout-account"));

    expect(await screen.findByTestId("payout-form-error")).toHaveTextContent("No connection.");
    expect(screen.getByTestId("input-account-number")).toHaveValue("50100234564417");
  });
});

describe("changing the account", () => {
  it("prefills what we hold and asks for the number in full", async () => {
    renderCard();
    await screen.findByTestId("payout-account-summary");

    await user().click(screen.getByTestId("button-change-payout-account"));

    expect(await screen.findByText("Change bank account")).toBeInTheDocument();
    // The name and the IFSC, because we hold them and re-typing them is where a fresh typo
    // would come from.
    expect(screen.getByTestId("input-account-holder")).toHaveValue("Iron Temple Fitness Pvt Ltd");
    expect(screen.getByTestId("input-ifsc")).toHaveValue("HDFC0001234");
    // The number blank, and it cannot be otherwise: we hold four characters of it. Which is
    // also what makes the type-it-twice check run on a change and not only on the first save.
    expect(screen.getByTestId("input-account-number")).toHaveValue("");
    expect(screen.getByTestId("input-confirm-account-number")).toHaveValue("");
    expect(screen.queryByDisplayValue(/4417/)).toBeNull();
    expect(screen.getByTestId("button-save-payout-account")).toHaveTextContent("Replace account");
  });

  it("replaces the record with the details entered", async () => {
    renderCard();
    await screen.findByTestId("payout-account-summary");
    await user().click(screen.getByTestId("button-change-payout-account"));
    await screen.findByTestId("input-account-number");

    const u = await fillForm({ accountHolderName: "", ifsc: "" });
    await u.click(screen.getByTestId("radio-account-type-savings"));
    await u.click(screen.getByTestId("button-save-payout-account"));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0]).toMatchObject({
      accountHolderName: "Iron Temple Fitness Pvt Ltd",
      accountNumber: "50100234564417",
      ifsc: "HDFC0001234",
      accountType: "savings",
    });
  });
});

describe("removing the account", () => {
  it("asks first, and says what stops working", async () => {
    renderCard();
    await screen.findByTestId("payout-account-summary");

    await user().click(screen.getByTestId("button-remove-payout-account"));

    // The consequence, not a generic "are you sure?". And the reassurance, because the fear
    // is that removing the account forfeits what is owed.
    expect(await screen.findByText(/nowhere to transfer your payout/i)).toBeInTheDocument();
    expect(screen.getByText(/already owed to you is unaffected/i)).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("does nothing when the confirmation is declined", async () => {
    renderCard();
    await screen.findByTestId("payout-account-summary");
    const u = user();

    await u.click(screen.getByTestId("button-remove-payout-account"));
    await u.click(await screen.findByText("Keep it"));

    await waitFor(() => expect(screen.queryByText(/nowhere to transfer/i)).toBeNull());
    expect(mockRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId("payout-account-summary")).toBeInTheDocument();
  });

  it("removes it once confirmed and offers a form in its place", async () => {
    renderCard();
    await screen.findByTestId("payout-account-summary");
    const u = user();

    await u.click(screen.getByTestId("button-remove-payout-account"));
    mockFetch.mockResolvedValue(null);
    await u.click(await screen.findByTestId("button-confirm-remove-payout-account"));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    await screen.findByTestId("payout-account-empty");
  });

  it("keeps the confirmation open and reports a removal that failed", async () => {
    // Closing on failure would leave the card showing an account the gym believes is gone,
    // and the next payout going to it.
    renderCard();
    await screen.findByTestId("payout-account-summary");
    mockRemove.mockRejectedValue(new PayoutAccountRequestError("network", "No connection."));
    const u = user();

    await u.click(screen.getByTestId("button-remove-payout-account"));
    await u.click(await screen.findByTestId("button-confirm-remove-payout-account"));

    expect(await screen.findByTestId("payout-removal-error")).toHaveTextContent("No connection.");
    expect(screen.getByTestId("button-confirm-remove-payout-account")).toBeInTheDocument();
    expect(screen.getByTestId("payout-account-summary")).toBeInTheDocument();
  });
});
