import type { Metadata } from "next";
import { OperatorSetPassword } from "@/pages/operator/OperatorAuth";

// A crawler that follows the link spends the single-use handle before the operator does.
export const metadata: Metadata = {
  title: "Choose a password | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <OperatorSetPassword handle={handle} />;
}
