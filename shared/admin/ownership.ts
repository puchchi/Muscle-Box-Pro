import * as z from "zod";
import { toParse, type AdminParse } from "./parse";

export const OWNER_STATES = ["stock", "franchise_unplaced", "placed"] as const;
export type OwnerState = (typeof OWNER_STATES)[number];

export const OWNER_REASONS = ["assign", "gym_franchise", "machine_replaced", "invite", "recovered", "migration"] as const;

export const OWNER_LIMITS = { model: 120, serialNumber: 120, accessories: 2000 };

const id = z.string().min(1);
const name = z.string().nullable();
const version = z.number().int().min(0);
const instant = z.string().nullable();

const ownerRefSchema = z.object({
  franchiseId: id.nullable(),
  franchiseName: name,
  gymId: id.nullable(),
  gymName: name,
});

const ownerViewSchema = ownerRefSchema.extend({
  ownerState: z.enum(OWNER_STATES),
  since: instant,
  version,
});

export const machineOwnerSchema = z.object({
  sn: id,
  migrated: z.boolean(),
  owner: ownerViewSchema,
  history: z.array(
    z.object({
      version,
      at: z.string(),
      by: z.string(),
      reason: z.string(),
      from: ownerRefSchema,
      to: ownerRefSchema,
    }),
  ),
});

export const machineMoveSchema = z.object({ sn: id, changed: z.boolean(), owner: ownerViewSchema });

export const gymFranchiseSchema = z.object({
  gymId: id,
  changed: z.boolean(),
  franchiseId: id.nullable(),
  franchiseName: name,
  ownershipVersion: version,
  machine: z.object({ sn: id, owner: ownerRefSchema.extend({ version }) }).nullable(),
});

const networkMachineSchema = z.object({ sn: id, since: instant, version });

export const franchiseNetworkSchema = z.object({
  franchiseId: id,
  franchiseName: name,
  status: z.string(),
  machineAllocation: z.number().int().min(0).nullable(),
  machineCount: z.number().int().min(0),
  overAllocated: z.boolean(),
  gyms: z.array(
    z.object({
      gymId: id,
      gymName: name,
      status: z.string(),
      lifecycle: z.string().nullable(),
      ownershipVersion: version,
      machine: networkMachineSchema.nullable(),
    }),
  ),
  unplacedMachines: z.array(networkMachineSchema),
});

export type OwnerRef = z.infer<typeof ownerRefSchema>;
export type OwnerView = z.infer<typeof ownerViewSchema>;
export type MachineOwner = z.infer<typeof machineOwnerSchema>;
export type OwnerHistoryRow = MachineOwner["history"][number];
export type MachineMove = z.infer<typeof machineMoveSchema>;
export type GymFranchise = z.infer<typeof gymFranchiseSchema>;
export type FranchiseNetwork = z.infer<typeof franchiseNetworkSchema>;
export type NetworkGym = FranchiseNetwork["gyms"][number];

export type GymPlacement = {
  gymId: string;
  model: string;
  serialNumber?: string;
  valueInr: number;
  accessories?: string;
  installationDate?: string;
};

export type OwnerMove =
  | { to: "stock"; expectedVersion: number }
  | { to: "franchise"; franchiseId: string; expectedVersion: number }
  | ({ to: "gym"; expectedVersion: number } & GymPlacement);

export function parseOwnership<S extends z.ZodTypeAny>(schema: S, raw: unknown): AdminParse<z.infer<S>> {
  return toParse(schema.safeParse(raw));
}
