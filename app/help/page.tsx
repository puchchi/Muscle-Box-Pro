import type { Metadata } from "next";
import HelpCenter from "@/pages/HelpCenter";

export const metadata: Metadata = {
  title: "Help Center | Muscle Box Pro",
  description:
    "Find answers to common questions about Muscle Box Pro accounts, machines, billing, and support.",
  alternates: { canonical: "/help" },
  openGraph: { type: "website", url: "/help" },
};

export default function Page() {
  return <HelpCenter />;
}
