import * as z from "zod";
import type { AdminReadResult } from "./adminApi";
import { apiRequest, type ApiMethod } from "./apiClient";
import {
  operatorEnvelopeSchema,
  operatorsSchema,
  suggestedOperatorIdSchema,
  type Operator,
  type OperatorCreateInput,
  type OperatorPatch,
} from "@shared/admin/operatorsSchema";
import type { OnboardingError } from "@shared/onboarding/types";

export type OperatorManager = "admin" | "franchise";

const MALFORMED: OnboardingError = {
  code: "network",
  message: "The server answered in a shape this page does not understand. Reload before trying again.",
};

const base = (as: OperatorManager) => (as === "admin" ? "/admin/operators" : "/franchise/operators");
const one = (as: OperatorManager, operatorId: string) => `${base(as)}/${encodeURIComponent(operatorId)}`;

async function call<S extends z.ZodTypeAny>(schema: S, method: ApiMethod, path: string, body?: unknown): Promise<AdminReadResult<z.infer<S>>> {
  const result = await apiRequest<unknown>(method, path, { api: "franchiseAdmin", ...(body === undefined ? {} : { body }) });
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: MALFORMED, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  return { ok: true, data: parsed.data };
}

async function operatorCall(method: ApiMethod, path: string, body?: unknown): Promise<AdminReadResult<Operator>> {
  const result = await call(operatorEnvelopeSchema, method, path, body);
  return result.ok ? { ok: true, data: result.data.operator } : result;
}

export async function fetchOperators(as: OperatorManager): Promise<AdminReadResult<Operator[]>> {
  const result = await call(operatorsSchema, "GET", base(as));
  return result.ok ? { ok: true, data: result.data.operators } : result;
}

export async function fetchSuggestedOperatorId(as: OperatorManager, franchiseId: string | null): Promise<string | null> {
  const query = as === "admin" && franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : "";
  const result = await call(suggestedOperatorIdSchema, "GET", `${base(as)}/suggested-id${query}`);
  return result.ok ? result.data.operatorId : null;
}

export const createOperator = (as: OperatorManager, input: OperatorCreateInput) => operatorCall("POST", base(as), input);

export const updateOperator = (as: OperatorManager, operatorId: string, patch: OperatorPatch) =>
  operatorCall("PATCH", one(as, operatorId), patch);

export const setOperatorPassword = (as: OperatorManager, operatorId: string, password: string) =>
  operatorCall("PUT", `${one(as, operatorId)}/password`, { password });

export const setOperatorDisabled = (as: OperatorManager, operatorId: string, disabled: boolean, reason?: string) =>
  operatorCall("PUT", `${one(as, operatorId)}/disabled`, { disabled, ...(reason ? { reason } : {}) });
