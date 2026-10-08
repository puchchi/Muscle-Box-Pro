import * as z from "zod";

// mbp-backend services/machine/src/admin/lib/permissions.ts, in its order.
export const PERMISSIONS = [
  "machines.list.view",
  "machines.health.view",
  "machines.salesToday.view",
  "machines.add.edit",
  "machines.factoryPinBulk.edit",
  "settings.facts.view",
  "settings.name.view",
  "settings.name.edit",
  "settings.machineNumber.view",
  "settings.machineNumber.edit",
  "settings.servicePhone.view",
  "settings.servicePhone.edit",
  "settings.location.view",
  "settings.location.edit",
  "settings.hotWater.view",
  "settings.hotWater.edit",
  "settings.coldWater.view",
  "settings.coldWater.edit",
  "settings.enabled.view",
  "settings.enabled.edit",
  "settings.qrPay.view",
  "settings.qrPay.edit",
  "settings.freeVend.view",
  "settings.freeVend.edit",
  "owner.view",
  "owner.move.edit",
  "machineGoods.view",
  "machineGoods.add.edit",
  "machineGoods.listing.view",
  "machineGoods.listing.edit",
  "machineGoods.price.view",
  "machineGoods.price.edit",
  "machineGoods.sort.view",
  "machineGoods.sort.edit",
  "stock.view",
  "stock.restock.edit",
  "stock.history.view",
  "machineVoices.view",
  "machineVoices.edit",
  "pins.operator.view",
  "pins.operator.edit",
  "pins.factory.view",
  "pins.factory.edit",
  "remote.mqtt.edit",
  "remote.clean.edit",
  "remote.door.edit",
  "remote.lock.edit",
  "remote.unlock.edit",
  "remote.water.edit",
  "remote.uploadLog.edit",
  "remote.reload.edit",
  "remote.restart.edit",
  "remote.live.view",
  "files.logs.view",
  "files.backups.view",
  "logs.equipment.view",
  "logs.operations.view",
  "orders.view",
  "stats.view",
  "feedback.view",
  "feedback.edit",
  "redeemCodes.view",
  "redeemCodes.edit",
  "shopOrders.view",
  "shopOrders.refund.edit",
  "customers.view",
  "customers.edit",
  "customers.refund.edit",
  "goodsLibrary.view",
  "goodsLibrary.edit",
  "materials.view",
  "materials.edit",
  "discounts.view",
  "discounts.edit",
  "newProducts.view",
  "newProducts.edit",
  "ads.view",
  "ads.edit",
  "voiceDefaults.view",
  "voiceDefaults.edit",
  "qr.view",
  "qr.edit",
  "operators.view",
  "operators.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const KNOWN: ReadonlySet<string> = new Set(PERMISSIONS);

export const VIEWER_ROLES = ["admin", "franchise", "gym", "operator"] as const;
export type ViewerRole = (typeof VIEWER_ROLES)[number];

export type MachineViewer = {
  role: ViewerRole;
  name: string;
  email: string;
  franchiseId: string | null;
  gymId: string | null;
  can: ReadonlySet<Permission>;
};

export const viewerSchema = z
  .object({
    role: z.enum(VIEWER_ROLES),
    name: z.string(),
    email: z.string(),
    franchiseId: z.string().nullable().catch(null),
    gymId: z.string().nullable().catch(null),
    can: z.array(z.string()),
  })
  .transform(
    (raw): MachineViewer => ({
      ...raw,
      can: new Set(raw.can.filter((p): p is Permission => KNOWN.has(p))),
    }),
  );

export const adminViewer = (name: string, email: string): MachineViewer => ({
  role: "admin",
  name,
  email,
  franchiseId: null,
  gymId: null,
  can: new Set(PERMISSIONS),
});

export const ROLE_LABEL: Record<ViewerRole, string> = {
  admin: "MBP team",
  franchise: "Franchise",
  gym: "Gym",
  operator: "Operator",
};
