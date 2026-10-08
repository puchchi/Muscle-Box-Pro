import { apiRequest, forgetBearerSession, rememberBearerSession } from "./apiClient";
import type { OnboardingResult } from "@shared/onboarding/types";

export type OperatorSession = {
  email: string;
  name: string;
  machines: string[];
  expiresAt: string | null;
};

type OperatorSessionResponse = {
  email?: unknown;
  name?: unknown;
  machines?: unknown;
  expiresAt?: unknown;
  sessionToken?: unknown;
};

function asSession(body: OperatorSessionResponse | undefined, fallbackEmail: string): OperatorSession {
  return {
    email: typeof body?.email === "string" ? body.email : fallbackEmail,
    name: typeof body?.name === "string" ? body.name : fallbackEmail,
    machines: Array.isArray(body?.machines) ? body.machines.filter((m): m is string => typeof m === "string") : [],
    expiresAt: typeof body?.expiresAt === "string" ? body.expiresAt : null,
  };
}

export async function fetchOperatorSession(): Promise<OperatorSession | null> {
  const result = await apiRequest<OperatorSessionResponse>("GET", "/operator/session");
  if (!result.ok || typeof result.data?.email !== "string") return null;
  return asSession(result.data, result.data.email);
}

const SIGN_IN_FAILED = {
  code: "invalid_token" as const,
  message: "Incorrect email or password. Please try again.",
};

const TOO_MANY = {
  code: "invalid_token" as const,
  message: "Too many attempts. Wait a few minutes and try again.",
};

export async function signInAsOperator(email: string, password: string): Promise<OnboardingResult<OperatorSession>> {
  const result = await apiRequest<OperatorSessionResponse>("POST", "/operator/login", { body: { email, password } });
  if (!result.ok) {
    if (result.error.code === "network") return { ok: false, error: result.error };
    return { ok: false, error: /too many/i.test(result.error.message) ? TOO_MANY : SIGN_IN_FAILED };
  }
  rememberBearerSession(result.data?.sessionToken);
  return { ok: true, data: asSession(result.data, email) };
}

export async function signOutAsOperator(): Promise<void> {
  await apiRequest("POST", "/operator/logout");
  forgetBearerSession();
}

export async function setOperatorPassword(handle: string, password: string): Promise<OnboardingResult<{ email: string | null }>> {
  const result = await apiRequest<{ email?: unknown }>("POST", "/operator/set-password", { handle, body: { password } });
  if (!result.ok) return result;
  return { ok: true, data: { email: typeof result.data?.email === "string" ? result.data.email : null } };
}

// The server answers 202 for every address, known or not; keep it that way here.
export async function requestOperatorPasswordReset(email: string): Promise<OnboardingResult<void>> {
  const result = await apiRequest<unknown>("POST", "/operator/forgot-password", { body: { email } });
  if (!result.ok) return result;
  return { ok: true, data: undefined };
}
