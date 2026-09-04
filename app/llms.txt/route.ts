import { llmsTxt } from "@shared/seo/llmsTxt";
import { CITY_NAMES } from "../protein-vending-machine/[city]/page";

/**
 * `/llms.txt`, generated. `public/llms.txt` was deleted when this landed, because a file in
 * `public/` shadows the route of the same path.
 *
 * The city list comes from `cityConfig` for the same reason `app/sitemap.ts` takes it from
 * there: a twelfth city then appears here by existing rather than by someone remembering.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(CITY_NAMES), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
