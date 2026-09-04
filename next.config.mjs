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
 * need `SameSite=None`, and that protection is gone. So an `execute-api` entry appearing in
 * this list is not routine housekeeping — it means something bypassed the domain that is
 * doing the security work. See `mbp-backend` docs/gym-onboarding-api-design.md §4.2. The one
 * `amazonaws.com` host that is *not* that is the documents bucket, for the reasons at
 * `franchiseDocsOrigin()`: nothing cookie-authenticated ever goes there.
 *
 * An earlier version of this comment said the browser would never connect to AWS at all,
 * because the design of the day put a Supabase edge function in front as a BFF. That design
 * is gone: there is no service secret to hide any more — the browser sends a cookie the API
 * issued, and the API resolves the gym from it — so the hop bought a second trust boundary
 * and nothing else.
 */
const PRODUCTION_API_ORIGIN = "https://api.muscleboxpro.com";

function originOf(configured) {
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    // Unparseable is a misconfiguration, and the safe reading of one is "allow nothing extra".
    return null;
  }
}

/**
 * The non-production API origins to allow, empty in production.
 *
 * The sandbox stack answers on `https://6t9q5v5v97.execute-api.ap-south-1.amazonaws.com/sandbox`
 * and a browser has to reach it to test the integration at all. Rather than adding that host
 * to the list above — where it would ship to production and quietly widen the CSP for every
 * real visitor — it is **derived from the API origins this build was configured with.** So the
 * entry exists exactly where the requests do:
 *
 *   - Env unset, or set to the production host → empty. Production's `connect-src` contains
 *     no `amazonaws.com` entry, which is the property `securityHeaders.test.ts` pins.
 *   - Env set to the sandbox → those origins, and nothing else, are allowed.
 *
 * There are three because there are three stacks, and in production all three are one origin
 * mapped at `/`, `/franchise` and `/franchise-wizard`. Off that domain they are three unrelated
 * API Gateway ids, so a franchise origin cannot be derived from the onboarding one and has to be
 * named. **Both franchise entries are gated on the onboarding build being non-production**, so a
 * production build allows nothing extra whatever those two variables are left set to.
 *
 * `NEXT_PUBLIC_*` is read at build time, so this is decided when the bundle is built and
 * cannot be flipped by a runtime variable. It is the same rule as `BEARER_SESSION_ALLOWED`
 * in `client/src/lib/apiClient.ts`, restated because a `.mjs` config cannot import from TS —
 * and tied to it by the test that asserts this list contains `MBP_API_BASE_URL`'s origin.
 *
 * Loosening the CSP is not the dangerous part of pointing a build at `execute-api`; losing
 * `SameSite=Lax` is, and that is why the bearer hatch is confined to the same condition.
 */
function nonProductionApiOrigins() {
  const onboarding = originOf(process.env.NEXT_PUBLIC_MBP_API_URL);
  if (onboarding === null || onboarding === PRODUCTION_API_ORIGIN) return [];
  const franchise = [
    originOf(process.env.NEXT_PUBLIC_MBP_FRANCHISE_API_URL),
    originOf(process.env.NEXT_PUBLIC_MBP_FRANCHISE_WIZARD_API_URL),
  ].filter((origin) => origin !== null && origin !== PRODUCTION_API_ORIGIN);
  return [...new Set([onboarding, ...franchise])];
}

const NON_PRODUCTION_API_ORIGINS = nonProductionApiOrigins();

/**
 * The franchise documents bucket, which a browser `PUT`s identity documents straight into.
 *
 * **Not gated on the environment, unlike everything above**, and the difference is the point. A
 * presigned `PUT` goes to S3 by definition — the bytes deliberately never pass through a Lambda, so
 * an Aadhaar scan is never in a function's memory or an access log — and there is therefore no
 * version of this that routes through `api.muscleboxpro.com`. Production needs the entry as much as
 * the sandbox does.
 *
 * It does not trade away what the entries above are guarding. The upload sends
 * `credentials: "omit"` and S3 refuses a credentialed cross-origin request anyway, so no session
 * cookie reaches this host and no `SameSite` promise is involved. The signature is the whole
 * authorisation, and it expires in five minutes.
 *
 * The bucket is `mbp-franchise-docs-<env>-<account>`, so this cannot be derived: the account id is
 * not something the frontend knows. Hence a variable — and hence the shape check, because this is
 * the one entry a *production* build can add, and a mistyped value must widen nothing rather than
 * allow some other host. `ap-south-1` is pinned because both environments pin that region.
 */
function franchiseDocsOrigin() {
  const origin = originOf(process.env.NEXT_PUBLIC_MBP_FRANCHISE_DOCS_ORIGIN);
  if (origin === null) return [];
  const { protocol, hostname } = new URL(origin);
  const ours = /^mbp-franchise-docs-[a-z0-9-]+\.s3\.ap-south-1\.amazonaws\.com$/.test(hostname);
  return protocol === "https:" && ours ? [origin] : [];
}

const FRANCHISE_DOCS_ORIGIN = franchiseDocsOrigin();

const CONNECT_SRC = [
  "'self'",
  "https://va.vercel-insights.com",
  "https://vitals.vercel-insights.com",
  "https://api.indexnow.org",
  // The onboarding wizard and the gym dashboard. Cookie-authenticated, same-site, and the
  // reason `NEXT_PUBLIC_MBP_API_URL` should stay on this host in production — see above.
  PRODUCTION_API_ORIGIN,
  // Supabase auth, still carrying the gym login until it moves onto the cookie sessions
  // above (TODO A2). Nothing else in the app depends on this origin any more.
  "https://esyfzbcoufjcnakloahc.supabase.co",
  ...NON_PRODUCTION_API_ORIGINS,
  ...FRANCHISE_DOCS_ORIGIN,
];

const INDEXNOW_KEY = "a3f7b2e8d4c1f9a6b5e0d7c3f2a8b1e4";

/*
 * Must stay in step with `PAGE_CHANGED_ON` and `CITY_SLUGS` in shared/seo/pages.ts, which
 * is what `app/sitemap.ts` publishes. It cannot import them: this is a `.mjs` config, so
 * a TypeScript module is not loadable from here, and that is why the two lists are
 * hand-kept. Seven URLs had already drifted out of this one, including /franchise.
 *
 * A page missing here still gets crawled. It just does not get the push, so Bing and
 * Yandex find the change whenever they next come round instead of on deploy.
 */
const INDEXNOW_URLS = [
  "https://www.muscleboxpro.com/",
  "https://www.muscleboxpro.com/gym-demo",
  "https://www.muscleboxpro.com/gym-partnership",
  "https://www.muscleboxpro.com/franchise",
  "https://www.muscleboxpro.com/invest",
  "https://www.muscleboxpro.com/specs",
  "https://www.muscleboxpro.com/advertise",
  "https://www.muscleboxpro.com/menu",
  "https://www.muscleboxpro.com/about",
  "https://www.muscleboxpro.com/contact",
  "https://www.muscleboxpro.com/help",
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
  "https://www.muscleboxpro.com/blog/how-i-fixed-my-hba1c",
  "https://www.muscleboxpro.com/blog",
  "https://www.muscleboxpro.com/vs/protein-shake-bar",
  "https://www.muscleboxpro.com/vs/supplement-counter",
  "https://www.muscleboxpro.com/alternatives/gym-revenue-ideas",
  "https://www.muscleboxpro.com/terms",
  "https://www.muscleboxpro.com/privacy",
  "https://www.muscleboxpro.com/refund-cancellation",
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
      // The routes that carry a live credential in the URL, so they get the strictest
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
      {
        // Franchise onboarding, whose step 7 leaves for Leegality. The handle in this path is the
        // credential for a flow that signs a ₹25 lakh term sheet, and the thing it would leak to
        // is a signing session in a named person's identity.
        //
        // Load-bearing as of the e-sign routes going in, not theoretical: step 7 navigates this tab
        // to `*.leegality.com` with `window.location.assign`, and the URL it leaves is
        // `/franchise/onboarding/<slug>/<handle>`. Without this header the 30-day handle arrives at
        // a third party in a `Referer`, which is the same leak `mbp-backend` §4.3 refuses to put in
        // an access log.
        source: "/franchise/onboarding/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // Leegality's return path. It carries no handle by design, but it does carry Leegality's own
        // request identifiers, and it is the one page in this flow whose next navigation is
        // back into a credential-bearing URL.
        source: "/franchise/esign-return",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // An emailed franchise set-password link, with the gym set-password page's reasoning: the
        // handle is single-use, so whoever receives a leaked referrer can spend it before the
        // franchisee does, and the franchisee then reads "already used" on a link they never
        // got to click.
        source: "/franchise/set-password/:path*",
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
