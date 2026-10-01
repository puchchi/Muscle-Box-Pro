import Image from "next/image";
import Link from "next/link";

export function readableSn(sn: string | string[] | undefined): string | null {
  const value = Array.isArray(sn) ? sn[0] : sn;
  return value && /^[A-Za-z0-9-]{1,40}$/.test(value) ? value : null;
}

export function ShopHeader({ sn, container = "max-w-7xl px-4 sm:px-6 lg:px-8" }: { sn: string | null; container?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className={`mx-auto flex h-16 ${container} items-center justify-between`}>
        <Link href="/" className="cursor-pointer">
          <Image src="/assets/logo.png" alt="MuscleBoxPro" width={160} height={40} className="h-10 w-auto" priority />
        </Link>
        {sn && (
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-xs text-gray-600" data-testid="shop-sn">
            Machine {sn}
          </span>
        )}
      </div>
    </header>
  );
}
