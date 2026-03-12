import type { Metadata } from "next";
import Home from "@/pages/Home";

export const metadata: Metadata = {
  title:
    "Protein Shake Vending Machine for Gyms | Automated Protein Shake Blend Machine | MuscleBoxPro",
  description:
    "MuscleBoxPro is a smart protein shake vending machine for gyms. Serve fresh protein shake blends in 30 seconds and generate passive revenue for fitness centers with automated protein vending technology.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title:
      "Protein Shake Vending Machine for Gyms | Automated Protein Shake Blend Machine | MuscleBoxPro",
    description:
      "Discover Muscle Box Pro, the premium protein shake vending machine designed to boost gym revenue with zero maintenance and high-resolution advertising displays.",
    images: [
      {
        url: "/og-image.png",
        alt: "Muscle Box Pro smart protein shake vending machine in a gym",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Protein Shake Vending Machine for Gyms | Automated Protein Shake Blend Machine | MuscleBoxPro",
    description:
      "Serve fresh protein shakes automatically and create passive gym revenue with MuscleBoxPro.",
    images: ["/og-image.png"],
  },
};

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Protein Shake Vending Machine for Gyms | MuscleBoxPro",
  url: "https://www.muscleboxpro.com/",
  description:
    "Automated protein shake vending machines for gyms and fitness centers.",
  inLanguage: "en",
};

const homeServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Protein Shake Vending Machine for Gyms",
  provider: {
    "@type": "Organization",
    name: "Muscle Box Pro",
    url: "https://www.muscleboxpro.com",
  },
  serviceType: "Automated protein vending machine solution for gyms",
  areaServed: [
    "India",
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Hyderabad",
    "Pune",
    "Chennai",
    "Ahmedabad",
    "Kolkata",
    "Chandigarh",
    "Gurgaon",
    "Noida",
  ],
  description:
    "Smart protein shake vending machine system for gyms with automated blending, cashless payments, and recurring revenue support.",
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a protein shake vending machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A protein shake vending machine automatically blends whey protein, fruits, and liquids to prepare fresh post-workout shakes in seconds.",
      },
    },
    {
      "@type": "Question",
      name: "Why should gyms install a protein vending machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gyms install protein vending machines to provide instant post-workout nutrition, improve member convenience, and create an additional revenue stream.",
      },
    },
    {
      "@type": "Question",
      name: "How does MuscleBoxPro support gym owners?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MuscleBoxPro provides an automated protein vending solution with hygienic blending, cashless payments, and support for operations and servicing.",
      },
    },
    {
      "@type": "Question",
      name: "Can protein vending machines be installed across India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. MuscleBoxPro supports gym deployments across major Indian cities including Delhi, Mumbai, Bangalore, Hyderabad, Pune, Chennai, Ahmedabad, Kolkata, Chandigarh, Gurgaon, and Noida.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <Home />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeServiceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />
    </>
  );
}
