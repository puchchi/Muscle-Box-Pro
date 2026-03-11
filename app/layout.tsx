import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "@/components/Providers";
import "@/index.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.muscleboxpro.com"),
  title: {
    default: "Protein Shake Vending Machine for Gyms | Automated Protein Shake Blend Machine | MuscleBoxPro",
    template: "%s",
  },
  description:
    "MuscleBoxPro is a smart protein shake vending machine for gyms. Serve fresh protein shake blends in 30 seconds and generate passive revenue for fitness centers with automated protein vending technology.",
  keywords: [
    "protein shake vending machine",
    "gym vending machine",
    "smart vending machine for gyms",
    "gym owner revenue",
    "automated fitness vending",
    "post workout protein shakes",
    "Muscle Box Pro",
  ],
  authors: [{ name: "Muscle Box Pro" }],
  icons: { icon: "/favicon.png" },
  openGraph: {
    siteName: "Muscle Box Pro",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        alt: "Muscle Box Pro smart protein shake vending machine in a gym",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og-image.png",
        alt: "Muscle Box Pro smart protein shake vending machine in a gym",
      },
    ],
  },
  other: {
    "theme-color": "#0a0a0a",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Russo+One&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Muscle Box Pro",
              url: "https://www.muscleboxpro.com",
              logo: "https://www.muscleboxpro.com/favicon.png",
              description:
                "Smart protein shake vending machines for gyms with zero-maintenance operations and recurring revenue.",
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Muscle Box Pro",
              url: "https://www.muscleboxpro.com",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  "https://www.muscleboxpro.com/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
