import type { Metadata } from "next";
import BlogBestProteinShake from "@/pages/BlogBestProteinShake";

export const metadata: Metadata = {
  title: "The Best Protein Shake After a Workout: Whey vs. Plant | Muscle Box Pro",
  description: "Discover the science behind the best post-workout protein shakes. Compare whey and plant protein to find the perfect recovery drink.",
  alternates: { canonical: "/blog/best-protein-shake-after-workout" },
  openGraph: { type: "website", url: "/blog/best-protein-shake-after-workout" },
};

export default function Page() {
  return <BlogBestProteinShake />;
}
