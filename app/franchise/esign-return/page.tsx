import type { Metadata } from "next";
import EsignReturn from "@/pages/franchise/EsignReturn";

/**
 * The redirect URL registered with Digio for every term sheet eSign request.
 *
 * A fixed path with no franchise in it: the URL is handed to Digio when the request is created, so
 * anything identifying in it would be stored by a third party, and the onboarding handle is a
 * long-lived credential. The tab that left for Digio is what remembers where to go back to. See
 * docs/franchise-onboarding.md §6.4.
 *
 * `noindex, nofollow` because Digio appends its own identifiers on the way back, and this path is
 * `Disallow`ed by name in `public/robots.txt` — `/franchise/` itself is indexed, so it does not
 * inherit a rule the way `/gym/` does.
 */
export const metadata: Metadata = {
  title: "Recording your signature | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <EsignReturn />;
}
