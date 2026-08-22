/**
 * Rupee figures written out in words, Indian numbering.
 *
 * Exists for one clause. §5.1 of the agreement prints the deposit twice — once as a
 * figure and once as words — and in the source PDF the words were fixed text
 * ("Rupees Fifty Thousand Only") beside a figure we tokenise. A gym on a negotiated
 * ₹75,000 deposit would have received a clause reading "₹75,000 - Rupees Fifty
 * Thousand Only", which is the one kind of defect that makes the whole document
 * arguable: where a contract states an amount twice and the two disagree, the reader
 * gets to argue for the lower one.
 *
 * The deposit is a fixed ₹50,000 today, so this is not needed *yet*. It is here
 * because the figure is settable from the backend by design, and the failure mode of
 * the alternative — leaving the words hardcoded and remembering to change them — is
 * silent, only reachable through a negotiated gym, and lands in a signed contract.
 *
 * Indian numbering (crore / lakh / thousand) rather than the international scale,
 * because that is what an Indian agreement, a CA and a court all expect.
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

/** 0–99. The teens are irregular, which is why ONES runs to nineteen. */
function underHundred(value: number): string {
  if (value < 20) return ONES[value];
  const tens = TENS[Math.floor(value / 10)];
  const ones = ONES[value % 10];
  return ones ? `${tens} ${ones}` : tens;
}

/** 0–999. */
function underThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) parts.push(underHundred(rest));
  return parts.join(" ");
}

/**
 * The groups Indian numbering splits on, largest first.
 *
 * Stops at crore rather than continuing to arab/kharab: a security deposit above
 * ₹99,99,99,999 is not a case this document has, and inventing words for it would be
 * inventing words nobody would check.
 */
const GROUPS: { divisor: number; label: string }[] = [
  { divisor: 1_00_00_000, label: "Crore" },
  { divisor: 1_00_000, label: "Lakh" },
  { divisor: 1_000, label: "Thousand" },
];

/**
 * `50000` → `"Rupees Fifty Thousand Only"`.
 *
 * Whole rupees only. Paise are deliberately unsupported rather than silently dropped:
 * every rupee amount in this agreement is a whole number, and a deposit of ₹50,000.75
 * is a data error worth surfacing as one — see the throw below.
 */
export function rupeesInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
    // Louder than returning a placeholder. This string goes into a contract, and the
    // one thing worse than a wrong figure in words is a plausible-looking wrong one.
    throw new RangeError(
      `rupeesInWords expects a whole non-negative rupee amount, received ${amount}`,
    );
  }

  if (amount === 0) return "Rupees Zero Only";
  if (amount > 99_99_99_999) {
    throw new RangeError(`rupeesInWords does not go above ₹99,99,99,999, received ${amount}`);
  }

  const parts: string[] = [];
  let remaining = amount;

  for (const { divisor, label } of GROUPS) {
    const count = Math.floor(remaining / divisor);
    if (count > 0) {
      // Each group is itself under a thousand by construction, so the same 0–999
      // renderer serves crore, lakh and thousand.
      parts.push(`${underThousand(count)} ${label}`);
      remaining %= divisor;
    }
  }

  if (remaining > 0) parts.push(underThousand(remaining));

  return `Rupees ${parts.join(" ")} Only`;
}
