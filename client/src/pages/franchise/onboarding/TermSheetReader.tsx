"use client";

import { useMemo } from "react";

import {
  ISSUED_TERM_SHEET,
  TERM_SHEET_RENDER_OPTIONS,
  issuedTermSheetFields,
} from "@shared/franchise/termsheet/issued";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";
import type { FranchiseTermSheetFields } from "@shared/franchise/termsheet/types";
import AgreementReader from "../../onboarding/AgreementReader";

/**
 * The term sheet, on screen, for signature.
 *
 * A binding of `AgreementReader` rather than a second reader. The gym reader already solves the
 * hard parts of putting a contract on a 390px screen — page-level scroll, `<details>` per
 * section, the sticky contents strip, the scroll gate — and a copy would be two components
 * drifting apart on the one screen where what is displayed has to match what was hashed.
 *
 * What this file exists to own is the pairing. `ISSUED_TERM_SHEET`, `TERM_SHEET_RENDER_OPTIONS`
 * and `issuedTermSheetFields` are three values that must arrive together and are meaningless
 * apart: the options are part of *this* document's identity, and a caller passing the gym's by
 * omission would render a different document from the one the server hashed. So step 7 passes
 * the state and the effective date, and cannot get the pairing wrong.
 *
 * **The effective date is a parameter and comes from the server's pinned record.** Never
 * `new Date()`: it is rendered into the hashed text, so a browser clock deciding it is a hash
 * bug rather than a display one. Gym doc §21 is the incident.
 */
export default function TermSheetReader({
  state,
  effectiveDate,
  showInternalMarkers = false,
  onReachedEnd,
  onProgress,
}: {
  state: FranchiseOnboardingState;
  /** From `state.termSheet.effectiveDate`. There is no document to render without one. */
  effectiveDate: string;
  showInternalMarkers?: boolean;
  onReachedEnd?: () => void;
  onProgress?: (percent: number) => void;
}) {
  // The reader memoises the whole document on this object, and scrolling it re-renders this
  // component. A fresh object per render would rebuild forty-odd sections on every scroll frame.
  const fields = useMemo(() => issuedTermSheetFields(state, effectiveDate), [state, effectiveDate]);

  return (
    <AgreementReader<FranchiseTermSheetFields>
      agreement={ISSUED_TERM_SHEET}
      fields={fields}
      renderOptions={TERM_SHEET_RENDER_OPTIONS}
      showInternalMarkers={showInternalMarkers}
      onReachedEnd={onReachedEnd}
      onProgress={onProgress}
    />
  );
}
