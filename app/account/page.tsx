import type { Metadata } from "next";
import Account from "@/pages/Account";

export const metadata: Metadata = {
  title: "Account | Muscle Box Pro",
  description: "Manage your Muscle Box Pro account and activity.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Account />;
}
