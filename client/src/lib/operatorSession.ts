import { apiRequest, forgetBearerSession, rememberBearerSession } from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";

export type OperatorSession = {
  operatorId: string;
  name: string;
  machines: string[];
  expiresAt: string | null;
};

type OperatorSessionResponse = {
  operatorId?: unknown;
  name?: unknown;
  machines?: unknown;
  expiresAt?: unknown;
  sessionToken?: unknown;
};

function asSession(body: OperatorSessionResponse | undefined, fallbackId: string): OperatorSession {
  const operatorId = typeof body?.operatorId === "string" ? body.operatorId : fallbackId;
  return {
    operatorId,
    name: typeof body?.name === "string" ? body.name : operatorId,
    machines: Array.isArray(body?.machines) ? body.machines.filter((m): m is string => typeof m === "string") : [],
    expiresAt: typeof body?.expiresAt === "string" ? body.expiresAt : null,
  };
}

export async function fetchOperatorSession(): Promise<OperatorSession | null> {
  const result = await apiRequest<OperatorSessionResponse>("GET", "/operator/session");
  if (!result.ok || typeof result.data?.operatorId !== "string") return null;
  return asSession(result.data, result.data.operatorId);
}

const SIGN_IN_FAILED = {
  code: "invalid_token" as const,
  message: "Incorrect operator ID or password. Please try again.",
};

const TOO_MANY = {
  code: "invalid_token" as const,
  message: "Too many attempts. Wait a few minutes and try again.",
};

export async function signInAsOperator(operatorId: string, password: string): Promise<OnboardingResult<OperatorSession>> {
  const id = operatorId.trim().toLowerCase();
  const result = await apiRequest<OperatorSessionResponse>("POST", "/operator/login", { body: { operatorId: id, password } });
  if (!result.ok) {
    if (result.error.code === "network") return { ok: false, error: result.error };
    return { ok: false, error: /too many/i.test(result.error.message) ? TOO_MANY : SIGN_IN_FAILED };
  }
  rememberBearerSession(result.data?.sessionToken);
  return { ok: true, data: asSession(result.data, id) };
}

export async function signOutAsOperator(): Promise<void> {
  await apiRequest("POST", "/operator/logout");
  forgetBearerSession();
}
