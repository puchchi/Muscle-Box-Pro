import type { Metadata } from "next";
import Account from "@/pages/Account";

export const metadata: Metadata = {
  title: "Account | MuscleBoxPro",
  description: "Manage your MuscleBoxPro account and activity.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Account />;
}
