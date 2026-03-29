import type { Metadata } from "next";
import ForgotPassword from "@/pages/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgot Password | MuscleBoxPro",
  description: "Reset your MuscleBoxPro account password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/forgot-password", title: "Forgot Password | MuscleBoxPro", description: "Reset your MuscleBoxPro account password." },
};

export default function Page() {
  return <ForgotPassword />;
}
