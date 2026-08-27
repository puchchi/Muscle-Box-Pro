import type { Metadata } from "next";
import Invest from "@/pages/Invest";

export const metadata: Metadata = {
  title: "Invest in MuscleBoxPro | BlendBox Innovations LLP",
  description:
    "Join us in reshaping post-workout nutrition. MuscleBoxPro is India's first automated protein shake vending platform for gyms — explore our investment opportunity.",
  alternates: { canonical: "/invest" },
  openGraph: {
    type: "website",
    url: "/invest",
    title: "Invest in MuscleBoxPro | BlendBox Innovations LLP",
    description:
      "Join us in reshaping post-workout nutrition. MuscleBoxPro is India's first automated protein shake vending platform for gyms — explore our investment opportunity.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro smart protein shake vending machine" }],
  },
};

export default function Page() {
  return <Invest />;
}
