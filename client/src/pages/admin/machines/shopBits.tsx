import Link from "next/link";
import type { ShopAdminStatus } from "@shared/admin/shopAdminSchema";
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

export function CustomerCell({ customerId }: { customerId: string | null }) {
  if (!customerId) return <span className="text-muted-foreground">Guest</span>;
  return (
    <Link href={customerHref(customerId)} className="font-mono text-xs text-primary hover:underline">
      {customerId}
    </Link>
  );
}
