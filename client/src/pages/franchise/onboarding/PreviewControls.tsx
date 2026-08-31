"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

import { previewFranchise } from "@/lib/franchiseOnboardingApi";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";

/**
 * The writes that are ours rather than the franchisee's, as buttons, in preview mode only.
 *
 * Three of the nine steps do not move when the franchisee does anything: an admin approves,
 * Digio's webhook lands a signature, an admin ties a UTR to a bank statement. Against the mock
 * there is no admin and no webhook, so without this strip the preview stops dead at step 4 and
 * the six steps after it are unreachable, which makes them unreviewable. See
 * docs/franchise-onboarding.md §11 phase 5.
 *
 * Rendered only behind `IS_MOCK_FRANCHISE_ONBOARDING`, and deleted wholesale when the admin
 * routes exist. Every button here stands in for a route in §9 or the webhook in §6.4, and the
 * hatch it calls lives beside the mock rather than in the API surface, so nothing in the live
 * client can reach one.
 *
 * Only the hatches for the step on screen are shown. All six at once is a control panel to
 * decode; the two or three that could move *this* step are a choice.
 */

type Props = {
  handle: string;
  state: FranchiseOnboardingState;
  viewStep: number;
  /** Re-reads the record. The hatches write to the store behind the API, not through it. */
  onChanged(): Promise<void>;
};

type Hatch = {
  label: string;
  /** Why this one is unavailable right now, or null. Shown as the button's title. */
  unavailable: string | null;
  run(handle: string): FranchiseOnboardingState | null;
};

function hatchesFor(step: number, state: FranchiseOnboardingState): Hatch[] {
  const outcome = state.approval?.outcome ?? null;
  const firstPayment = state.payments.find((p) => p.instalment === 1) ?? null;
  const hasClaim = firstPayment?.claim != null;

  if (step === 4) {
    return [
      {
        label: "Approve",
        unavailable: outcome === "declined" ? "Declined is terminal" : null,
        run: (h) => previewFranchise.approve(h),
      },
      {
        label: "Hold",
        unavailable: outcome === "declined" ? "Declined is terminal" : null,
        run: (h) => previewFranchise.hold(h),
      },
      {
        label: "Decline",
        // The ladder refuses it, and `previewDecline` returns null rather than writing a
        // declined decision under an approved status.
        unavailable: state.isApproved ? "The ladder refuses it after approval" : null,
        run: (h) => previewFranchise.decline(h),
      },
    ];
  }

  if (step === 7) {
    return [
      {
        label: "Complete signature",
        unavailable: state.isSigned
          ? "Already signed"
          : state.esign.request
            ? null
            : "Request the signature first",
        run: (h) => previewFranchise.completeEsign(h),
      },
    ];
  }

  if (step === 8) {
    return [
      {
        label: "Verify payment",
        unavailable: firstPayment?.verifiedAt
          ? "Already verified"
          : hasClaim
            ? null
            : "No claim to verify yet",
        run: (h) => previewFranchise.verifyPayment(h),
      },
      {
        label: "Verify short by ₹500",
        unavailable: firstPayment?.verifiedAt
          ? "Already verified"
          : hasClaim
            ? null
            : "No claim to verify yet",
        // The case the two amount fields exist for: a bank that deducted charges (§7.3).
        run: (h) =>
          previewFranchise.verifyPayment(
            h,
            firstPayment ? firstPayment.expectedPaise - 50_000 : undefined,
          ),
      },
      {
        label: "Refuse claim",
        unavailable: firstPayment?.verifiedAt
          ? "Already verified"
          : hasClaim
            ? null
            : "No claim to refuse yet",
        run: (h) => previewFranchise.refusePayment(h),
      },
    ];
  }

  return [];
}

export default function PreviewControls({ handle, state, viewStep, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const hatches = hatchesFor(viewStep, state);
  if (hatches.length === 0) return null;

  async function fire(hatch: Hatch) {
    setBusy(true);
    try {
      hatch.run(handle);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="bg-violet-50 border-b border-violet-200 py-2"
      data-testid="franchise-preview-controls"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900 flex items-center gap-1.5">
          <Wand2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          Our side
        </p>
        {hatches.map((hatch) => (
          <button
            key={hatch.label}
            type="button"
            disabled={busy || hatch.unavailable !== null}
            title={hatch.unavailable ?? undefined}
            onClick={() => void fire(hatch)}
            data-testid={`preview-${hatch.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-900 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {hatch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
