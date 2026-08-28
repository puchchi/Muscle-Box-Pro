import type { Metadata } from "next";
import GymSetPassword from "@/pages/gym/GymSetPassword";

/**
 * The landing route for a relayed set-password link.
 *
 * The handle is a path segment rather than `?handle=` because a credential in a query string
 * is archived by every access log it passes and travels in `document.referrer` to anything
 * this page links out to. `Referrer-Policy: no-referrer` is scoped to `/gym/set-password/` in
 * `next.config.mjs` for the second half of that, and `noindex, nofollow` below for the
 * crawler that follows a link out of a forwarded email — `follow: false` matters as much as
 * `index: false` here, because these handles are single-use and a crawler that opens one has
 * spent it before the gym owner clicks.
 *
 * `/gym/` also puts it inside the `Disallow: /gym/` already in `public/robots.txt`.
 */
export const metadata: Metadata = {
  title: "Set your portal password | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <GymSetPassword handle={handle} />;
}
