import { describe, it, expect } from "vitest";
import {
  DEPOSIT_PAID_EVENT,
  parseDepositWebhook,
  settlesDeposit,
  verifyWebhookSignature,
} from "../_shared/razorpay.ts";

/**
 * The money-protecting half of the deposit webhook (§5 of docs/gym-onboarding.md).
 *
 * These are the checks whose failures are silent. A signature verifier that returns
 * `true` for everything, or an amount read from `payment.amount` instead of
 * `payment_link.amount_paid`, produces a system that looks like it works and marks
 * deposits paid that were not. So each rule gets a test that would fail if the rule
 * were removed, not just one happy path.
 */

const SECRET = "whsec_test_deposit";

/** A `payment_link.paid` body shaped the way Razorpay sends it. */
function body(overrides: {
  event?: string;
  amount?: number;
  amountPaid?: number;
  linkId?: string;
  paymentId?: string;
  method?: string;
  createdAt?: number;
  referenceId?: string | null;
} = {}) {
  const {
    event = DEPOSIT_PAID_EVENT,
    amount = 5_000_000,
    amountPaid = 5_000_000,
    linkId = "plink_test123",
    paymentId = "pay_test456",
    method = "UPI",
    createdAt = 1_766_000_000,
    referenceId = "gym_mock_0001",
  } = overrides;

  return JSON.stringify({
    entity: "event",
    event,
    payload: {
      payment_link: {
        entity: { id: linkId, amount, amount_paid: amountPaid, reference_id: referenceId },
      },
      payment: { entity: { id: paymentId, method, created_at: createdAt } },
    },
  });
}

async function sign(raw: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("razorpay webhook — signature", () => {
  it("accepts a body signed with our secret", async () => {
    const raw = body();
    expect(await verifyWebhookSignature(raw, await sign(raw), SECRET)).toBe(true);
  });

  it("rejects a body that was altered after signing", async () => {
    const raw = body();
    const signature = await sign(raw);
    // The attack this exists to stop: a genuine signature reused over a body whose
    // amount has been raised. One byte's difference must fail.
    const tampered = body({ amountPaid: 100 });
    expect(await verifyWebhookSignature(tampered, signature, SECRET)).toBe(false);
  });

  it("rejects a signature made with a different secret", async () => {
    const raw = body();
    expect(await verifyWebhookSignature(raw, await sign(raw, "whsec_someone_else"), SECRET)).toBe(
      false,
    );
  });

  it("rejects a missing signature, and a missing secret", async () => {
    const raw = body();
    expect(await verifyWebhookSignature(raw, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(raw, "", SECRET)).toBe(false);
    // No secret configured must fail closed. Failing open here would accept every
    // unsigned call the moment an env var goes missing.
    expect(await verifyWebhookSignature(raw, await sign(raw), "")).toBe(false);
  });

  it("does not care about header casing or surrounding whitespace", async () => {
    const raw = body();
    const signature = await sign(raw);
    expect(await verifyWebhookSignature(raw, ` ${signature.toUpperCase()} `, SECRET)).toBe(true);
  });
});

describe("razorpay webhook — parsing", () => {
  it("extracts the link, the payment id, the amount and the gym reference", () => {
    const event = parseDepositWebhook(body());
    expect(event.kind).toBe("deposit_paid");
    if (event.kind !== "deposit_paid") return;

    expect(event.linkId).toBe("plink_test123");
    // The idempotency key. Razorpay retries, so this is what carries the unique index.
    expect(event.paymentId).toBe("pay_test456");
    expect(event.amountPaise).toBe(5_000_000);
    expect(event.method).toBe("UPI");
    expect(event.referenceId).toBe("gym_mock_0001");
    // Razorpay's epoch seconds, not our clock: on a retry hours later, the record must
    // still say when the money moved.
    expect(event.paidAt).toBe(new Date(1_766_000_000 * 1000).toISOString());
  });

  it("ignores every event except payment_link.paid", () => {
    for (const other of ["payment.captured", "payment_link.partially_paid", "order.paid"]) {
      const event = parseDepositWebhook(body({ event: other }));
      expect(event.kind).toBe("ignored");
    }
  });

  it("refuses a partial payment as a deposit", () => {
    // Payment Links can be configured to accept part payment. ₹5,000 against a
    // ₹50,000 obligation is genuine money and still not a paid deposit.
    const event = parseDepositWebhook(body({ amount: 5_000_000, amountPaid: 500_000 }));
    expect(event.kind).toBe("ignored");
    if (event.kind === "ignored") expect(event.reason).toMatch(/partial payment/);
  });

  it("reads the cumulative amount off the link, not the single payment", () => {
    // Second instalment completing the total. `payment.amount` would say 500,000 here;
    // the link's `amount_paid` is the figure that answers "is this settled".
    const event = parseDepositWebhook(body({ amount: 5_000_000, amountPaid: 5_000_000 }));
    expect(event.kind).toBe("deposit_paid");
    if (event.kind === "deposit_paid") expect(event.amountPaise).toBe(5_000_000);
  });

  it("describes a broken payload instead of throwing", () => {
    // A handler that throws is retried by Razorpay forever on a body that will never
    // parse. Every failure has to be a value the caller can 200 and alert on.
    expect(parseDepositWebhook("not json").kind).toBe("malformed");
    expect(parseDepositWebhook("[]").kind).toBe("malformed");
    expect(parseDepositWebhook(JSON.stringify({ event: DEPOSIT_PAID_EVENT })).kind).toBe(
      "malformed",
    );
    expect(parseDepositWebhook(body({ linkId: "" })).kind).toBe("malformed");
    expect(parseDepositWebhook(body({ paymentId: "" })).kind).toBe("malformed");
  });

  it("tolerates a link with no reference id rather than rejecting the payment", () => {
    // A link created by hand in the Razorpay dashboard has no `reference_id`. The money
    // is still real; the caller matches it by `linkId` instead.
    const event = parseDepositWebhook(body({ referenceId: null }));
    expect(event.kind).toBe("deposit_paid");
    if (event.kind === "deposit_paid") expect(event.referenceId).toBeNull();
  });
});

describe("razorpay webhook — settlement check", () => {
  it("needs the terms figure to be met, and treats an overpayment as settled", () => {
    expect(settlesDeposit(5_000_000, 5_000_000)).toBe(true);
    expect(settlesDeposit(5_000_100, 5_000_000)).toBe(true);
    expect(settlesDeposit(4_999_900, 5_000_000)).toBe(false);
  });

  it("fails closed on a missing or nonsensical expected amount", () => {
    // A zero or absent `gym_terms.security_deposit` must not make every payment
    // sufficient. Reading the expected figure wrongly is the failure this catches.
    expect(settlesDeposit(1, 0)).toBe(false);
    expect(settlesDeposit(5_000_000, Number.NaN)).toBe(false);
    expect(settlesDeposit(5_000_000.5, 5_000_000)).toBe(false);
  });
});
