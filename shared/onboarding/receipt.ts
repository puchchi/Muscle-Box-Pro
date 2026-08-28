/**
 * Deposit receipt display.
 *
 * `DepositReceipt.method` is whatever Razorpay called it — machine values like `card` and
 * `netbanking` — and putting one straight on the screen produces "paid by card" and
 * "paid by netbanking" in the middle of otherwise written English. The mapping is here
 * rather than in a step so that step 4 and step 5, which both print the receipt, cannot
 * disagree about what a method is called.
 */

const METHOD_LABELS: Record<string, string> = {
  card: "card",
  upi: "UPI",
  netbanking: "netbanking",
  wallet: "a wallet",
  emi: "EMI",
  emandate: "e-mandate",
  nach: "NACH",
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  bank_transfer: "bank transfer",
};

/** Reads inside a sentence: `paid by ${formatPaymentMethod(method)}`. Empty in, empty out. */
export function formatPaymentMethod(method: string): string {
  const raw = method.trim();
  return METHOD_LABELS[raw.toLowerCase()] ?? raw;
}
