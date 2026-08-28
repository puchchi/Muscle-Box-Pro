"use client";

import { useEffect, useRef, useState } from "react";
import { onboardingApi } from "@/lib/onboardingApi";
import type { DraftKey, StepDrafts } from "@shared/onboarding/types";

/**
 * Debounced server-side draft saving.
 *
 * Why debounce rather than save on submit: a gym owner who types nine fields on a
 * front-desk computer and then gets pulled onto the floor has typed nine fields
 * for nothing. Drafts go to `step_data` under a per-step key, so a partial step 1
 * can never overwrite a submitted step 1 (docs/gym-onboarding.md §4).
 *
 * Why server-side and not `localStorage`: no PII in a shared browser, and the
 * round trip is what makes cross-device resume work anyway. A cached GSTIN and
 * signatory name on the gym's reception PC is a leak with no upside.
 */

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export type UseDraftAutosave = {
  status: DraftStatus;
  /** ISO timestamp of the last successful save, for "Saved just now". */
  savedAt: string | null;
  /** Writes immediately, bypassing the debounce. Used on submit and on tab hide. */
  flush(): Promise<void>;
};

export function useDraftAutosave<K extends DraftKey>(
  token: string,
  key: K,
  value: NonNullable<StepDrafts[K]>,
  options: { enabled?: boolean; delayMs?: number } = {},
): UseDraftAutosave {
  const { enabled = true, delayMs = 800 } = options;

  const [status, setStatus] = useState<DraftStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const serialised = JSON.stringify(value);
  /**
   * Seeded with the first value we see so the hook does not immediately save back
   * whatever it was handed on mount. Re-saving the server's own data would show a
   * spurious "Saved" on a form nobody has touched.
   */
  const lastSaved = useRef<string>(serialised);
  const latest = useRef<string>(serialised);
  latest.current = serialised;

  const save = useRef(async (payload: string) => {
    setStatus("saving");
    const result = await onboardingApi.saveDraft(token, key, JSON.parse(payload));
    if (result.ok) {
      lastSaved.current = payload;
      setSavedAt(result.data.savedAt);
      setStatus("saved");
    } else {
      // Left as "error" deliberately rather than retried in a loop. A frozen or
      // revoked token will never succeed, and hammering it hides that.
      setStatus("error");
    }
  });

  useEffect(() => {
    if (!enabled || serialised === lastSaved.current) return;
    const timer = setTimeout(() => void save.current(serialised), delayMs);
    return () => clearTimeout(timer);
  }, [enabled, serialised, delayMs]);

  /**
   * Debouncing loses the last few keystrokes when a tab is closed inside the
   * window, which is exactly the moment the draft matters most. `pagehide` fires
   * on close, navigation and iOS backgrounding, where `beforeunload` does not.
   */
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (latest.current !== lastSaved.current) void save.current(latest.current);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [enabled]);

  return {
    status,
    savedAt,
    async flush() {
      if (!enabled || latest.current === lastSaved.current) return;
      await save.current(latest.current);
    },
  };
}
