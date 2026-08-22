import { describe, it, expect } from "vitest";
import { rupeesInWords } from "@shared/agreement/amountInWords";
import { PARTNERSHIP, formatInr } from "@shared/partnership/summary";

/**
 * Rupees in words, for §5.1 of the agreement.
 *
 * This function's output goes into a contract beside the same amount as a figure, so
 * the failure that matters is not "ugly" — it is "plausible but wrong". A gym reading
 * "₹1,50,000 - Rupees Fifteen Thousand Only" gets to argue for the lower number, and
 * nobody proofreads the words when the figure looks right. Hence the emphasis below on
 * the boundaries where Indian grouping goes wrong: the teens, the round tens, and the
 * gaps between crore, lakh and thousand.
 */

describe("rupeesInWords", () => {
  it("writes the standard deposit", () => {
    expect(rupeesInWords(50_000)).toBe("Rupees Fifty Thousand Only");
  });

  it("writes the figure the agreement would actually carry today", () => {
    // The pairing §5.1 renders. If these two ever describe different amounts, the
    // clause contradicts itself.
    expect(formatInr(PARTNERSHIP.securityDepositInr)).toBe("₹50,000");
    expect(rupeesInWords(PARTNERSHIP.securityDepositInr)).toBe("Rupees Fifty Thousand Only");
  });

  it.each([
    [1, "Rupees One Only"],
    [7, "Rupees Seven Only"],
    [10, "Rupees Ten Only"],
    // The teens are the irregular block, and the usual off-by-one is here.
    [11, "Rupees Eleven Only"],
    [13, "Rupees Thirteen Only"],
    [19, "Rupees Nineteen Only"],
    [20, "Rupees Twenty Only"],
    [21, "Rupees Twenty One Only"],
    [70, "Rupees Seventy Only"],
    [99, "Rupees Ninety Nine Only"],
  ])("writes %i under a hundred", (amount, words) => {
    expect(rupeesInWords(amount)).toBe(words);
  });

  it.each([
    [100, "Rupees One Hundred Only"],
    [101, "Rupees One Hundred One Only"],
    [115, "Rupees One Hundred Fifteen Only"],
    [900, "Rupees Nine Hundred Only"],
    [999, "Rupees Nine Hundred Ninety Nine Only"],
  ])("writes %i in hundreds", (amount, words) => {
    expect(rupeesInWords(amount)).toBe(words);
  });

  it.each([
    [1_000, "Rupees One Thousand Only"],
    [1_500, "Rupees One Thousand Five Hundred Only"],
    [25_000, "Rupees Twenty Five Thousand Only"],
    [75_000, "Rupees Seventy Five Thousand Only"],
    [99_999, "Rupees Ninety Nine Thousand Nine Hundred Ninety Nine Only"],
  ])("writes %i in thousands", (amount, words) => {
    expect(rupeesInWords(amount)).toBe(words);
  });

  it.each([
    [1_00_000, "Rupees One Lakh Only"],
    [1_50_000, "Rupees One Lakh Fifty Thousand Only"],
    // The trap: a lakh with nothing in the thousands place. "One Lakh Five Hundred",
    // not "One Lakh Five Thousand".
    [1_00_500, "Rupees One Lakh Five Hundred Only"],
    [5_00_000, "Rupees Five Lakh Only"],
    [12_34_567, "Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only"],
    [99_99_999, "Rupees Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only"],
  ])("writes %i in lakh, the Indian grouping rather than the international one", (amount, words) => {
    expect(rupeesInWords(amount)).toBe(words);
  });

  it.each([
    [1_00_00_000, "Rupees One Crore Only"],
    [4_50_000, "Rupees Four Lakh Fifty Thousand Only"],
    // A machine value, which is the other place a figure like this shows up.
    [1_01_00_000, "Rupees One Crore One Lakh Only"],
    [10_00_00_000, "Rupees Ten Crore Only"],
    [99_99_99_999, "Rupees Ninety Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only"],
  ])("writes %i in crore", (amount, words) => {
    expect(rupeesInWords(amount)).toBe(words);
  });

  it("never skips a group silently", () => {
    // A zero group must not leave a dangling label, and must not shift the ones below
    // it into the wrong place. "Two Crore Three Hundred", not "Two Crore Three Lakh".
    expect(rupeesInWords(2_00_00_300)).toBe("Rupees Two Crore Three Hundred Only");
    expect(rupeesInWords(2_00_01_000)).toBe("Rupees Two Crore One Thousand Only");
  });

  it("writes zero explicitly rather than returning an empty string", () => {
    // An empty string would render §5.1 as "₹0 - Rupees Only", which reads like a
    // rendering bug and would be argued as one.
    expect(rupeesInWords(0)).toBe("Rupees Zero Only");
  });

  it.each([-1, 50_000.5, Number.NaN, Number.POSITIVE_INFINITY, 1_00_00_00_000])(
    "throws on %s rather than putting a guess in a contract",
    (amount) => {
      expect(() => rupeesInWords(amount)).toThrow(RangeError);
    },
  );
});
