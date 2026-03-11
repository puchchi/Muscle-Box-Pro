import { supabase } from "./supabase";

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function getAccessTokenSync(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(
    `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string).hostname.split(".")[0]}-auth-token`,
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function hasAccessToken(): Promise<boolean> {
  return Boolean(await getAccessToken());
}

export function hasAccessTokenSync(): boolean {
  return Boolean(getAccessTokenSync());
}

export async function clearSession() {
  await supabase.auth.signOut();
}
