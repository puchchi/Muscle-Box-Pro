/**
 * Where a gym's payout is transferred, and what we are willing to hold about it.
 *
 * Written before the endpoint exists, for the same reason as `portal.ts`: the card renders
 * one type, the seam fills it from an in-memory store today and from
 * `/gym/payout-account` later. The routes it describes are `GET`, `PUT` and `DELETE` on
 * that path — see `client/src/lib/gymPayoutAccountApi.ts` for the envelope.
 *
 * The one rule that shapes this file: **the account number goes out and never comes back.**
 * `PayoutAccountInput` carries it because it has to; `PayoutAccount` carries four characters
 * of it because that is all a gym needs to recognise which account it named, and anything
 * more is a full bank credential sitting in a response body, a browser cache and every
 * error report that ever serialises it. This is also why there is no "edit" — you cannot
 * amend a value you were never sent, so a change is a fresh set of details that replaces
 * the record, and the confirm-the-number check runs on every write rather than only the
 * first.
 *
 * There is no verification state here on purpose. Penny-drop verification is a real thing
 * we may do, and inventing `status: "verified"` before anything can set it would put a word
 * on screen that no process backs.
 */

/** What a gym holds the account as. Both are ordinary; neither changes how we pay. */
export type PayoutAccountType = "savings" | "current";

/**
 * The account on file, as the server describes it back.
 *
 * Everything here is safe to render. `bankName` is the server's IFSC lookup and is null
 * where that lookup has nothing to say — a gym recognises "HDFC Bank" faster than an
 * eleven-character code, but a *guessed* bank name is worse than none, so the field is
 * nullable rather than best-effort.
 */
export type PayoutAccount = {
  accountHolderName: string;
  /** The last four characters of the account number. The rest is never sent. */
  accountNumberLast4: string;
  ifsc: string;
  bankName: string | null;
  accountType: PayoutAccountType;
  /** ISO timestamp of the last write. Shown, because a gym should know how old this is. */
  updatedAt: string;
};

/**
 * What a gym submits. The whole set every time, including on a change.
 *
 * `confirmAccountNumber` is deliberately **not** here — it is a question the form asks the
 * person filling it in, answered before anything is sent, and a second copy of an account
 * number on the wire is a second copy to leak. See `payoutAccountFormSchema`.
 */
export type PayoutAccountInput = {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  accountType: PayoutAccountType;
};
