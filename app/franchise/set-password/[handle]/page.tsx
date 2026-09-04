import type { Metadata } from "next";
import FranchiseSetPassword from "@/pages/franchise/FranchiseSetPassword";

/**
 * The landing route for an emailed set-password link.
 *
 * The gym's equivalent explains the two rules this shares: the handle is a path segment because
 * a credential in a query string is archived by every access log it passes, and `follow: false`
 * matters as much as `index: false` because these handles are single-use and a crawler that
 * opens one has spent it before the franchisee clicks.
 *
 * Unlike `/gym/`, `/franchise/` is **not** blanket-disallowed in `public/robots.txt` — the bare
 * `/franchise` page is marketing and has to stay crawlable. So this path is listed there
 * explicitly.
 */
export const metadata: Metadata = {
  title: "Set your portal password | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <FranchiseSetPassword handle={handle} />;
}
