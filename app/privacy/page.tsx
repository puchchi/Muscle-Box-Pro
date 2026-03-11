import type { Metadata } from "next";
import Privacy from "@/pages/Privacy";

export const metadata: Metadata = {
  title: "Privacy Policy | Muscle Box Pro",
  description:
    "Review how Muscle Box Pro collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
  openGraph: { type: "article", url: "/privacy" },
};

export default function Page() {
  return <Privacy />;
}
