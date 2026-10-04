import type { Metadata } from "next";
import { SHOP_API_BASE_URL } from "@/lib/shopApi";
import { JoinHolding } from "@/pages/shop/JoinHolding";
import { JoinPage } from "@/pages/shop/JoinPage";
import { readableSn } from "@/pages/shop/ShopHolding";
import { OG_IMAGE_URL, webPageSchemas } from "@shared/seo/webPage";

const title = "Every 10th Protein Shake Free | Join MuscleBoxPro";
const description =
  "Sign in with your email and every protein shake you buy on your phone earns a stamp. Your 10th protein shake is free, and your codes never expire.";
const shareTitle = "Every 10th Protein Shake Free | MuscleBoxPro";
const shareDescription = "Sign in with your email and every protein shake you buy on your phone earns a stamp. Your 10th protein shake is free.";
const image = { url: OG_IMAGE_URL, width: 1200, height: 800, alt: "MuscleBoxPro protein shake stamp card" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/join" },
  openGraph: { type: "website", url: "/join", title: shareTitle, description: shareDescription, images: [image] },
  twitter: { card: "summary_large_image", title: shareTitle, description: shareDescription, images: [image] },
};

const schemas = webPageSchemas({ path: "/join", crumb: "Join", title, description, imageAlt: image.alt });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sn = readableSn((await searchParams).sn);
  return (
    <>
      {schemas.map((schema) => (
        <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      {SHOP_API_BASE_URL ? <JoinPage sn={sn} /> : <JoinHolding sn={sn} />}
    </>
  );
}
