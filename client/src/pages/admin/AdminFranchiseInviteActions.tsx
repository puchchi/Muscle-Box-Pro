"use client";

import type { AdminFranchiseView } from "@shared/admin/franchises";
import { resendFranchiseInvite, voidFranchiseInvite } from "@/lib/adminFranchiseApi";
import { InviteActions } from "./InviteActions";

export function FranchiseInviteActions({ franchise, onChanged }: { franchise: AdminFranchiseView; onChanged: () => void }) {
  return (
    <InviteActions
      subject="franchise"
      invite={franchise.invite}
      noticesEmail={franchise.details.noticesEmail}
      voidBody="Whoever holds it gets a dead page. Nothing is emailed, and the token is kept as a record of which link they had. The far end of this link is an Aadhaar signature, so revoking a link that has gone to the wrong person is the point of this button."
      onResend={(body) => resendFranchiseInvite(franchise.franchiseId, body)}
      onVoid={() => voidFranchiseInvite(franchise.franchiseId)}
      onChanged={onChanged}
    />
  );
}
