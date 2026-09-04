import { franchiseMarkdown } from "@shared/seo/llmDocs";

/**
 * `/franchise.md`, the plain-text alternate of `/franchise`. See
 * `app/gym-partnership.md/route.ts` for why this is a route and not a static file.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(franchiseMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
