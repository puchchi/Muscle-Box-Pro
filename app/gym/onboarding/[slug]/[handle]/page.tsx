import type { Metadata } from "next";
import OnboardingFlow from "@/pages/onboarding/OnboardingFlow";

/**
 * One route for the whole five-step flow. The step lives in the database, not the path, so
 * the emailed link never goes stale — see docs/gym-onboarding.md §4.
 *
 * **Two segments, and only one of them is a credential.** `handle` is a 128-bit opaque
 * token, the sole thing that authorises this page; `slug` is the gym's name, present so the
 * link a person receives reads as theirs —
 * `muscleboxpro.com/gym/onboarding/iron-temple-fitness/3f7c…` rather than a bare hex string
 * after a path nobody recognises. A link that looks like a phishing URL does not get clicked,
 * and this flow lives or dies on being clicked.
 *
 * The slug is **not checked against the handle here, and must not be.** The server resolves
 * the gym from `sha256(handle)` and nothing else. A browser comparing the two would be
 * validating its own credential against a hint it was handed in the same URL, which proves
 * nothing — and if the check ever *failed* for a legitimate gym whose trade name changed
 * between invite and click, it would lock a partner out of onboarding over cosmetics.
 *
 * **Under `/gym/` deliberately.** `public/robots.txt` already disallows that whole prefix, so
 * the credential-bearing path is covered by the existing rule rather than by a new one
 * somebody has to remember to add. `noindex, nofollow` below is the firmer version of the
 * same instruction: robots.txt is a request, and `follow: false` matters more than usual
 * here — a crawler that follows this link is a crawler that has opened someone's agreement
 * and recorded its first-open telemetry.
 *
 * The handle also stays out of the referrer on the way to Razorpay in step 4. That is
 * `Referrer-Policy` in `next.config.mjs` — global `strict-origin-when-cross-origin`, plus
 * `no-referrer` scoped to this route.
 */
export const metadata: Metadata = {
  title: "Your MuscleBoxPro partnership | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; handle: string }>;
}) {
  const { handle } = await params;
  return <OnboardingFlow token={handle} />;
}
