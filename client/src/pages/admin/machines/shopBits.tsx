import Link from "next/link";
import type { ShopAdminStatus, ShopCustomerRow } from "@shared/admin/shopAdminSchema";
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

export function CustomerCell({ customerId, customer }: { customerId: string | null; customer?: ShopCustomerRow }) {
  if (!customerId) return <span className="text-muted-foreground">Guest</span>;
  if (!customer) {
    return (
      <Link href={customerHref(customerId)} className="font-mono text-xs text-primary hover:underline">
        {customerId}
      </Link>
    );
  }
  return (
    <span className="block">
      <Link href={customerHref(customerId)} className="text-primary hover:underline" data-testid={`customer-email-${customerId}`}>
        {customer.email ?? "Deleted account"}
      </Link>
      <span className="block font-mono text-xs text-muted-foreground">{customerId}</span>
    </span>
  );
}

export const FREE_LABEL = { text: "Free code", className: "bg-fuchsia-400/10 text-fuchsia-200" };
