import type { Metadata } from "next";
import Login from "@/pages/Login";

export const metadata: Metadata = {
  title: "Login | MuscleBoxPro",
  description: "Sign in to your MuscleBoxPro account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Login />;
}
