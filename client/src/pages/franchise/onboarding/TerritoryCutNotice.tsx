"use client";

import { Button } from "@/components/ui/button";
import { franchiseTerritoryLabel } from "@shared/franchise/onboarding/schema";
import type { FranchiseOnboardingState } from "@shared/franchise/onboarding/types";

/**
 * Granted is not what was requested, said wherever the franchisee actually is.
 *
 * Step 4 is the screen written to disclose this, and nobody lands on it. Approval is completed on
 * read, so the moment it arrives `completedStepsOnRead` adds 4, `deriveCurrentStep` returns 5, and
 * a franchisee opening their link goes straight to the commercial terms. The one screen that says
 * three suburbs of five were cut is reachable only by pressing back on the rail.
 *
 * So this is a component rather than markup in `StepApproval`: the comparison has to be on the
 * path between an approval and a signature, not on a step beside it. It renders nothing when the
 * grant matches the request, which is the common case, and nothing before a decision.
 */
export default function TerritoryCutNotice({
  state,
  onSeeBoundary,
}: {
  state: FranchiseOnboardingState;
  /** Offered where the granted boundary is not already on screen. */
  onSeeBoundary?: () => void;
}) {
  const approval = state.approval;
  if (!approval || approval.outcome !== "approved") return null;

  const requested = franchiseTerritoryLabel(state.territory).trim();
  const granted = approval.territory.trim();
  if (granted === requested) return null;

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-2.5"
      data-testid="territory-differs"
    >
      <p className="text-xs font-semibold text-amber-900">
        Not the same as your request
      </p>
      <p className="text-sm text-amber-900 leading-relaxed">
        You asked for {requested}. What is granted is {granted}, and that is what the term sheet
        will say. Read the boundary before you sign.
      </p>
      {onSeeBoundary && (
        <Button
          type="button"
          variant="outline"
          onClick={onSeeBoundary}
          className="min-h-11 rounded-lg text-xs font-semibold cursor-pointer border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-900"
          data-testid="button-see-granted-boundary"
        >
          See the granted boundary
        </Button>
      )}
    </div>
  );
}
