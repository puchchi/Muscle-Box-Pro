"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { DraftStatus } from "./useDraftAutosave";

/**
 * "Saved" / "Saving..." next to the Continue button.
 *
 * Small, but it is the only evidence a gym has that closing the tab is safe. The
 * footer promises progress is saved; this is what makes the promise checkable.
 *
 * `idle` renders nothing rather than "Not saved" — on a form nobody has touched,
 * "not saved" is alarming and untrue.
 *
 * The live region is the outer span, which is always in the tree even when it is
 * empty. A region that appears at the same moment as its text is usually not
 * announced at all, so "Couldn't save" would have been a purely visual message on the
 * one status that matters — and it is the failure case, not the success case, that a
 * gym needs told rather than shown.
 */
export default function DraftIndicator({ status }: { status: DraftStatus }) {
  return (
    <span role="status" aria-live="polite" className="min-w-0">
      {status === "saving" && (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid="draft-saving">
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
          Saving...
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-700 font-medium flex items-center gap-1.5" data-testid="draft-error">
          <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          Couldn't save. Check your connection
        </span>
      )}
      {status === "saved" && (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid="draft-saved">
          <Check className="w-3 h-3 text-primary-ink flex-shrink-0" aria-hidden="true" />
          Saved
        </span>
      )}
    </span>
  );
}
