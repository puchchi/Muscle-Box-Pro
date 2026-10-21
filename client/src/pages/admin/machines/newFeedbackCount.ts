import { useEffect, useSyncExternalStore } from "react";
import { listFeedback } from "@/lib/adminMachineApi";

let current: number | null = null;
const listeners = new Set<() => void>();

export function setNewFeedbackCount(n: number) {
  current = n;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNewFeedbackCount(enabled = true): number {
  const n = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    if (!enabled || current !== null) return;
    listFeedback({ state: "new" }, null, 1).then((result) => {
      if (result.ok) setNewFeedbackCount(result.data.newCount);
    });
  }, [enabled]);
  return enabled ? (n ?? 0) : 0;
}

export function adjustNewFeedbackCount(delta: number) {
  if (current !== null) setNewFeedbackCount(Math.max(0, current + delta));
}
