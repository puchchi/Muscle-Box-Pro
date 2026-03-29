import type { Metadata } from "next";
import Account from "@/pages/Account";

export const metadata: Metadata = {
  title: "Account | MuscleBoxPro",
  description: "Manage your MuscleBoxPro account and activity.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/account", title: "Account | MuscleBoxPro", description: "Manage your MuscleBoxPro account and activity." },
};

export default function Page() {
  return <Account />;
}
