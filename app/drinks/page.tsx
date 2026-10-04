import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { DrinksShop } from "@/pages/shop/DrinksShop";
import { readableSn } from "@/pages/shop/ShopHolding";
import { OG_IMAGE_URL, webPageSchemas } from "@shared/seo/webPage";

const title = "How to Buy a Protein Shake | MuscleBoxPro";
const description =
  "Buy a fresh protein shake at a MuscleBoxPro machine in about a minute. Pay with any UPI app, or type a code on the machine. No account needed.";
const shareDescription = "Buy a fresh protein shake at a MuscleBoxPro machine in about a minute. Pay with any UPI app, or type a code on the machine.";
const image = { url: OG_IMAGE_URL, width: 1200, height: 800, alt: "MuscleBoxPro protein shake vending machine" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/drinks" },
  openGraph: { type: "website", url: "/drinks", title, description: shareDescription, images: [image] },
  twitter: { card: "summary_large_image", title, description: shareDescription, images: [image] },
};

const schemas = webPageSchemas({ path: "/drinks", crumb: "Buy a Shake", title, description, imageAlt: image.alt });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  return (
    <>
      {schemas.map((schema) => (
        <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      {sn && SHOP_API_BASE_URL ? <DrinksShop sn={sn} /> : <DrinksHolding sn={sn} live={Boolean(SHOP_API_BASE_URL)} />}
    </>
  );
}
