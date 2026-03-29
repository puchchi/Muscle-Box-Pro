import type { Metadata } from "next";
import AuthCallback from "@/pages/AuthCallback";

export const metadata: Metadata = {
  title: "Authentication Callback | MuscleBoxPro",
  description: "Completing authentication for MuscleBoxPro.",
  alternates: { canonical: "/auth/callback" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <AuthCallback />;
}
