import * as z from "zod";
import type { AdminReadResult } from "./adminApi";
import { apiRequest, type ApiMethod } from "./apiClient";
import {
  operatorEnvelopeSchema,
  operatorInviteSchema,
  operatorsSchema,
  type Operator,
  type OperatorCreateInput,
  type OperatorInvite,
  type OperatorPatch,
} from "@shared/admin/operatorsSchema";
import type { OnboardingError } from "@shared/onboarding/types";

export type OperatorManager = "admin" | "franchise";

const MALFORMED: OnboardingError = {
  code: "network",
  message: "The server answered in a shape this page does not understand. Reload before trying again.",
};

const base = (as: OperatorManager) => (as === "admin" ? "/admin/operators" : "/franchise/operators");
const one = (as: OperatorManager, email: string) => `${base(as)}/${encodeURIComponent(email)}`;

async function call<S extends z.ZodTypeAny>(schema: S, method: ApiMethod, path: string, body?: unknown): Promise<AdminReadResult<z.infer<S>>> {
  const result = await apiRequest<unknown>(method, path, { api: "franchiseAdmin", ...(body === undefined ? {} : { body }) });
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: MALFORMED, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  return { ok: true, data: parsed.data };
}

export async function fetchOperators(as: OperatorManager): Promise<AdminReadResult<Operator[]>> {
  const result = await call(operatorsSchema, "GET", base(as));
  return result.ok ? { ok: true, data: result.data.operators } : result;
}

export const createOperator = (as: OperatorManager, input: OperatorCreateInput): Promise<AdminReadResult<OperatorInvite>> =>
  call(operatorInviteSchema, "POST", base(as), input);

export async function updateOperator(as: OperatorManager, email: string, patch: OperatorPatch): Promise<AdminReadResult<Operator>> {
  const result = await call(operatorEnvelopeSchema, "PATCH", one(as, email), patch);
  return result.ok ? { ok: true, data: result.data.operator } : result;
}

export async function setOperatorDisabled(
  as: OperatorManager,
  email: string,
  disabled: boolean,
  reason?: string,
): Promise<AdminReadResult<Operator>> {
  const result = await call(operatorEnvelopeSchema, "PUT", `${one(as, email)}/disabled`, { disabled, ...(reason ? { reason } : {}) });
  return result.ok ? { ok: true, data: result.data.operator } : result;
}

export const resendOperatorInvite = (as: OperatorManager, email: string): Promise<AdminReadResult<OperatorInvite>> =>
  call(operatorInviteSchema, "POST", `${one(as, email)}/invite`, {});
