import type { Metadata } from "next";
import { MachinesForgotPassword } from "@/pages/operator/OperatorAuth";

export const metadata: Metadata = {
  title: "Forgot password | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MachinesForgotPassword />;
}
