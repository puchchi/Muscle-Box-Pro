import type { Metadata } from "next";
import FranchiseForgotPassword from "@/pages/franchise/FranchiseForgotPassword";

export const metadata: Metadata = {
  title: "Reset Password | MuscleBoxPro Franchise",
  description: "Reset the password for your MuscleBoxPro franchise portal.",
  alternates: { canonical: "/franchise/forgot-password" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/franchise/forgot-password", title: "Reset Password | MuscleBoxPro Franchise", description: "Reset the password for your MuscleBoxPro franchise portal." },
};

export default function Page() {
  return <FranchiseForgotPassword />;
}
