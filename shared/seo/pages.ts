/**
 * The date the content of each indexable page last changed.
 *
 * One table, two consumers: `app/sitemap.ts` emits it as `<lastmod>`, and a page that
 * carries `WebPage` JSON-LD emits its own entry as `dateModified`. That single source is
 * the point — a page reporting one date in the sitemap and a different one in its own
 * markup is worse than reporting neither.
 *
 * These are **content** dates. Bump one when the words or the figures on that page
 * change; leave it alone for a restyle or a redeploy. A sitemap that reports every URL
 * as modified on every deploy is a sitemap Google stops believing.
 *
 * `next.config.mjs` keeps a third URL list, for its IndexNow ping. That one cannot be
 * fed from here — a `.mjs` config cannot import TypeScript — so it stays manual.
 */
export const PAGE_CHANGED_ON = {
  "/": "2026-08-27",
  "/gym-demo": "2026-03-28",
  "/gym-partnership": "2026-08-27",
  "/franchise": "2026-08-28",
  "/specs": "2026-03-28",
  "/advertise": "2026-03-28",
  "/protein-shake-vending-machine": "2026-03-28",
  "/gym-protein-shake-machine": "2026-03-28",
  "/protein-vending-machine-india": "2026-03-28",
  "/menu": "2026-03-28",
  "/about": "2026-03-28",
  "/contact": "2026-03-28",
  "/help": "2026-03-28",
  "/blog": "2026-03-28",
  "/blog/why-gyms-need-vending-machines": "2026-03-28",
  "/blog/best-protein-shake-after-workout": "2026-03-28",
  "/blog/protein-for-diabetes": "2026-03-28",
  "/blog/gym-member-retention": "2026-03-29",
  "/blog/how-i-fixed-my-hba1c": "2026-04-03",
  "/vs/protein-shake-bar": "2026-03-29",
  "/vs/supplement-counter": "2026-03-29",
  "/alternatives/gym-revenue-ideas": "2026-03-29",
  "/invest": "2026-04-19",
  "/terms": "2026-02-26",
  "/privacy": "2026-02-26",
  "/refund-cancellation": "2026-02-26",
} as const;

/**
 * The eleven city pages share one date because they share one `cityConfig` object in
 * `app/protein-vending-machine/[city]/page.tsx` — editing it edits all of them, so
 * per-city dates would be eleven copies of the same fact.
 */
export const CITY_PAGES_CHANGED_ON = "2026-03-28";

export type IndexablePath = keyof typeof PAGE_CHANGED_ON;
