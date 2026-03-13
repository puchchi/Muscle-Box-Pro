import type { Metadata } from "next";
import BlogWhyGymVending from "@/pages/BlogWhyGymVending";

export const metadata: Metadata = {
  title: "Why Every Gym Should Install a Protein Shake Vending Machine | Muscle Box Pro",
  description: "Discover why protein shake vending machines are becoming the most profitable and member-retaining asset for modern gyms.",
  alternates: { canonical: "/blog/why-gyms-need-vending-machines" },
  openGraph: { type: "website", url: "/blog/why-gyms-need-vending-machines" },
};

export default function Page() {
  return <BlogWhyGymVending />;
}
