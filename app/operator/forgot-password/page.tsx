import type { Metadata } from "next";
import { OperatorForgotPassword } from "@/pages/operator/OperatorAuth";

export const metadata: Metadata = {
  title: "Forgot password | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OperatorForgotPassword />;
}
