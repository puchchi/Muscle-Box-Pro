import type { Metadata } from "next";
import Signup from "@/pages/Signup";

export const metadata: Metadata = {
  title: "Sign Up | Muscle Box Pro",
  description: "Create your Muscle Box Pro account.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Signup />;
}
