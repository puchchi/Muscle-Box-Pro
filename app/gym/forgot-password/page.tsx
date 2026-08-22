import type { Metadata } from "next";
import GymForgotPassword from "@/pages/gym/GymForgotPassword";

export const metadata: Metadata = {
  title: "Reset Password | MuscleBoxPro",
  description: "Reset the password for your MuscleBoxPro gym partner portal.",
  alternates: { canonical: "/gym/forgot-password" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/gym/forgot-password", title: "Reset Password | MuscleBoxPro", description: "Reset the password for your MuscleBoxPro gym partner portal." },
};

export default function Page() {
  return <GymForgotPassword />;
}
