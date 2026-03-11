import type { Metadata } from "next";
import ForgotPassword from "@/pages/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgot Password | Muscle Box Pro",
  description: "Reset your Muscle Box Pro account password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ForgotPassword />;
}
