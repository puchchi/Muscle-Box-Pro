import type { Metadata } from "next";
import Terms from "@/pages/Terms";

export const metadata: Metadata = {
  title: "Terms & Conditions | Muscle Box Pro",
  description:
    "Read the official terms and conditions for using Muscle Box Pro services and platform features.",
  alternates: { canonical: "/terms" },
  openGraph: { type: "article", url: "/terms" },
};

export default function Page() {
  return <Terms />;
}
