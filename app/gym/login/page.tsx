import type { Metadata } from "next";
import GymLogin from "@/pages/gym/GymLogin";

export const metadata: Metadata = {
  title: "Partner Login | MuscleBoxPro",
  description: "Sign in to your MuscleBoxPro gym partner portal.",
  alternates: { canonical: "/gym/login" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/gym/login", title: "Partner Login | MuscleBoxPro", description: "Sign in to your MuscleBoxPro gym partner portal." },
};

export default function Page() {
  return <GymLogin />;
}
