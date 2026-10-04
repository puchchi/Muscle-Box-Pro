import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { DrinkAccount } from "@/pages/shop/DrinkAccount";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Your account | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  if (!SHOP_API_BASE_URL) return <DrinksHolding sn={sn} />;
  return <DrinkAccount sn={sn} />;
}
