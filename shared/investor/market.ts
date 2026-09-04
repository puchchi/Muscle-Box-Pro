/**
 * The market figures the investor pitch rests on.
 *
 * Extracted because /invest and /about both state them. Two pages quoting different
 * numbers at the same investor is the one inconsistency here that costs a conversation,
 * so there is one place to change them and one place to check them against a source.
 */

export type MarketStat = {
  value: string;
  label: string;
  /** What the figure measures, since "75,000+" alone does not say. */
  note: string;
};

export const INVESTOR_MARKET = {
  gyms: { value: "75,000+", label: "Gyms in India", note: "Addressable market" },
  growth: { value: "16–18%", label: "Annual growth", note: "Indian fitness industry" },
  tam: { value: "₹1,100 Cr+", label: "Annual TAM", note: "Gym nutrition spend" },
} as const satisfies Record<string, MarketStat>;

/** Display order, which is the order the argument runs in: size, then rate, then value. */
export const INVESTOR_MARKET_STATS: readonly MarketStat[] = [
  INVESTOR_MARKET.gyms,
  INVESTOR_MARKET.growth,
  INVESTOR_MARKET.tam,
];
