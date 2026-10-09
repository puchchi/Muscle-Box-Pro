import { IS_PRODUCTION_API, forgetBearerSession } from "./apiClient";
import { signInAsAdmin, signOutAsAdmin } from "./adminSession";
import { requestFranchisePasswordReset, signInToFranchisePortal, signOutOfFranchisePortal } from "./franchiseSession";
import { requestPortalPasswordReset, signInToPortal, signOutOfPortal } from "./gymSession";
import { requestOperatorPasswordReset, signInAsOperator, signOutAsOperator } from "./operatorSession";
import type { ViewerRole } from "@shared/admin/viewerSchema";

// Production has no operator routes yet, and its 403 carries no CORS header, so the browser reports a network error.
export const OPERATOR_ACCOUNTS_LIVE = !IS_PRODUCTION_API;

type Outcome = { ok: true } | { ok: false; error: { code: string; message: string } };

const SIGN_INS: { role: ViewerRole; run: (email: string, password: string) => Promise<Outcome> }[] = [
  { role: "admin", run: signInAsAdmin },
  { role: "franchise", run: signInToFranchisePortal },
  { role: "gym", run: signInToPortal },
  ...(OPERATOR_ACCOUNTS_LIVE ? [{ role: "operator" as const, run: signInAsOperator }] : []),
];

export type ConsoleSignInError = { code: "wrong" | "throttled" | "network"; message: string };

export const CONSOLE_SIGN_IN_ERRORS: Record<ConsoleSignInError["code"], string> = {
  wrong: "Incorrect email or password. Please try again.",
  throttled: "Too many attempts. Wait a few minutes and try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
};

export async function signInToMachineConsole(
  email: string,
  password: string,
): Promise<{ ok: true; role: ViewerRole } | { ok: false; error: ConsoleSignInError }> {
  let unreachable = false;
  let throttled = false;
  for (const { role, run } of SIGN_INS) {
    const result = await run(email, password);
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
  const requests = [
    requestFranchisePasswordReset(email),
    requestPortalPasswordReset(email),
    ...(OPERATOR_ACCOUNTS_LIVE ? [requestOperatorPasswordReset(email)] : []),
  ];
  const results = await Promise.all(requests);
  return { ok: results.some((r) => r.ok) };
}
