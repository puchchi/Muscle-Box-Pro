const PRODUCTION_SHOP_HOST = "api.muscleboxpro.com";
const BEARER_KEY = "mbp:shop-sandbox-session";
const HINT_KEY = "mbp:shop-signed-in";

function hostOf(base: string | null): string | null {
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

// Production sets an HttpOnly cookie on the API host. Only sandbox, on an execute-api URL the cookie's
// Path=/shop can't match, hands the token back, and it is kept per tab, never in localStorage.
export function bearerAllowed(base: string | null): boolean {
  const host = hostOf(base);
  return host !== null && host !== PRODUCTION_SHOP_HOST;
}

function storage(kind: "session" | "local"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function sandboxBearer(base: string | null): string | null {
  if (!bearerAllowed(base)) return null;
  return storage("session")?.getItem(BEARER_KEY) ?? null;
}

export function rememberSandboxBearer(base: string | null, token: unknown): void {
  if (!bearerAllowed(base) || typeof token !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) return;
  try {
    storage("session")?.setItem(BEARER_KEY, token);
  } catch {
    return;
  }
}

export function signedInHint(): boolean {
  return storage("local")?.getItem(HINT_KEY) === "1";
}

export function setSignedInHint(on: boolean): void {
  try {
    if (on) storage("local")?.setItem(HINT_KEY, "1");
    else {
      storage("local")?.removeItem(HINT_KEY);
      storage("session")?.removeItem(BEARER_KEY);
    }
  } catch {
    return;
  }
}
