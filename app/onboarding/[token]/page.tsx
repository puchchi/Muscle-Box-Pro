import type { Metadata } from "next";
import OnboardingFlow from "@/pages/onboarding/OnboardingFlow";

/**
 * One route for the whole five-step flow. The step lives in the database, not the
 * path, so the emailed link never goes stale — see docs/gym-onboarding.md §4.
 *
 * `follow: false` as well as `index: false`, unlike the rest of the private routes:
 * the token *is* the credential, so a crawler that follows it is a crawler that has
 * opened someone's agreement. `public/robots.txt` already disallows `/onboarding/`,
 * but robots.txt is a request and a meta tag is a slightly firmer one.
 */
export const metadata: Metadata = {
  title: "Your MuscleBoxPro partnership | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OnboardingFlow token={token} />;
}
