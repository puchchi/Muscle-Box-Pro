import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { DrinksShop } from "@/pages/shop/DrinksShop";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Get Drinks | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  if (sn && SHOP_API_BASE_URL) return <DrinksShop sn={sn} />;
  return <DrinksHolding sn={sn} />;
}
