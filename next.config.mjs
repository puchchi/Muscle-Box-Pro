import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Every origin the browser is allowed to open a connection to.
 *
 * Named and listed one per line because this is an allowlist that fails **in production
 * only** — `next dev` does not apply these headers the same way, so a missing host is
 * invisible until deploy. This repo has been bitten by exactly that.
 *
 * **`https://api.muscleboxpro.com` is a specific host, not a stand-in for "the API".** The
 * onboarding and reporting endpoints are called straight from the browser, and the custom
 * domain is what makes that safe rather than merely tidy: `www.muscleboxpro.com` and
 * `api.muscleboxpro.com` share one registrable domain, so the session cookies are
 * same-*site* and `SameSite=Lax` keeps its CSRF protection. Behind an
 * `execute-api.<region>.amazonaws.com` URL the requests are cross-site, the cookies would
 * need `SameSite=None`, and that protection is gone. So an `amazonaws.com` entry appearing
 * in this list is not routine housekeeping — it means something bypassed the domain that is
 * doing the security work. See `mbp-backend` docs/gym-onboarding-api-design.md §4.2.
 *
 * An earlier version of this comment said the browser would never connect to AWS at all,
 * because the design of the day put a Supabase edge function in front as a BFF. That design
 * is gone: there is no service secret to hide any more — the browser sends a cookie the API
 * issued, and the API resolves the gym from it — so the hop bought a second trust boundary
 * and nothing else.
 */
const CONNECT_SRC = [
  "'self'",
  "https://va.vercel-insights.com",
  "https://vitals.vercel-insights.com",
  "https://api.indexnow.org",
  // The onboarding wizard and the gym dashboard. Cookie-authenticated, same-site, and the
  // reason `NEXT_PUBLIC_MBP_API_URL` should stay on this host — see above.
  "https://api.muscleboxpro.com",
  // Supabase auth, still carrying the gym login until it moves onto the cookie sessions
  // above (TODO A2). Nothing else in the app depends on this origin any more.
  "https://esyfzbcoufjcnakloahc.supabase.co",
];

const INDEXNOW_KEY = "a3f7b2e8d4c1f9a6b5e0d7c3f2a8b1e4";
const INDEXNOW_URLS = [
  "https://www.muscleboxpro.com/",
  "https://www.muscleboxpro.com/gym-demo",
  "https://www.muscleboxpro.com/gym-partnership",
  "https://www.muscleboxpro.com/specs",
  "https://www.muscleboxpro.com/advertise",
  "https://www.muscleboxpro.com/menu",
  "https://www.muscleboxpro.com/about",
  "https://www.muscleboxpro.com/contact",
  "https://www.muscleboxpro.com/protein-shake-vending-machine",
  "https://www.muscleboxpro.com/gym-protein-shake-machine",
  "https://www.muscleboxpro.com/protein-vending-machine-india",
  "https://www.muscleboxpro.com/protein-vending-machine-delhi",
  "https://www.muscleboxpro.com/protein-vending-machine-mumbai",
  "https://www.muscleboxpro.com/protein-vending-machine-bangalore",
  "https://www.muscleboxpro.com/protein-vending-machine-hyderabad",
  "https://www.muscleboxpro.com/protein-vending-machine-pune",
  "https://www.muscleboxpro.com/protein-vending-machine-chennai",
  "https://www.muscleboxpro.com/protein-vending-machine-ahmedabad",
  "https://www.muscleboxpro.com/protein-vending-machine-kolkata",
  "https://www.muscleboxpro.com/protein-vending-machine-chandigarh",
  "https://www.muscleboxpro.com/protein-vending-machine-gurgaon",
  "https://www.muscleboxpro.com/protein-vending-machine-noida",
  "https://www.muscleboxpro.com/blog/why-gyms-need-vending-machines",
  "https://www.muscleboxpro.com/blog/best-protein-shake-after-workout",
  "https://www.muscleboxpro.com/blog/protein-for-diabetes",
  "https://www.muscleboxpro.com/blog/gym-member-retention",
  "https://www.muscleboxpro.com/blog",
  "https://www.muscleboxpro.com/vs/protein-shake-bar",
  "https://www.muscleboxpro.com/vs/supplement-counter",
  "https://www.muscleboxpro.com/alternatives/gym-revenue-ideas",
];

class IndexNowPlugin {
  apply(compiler) {
    compiler.hooks.done.tapAsync("IndexNowPlugin", async (stats, callback) => {
      if (process.env.NODE_ENV !== "production" || stats.hasErrors()) {
        return callback();
      }
      try {
        const res = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            host: "www.muscleboxpro.com",
            key: INDEXNOW_KEY,
            keyLocation: `https://www.muscleboxpro.com/${INDEXNOW_KEY}.txt`,
            urlList: INDEXNOW_URLS,
          }),
        });
        console.log(`IndexNow ping: ${res.status}`);
      } catch (err) {
        console.warn("IndexNow ping failed:", err.message);
      }
      callback();
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async redirects() {
    return [
      {
        source: "/protein-vending-machine/:city",
        destination: "/protein-vending-machine-:city",
        permanent: true,
      },
      // Consumer auth was removed in favour of the gym partner portal.
      // See docs/gym-onboarding.md §9. There is no gym signup: portal accounts
      // are created by the onboarding flow, so /signup goes to lead capture.
      { source: "/login", destination: "/gym/login", permanent: true },
      { source: "/account", destination: "/gym/dashboard", permanent: true },
      { source: "/forgot-password", destination: "/gym/forgot-password", permanent: true },
      { source: "/signup", destination: "/gym-demo", permanent: true },
      // The onboarding link moved under `/gym/` and gained a name segment, so that the URL
      // a gym owner receives reads as theirs and so that robots.txt's existing `/gym/`
      // rule covers it. `permanent: false`: no invite was ever minted at the old shape, so
      // this is a courtesy for a pasted dev link rather than a URL with history to
      // preserve, and a 308 cached in a browser would outlive the reason for it.
      {
        source: "/onboarding/:handle",
        destination: "/gym/onboarding/link/:handle",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/protein-vending-machine-:city",
        destination: "/protein-vending-machine/:city",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-insights.com https://vitals.vercel-insights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src ${CONNECT_SRC.join(" ")}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // The two routes that carry a live credential in the URL, so they get the strictest
      // referrer policy we have. The global `strict-origin-when-cross-origin` above already
      // strips the path — and therefore the handle — before it reaches Razorpay in step 4 of
      // onboarding, which is why `mbp-backend` §4.3 records that leak as closed rather than
      // open. `no-referrer` here is the belt-and-braces version: it also withholds the bare
      // origin, and it survives a future relaxation of the global default by someone who has
      // not read this comment.
      //
      // Listed after the `/(.*)` block on purpose. Next applies every matching rule in order
      // and a later `Referrer-Policy` wins, so moving these above it silently disables them.
      {
        source: "/gym/onboarding/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // A relayed set-password link. Single-use, so a referrer leak here is worse than the
        // onboarding one in a specific way: whoever receives it can spend the link before the
        // gym owner does, and the gym owner then sees "already used" on a link they never got
        // to click.
        source: "/gym/set-password/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "client/src");
    config.resolve.alias["@shared"] = path.resolve(__dirname, "shared");
    if (!isServer) config.plugins.push(new IndexNowPlugin());
    return config;
  },
};

export default nextConfig;
