import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { JoinHolding } from "@/pages/shop/JoinHolding";
import { JoinPage } from "@/pages/shop/JoinPage";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Every 10th Protein Shake Free | Join MuscleBoxPro",
  description: "Sign in with your email and every protein shake you buy on your phone earns a stamp. Your 10th protein shake is free, and your codes never expire.",
  alternates: { canonical: "/join" },
  openGraph: {
    type: "website",
    url: "/join",
    title: "Every 10th Protein Shake Free | MuscleBoxPro",
    description: "Sign in with your email and every protein shake you buy on your phone earns a stamp. Your 10th protein shake is free.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro protein shake stamp card" }],
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  return SHOP_API_BASE_URL ? <JoinPage sn={sn} /> : <JoinHolding sn={sn} />;
}
