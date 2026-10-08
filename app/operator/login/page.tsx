import type { Metadata } from "next";
import { OperatorLogin } from "@/pages/operator/OperatorAuth";

export const metadata: Metadata = {
  title: "Operator sign in | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OperatorLogin />;
}
