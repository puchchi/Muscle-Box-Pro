"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markReturnedFromGateway, takeReturnTo } from "@/lib/depositReturn";

/**
 * Where Razorpay sends a gym after it has paid the deposit.
 *
 * A doormat, not a destination: it recovers the onboarding path this tab stashed on the way
 * out and replaces itself with the wizard, which picks the payment up from our own record.
 * The route exists at all because the return URL is handed to Razorpay at link creation and
 * therefore must not contain the handle — see [depositReturn.ts](../../lib/depositReturn.ts).
 *
 * **It reads none of the query string.** Razorpay appends `razorpay_payment_id`,
 * `razorpay_payment_link_status` and a signature, and a page that believed any of it would be
 * a way to mark a deposit paid by editing a URL. The webhook is the only source of paid truth
 * (§5), so what arrives here is treated as a person coming back, nothing more.
 *
 * **The no-storage case is not an error.** A gym whose accountant paid from the forwarded link
 * lands here in a browser that never held the path — the link is deliberately usable by
 * someone who is not the signatory, so this is a supported ending rather than a failure. It
 * cannot be handed the wizard, because identifying the gym would mean putting a credential in
 * the callback URL, which is the thing this route is shaped to avoid.
 */
export default function DepositReturn() {
  const router = useRouter();
  const [stranded, setStranded] = useState(false);

  useEffect(() => {
    const returnTo = takeReturnTo();
    if (!returnTo) {
      setStranded(true);
      return;
    }
    markReturnedFromGateway();
    // `replace`, so Back from the wizard does not land on this page and bounce forward again.
    router.replace(returnTo);
  }, [router]);

  return (
    <div className="theme-console min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/assets/logo.png"
              alt="MuscleBoxPro"
              width={140}
              height={36}
              priority
              className="h-9 w-auto mx-auto cursor-pointer"
            />
          </Link>
        </div>

        {stranded ? (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            data-testid="deposit-return-standalone"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-display font-black text-foreground uppercase tracking-tight mb-2">
              Thank you. We're confirming it
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payments are confirmed from our own records rather than from this page, which takes a
              few seconds and needs nothing further from you. The receipt goes to the gym's notices
              email as soon as it clears.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              To carry on with the onboarding, open the link from our email. This page can't tell
              which gym you're paying for, on purpose. That identifier is never handed to the
              payment provider.
            </p>
            <Button
              asChild
              variant="outline"
              className="min-h-11 w-full rounded-xl font-semibold text-sm mt-6 cursor-pointer"
              data-testid="button-deposit-return-help"
            >
              <a href="mailto:contact@muscleboxpro.com">Email us about this payment</a>
            </Button>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            role="status"
            data-testid="deposit-return-bouncing"
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Taking you back to your onboarding</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  One moment. We'll confirm the payment from our own records once you're there.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
