import type { Metadata } from "next";
import { JoinHolding } from "@/pages/shop/JoinHolding";
import { readableSn } from "@/pages/shop/ShopHolding";

export const metadata: Metadata = {
  title: "Join MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sn } = await searchParams;
  return <JoinHolding sn={readableSn(sn)} />;
}
