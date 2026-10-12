import { IS_PRODUCTION_API, forgetBearerSession } from "./apiClient";
import { signInAsAdmin, signOutAsAdmin } from "./adminSession";
import { requestFranchisePasswordReset, signInToFranchisePortal, signOutOfFranchisePortal } from "./franchiseSession";
import { requestPortalPasswordReset, signInToPortal, signOutOfPortal } from "./gymSession";
import { signInAsOperator, signOutAsOperator } from "./operatorSession";
import type { ViewerRole } from "@shared/admin/viewerSchema";

// Production has no operator routes yet, and its 403 carries no CORS header, so the browser reports a network error.
export const OPERATOR_ACCOUNTS_LIVE = !IS_PRODUCTION_API;

type Outcome = { ok: true } | { ok: false; error: { code: string; message: string } };

type SignIn = { role: ViewerRole; run: (login: string, password: string) => Promise<Outcome> };

const EMAIL_SIGN_INS: SignIn[] = [
  { role: "admin", run: signInAsAdmin },
  { role: "franchise", run: signInToFranchisePortal },
  { role: "gym", run: signInToPortal },
];

const OPERATOR_SIGN_INS: SignIn[] = OPERATOR_ACCOUNTS_LIVE ? [{ role: "operator", run: signInAsOperator }] : [];

export type ConsoleSignInError = { code: "wrong" | "throttled" | "network"; message: string };

export const CONSOLE_SIGN_IN_ERRORS: Record<ConsoleSignInError["code"], string> = {
  wrong: "Incorrect sign-in details. Check your email or operator ID and password.",
  throttled: "Too many attempts. Wait a few minutes and try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

export async function signInToMachineConsole(
  login: string,
  password: string,
): Promise<{ ok: true; role: ViewerRole } | { ok: false; error: ConsoleSignInError }> {
  let unreachable = false;
  let throttled = false;
  const trimmed = login.trim();
  const routes = trimmed.includes("@") ? EMAIL_SIGN_INS : OPERATOR_SIGN_INS;
  for (const { role, run } of routes) {
    const result = await run(trimmed, password);
    if (result.ok) return { ok: true, role };
    if (result.error.code === "network") unreachable = true;
    else if (/too many/i.test(result.error.message)) throttled = true;
  }
  const code = throttled ? "throttled" : unreachable ? "network" : "wrong";
  return { ok: false, error: { code, message: CONSOLE_SIGN_IN_ERRORS[code] } };
}

const SIGN_OUTS: Record<ViewerRole, () => Promise<void>> = {
  admin: signOutAsAdmin,
  franchise: signOutOfFranchisePortal,
  gym: signOutOfPortal,
  operator: signOutAsOperator,
};

export async function signOutOfMachineConsole(role: ViewerRole): Promise<void> {
  await SIGN_OUTS[role]();
  forgetBearerSession();
}

// Every route answers the same whether or not the address has an account there, so asking all of them reveals nothing.
export async function requestMachineConsolePasswordReset(email: string): Promise<{ ok: boolean }> {
  const results = await Promise.all([requestFranchisePasswordReset(email), requestPortalPasswordReset(email)]);
  return { ok: results.some((r) => r.ok) };
}
