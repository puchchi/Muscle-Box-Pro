import * as z from "zod";
import { fetchAdminGymList, type AdminReadResult } from "./adminApi";
import { fetchAdminFranchiseList } from "./adminFranchiseApi";
import { apiRequest, type ApiMethod } from "./apiClient";
import {
  franchiseNetworkSchema,
  gymFranchiseSchema,
  machineMoveSchema,
  machineOwnerSchema,
  parseOwnership,
  type OwnerMove,
} from "@shared/admin/ownership";
import type { OnboardingError } from "@shared/onboarding/types";

const MALFORMED: OnboardingError = {
  code: "network",
  message: "The server answered in a shape this page does not understand. If you just saved, reload before trying again.",
};

const seg = encodeURIComponent;

async function call<S extends z.ZodTypeAny>(
  schema: S,
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<AdminReadResult<z.infer<S>>> {
  const result = await apiRequest<unknown>(method, path, { api: "franchiseAdmin", ...(body === undefined ? {} : { body }) });
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseOwnership(schema, result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

export const machineOwnerQueryKey = (sn: string) => ["admin", "machine-owner", sn] as const;
export const franchiseNetworkQueryKey = (franchiseId: string) => ["admin", "franchise-network", franchiseId] as const;

export const fetchMachineOwner = (sn: string) => call(machineOwnerSchema, "GET", `/admin/machines/${seg(sn)}/owner`);

export const moveMachine = (sn: string, move: OwnerMove) => call(machineMoveSchema, "PUT", `/admin/machines/${seg(sn)}/owner`, move);

export const setGymFranchise = (gymId: string, franchiseId: string | null, expectedVersion: number) =>
  call(gymFranchiseSchema, "PUT", `/admin/gyms/${seg(gymId)}/franchise`, { franchiseId, expectedVersion });

export const fetchFranchiseNetwork = (franchiseId: string) =>
  call(franchiseNetworkSchema, "GET", `/admin/franchises/${seg(franchiseId)}/network`);

const MAX_PAGES = 10;

export type FranchiseTarget = { franchiseId: string; name: string };
export type GymTarget = { gymId: string; name: string; franchiseId: string | null; franchiseName: string | null };
export type OwnerChoices = { franchises: FranchiseTarget[]; gyms: GymTarget[] };

type Page<T> = AdminReadResult<{ rows: T[]; nextCursor: string | null }>;

async function everyPage<T>(fetchPage: (cursor: string | undefined) => Promise<Page<T>>): Promise<AdminReadResult<T[]>> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPage(cursor);
    if (!result.ok) return result;
    out.push(...result.data.rows);
    if (!result.data.nextCursor) break;
    cursor = result.data.nextCursor;
  }
  return { ok: true, data: out };
}

const byName = <T extends { name: string }>(rows: T[]) => rows.sort((a, b) => a.name.localeCompare(b.name));

async function allFranchises(): Promise<AdminReadResult<(FranchiseTarget & { status: string })[]>> {
  const result = await everyPage(async (cursor) => {
    const page = await fetchAdminFranchiseList({ limit: 200, cursor });
    if (!page.ok) return page;
    return { ok: true, data: { rows: page.data.franchises, nextCursor: page.data.nextCursor } };
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: byName(
      result.data.map((row) => ({ franchiseId: row.franchiseId, name: row.tradeName || row.legalEntityName || row.franchiseId, status: row.status })),
    ),
  };
}

async function allGyms(hasMachine?: boolean): Promise<AdminReadResult<(GymTarget & { lifecycle: string | null })[]>> {
  const result = await everyPage(async (cursor) => {
    const page = await fetchAdminGymList({ limit: 200, cursor, hasMachine });
    if (!page.ok) return page;
    return { ok: true, data: { rows: page.data.gyms, nextCursor: page.data.nextCursor } };
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: byName(
      result.data.map((row) => ({
        gymId: row.gymId,
        name: row.tradeName || row.legalEntityName || row.gymId,
        franchiseId: row.franchiseId,
        franchiseName: row.franchiseName,
        lifecycle: row.lifecycle,
      })),
    ),
  };
}

export async function fetchActiveFranchises(): Promise<AdminReadResult<FranchiseTarget[]>> {
  const result = await allFranchises();
  if (!result.ok) return result;
  return { ok: true, data: result.data.filter((f) => f.status === "active").map(({ franchiseId, name }) => ({ franchiseId, name })) };
}

export const OFFBOARDED_LIFECYCLES: ReadonlySet<string> = new Set(["terminated", "machine_recovered", "settled"]);

export async function fetchGymsWithoutMachine(): Promise<AdminReadResult<GymTarget[]>> {
  const result = await allGyms(false);
  if (!result.ok) return result;
  return { ok: true, data: result.data.filter((g) => !g.lifecycle || !OFFBOARDED_LIFECYCLES.has(g.lifecycle)) };
}

export async function fetchOwnerChoices(): Promise<AdminReadResult<OwnerChoices>> {
  const [franchises, gyms] = await Promise.all([allFranchises(), allGyms()]);
  if (!franchises.ok) return franchises;
  if (!gyms.ok) return gyms;
  return {
    ok: true,
    data: {
      franchises: franchises.data.map(({ franchiseId, name }) => ({ franchiseId, name })),
      gyms: gyms.data.map(({ gymId, name, franchiseId, franchiseName }) => ({ gymId, name, franchiseId, franchiseName })),
    },
  };
}
