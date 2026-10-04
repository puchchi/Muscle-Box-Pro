import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { ACCOUNT_COPY } from "./shopCopy";

export function readableSn(sn: string | string[] | undefined): string | null {
  const value = Array.isArray(sn) ? sn[0] : sn;
  return value && /^[A-Za-z0-9-]{1,40}$/.test(value) ? value : null;
}

export function ShopHeader({
  sn,
  container = "max-w-7xl px-4 sm:px-6 lg:px-8",
  children,
}: {
  sn: string | null;
  container?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className={`mx-auto flex h-16 ${container} items-center justify-between`}>
        <Link href="/" className="cursor-pointer">
          <Image src="/assets/logo.png" alt="MuscleBoxPro" width={160} height={40} className="h-10 w-auto" priority />
        </Link>
        <div className="flex items-center gap-2">
          {sn && (
            <span className="hidden rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-xs text-gray-600 sm:inline" data-testid="shop-sn">
              Machine {sn}
            </span>
          )}
          {children}
        </div>
      </div>
    </header>
  );
}

export function accountHref(sn: string | null): string {
  return sn ? `/drinks/account?sn=${encodeURIComponent(sn)}` : "/drinks/account";
}

export function AccountLink({ sn, signedIn }: { sn: string | null; signedIn: boolean }) {
  return (
    <Link
      href={accountHref(sn)}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="shop-account-link"
    >
      <UserRound className="h-4 w-4" aria-hidden />
      {signedIn ? ACCOUNT_COPY.account : ACCOUNT_COPY.signInTitle}
    </Link>
  );
}
