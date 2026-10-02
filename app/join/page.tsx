import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { JoinHolding } from "@/pages/shop/JoinHolding";
import { JoinPage } from "@/pages/shop/JoinPage";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Join MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  return SHOP_API_BASE_URL ? <JoinPage sn={sn} /> : <JoinHolding sn={sn} />;
}
