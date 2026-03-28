import type { Metadata } from "next";
import ProteinShakeVendingMachine from "@/pages/ProtienShakeVendingMachine";

export const metadata: Metadata = {
  title: "Protein Shake Vending Machine | Muscle Box Pro",
  description:
    "Discover how Muscle Box Pro protein shake vending machines help gyms increase member convenience and generate additional recurring revenue.",
  alternates: { canonical: "/protein-shake-vending-machine" },
  openGraph: { type: "website", url: "/protein-shake-vending-machine" },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "MuscleBoxPro Protein Shake Vending Machine",
  description:
    "Smart protein shake vending machine for gyms. Blends fresh whey or plant protein shakes in under 45 seconds with cashless payments and zero staff overhead.",
  brand: { "@type": "Brand", name: "Muscle Box Pro" },
  manufacturer: { "@type": "Organization", name: "BlendBox Innovations LLP" },
  image: "https://www.muscleboxpro.com/og-image.png",
  url: "https://www.muscleboxpro.com/protein-shake-vending-machine",
  category: "Fitness Equipment > Vending Machines > Protein Shake Machines",
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    price: "0",
    url: "https://www.muscleboxpro.com/protein-shake-vending-machine",
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
      name: "What is a protein shake vending machine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A protein shake vending machine is an automated unit that blends fresh protein shakes on-demand using whey isolate or plant protein, water or milk, and optional flavour add-ons — without any staff involvement.",
      },
    },
    {
      "@type": "Question",
      name: "How fast does the protein shake vending machine prepare a shake?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MuscleBoxPro machines prepare a freshly blended protein shake in 30–45 seconds from ingredient selection to dispensing.",
      },
    },
    {
      "@type": "Question",
      name: "Which payment methods does the machine support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The machine supports UPI, PhonePe, debit cards, credit cards, and other popular digital payment options. No cash handling required.",
      },
    },
    {
      "@type": "Question",
      name: "Can the machine be installed in any gym in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. MuscleBoxPro supports installations across major Indian cities including Delhi, Mumbai, Bangalore, Hyderabad, Pune, Chennai, Ahmedabad, Kolkata, Chandigarh, Gurgaon, and Noida.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <ProteinShakeVendingMachine />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
