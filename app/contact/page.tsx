import type { Metadata } from "next";
import ContactUs from "@/pages/ContactUs";

export const metadata: Metadata = {
  title: "Contact Us | Muscle Box Pro",
  description:
    "Contact Muscle Box Pro for partnerships, machine placement, support, and business inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", url: "/contact" },
};

export default function Page() {
  return <ContactUs />;
}
