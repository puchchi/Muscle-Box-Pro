import { OWNER_LIMITS, type GymPlacement, type OwnerRef, type OwnerState } from "@shared/admin/ownership";
import type { OnboardingError } from "@shared/onboarding/types";

export const OWNER_STATE_LABEL: Record<OwnerState, string> = {
  stock: "MBP stock",
  franchise_unplaced: "Franchise, not placed",
  placed: "At a gym",
};

export const OWNER_REASON_LABEL: Record<string, string> = {
  assign: "Moved by an admin",
  gym_franchise: "Gym changed franchise",
  machine_replaced: "Unit replaced at the gym",
  invite: "Allocated when the gym was invited",
  recovered: "Recovered from an offboarded gym",
  migration: "Set up from existing records",
};

type OwnerNames = Pick<OwnerRef, "franchiseId" | "franchiseName" | "gymId" | "gymName">;

export const ownerGymName = (owner: Pick<OwnerRef, "gymId" | "gymName">) => owner.gymName ?? owner.gymId ?? "";
export const ownerFranchiseName = (owner: Pick<OwnerRef, "franchiseId" | "franchiseName">) => owner.franchiseName ?? owner.franchiseId ?? "";

export function ownerLine(owner: OwnerNames | null): string {
  if (!owner || (!owner.gymId && !owner.franchiseId)) return "MBP stock";
  if (!owner.gymId) return `${ownerFranchiseName(owner)}, not placed`;
  return owner.franchiseId ? `${ownerGymName(owner)} (${ownerFranchiseName(owner)})` : `${ownerGymName(owner)}`;
}

export type PlacementDraft = {
  gymId: string;
  model: string;
  serialNumber: string;
  valueInr: string;
  accessories: string;
  installationDate: string;
};

export function checkPlacement(draft: PlacementDraft): { errors: Record<string, string>; placement: GymPlacement | null } {
  const errors: Record<string, string> = {};
  const model = draft.model.trim();
  const serialNumber = draft.serialNumber.trim();
  const accessories = draft.accessories.trim();
  const value = draft.valueInr.trim().replace(/,/g, "");
  if (!draft.gymId) errors.gymId = "Choose a gym.";
  if (!model) errors.model = "Required.";
  else if (model.length > OWNER_LIMITS.model) errors.model = `Up to ${OWNER_LIMITS.model} characters.`;
  if (serialNumber.length > OWNER_LIMITS.serialNumber) errors.serialNumber = `Up to ${OWNER_LIMITS.serialNumber} characters.`;
  if (accessories.length > OWNER_LIMITS.accessories) errors.accessories = `Up to ${OWNER_LIMITS.accessories} characters.`;
  const valueInr = Number(value);
  if (!value) errors.valueInr = "Required.";
  else if (!/^\d+$/.test(value)) errors.valueInr = "Whole rupees, no paise.";
  else if (valueInr > 100_000_000) errors.valueInr = "Up to ₹10,00,00,000.";
  if (draft.installationDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.installationDate)) errors.installationDate = "Use a date as YYYY-MM-DD.";
  if (Object.keys(errors).length > 0) return { errors, placement: null };
  return {
    errors,
    placement: {
      gymId: draft.gymId,
      model,
      valueInr,
      ...(serialNumber ? { serialNumber } : {}),
      ...(accessories ? { accessories } : {}),
      ...(draft.installationDate ? { installationDate: draft.installationDate } : {}),
    },
  };
}

export type OwnershipProblem = { kind: "stale" | "unmigrated" | "refused"; message: string; fieldErrors: Record<string, string> };

const PLAIN: Record<string, string> = {
  "That machine is placed at another gym. Move it with PUT /admin/machines/{sn}/owner.":
    "That machine is placed at another gym. Move it off that gym first, from the machine's Owner tab.",
  "This machine is on a gym but has no ownership record yet. Run the ownership migration first.":
    "This machine is at a gym but has no ownership record yet, so it can't be moved. It can be moved once the ownership migration has run.",
  "This gym has no allocated machine. Place one with PUT /admin/machines/{sn}/owner.":
    "This gym has no machine. Place one from the machine's Owner tab in the machine console.",
};

export const plainOwnershipMessage = (message: string) => PLAIN[message] ?? message;

export function ownershipProblem(error: OnboardingError, machineKey: "sn" | "deviceNo"): OwnershipProblem {
  const fieldErrors = Object.fromEntries(Object.entries(error.fieldErrors ?? {}).map(([k, v]) => [k, plainOwnershipMessage(v)]));
  if (error.code === "already_signed" && error.fieldErrors?.expectedVersion) {
    return { kind: "stale", message: "Someone changed this since you opened it. Reload to see the latest, then try again.", fieldErrors: {} };
  }
  if (error.code === "already_signed" && error.fieldErrors?.[machineKey]) {
    return { kind: "unmigrated", message: plainOwnershipMessage(error.fieldErrors[machineKey]!), fieldErrors: {} };
  }
  return { kind: "refused", message: plainOwnershipMessage(error.message), fieldErrors };
}

export function franchiseChangeNote(
  current: { franchiseId: string | null; franchiseName: string | null },
  gym: { franchiseId: string | null; franchiseName: string | null },
): string | null {
  if (current.franchiseId === gym.franchiseId) return null;
  const to = gym.franchiseId ? `joins ${ownerFranchiseName(gym)}, the gym's franchise` : "becomes an MBP-direct machine";
  return current.franchiseId
    ? `This gym isn't in ${ownerFranchiseName(current)}. The machine leaves ${ownerFranchiseName(current)} and ${to}.`
    : `The machine ${to}.`;
}

export function allocationNote(
  network: { franchiseName: string | null; franchiseId: string; machineAllocation: number | null; machineCount: number },
  adding: number,
): string | null {
  if (network.machineAllocation === null) return null;
  const after = network.machineCount + adding;
  if (after <= network.machineAllocation) return null;
  const name = network.franchiseName ?? network.franchiseId;
  return `${name} will hold ${after} machine${after === 1 ? "" : "s"}. Its agreement allows ${network.machineAllocation}. You can still go ahead.`;
}
