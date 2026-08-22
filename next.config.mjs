import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
              "connect-src 'self' https://va.vercel-insights.com https://vitals.vercel-insights.com https://api.indexnow.org https://esyfzbcoufjcnakloahc.supabase.co",
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
