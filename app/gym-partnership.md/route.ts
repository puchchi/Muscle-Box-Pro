import { gymPartnershipMarkdown } from "@shared/seo/llmDocs";

/**
 * `/gym-partnership.md`, the plain-text alternate of `/gym-partnership`.
 *
 * A route rather than a file in `public/` so the terms are generated from
 * `shared/partnership/summary.ts` on every build. See the header of `shared/seo/llmDocs.ts`
 * for why that is the load-bearing part.
 *
 * Nothing crawls for a `.md` suffix on its own. It is reachable because `app/llms.txt` lists
 * it and because the page advertises it as `rel="alternate"` in `app/gym-partnership/page.tsx`.
 * Remove either and this becomes an unreferenced URL.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(gymPartnershipMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
