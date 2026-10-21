import type { Metadata } from "next";
import { MachinesSignIn } from "@/pages/operator/OperatorAuth";

export const metadata: Metadata = {
  title: "Sign in | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MachinesSignIn />;
}
