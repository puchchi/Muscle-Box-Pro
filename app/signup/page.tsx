import type { Metadata } from "next";
import Signup from "@/pages/Signup";

export const metadata: Metadata = {
  title: "Sign Up | MuscleBoxPro",
  description: "Create your MuscleBoxPro account.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Signup />;
}
