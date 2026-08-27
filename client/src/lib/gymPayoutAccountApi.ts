/**
 * The gym's payout account, behind one seam.
 *
 * Three operations on `/gym/payout-account` — read it, replace it, remove it — with the
 * same build-time switch and the same shape of boundary as
 * [gymPortalApi.ts](./gymPortalApi.ts). Nothing in `pages/gym/` knows whether the answer
 * came from the store below or from the API, and no component reaches past this file.
 *
 * Four decisions worth knowing about before changing anything here:
 *
 * 1. **`PUT`, not `POST` or `PATCH`.** There is one payout account per gym, and a change is
 *    the whole set of details replacing the whole set. `PATCH` would imply an account
 *    number can be amended in isolation, which is the one edit that must not exist: we
 *    never send the number back, so a partial update would have nothing to merge into and
 *    the confirm-it-twice check would be skipped on precisely the field it exists for.
 *
 * 2. **No `gymId` parameter, ever.** Same rule as the reporting call: the gym is resolved
 *    from the session cookie inside the handler. On a route that decides where money is
 *    sent, a gym identifier travelling from the browser would be an authorisation decision
 *    made in the wrong process.
 *
 * 3. **Every response is validated, including a fabricated one.** `parsePayoutAccountResponse`
 *    is what enforces "the full account number never comes back" — see
 *    `shared/gym/payoutAccountSchema.ts`. The mock path goes through it too, because a
 *    fixture that cannot pass the boundary is a fixture that is lying about the shape.
 *
 * 4. **Failures throw here, unlike in `apiClient`.** These three are TanStack mutations and
 *    queries, whose error surface *is* a rejected promise: returning a result value would
 *    mean `onSuccess` firing on a failure and `mutation.error` staying null. The thrown
 *    values are still structured — a code and, on a rejected write, the server's field
 *    errors, so the form can mark the field the handler objected to.
 */

import { apiRequest } from "./apiClient";
import {
  parsePayoutAccountResponse,
  toPayoutAccountInput,
  type PayoutAccountFormValues,
} from "@shared/gym/payoutAccountSchema";
import type { PayoutAccount, PayoutAccountInput } from "@shared/gym/payoutAccount";
import type { OnboardingErrorCode } from "@shared/onboarding/types";

/** Same build-time switch as the wizard's — see `onboardingApi.ts` for why it is opt-in. */
const USE_LIVE_API = process.env.NEXT_PUBLIC_MBP_API_MODE === "live";

/** The TanStack Query key. Exported so a sign-out can drop it with the rest. */
export const GYM_PAYOUT_ACCOUNT_QUERY_KEY = ["gym-payout-account"] as const;

const ROUTE = "/gym/payout-account";

/** The request failed: no session, no network, a 500, a rejected write. */
export class PayoutAccountRequestError extends Error {
  readonly code: OnboardingErrorCode;
  /** Keyed by form field, when the server rejected one. Empty otherwise. */
  readonly fieldErrors: Record<string, string>;

  constructor(code: OnboardingErrorCode, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "PayoutAccountRequestError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** A response arrived and was not a shape we will render. Distinct, because it is our bug. */
export class PayoutAccountResponseError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    // For a log. The card renders its own copy and never shows this string, so it is free
    // to name fields.
    super(`Payout account response failed validation: ${issues.join("; ")}`);
    this.name = "PayoutAccountResponseError";
    this.issues = issues;
  }
}

/**
 * One sentence for a gym owner, whichever of the two went wrong.
 *
 * A malformed response is our fault and unactionable, so it does not get its own copy —
 * being told to check a field would be worse than being told to try again. The request
 * errors keep the server's message, which is written for this audience.
 */
export function payoutAccountErrorMessage(error: unknown): string {
  if (error instanceof PayoutAccountRequestError) return error.message;
  return "We could not save your bank details just now. Please try again.";
}

/** The account on file, or null when the gym has not given us one. */
export async function fetchPayoutAccount(): Promise<PayoutAccount | null> {
  if (!USE_LIVE_API) return mockRead();

  const result = await apiRequest<unknown>("GET", ROUTE);
  if (!result.ok) throw requestError(result.error);
  return validate(result.data);
}

/**
 * Replace the account on file, or set the first one.
 *
 * Takes the form's values rather than the wire body so normalising happens in exactly one
 * place — a caller that assembled its own body could send `"1234 5678"` and no rule here
 * would catch it, because a space is legal in a JSON string.
 */
export async function savePayoutAccount(
  values: PayoutAccountFormValues,
): Promise<PayoutAccount> {
  const input = toPayoutAccountInput(values);

  if (!USE_LIVE_API) return mockWrite(input);

  const result = await apiRequest<unknown>("PUT", ROUTE, { body: input });
  if (!result.ok) throw requestError(result.error);

  const account = validate(result.data);
  // A write that answers `{ account: null }` is a handler that saved nothing and said it
  // did. Failing here keeps the card from replacing a filled form with an empty state.
  if (account === null) throw new PayoutAccountResponseError(["account: saved but not returned"]);
  return account;
}

/**
 * Remove it. Resolves to nothing, because there is nothing left to describe.
 *
 * The handler must answer with `{ "account": null }` rather than a bodyless `204`:
 * `apiRequest` treats an empty 2xx body as a failed request, since on every other route
 * that is what a truncated response looks like.
 */
export async function removePayoutAccount(): Promise<void> {
  if (!USE_LIVE_API) {
    await pause();
    mockAccount = null;
    return;
  }

  const result = await apiRequest<unknown>("DELETE", ROUTE);
  if (!result.ok) throw requestError(result.error);
  validate(result.data);
}

function validate(payload: unknown): PayoutAccount | null {
  const result = parsePayoutAccountResponse(payload);
  if (!result.ok) throw new PayoutAccountResponseError(result.issues);
  return result.account;
}

function requestError(error: {
  code: OnboardingErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}): PayoutAccountRequestError {
  return new PayoutAccountRequestError(error.code, error.message, error.fieldErrors ?? {});
}

// ── The store that stands in for the endpoint ───────────────────────────────
//
// Module state, so a change made in one tab session survives navigation and the card can be
// exercised through its whole cycle — add, change, remove, add again — before any of it
// exists on the server.

const DEMO_ACCOUNT: PayoutAccount = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumberLast4: "4417",
  ifsc: "HDFC0001234",
  bankName: "HDFC Bank",
  accountType: "current",
  updatedAt: "2026-04-29T10:05:00.000Z",
};

let mockAccount: PayoutAccount | null = DEMO_ACCOUNT;

/**
 * The bank behind an IFSC, for the demo only.
 *
 * A real lookup is the server's — Razorpay publishes one, and it knows the branch too.
 * This exists so the demo does not lose its bank name the moment someone changes the
 * account, and it answers null for anything it has not heard of, which is the same thing
 * the live route will do when the lookup misses.
 */
const DEMO_BANKS: Record<string, string> = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  BARB: "Bank of Baroda",
  CNRB: "Canara Bank",
  IDIB: "Indian Bank",
  YESB: "Yes Bank",
};

async function mockRead(): Promise<PayoutAccount | null> {
  await pause();
  // Through the same boundary as a live response, for the reason in the header.
  return validate({ account: mockAccount });
}

async function mockWrite(input: PayoutAccountInput): Promise<PayoutAccount> {
  await pause();
  const saved: PayoutAccount = {
    accountHolderName: input.accountHolderName,
    accountNumberLast4: input.accountNumber.slice(-4),
    ifsc: input.ifsc,
    bankName: DEMO_BANKS[input.ifsc.slice(0, 4)] ?? null,
    accountType: input.accountType,
    // Stamped rather than passed in: the moment of the write is the server's fact, and a
    // client-supplied timestamp on a record like this one is a field a browser can lie in.
    updatedAt: new Date().toISOString(),
  };
  const account = validate({ account: saved });
  if (account === null) throw new PayoutAccountResponseError(["account: saved but not returned"]);
  mockAccount = account;
  return account;
}

/**
 * A little latency in development, none under test.
 *
 * Same reasoning as the reporting seam: with an instant resolve nobody ever sees the
 * saving state, so it ships broken. Zero in tests, where waiting is only flake.
 */
function pause(): Promise<void> {
  const ms = process.env.NODE_ENV === "test" ? 0 : 400;
  if (ms === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
