"use client";

import { useEffect, useRef, useState } from "react";

import { franchiseOnboardingApi } from "@/lib/franchiseOnboardingApi";
import type { DraftStatus } from "../../onboarding/useDraftAutosave";
import type {
  FranchiseDraftKey,
  FranchiseStepDrafts,
} from "@shared/franchise/onboarding/types";

/**
 * Debounced server-side draft saving, against the franchise API.
 *
 * `useDraftAutosave` is this hook with `onboardingApi` in place of
 * `franchiseOnboardingApi`, and its reasoning holds unchanged: debounced rather than
 * save-on-submit because someone who fills in fourteen fields and then gets called away has
 * filled in fourteen fields for nothing, server-side rather than `localStorage` because a PAN
 * and a registered address should not be left in a shared browser, `pagehide` rather than
 * `beforeunload` because that is the event iOS fires, and a failed save left as `error` rather
 * than retried because a revoked handle will never succeed and hammering it hides that.
 *
 * It is a copy rather than a generic over both APIs. The two share no interface, and a
 * type parameter over `saveDraft` would need `DraftKey | FranchiseDraftKey` threaded through a
 * hook whose only real content is a `setTimeout`. `DraftStatus` and `DraftIndicator` *are*
 * shared, because they are UI with no API in them.
 */
export function useFranchiseDraftAutosave<K extends FranchiseDraftKey>(
  handle: string,
  key: K,
  value: NonNullable<FranchiseStepDrafts[K]>,
  options: { enabled?: boolean; delayMs?: number } = {},
): { status: DraftStatus; savedAt: string | null; flush(): Promise<void> } {
  const { enabled = true, delayMs = 800 } = options;

  const [status, setStatus] = useState<DraftStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const serialised = JSON.stringify(value);
  // Seeded with the first value seen, so mounting does not save the server's own data back
  // and show "Saved" on a form nobody has touched.
  const lastSaved = useRef<string>(serialised);
  const latest = useRef<string>(serialised);
  latest.current = serialised;

  const save = useRef(async (payload: string) => {
    setStatus("saving");
    const result = await franchiseOnboardingApi.saveDraft(handle, key, JSON.parse(payload));
    if (result.ok) {
      lastSaved.current = payload;
      setSavedAt(result.data.savedAt);
      setStatus("saved");
    } else {
      setStatus("error");
    }
  });

  useEffect(() => {
    if (!enabled || serialised === lastSaved.current) return;
    const timer = setTimeout(() => void save.current(serialised), delayMs);
    return () => clearTimeout(timer);
  }, [enabled, serialised, delayMs]);

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
