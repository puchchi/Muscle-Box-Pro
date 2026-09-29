import type { Order } from "@shared/admin/machinesSchema";

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

export const UNKNOWN_HINT = "The machine never reported the result within 10 minutes.";
