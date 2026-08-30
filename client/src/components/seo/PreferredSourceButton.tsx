import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Google's "Add as a preferred source" button.
 *
 * A reader who marks us preferred gets our articles favoured in Top Stories and a "preferred"
 * badge on our results in AI Mode and AI Overviews. It is not a ranking factor and there is no
 * markup for it — the whole feature is one link.
 *
 * **The domain is the entire payload.** Google stores the preference per site and only at
 * domain or subdomain level, never per path, so this button does the same thing wherever it
 * appears and `q` must not grow one.
 *
 * Google also ships a JavaScript widget that renders this button and returns the reader to
 * where they were. It is deliberately not used. It would need `news.google.com` on `script-src`
 * and a `gstatic.com` origin on `img-src` in `next.config.mjs`, where the policy is narrow on
 * purpose, and it would put a third-party script on every article for the sake of a button. The
 * badge below is Google's own asset served from our own origin, so nothing in the CSP moves.
 * What that costs is the return trip, which `target="_blank"` covers instead.
 */

/**
 * Whether Google's source preferences tool knows this site exists.
 *
 * **It does not, as of 2026-08-31.** The tool searches "by name or website" and both were tried:
 * `muscleboxpro.com` and `MuscleBoxPro` each return "No results" at
 * `google.com/preferences/source`. That page's own footnote gives the reason: "Sources that are
 * not updated regularly may be unavailable." Five evergreen posts and no publishing cadence is
 * not a source, as far as this feature is concerned. So this is not a spelling to fix — the site
 * is absent from the index behind the tool, and only publishing changes that.
 *
 * So the button renders nothing. A Google-branded badge that lands a reader on an empty search
 * is worse than no badge: they conclude the site is broken, or that we are not really in Google,
 * and either way we spent our credibility on a link that could not work. Same failure as the
 * password reset page that confirmed emails it never sent — see `GymForgotPassword`.
 *
 * **To turn it on:** search for the site in the tool. If it appears, set this to `true` and make
 * `PREFERRED_SOURCE_QUERY` below match whatever the tool actually matched on, which may be the
 * brand name rather than the domain. Nothing else needs to change; the six placements are wired.
 */
export const PREFERRED_SOURCE_LISTED = false;

/** What the tool searches on. The domain, unless Google lists us under the brand name instead. */
const PREFERRED_SOURCE_QUERY = "muscleboxpro.com";

const PREFERRED_SOURCE_URL = `https://www.google.com/preferences/source?q=${PREFERRED_SOURCE_QUERY}`;

/**
 * Google's badge, unmodified, in the two themes it ships in. Sized from the `@2x` originals so
 * `next/image` has something to downscale from and a retina screen gets the sharp one.
 */
const BADGE_WIDTH = 190;
const BADGE_HEIGHT = 60;

type PreferredSourceProps = {
  theme?: "light" | "dark";
  className?: string;
};

export default function PreferredSourceButton(props: PreferredSourceProps) {
  if (!PREFERRED_SOURCE_LISTED) return null;
  return <PreferredSourceCard {...props} />;
}

/**
 * The markup, separately callable so the tests can hold it to its contract without depending on
 * whether Google happens to list us today.
 */
export function PreferredSourceCard({ theme = "light", className }: PreferredSourceProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl border p-7",
        isDark ? "bg-gray-900 border-white/10" : "bg-gray-50 border-gray-100",
        className,
      )}
      data-testid="preferred-source"
    >
      <p
        className={cn(
          "font-bold mb-2 text-sm uppercase tracking-wider",
          isDark ? "text-white" : "text-gray-900",
        )}
      >
        Prefer our articles?
      </p>
      <p
        className={cn(
          "text-sm leading-relaxed mb-5",
          isDark ? "text-white/50" : "text-gray-600",
        )}
      >
        Tell Google you want more of them. Adding MuscleBoxPro as a preferred source gives our
        articles more weight in what Google shows you. You can undo it any time.
      </p>
      <a
        href={PREFERRED_SOURCE_URL}
        target="_blank"
        rel="noopener"
        className="inline-block rounded-lg cursor-pointer opacity-100 hover:opacity-80 transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        data-testid="link-preferred-source"
      >
        <Image
          src={isDark ? "/assets/google/preferred-source-dark.png" : "/assets/google/preferred-source-light.png"}
          alt="Add as a preferred source on Google"
          width={BADGE_WIDTH}
          height={BADGE_HEIGHT}
        />
      </a>
    </div>
  );
}
