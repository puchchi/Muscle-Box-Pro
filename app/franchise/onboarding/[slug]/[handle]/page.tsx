import type { Metadata } from "next";
import FranchiseOnboardingFlow from "@/pages/franchise/onboarding/FranchiseOnboardingFlow";

/**
 * One route for the whole nine-step flow. The step lives in the database, not the path, so the
 * emailed link never goes stale, and this one is followed for weeks rather than days: approval
 * sits between steps 3 and 4 and is somebody else's working day.
 *
 * The two segments, the slug not being checked against the handle, and `noindex, nofollow` are all
 * the gym route's reasoning, which holds here unchanged — see
 * [the gym shell](../../../../gym/onboarding/[slug]/[handle]/page.tsx). `handle` is the credential;
 * `slug` exists so the link reads as the franchisee's own.
 *
 * **Under `/franchise/`, which is indexed.** Unlike `/gym/`, this prefix has a public page on it,
 * so `public/robots.txt` disallows `/franchise/onboarding/` specifically rather than the whole
 * branch. Two rules to keep in step instead of one: whoever adds a route under here that carries a
 * handle adds the `Disallow` too.
 *
 * The handle stays out of the referrer on the way to Digio in step 7. That is `Referrer-Policy` in
 * `next.config.mjs` — global `strict-origin-when-cross-origin`, plus `no-referrer` scoped to this
 * route. It matters more here than for a payment link: the URL this leaves for authorises an eSign
 * in a named person's identity.
 */
export const metadata: Metadata = {
  title: "Your MuscleBoxPro franchise | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; handle: string }>;
}) {
  const { handle } = await params;
  return <FranchiseOnboardingFlow handle={handle} />;
}
