import type { Metadata } from "next";
import BlogProteinDiabetes from "@/pages/BlogProteinDiabetes";

export const metadata: Metadata = {
  title: "Why Protein Is Important for Diabetes Management | Health & Nutrition",
  description: "Discover how protein helps control blood sugar, the best protein sources for diabetes, and why it's a crucial part of diabetes management.",
  alternates: { canonical: "/blog/protein-for-diabetes" },
  openGraph: { type: "website", url: "/blog/protein-for-diabetes" },
};

export default function Page() {
  return <BlogProteinDiabetes />;
}
