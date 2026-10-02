import type { Metadata } from "next";
import { DrinkReceipt } from "@/pages/shop/DrinkReceipt";

export const metadata: Metadata = {
  title: "Your order | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DrinkReceipt />;
}
