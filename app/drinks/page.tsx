import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { DrinksShop } from "@/pages/shop/DrinksShop";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "How to Buy a Protein Shake | MuscleBoxPro",
  description: "Buy a fresh protein shake at a MuscleBoxPro machine in about a minute. Pay with any UPI app, or type a code on the machine. No account needed.",
  alternates: { canonical: "/drinks" },
  openGraph: {
    type: "website",
    url: "/drinks",
    title: "How to Buy a Protein Shake | MuscleBoxPro",
    description: "Buy a fresh protein shake at a MuscleBoxPro machine in about a minute. Pay with any UPI app, or type a code on the machine.",
    images: [{ url: "https://www.muscleboxpro.com/og-image.jpg", width: 1200, height: 800, alt: "MuscleBoxPro protein shake vending machine" }],
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  if (sn && SHOP_API_BASE_URL) return <DrinksShop sn={sn} />;
  return <DrinksHolding sn={sn} live={Boolean(SHOP_API_BASE_URL)} />;
}
