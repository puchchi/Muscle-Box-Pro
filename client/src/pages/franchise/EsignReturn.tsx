"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markReturnedFromEsign, takeEsignReturnTo } from "@/lib/esignReturn";

/**
 * Where Digio sends a signatory once the signing session ends.
 *
 * `DepositReturn` with a different third party, and the same three properties.
 *
 * A doormat, not a destination: it recovers the onboarding path this tab stashed on the way out and
 * replaces itself with the wizard, which reads the signature from our own record. The route exists
 * because the redirect URL is registered with Digio when the eSign request is created, so it must
 * not contain the handle — see [esignReturn.ts](../../lib/esignReturn.ts).
 *
 * **It reads none of the query string.** Digio appends its own identifiers and a status, and a page
 * that believed any of it would be a way to mark a ₹25 lakh term sheet signed by editing a URL. The
 * webhook is the only thing that may do that (docs/franchise-onboarding.md §6.4). Arriving here
 * means a person came back, which is not the same as a document being signed — the session may have
 * been abandoned, and step 7 is built to show that honestly.
 *
 * **The no-storage case is not an error.** Digio can email the signatory directly, so the person who
 * signs may never have had this flow open: a company secretary finishing an Aadhaar eSign on their
 * own phone lands here in a browser that never held the path. It cannot be handed the wizard,
 * because identifying the franchise would mean putting a credential in a URL a third party stores.
 */
export default function EsignReturn() {
  const router = useRouter();
  const [stranded, setStranded] = useState(false);

  useEffect(() => {
    const returnTo = takeEsignReturnTo();
    if (!returnTo) {
      setStranded(true);
      return;
    }
    markReturnedFromEsign();
    // `replace`, so Back from the wizard does not land here and bounce forward again.
    router.replace(returnTo);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
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
            data-testid="esign-return-standalone"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-display font-black text-foreground uppercase tracking-tight mb-2">
              Thank you. We're recording it
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Signatures are recorded from the signing provider rather than from this page, which
              takes a few seconds and needs nothing further from you. The signed copy goes to the
              franchise's notices email as soon as it completes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              To carry on with the onboarding, open the link from our email. This page can't tell
              which franchise you signed for, on purpose. That identifier is never handed to the
              signing provider.
            </p>
            <Button
              asChild
              variant="outline"
              className="min-h-11 w-full rounded-xl font-semibold text-sm mt-6 cursor-pointer"
              data-testid="button-esign-return-help"
            >
              <a href="mailto:contact@muscleboxpro.com">Email us about this signature</a>
            </Button>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            role="status"
            data-testid="esign-return-bouncing"
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  Taking you back to your onboarding
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  One moment. We'll confirm the signature from our own record once you're there.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
