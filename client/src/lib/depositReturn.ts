/**
 * The trip out to the payment gateway and back, for step 4 of onboarding.
 *
 * The gym leaves *this* tab for its Razorpay Payment Link, and the link's `callback_url`
 * brings it back to `/gym/deposit-return`, which hands it to the wizard again. Three things
 * have to survive that journey, and none of them can travel in the URL:
 *
 * **Where to come back to.** `callback_url` is a value we give Razorpay when the link is
 * created, so whatever is in it lands in a third party's records — and the onboarding path
 * contains the handle, a 30-day credential. That is the leak `Referrer-Policy: no-referrer`
 * on `/gym/onboarding/` exists to close, and a return URL carrying the handle would reopen
 * it deliberately. So the return route is handle-free and the path is kept here.
 *
 * **The payment URL**, so a gym that comes back without paying has a way to the payment page
 * rather than a dead "waiting" card. Re-issuing would mint a second live link for one
 * obligation.
 *
 * **That we have been away**, so the screen can say it is confirming a payment just made
 * instead of announcing it cannot see one nobody has attempted.
 *
 * `sessionStorage` because the lifetime is right: one tab, gone when that tab closes, and
 * carried across a cross-origin navigation and back. Nothing stored here is evidence of
 * anything — the webhook is the only thing that marks a deposit paid (§5), and a return trip
 * is a navigation, not a result. See docs/gym-onboarding.md §25.
 */

const RETURN_TO_KEY = "mbp.deposit.return-to";
const PAYMENT_URL_KEY = "mbp.deposit.payment-url";
const RETURNED_KEY = "mbp.deposit.returned";

/** Where a Payment Link's `callback_url` points. Carries no handle, by design. */
export const DEPOSIT_RETURN_PATH = "/gym/deposit-return";

export function rememberPaymentAttempt(attempt: {
  returnTo: string;
  paymentUrl: string;
}): void {
  write(RETURN_TO_KEY, attempt.returnTo);
  write(PAYMENT_URL_KEY, attempt.paymentUrl);
}

/**
 * Where the wizard was, read once and cleared.
 *
 * Null unless it is an onboarding path. This value is read straight off a third-party
 * callback and handed to `router.replace`, which makes it a redirect target: the check is
 * what keeps that redirect inside the flow it belongs to.
 */
export function takeReturnTo(): string | null {
  const path = read(RETURN_TO_KEY);
  drop(RETURN_TO_KEY);
  return path && path.startsWith("/gym/onboarding/") ? path : null;
}

/** The link the gym was sent to, if this tab is the one that sent it. */
export function readPaymentUrl(): string | null {
  const url = read(PAYMENT_URL_KEY);
  return url && url.startsWith("https://") ? url : null;
}

export function forgetPaymentAttempt(): void {
  drop(RETURN_TO_KEY);
  drop(PAYMENT_URL_KEY);
  drop(RETURNED_KEY);
}

export function markReturnedFromGateway(): void {
  write(RETURNED_KEY, "1");
}

/**
 * Did the gateway just send us back here? Read once and cleared.
 *
 * One-shot on purpose: left in storage it would make the next visit to step 4 — days later,
 * on a deposit still unpaid — look like a return from a payment.
 */
export function takeReturnedFromGateway(): boolean {
  const value = read(RETURNED_KEY);
  drop(RETURNED_KEY);
  return value === "1";
}

// ── Storage, which is allowed to not exist ──────────────────────────────────
//
// Safari in private mode and a browser with site data blocked both throw on access rather
// than returning null. Swallowed here because every one of these is an optimisation of the
// journey: without storage the gym still pays, and still lands on a page that tells it what
// happened — just the standalone one rather than back inside the wizard.

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

function drop(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}
