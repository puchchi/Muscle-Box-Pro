import type { MetadataRoute } from "next";
import { PAGE_CHANGED_ON, CITY_PAGES_CHANGED_ON } from "@shared/seo/pages";
import { CITY_SLUGS } from "./protein-vending-machine/[city]/page";

/**
 * The sitemap, generated. This replaced a hand-written `public/sitemap.xml`, which had to
 * be deleted rather than left in place — a file in `public/` shadows the route of the same
 * path, so the two cannot coexist and the stale one would win.
 *
 * Two things the static file could not do. The eleven city URLs are derived from
 * `cityConfig`, so a twelfth city is listed by existing rather than by someone
 * remembering. And every `<lastmod>` comes from `@shared/seo/pages`, which is also what
 * the pages themselves publish as `dateModified` in their JSON-LD, so the two cannot
 * disagree.
 *
 * The rewritten shape is what gets listed: `/protein-vending-machine-delhi` is the
 * canonical URL and `/protein-vending-machine/delhi` is the internal route behind the
 * rewrite in `next.config.mjs`. Listing the route would put a URL in the sitemap that
 * every city page's own canonical tag points away from.
 *
 * No `changefreq` and no `priority`. Google ignores both, and inventing values for 37
 * URLs invites treating them as a ranking control.
 */
const BASE_URL = "https://www.muscleboxpro.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = Object.entries(PAGE_CHANGED_ON).map(([path, lastModified]) => ({
    url: path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`,
    lastModified,
  }));

  const cityPages = CITY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/protein-vending-machine-${slug}`,
    lastModified: CITY_PAGES_CHANGED_ON,
  }));

  return [...pages, ...cityPages];
}
