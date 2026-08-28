/**
 * Razorpay webhook verification and event parsing, for the security deposit (§5).
 *
 * Split out from any handler on purpose. This file is the part where a mistake is
 * *silent* — a signature check that always passes, or an amount read from the wrong
 * field — so it is pure, has no database or network access, and is unit-tested
 * directly. The handler that writes to `deposits` and advances the onboarding record
 * lands with the tables in build item 9; nothing in this module needs those tables to
 * be correct or to be tested.
 *
 * The rules it enforces, from docs/gym-onboarding.md §5:
 *
 *   - Verify the signature on every call. Reject unsigned ones. No exceptions and no
 *     "allow in development" flag — a bypass flag is how an unsigned webhook reaches
 *     production.
 *   - Verify the amount server-side, in paise, against `gym_terms.security_deposit`.
 *     Never trust an amount that came back from the browser, and never accept a
 *     partial payment as a deposit: Razorpay Payment Links can be configured to allow
 *     them, and ₹5,000 against a ₹50,000 obligation is not "paid".
 *   - Idempotent by `razorpay_payment_id`. Razorpay retries; a replayed webhook must
 *     not create a second deposit, so the id is surfaced here as the key the caller
 *     writes with a unique constraint.
 */

/**
 * The only event we act on.
 *
 * `payment_link.paid` rather than `payment.captured` because the link is what ties a
 * payment to a gym: our `reference_id` travels on the link, not on the payment. A
 * `payment.captured` for the same money arrives too and is ignored — acting on both is
 * how one deposit becomes two rows.
 */
export const DEPOSIT_PAID_EVENT = "payment_link.paid";

export type DepositWebhookEvent =
  /** Verified, complete, and about a deposit. The caller may record it. */
  | {
      kind: "deposit_paid";
      /** `plink_...`. Matches `deposits.razorpay_link_id`. */
      linkId: string;
      /** `pay_...`. The idempotency key — store it unique. */
      paymentId: string;
      amountPaise: number;
      /** What we asked for, as the link records it. Compared, never trusted alone. */
      amountExpectedPaise: number;
      /** "UPI", "netbanking", "card" — as reported by the gateway. */
      method: string;
      /** ISO 8601, converted from Razorpay's epoch seconds. */
      paidAt: string;
      /** Our own id on the link, so the caller does not have to guess the gym. */
      referenceId: string | null;
    }
  /** Well-formed and genuine, but not something we act on. Acknowledge with 200. */
  | { kind: "ignored"; reason: string }
  /** Not parseable as the event it claims to be. Acknowledge with 200; alert internally. */
  | { kind: "malformed"; reason: string };

/**
 * HMAC-SHA256 of the **raw** request body, compared in constant time.
 *
 * Raw body, not a re-serialised object: `JSON.parse` followed by `JSON.stringify`
 * reorders keys and drops whitespace, and the digest is over the bytes Razorpay sent.
 * Any handler using this must read `await req.text()` once and pass that same string
 * both here and to `parseDepositWebhook`.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(expected, signatureHeader.trim().toLowerCase());
}

/**
 * Length-independent, comparison-independent equality.
 *
 * A `===` on a hex digest leaks how many leading characters matched through timing.
 * The leak is small and the fix is four lines, so there is no argument for `===`.
 */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Turns a verified raw body into something the caller may act on.
 *
 * Never throws. A webhook handler that throws gets retried by Razorpay forever on a
 * payload that will never parse, so every failure here is a described outcome instead.
 * The caller returns 200 for all three kinds and alerts internally on `malformed` —
 * a non-200 tells Razorpay to try again, which is the wrong answer to "this payload is
 * nonsense".
 */
export function parseDepositWebhook(rawBody: string): DepositWebhookEvent {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { kind: "malformed", reason: "body is not JSON" };
  }
  if (!isRecord(payload)) return { kind: "malformed", reason: "body is not an object" };

  const event = typeof payload.event === "string" ? payload.event : null;
  if (event !== DEPOSIT_PAID_EVENT) {
    return { kind: "ignored", reason: `event ${event ?? "(none)"} is not ${DEPOSIT_PAID_EVENT}` };
  }

  const entities = isRecord(payload.payload) ? payload.payload : null;
  const link = entities && isRecord(entities.payment_link) ? entities.payment_link.entity : null;
  const payment = entities && isRecord(entities.payment) ? entities.payment.entity : null;
  if (!isRecord(link) || !isRecord(payment)) {
    return { kind: "malformed", reason: "missing payment_link or payment entity" };
  }

  const linkId = str(link.id);
  const paymentId = str(payment.id);
  if (!linkId || !paymentId) {
    return { kind: "malformed", reason: "missing link id or payment id" };
  }

  // `amount_paid` on the link, not `amount` on the payment: with partial payments
  // enabled the two differ, and the cumulative figure is the one that answers "is this
  // obligation settled".
  const amountPaise = int(link.amount_paid);
  const amountExpectedPaise = int(link.amount);
  if (amountPaise === null || amountExpectedPaise === null) {
    return { kind: "malformed", reason: "link amounts are not integers" };
  }
  if (amountPaise < amountExpectedPaise) {
    // Genuine, verified, and still not a paid deposit. Ignored rather than malformed:
    // there is nothing wrong with the payload, and the caller must not record it.
    return {
      kind: "ignored",
      reason: `partial payment: ${amountPaise} of ${amountExpectedPaise} paise`,
    };
  }

  const paidAtEpoch = int(payment.created_at);

  return {
    kind: "deposit_paid",
    linkId,
    paymentId,
    amountPaise,
    amountExpectedPaise,
    method: str(payment.method) ?? "unknown",
    // Razorpay sends epoch seconds. `Date.now()` would record when *we* processed the
    // webhook, which on a retry can be hours after the money moved.
    paidAt: new Date((paidAtEpoch ?? 0) * 1000).toISOString(),
    referenceId: str(link.reference_id),
  };
}

/**
 * Does this payment settle that gym's deposit obligation?
 *
 * Called with the figure from `gym_terms`, read on the server. Exact-or-more, because
 * an overpayment is a refund conversation rather than a reason to leave a signed gym
 * marked unpaid — but a shortfall is not a deposit, whatever the gateway says.
 */
export function settlesDeposit(paidPaise: number, expectedPaise: number): boolean {
  return Number.isInteger(paidPaise) && Number.isInteger(expectedPaise) && expectedPaise > 0
    ? paidPaise >= expectedPaise
    : false;
}

// ── Narrowing helpers ───────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
