import type { Metadata } from "next";
import GymProteinShakeMachine from "@/pages/GymProtienShakeMachine";

export const metadata: Metadata = {
  title: "Gym Protein Shake Machine | Muscle Box Pro",
  description:
    "Discover how Muscle Box Pro gym protein shake machines help gyms increase member convenience and generate additional recurring revenue.",
  alternates: { canonical: "/gym-protein-shake-machine" },
  openGraph: { type: "website", url: "/gym-protein-shake-machine" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
    { "@type": "ListItem", position: 2, name: "Gym Protein Shake Machine", item: "https://www.muscleboxpro.com/gym-protein-shake-machine" },
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "MuscleBoxPro Gym Protein Shake Machine",
  description:
    "Automated gym protein shake machine that blends fresh whey and plant protein shakes in 60 seconds. Zero staff, 24/7 operation, cashless payments.",
  brand: { "@type": "Brand", name: "Muscle Box Pro" },
  manufacturer: { "@type": "Organization", name: "BlendBox Innovations LLP" },
  image: "https://www.muscleboxpro.com/og-image.png",
  url: "https://www.muscleboxpro.com/gym-protein-shake-machine",
  category: "Fitness Equipment > Vending Machines > Protein Shake Machines",
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: "Muscle Box Pro" },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a gym protein shake machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A gym protein shake machine is an automated vending unit installed on the gym floor that blends fresh protein shakes using whey isolate or plant protein in 60 seconds without any staff involvement.",
      },
    },
    {
      "@type": "Question",
      name: "How much space does a gym protein shake machine need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MuscleBoxPro machines require less than 10 square feet of floor space, making them suitable for gyms of all sizes.",
      },
    },
    {
      "@type": "Question",
      name: "Does a gym protein shake machine require staff to operate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The machine is fully automated and handles blending, payment processing, and self-cleaning cycles without any staff involvement.",
      },
    },
    {
      "@type": "Question",
      name: "How much revenue can a gym earn from a protein shake machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gyms typically enjoy 50%+ gross margins per shake. With shakes priced between ₹75–₹140 and costs of ₹45–₹70 per serve, machines can generate significant passive income 24/7.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <GymProteinShakeMachine />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
