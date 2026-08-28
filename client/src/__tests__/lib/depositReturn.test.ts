import { describe, it, expect, beforeEach } from "vitest";
import {
  forgetPaymentAttempt,
  markReturnedFromGateway,
  readPaymentUrl,
  rememberPaymentAttempt,
  takeReturnTo,
  takeReturnedFromGateway,
} from "@/lib/depositReturn";

/**
 * The stash that carries step 4 across the payment gateway and back.
 *
 * It exists because the return URL is registered with Razorpay and therefore cannot contain
 * the onboarding handle (docs/gym-onboarding.md §25). That makes two of the properties below
 * load-bearing rather than tidy: the path is read once, and it is only honoured if it is an
 * onboarding path — a value read straight off a third-party callback and handed to
 * `router.replace` is a redirect target.
 */

const ONBOARDING_PATH = "/gym/onboarding/iron-temple-fitness/3f7c9a";
const OTHER_GYM_PATH = "/gym/onboarding/southside-strength/b21d40";
const PAYMENT_URL = "https://rzp.io/i/abc123";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("the way back from the payment page", () => {
  it("hands the path over once and then has nothing", () => {
    rememberPaymentAttempt({ returnTo: ONBOARDING_PATH, paymentUrl: PAYMENT_URL });

    expect(takeReturnTo()).toBe(ONBOARDING_PATH);
    // Once, because the return route consumes it. Left in place, a later visit to the
    // gateway with storage already primed could send a gym to a stale onboarding path.
    expect(takeReturnTo()).toBeNull();
  });

  it("refuses a return path that is not an onboarding path", () => {
    for (const hostile of [
      "https://evil.example/gym/onboarding/x",
      "//evil.example/gym/onboarding/x",
      "/admin/gyms",
      "",
    ]) {
      window.sessionStorage.setItem("mbp.deposit.return-to", hostile);
      expect(takeReturnTo()).toBeNull();
    }
  });

  it("keeps the payment URL for a gym that comes back without paying", () => {
    rememberPaymentAttempt({ returnTo: ONBOARDING_PATH, paymentUrl: PAYMENT_URL });

    // Not one-shot, unlike the path: this is what the pending card offers as the way back
    // to the payment page, and re-issuing instead would mint a second live link for one
    // ₹50,000 obligation.
    expect(readPaymentUrl(ONBOARDING_PATH)).toBe(PAYMENT_URL);
    expect(readPaymentUrl(ONBOARDING_PATH)).toBe(PAYMENT_URL);
  });

  it("will not hand one gym's payment link to another gym's wizard", () => {
    rememberPaymentAttempt({ returnTo: ONBOARDING_PATH, paymentUrl: PAYMENT_URL });

    // These keys outlive a navigation, and one tab can visit two gyms' wizards. Unscoped,
    // the second gym's "Pay deposit now" opened the first gym's link — spent, so the button
    // landed on Razorpay's "Payment Completed" and that gym had no way to pay at all. Live,
    // it would have paid the wrong gym's deposit. Null sends the screen to the server, which
    // answers per gym.
    expect(readPaymentUrl(OTHER_GYM_PATH)).toBeNull();
  });

  it("will not offer a payment URL that is not https", () => {
    window.sessionStorage.setItem(
      "mbp.deposit.payment",
      JSON.stringify({ scope: ONBOARDING_PATH, url: "javascript:alert(1)" }),
    );
    expect(readPaymentUrl(ONBOARDING_PATH)).toBeNull();
  });

  it("offers nothing when the stash is not a record it wrote", () => {
    for (const junk of ["", "not json", "null", '"https://rzp.io/i/abc123"', "{}"]) {
      window.sessionStorage.setItem("mbp.deposit.payment", junk);
      expect(readPaymentUrl(ONBOARDING_PATH)).toBeNull();
    }
  });

  it("reports the return from the gateway once", () => {
    markReturnedFromGateway();

    expect(takeReturnedFromGateway()).toBe(true);
    // The screen says "checking your payment" on the strength of this. If it survived, a
    // visit days later to a deposit still unpaid would claim to be chasing a payment
    // nobody had made.
    expect(takeReturnedFromGateway()).toBe(false);
  });

  it("forgets the whole attempt once the deposit is paid", () => {
    rememberPaymentAttempt({ returnTo: ONBOARDING_PATH, paymentUrl: PAYMENT_URL });
    markReturnedFromGateway();

    forgetPaymentAttempt();

    expect(takeReturnTo()).toBeNull();
    expect(readPaymentUrl(ONBOARDING_PATH)).toBeNull();
    expect(takeReturnedFromGateway()).toBe(false);
  });
});
