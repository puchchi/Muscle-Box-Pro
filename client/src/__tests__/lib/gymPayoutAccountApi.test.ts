import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The payout-account seam, on its live path.
 *
 * Mocked at `apiRequest`, so what is under test is this file's own judgement rather than the
 * transport: which verb and route it uses, what it puts on the wire, and what it does with an
 * answer. The real schema runs, because the property worth proving is that a response leaking
 * a full account number is rejected *here*, before any component can render it.
 *
 * Every case is on the live path. The mock store is exercised through the card's own tests,
 * and asserting on it here would only pin a fixture in place.
 */

const { mockApiRequest } = vi.hoisted(() => ({ mockApiRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiRequest: mockApiRequest }));

import type { PayoutAccount } from "@shared/gym/payoutAccount";
import type { PayoutAccountFormValues } from "@shared/gym/payoutAccountSchema";
import type { OnboardingErrorCode } from "@shared/onboarding/types";

async function live() {
  vi.stubEnv("NEXT_PUBLIC_MBP_API_MODE", "live");
  vi.resetModules();
  return await import("@/lib/gymPayoutAccountApi");
}

const ACCOUNT: PayoutAccount = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumberLast4: "4417",
  ifsc: "HDFC0001234",
  bankName: "HDFC Bank",
  accountType: "current",
  updatedAt: "2026-04-29T10:05:00.000Z",
};

const FORM: PayoutAccountFormValues = {
  accountHolderName: "  Iron Temple Fitness Pvt Ltd ",
  accountNumber: "5010 0234-564417",
  confirmAccountNumber: "50100234564417",
  ifsc: "hdfc0001234",
  accountType: "current",
};

function resolves(data: unknown) {
  mockApiRequest.mockResolvedValue({ ok: true, data });
}

function fails(
  code: OnboardingErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  mockApiRequest.mockResolvedValue({ ok: false, error: { code, message, fieldErrors } });
}

function call(index = 0) {
  const [method, path, options] = mockApiRequest.mock.calls[index] as [
    string,
    string,
    { body?: unknown; handle?: unknown } | undefined,
  ];
  return { method, path, body: options?.body, handle: options?.handle };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fetchPayoutAccount", () => {
  it("reads the one route", async () => {
    resolves({ account: ACCOUNT });
    const { fetchPayoutAccount } = await live();

    expect(await fetchPayoutAccount()).toEqual(ACCOUNT);
    expect(call()).toMatchObject({ method: "GET", path: "/gym/payout-account" });
  });

  it("sends no gym identifier, on any of the three calls", async () => {
    // The gym is the session's, resolved in the handler. A `gymId` from the browser on the
    // route that decides where money goes would be an authorisation decision made in the
    // one process that cannot be trusted to make it.
    resolves({ account: ACCOUNT });
    const { fetchPayoutAccount, savePayoutAccount, removePayoutAccount } = await live();

    await fetchPayoutAccount();
    await savePayoutAccount(FORM);
    await removePayoutAccount();

    for (const index of [0, 1, 2]) {
      const { path, body } = call(index);
      expect(path).toBe("/gym/payout-account");
      expect(path).not.toMatch(/gym_?id/i);
      expect(body ?? {}).not.toHaveProperty("gymId");
    }
  });

  it("returns null for a gym that has not given us one", async () => {
    resolves({ account: null });
    const { fetchPayoutAccount } = await live();

    expect(await fetchPayoutAccount()).toBeNull();
  });

  it("throws a request error with the server's message", async () => {
    fails("expired_token", "Your session has expired.");
    const { fetchPayoutAccount, PayoutAccountRequestError } = await live();

    await expect(fetchPayoutAccount()).rejects.toBeInstanceOf(PayoutAccountRequestError);
    await expect(fetchPayoutAccount()).rejects.toMatchObject({ code: "expired_token" });
  });

  /**
   * The boundary earning its keep.
   *
   * A handler sending the whole number is a bank credential in this browser's memory. The
   * seam refuses it rather than truncating it for display, which would leave the leak in the
   * response and hide it on the screen.
   */
  it("refuses a response carrying the full account number", async () => {
    resolves({ account: { ...ACCOUNT, accountNumberLast4: "50100234564417" } });
    const { fetchPayoutAccount, PayoutAccountResponseError } = await live();

    await expect(fetchPayoutAccount()).rejects.toBeInstanceOf(PayoutAccountResponseError);
  });
});

describe("savePayoutAccount", () => {
  it("replaces the whole record with a PUT", async () => {
    // Not `PATCH`. There is one account per gym and a change is the whole set of details, so
    // a partial update would have nothing to merge the account number into.
    resolves({ account: ACCOUNT });
    const { savePayoutAccount } = await live();

    await savePayoutAccount(FORM);
    expect(call().method).toBe("PUT");
  });

  it("normalises what it sends and drops the confirmation", async () => {
    resolves({ account: ACCOUNT });
    const { savePayoutAccount } = await live();

    await savePayoutAccount(FORM);
    expect(call().body).toEqual({
      accountHolderName: "Iron Temple Fitness Pvt Ltd",
      accountNumber: "50100234564417",
      ifsc: "HDFC0001234",
      accountType: "current",
    });
  });

  it("carries the server's field errors to the caller", async () => {
    // So the form can mark the field the handler objected to. Without them a rule we do not
    // know about shows only as a banner, leaving the gym to guess which of five boxes it meant.
    fails("validation", "Please check your details.", { ifsc: "No branch with that IFSC" });
    const { savePayoutAccount, PayoutAccountRequestError } = await live();

    await expect(savePayoutAccount(FORM)).rejects.toMatchObject({
      fieldErrors: { ifsc: "No branch with that IFSC" },
    });
    await expect(savePayoutAccount(FORM)).rejects.toBeInstanceOf(PayoutAccountRequestError);
  });

  it("treats a write that returns no account as a failure", async () => {
    // A handler answering `{ account: null }` to a PUT saved nothing and said it did. Passing
    // that through would replace a filled-in form with the empty state and no explanation.
    resolves({ account: null });
    const { savePayoutAccount, PayoutAccountResponseError } = await live();

    await expect(savePayoutAccount(FORM)).rejects.toBeInstanceOf(PayoutAccountResponseError);
  });
});

describe("removePayoutAccount", () => {
  it("deletes the route and resolves to nothing", async () => {
    // `{ account: null }` rather than a bodyless 204, because `apiRequest` reads an empty 2xx
    // body as a truncated response.
    resolves({ account: null });
    const { removePayoutAccount } = await live();

    await expect(removePayoutAccount()).resolves.toBeUndefined();
    expect(call().method).toBe("DELETE");
  });

  it("throws rather than reporting success when the delete is refused", async () => {
    // A resolved promise here would close the confirmation and leave the card showing an
    // account the gym believes it has removed.
    fails("network", "We could not remove it just now.");
    const { removePayoutAccount, PayoutAccountRequestError } = await live();

    await expect(removePayoutAccount()).rejects.toBeInstanceOf(PayoutAccountRequestError);
  });
});

describe("payoutAccountErrorMessage", () => {
  it("keeps the server's wording, which is written for a gym owner", async () => {
    const { payoutAccountErrorMessage, PayoutAccountRequestError } = await live();

    expect(
      payoutAccountErrorMessage(
        new PayoutAccountRequestError("validation", "That IFSC has no branch."),
      ),
    ).toBe("That IFSC has no branch.");
  });

  it("says nothing about our field names when the fault is ours", async () => {
    const { payoutAccountErrorMessage, PayoutAccountResponseError } = await live();

    const message = payoutAccountErrorMessage(
      new PayoutAccountResponseError(["account.accountNumberLast4: must be the last four"]),
    );
    expect(message).not.toMatch(/accountNumberLast4/);
    expect(message).toMatch(/please try again/i);
  });
});
