const KEY = "mbp-machines-flash";

export type Flash = { notice: string; warning?: string | null };

export function setFlash(flash: Flash): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {}
}

export function takeFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as Flash) : null;
  } catch {
    return null;
  }
}
