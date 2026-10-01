import type { Metadata } from "next";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Get Drinks | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sn } = await searchParams;
  return <DrinksHolding sn={readableSn(sn)} />;
}
