import type { Metadata } from "next";
import Login from "@/pages/Login";

export const metadata: Metadata = {
  title: "Login | Muscle Box Pro",
  description: "Sign in to your Muscle Box Pro account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Login />;
}
