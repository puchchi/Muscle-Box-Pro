import type { Metadata } from "next";
import RefundCancellation from "@/pages/RefundCancellation";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Muscle Box Pro",
  description:
    "Understand Muscle Box Pro refund and cancellation terms, timelines, and support process.",
  alternates: { canonical: "/refund-cancellation" },
  openGraph: { type: "article", url: "/refund-cancellation" },
};

export default function Page() {
  return <RefundCancellation />;
}
