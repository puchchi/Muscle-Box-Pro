import type { Order, OrderDetail } from "@shared/admin/machinesSchema";

export const PAY_METHOD_LABEL: Record<Order["payMethod"], string> = {
  free: "Free",
  redeem: "Redeem code",
  qr: "QR payment",
};

export const STATUS_LABEL: Record<Order["status"], string> = {
  created: "Created",
  unknown: "Unknown",
  made: "Made",
  failed: "Failed",
};

export const STATUS_CLASS: Record<Order["status"], string> = {
  created: "text-foreground",
  unknown: "text-muted-foreground",
  made: "text-emerald-200",
  failed: "text-rose-300",
};

export const STATUS_PILL_CLASS: Record<Order["status"], string> = {
  created: "bg-sky-400/10 text-sky-200",
  unknown: "bg-secondary text-muted-foreground",
  made: "bg-emerald-400/10 text-emerald-200",
  failed: "bg-rose-400/10 text-rose-300",
};

export const UNKNOWN_HINT = "The machine never reported the result within 10 minutes.";

type RefundState = NonNullable<NonNullable<OrderDetail["payment"]>["refund"]>;

export const REFUND_LABEL: Record<RefundState, string> = {
  requested: "Refund requested",
  pending: "Refund in progress",
  refunded: "Refunded",
};

export const REFUND_PILL_CLASS: Record<RefundState, string> = {
  requested: "bg-amber-400/10 text-amber-200",
  pending: "bg-amber-400/10 text-amber-200",
  refunded: "bg-emerald-400/10 text-emerald-200",
};
