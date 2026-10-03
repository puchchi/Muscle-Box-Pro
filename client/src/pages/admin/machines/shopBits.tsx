import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ListFilter } from "lucide-react";
import type { ShopAdminStatus, ShopCustomerDetail } from "@shared/admin/shopAdminSchema";
import { Pill } from "../AdminUi";
import { WarningPanel } from "./WarningPanel";
import { SHOP_STATUS_LABEL } from "./shopOrderRules";

export function ShopNotConfigured() {
  return (
    <WarningPanel testId="shop-admin-off">
      The shop admin API isn&apos;t set up for this build. Set NEXT_PUBLIC_MBP_SHOP_ADMIN_API_URL and restart the site.
    </WarningPanel>
  );
}

export function ShopStatusPill({ status, testId }: { status: ShopAdminStatus; testId?: string }) {
  const label = SHOP_STATUS_LABEL[status];
  return (
    <Pill className={label.className} testId={testId}>
      {label.text}
    </Pill>
  );
}

export const shopOrderHref = (id: string) => `/machines/shop-orders/${encodeURIComponent(id)}`;
export function shopOrderOfCode(shopOrderId: string): string | null {
  if (shopOrderId.startsWith("reward:")) return null;
  const reissue = /^reissue:(.+):\d+$/.exec(shopOrderId);
  return reissue ? reissue[1]! : shopOrderId;
}

export const customerHref = (id: string) => `/machines/customers/${encodeURIComponent(id)}`;

export type CustomerLookup = ShopCustomerDetail | null | undefined;

const customerLabel = (customerId: string, lookup: ShopCustomerDetail | null) => (lookup === null ? customerId : (lookup.customer.email ?? "Deleted account"));

export function CustomerCell({ customerId, lookup, onOnly }: { customerId: string | null; lookup: CustomerLookup; onOnly?: () => void }) {
  if (!customerId) return <span className="text-muted-foreground">Guest</span>;
  if (lookup === undefined) {
    return <span className="block h-4 w-44 animate-pulse rounded bg-secondary motion-reduce:animate-none" role="status" aria-label="Loading customer" />;
  }
  const label = customerLabel(customerId, lookup);
  const deleted = lookup !== null && lookup.customer.email === null;
  return (
    <span className="flex items-center gap-1">
      <Link
        href={customerHref(customerId)}
        title={label === customerId ? customerId : `${label}\n${customerId}`}
        className={`min-w-0 max-w-[14rem] truncate hover:text-primary hover:underline ${lookup === null ? "font-mono text-xs" : ""} ${deleted ? "text-muted-foreground" : "text-foreground"}`}
        data-testid={`customer-email-${customerId}`}
      >
        {label}
      </Link>
      {onOnly && (
        <button
          type="button"
          onClick={onOnly}
          aria-label={`Show only orders from ${label}`}
          title="Show only this customer's orders"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition duration-150 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          data-testid={`customer-only-${customerId}`}
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

export function CustomerDetailCell({ customerId, lookup }: { customerId: string | null; lookup: CustomerLookup }) {
  const email = lookup?.customer.email ?? null;
  if (!customerId || lookup === undefined) return <CustomerCell customerId={customerId} lookup={lookup} />;
  return (
    <span className="block">
      <span className="flex items-center gap-1.5">
        <Link href={customerHref(customerId)} className="min-w-0 break-all text-primary hover:underline" data-testid={`customer-email-${customerId}`}>
          {customerLabel(customerId, lookup)}
        </Link>
        {email && <CopyText text={email} label="Copy email" />}
      </span>
      {lookup !== null && <span className="block font-mono text-xs text-muted-foreground">{customerId}</span>}
    </span>
  );
}

function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => undefined)}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="copy-customer-email"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

export const FREE_LABEL = { text: "Free code", className: "bg-fuchsia-400/10 text-fuchsia-200" };
