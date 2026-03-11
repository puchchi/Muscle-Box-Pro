import type { Metadata } from "next";
import AboutUs from "@/pages/AboutUs";

export const metadata: Metadata = {
  title: "About Us | Muscle Box Pro",
  description:
    "Learn about Muscle Box Pro and our mission to deliver on-demand post-workout nutrition through smart gym vending technology.",
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: "/about" },
};

export default function Page() {
  return <AboutUs />;
}
