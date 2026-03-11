import type { Metadata } from "next";
import Advertiser from "@/pages/Advertiser";

export const metadata: Metadata = {
  title: "Advertise With Muscle Box Pro",
  description:
    "Reach health-focused gym audiences through high-visibility digital ad placements on Muscle Box Pro smart vending screens.",
  alternates: { canonical: "/advertise" },
  openGraph: { type: "website", url: "/advertise" },
};

export default function Page() {
  return <Advertiser />;
}
