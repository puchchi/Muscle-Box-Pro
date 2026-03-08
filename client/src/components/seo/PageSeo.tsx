import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.muscleboxpro.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
  ogType?: "website" | "article";
};

const pageSeoMap: Record<string, SeoConfig> = {
  "/": {
    title: "Muscle Box Pro | Smart Protein Shake Vending Machines for Gyms",
    description:
      "Muscle Box Pro provides smart protein shake vending machines for gyms with zero-maintenance operations, fresh post-workout nutrition for members, and recurring revenue for gym owners.",
    canonicalPath: "/",
    ogType: "website",
  },
  "/gym-demo": {
    title: "Gym Demo | Muscle Box Pro",
    description:
      "See how Muscle Box Pro works inside gyms and how smart shake vending improves member experience and boosts recurring revenue.",
    canonicalPath: "/gym-demo",
    ogType: "website",
  },
  "/specs": {
    title: "Machine Specifications | Muscle Box Pro",
    description:
      "Explore the technical specifications and capabilities of Muscle Box Pro smart protein shake vending machines for modern gyms.",
    canonicalPath: "/specs",
    ogType: "website",
  },
  "/advertise": {
    title: "Advertise With Muscle Box Pro",
    description:
      "Reach health-focused gym audiences through high-visibility digital ad placements on Muscle Box Pro smart vending screens.",
    canonicalPath: "/advertise",
    ogType: "website",
  },
  "/about": {
    title: "About Us | Muscle Box Pro",
    description:
      "Learn about Muscle Box Pro and our mission to deliver on-demand post-workout nutrition through smart gym vending technology.",
    canonicalPath: "/about",
    ogType: "website",
  },
  "/contact": {
    title: "Contact Us | Muscle Box Pro",
    description:
      "Contact Muscle Box Pro for partnerships, machine placement, support, and business inquiries.",
    canonicalPath: "/contact",
    ogType: "website",
  },
  "/help": {
    title: "Help Center | Muscle Box Pro",
    description:
      "Find answers to common questions about Muscle Box Pro accounts, machines, billing, and support.",
    canonicalPath: "/help",
    ogType: "website",
  },
  "/terms": {
    title: "Terms & Conditions | Muscle Box Pro",
    description:
      "Read the official terms and conditions for using Muscle Box Pro services and platform features.",
    canonicalPath: "/terms",
    ogType: "article",
  },
  "/privacy": {
    title: "Privacy Policy | Muscle Box Pro",
    description:
      "Review how Muscle Box Pro collects, uses, and protects your personal information.",
    canonicalPath: "/privacy",
    ogType: "article",
  },
  "/refund-cancellation": {
    title: "Refund & Cancellation Policy | Muscle Box Pro",
    description:
      "Understand Muscle Box Pro refund and cancellation terms, timelines, and support process.",
    canonicalPath: "/refund-cancellation",
    ogType: "article",
  },
  "/login": {
    title: "Login | Muscle Box Pro",
    description: "Sign in to your Muscle Box Pro account.",
    canonicalPath: "/login",
    noindex: true,
  },
  "/signup": {
    title: "Sign Up | Muscle Box Pro",
    description: "Create your Muscle Box Pro account.",
    canonicalPath: "/signup",
    noindex: true,
  },
  "/forgot-password": {
    title: "Forgot Password | Muscle Box Pro",
    description: "Reset your Muscle Box Pro account password.",
    canonicalPath: "/forgot-password",
    noindex: true,
  },
  "/account": {
    title: "Account | Muscle Box Pro",
    description: "Manage your Muscle Box Pro account and activity.",
    canonicalPath: "/account",
    noindex: true,
  },
  "/auth/callback": {
    title: "Authentication Callback | Muscle Box Pro",
    description: "Completing authentication for Muscle Box Pro.",
    canonicalPath: "/auth/callback",
    noindex: true,
  },
};

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function getSeoForPath(pathname: string): SeoConfig {
  const normalizedPath = normalizePath(pathname);
  return (
    pageSeoMap[normalizedPath] ?? {
      title: "Page Not Found | Muscle Box Pro",
      description:
        "The page you are looking for could not be found. Visit Muscle Box Pro to explore our smart gym vending solutions.",
      canonicalPath: normalizedPath,
      noindex: true,
      ogType: "website",
    }
  );
}

export default function PageSeo({ pathname }: { pathname: string }) {
  const seo = getSeoForPath(pathname);
  const canonicalUrl = `${SITE_URL}${seo.canonicalPath}`;
  const robotsValue = seo.noindex ? "noindex, follow" : "index, follow";

  return (
    <Helmet prioritizeSeoTags>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="robots" content={robotsValue} />
      <meta name="googlebot" content={robotsValue} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content="Muscle Box Pro" />
      <meta property="og:type" content={seo.ogType ?? "website"} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta property="og:image:alt" content="Muscle Box Pro smart protein shake vending machine in a gym" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
      <meta name="twitter:image:alt" content="Muscle Box Pro smart protein shake vending machine in a gym" />
    </Helmet>
  );
}
