import type { Metadata } from "next";
import AuthCallback from "@/pages/AuthCallback";

export const metadata: Metadata = {
  title: "Authentication Callback | Muscle Box Pro",
  description: "Completing authentication for Muscle Box Pro.",
  alternates: { canonical: "/auth/callback" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <AuthCallback />;
}
