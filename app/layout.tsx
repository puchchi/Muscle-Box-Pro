import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});
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
    "MuscleBoxPro is a smart protein shake vending machine for gyms. Install a Muscle Box Pro at your fitness centre — serve fresh protein blends in 60 seconds and generate passive revenue with zero staff or maintenance.",
  keywords: [
    "protein shake vending machine",
    "gym vending machine",
    "smart vending machine for gyms",
    "gym owner revenue",
    "automated fitness vending",
    "post workout protein shakes",
    "MuscleBoxPro",
  ],
  authors: [{ name: "MuscleBoxPro" }],
  icons: { icon: "/favicon.png" },
  openGraph: {
    siteName: "MuscleBoxPro",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        alt: "MuscleBoxPro smart protein shake vending machine in a gym",
      },
    ],
    description:
    "Discover MuscleBoxPro, the premium protein shake vending machine designed to boost gym revenue with zero maintenance and high-resolution advertising displays.",
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og-image.png",
        alt: "MuscleBoxPro smart protein shake vending machine in a gym",
      },
    ],
  },
  other: {
    "theme-color": "#ffffff",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://www.muscleboxpro.com/#organization",
              name: "MuscleBoxPro",
              legalName: "BlendBox Innovations LLP",
              url: "https://www.muscleboxpro.com",
              logo: {
                "@type": "ImageObject",
                url: "https://www.muscleboxpro.com/favicon.png",
                width: 507,
                height: 520,
              },
              description:
                "Smart protein shake vending machines for gyms with zero-maintenance operations and recurring revenue. Operating across India.",
              email: "contact@muscleboxpro.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Sector 75",
                addressLocality: "Noida",
                postalCode: "201301",
                addressRegion: "Uttar Pradesh",
                addressCountry: "IN",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "contact@muscleboxpro.com",
                availableLanguage: ["English", "Hindi"],
              },
              sameAs: [
                "https://www.instagram.com/muscleboxpro",
                "https://www.linkedin.com/company/muscleboxpro",
                "https://maps.app.goo.gl/ERqXE85LfseUMBQ6A",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              "@id": "https://www.muscleboxpro.com/#localbusiness",
              name: "MuscleBoxPro",
              description:
                "Automated protein shake vending machines installed in gyms and fitness centers across India.",
              url: "https://www.muscleboxpro.com",
              email: "contact@muscleboxpro.com",
              image: "https://www.muscleboxpro.com/og-image.png",
              priceRange: "₹₹",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Sector 75",
                addressLocality: "Noida",
                postalCode: "201301",
                addressRegion: "Uttar Pradesh",
                addressCountry: "IN",
              },
              areaServed: [
                "Delhi", "Mumbai", "Bangalore", "Hyderabad",
                "Pune", "Chennai", "Ahmedabad", "Kolkata",
                "Chandigarh", "Gurgaon", "Noida",
              ],
              openingHours: "Mo-Su 00:00-23:59",
              sameAs: [
                "https://maps.app.goo.gl/ERqXE85LfseUMBQ6A",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://www.muscleboxpro.com/#website",
              name: "MuscleBoxPro",
              url: "https://www.muscleboxpro.com",
            }),
          }}
        />
      </head>
      <body className={plusJakartaSans.variable}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
