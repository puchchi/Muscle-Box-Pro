import type { Metadata } from "next";
import DepositReturn from "@/pages/gym/DepositReturn";

/**
 * The `callback_url` on every deposit Payment Link.
 *
 * A fixed path with no gym in it: the URL is registered with Razorpay when the link is
 * created, so anything identifying in it would be stored by a third party — and the
 * onboarding handle is a 30-day credential. The tab that left for the gateway is what
 * remembers where to go back to. See docs/gym-onboarding.md §25.
 *
 * `noindex, nofollow` because Razorpay appends payment identifiers to it on the way back, and
 * `/gym/` is already `Disallow`ed in `public/robots.txt`.
 */
export const metadata: Metadata = {
  title: "Confirming your deposit | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DepositReturn />;
}
