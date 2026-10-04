"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { activateFranchise, type FranchiseActivateResult } from "@/lib/adminFranchiseApi";
import type { AdminFranchiseView } from "@shared/admin/franchises";
import { Card, Empty, ErrorPanel, Field, Fields, SuccessPanel } from "./AdminUi";
import { WarningPanel } from "./machines/WarningPanel";
import { formatIstDateTime } from "./adminFormat";

export function franchiseActivationContext(franchise: AdminFranchiseView): string[] {
  const { signedAt, paymentVerifiedAt, accountCreatedAt } = franchise.timestamps;
  const lines: string[] = [];
  if (signedAt === null) lines.push("They haven't signed the agreement yet. You can still activate.");
  else if (paymentVerifiedAt === null) lines.push("The first instalment isn't confirmed yet. You can still activate.");
  else lines.push("The agreement is signed and the first instalment is confirmed.");
  if (accountCreatedAt === null) lines.push("They have no portal login yet. The email asks them to reply for a link to set one up.");
  return lines;
}

export function FranchiseActivationCard({ franchise, onChanged }: { franchise: AdminFranchiseView; onChanged: () => void }) {
  const [notify, setNotify] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<FranchiseActivateResult | null>(null);

  const name = franchise.details.tradeName || franchise.details.legalEntityName || "this franchise";
  const activatedAt = franchise.timestamps.activatedAt;

  async function activate() {
    setBusy(true);
    setProblem(null);
    const result = await activateFranchise(franchise.franchiseId, { notify });
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setProblem(result.error.message);
      return;
    }
    setDone(result.data);
    onChanged();
  }

  if (franchise.status === "active" || activatedAt) {
    return (
      <Card id="activation" title="Activation" testId="card-franchise-activation">
        {done && (
          <div className="px-4 pt-3 sm:px-5">
            <SuccessPanel testId="franchise-activation-done">{doneMessage(done)}</SuccessPanel>
          </div>
        )}
        <Fields>
          <Field label="Activated" value={activatedAt ? formatIstDateTime(activatedAt) : null} />
        </Fields>
      </Card>
    );
  }

  if (franchise.status === "declined") {
    return (
      <Card id="activation" title="Activation" testId="card-franchise-activation">
        <Empty testId="franchise-activation-declined">This application was declined, so it can&apos;t be activated. Invite them again instead.</Empty>
      </Card>
    );
  }

  return (
    <Card
      id="activation"
      title="Activation"
      note="Activating makes the franchise live. Nothing has to be finished first, and it can't be undone."
      testId="card-franchise-activation"
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {problem && <ErrorPanel message={problem} testId="franchise-activation-error" />}

        <ul className="space-y-1 text-sm text-foreground" data-testid="franchise-activation-context">
          {franchiseActivationContext(franchise).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
            data-testid="checkbox-notify-franchise"
          />
          <span className="text-sm text-foreground">
            Email {franchise.details.noticesEmail || "the franchise"} that they are live
            <span className="block text-xs text-muted-foreground">Untick if they already know, for example when fixing a record.</span>
          </span>
        </label>

        {confirming ? (
          <WarningPanel testId="confirm-activate-franchise">
            <span className="block font-semibold">Activate {name}?</span>
            <span className="block">The franchise goes live. This can&apos;t be undone.</span>
            <span className="mt-3 flex gap-2.5">
              <Button onClick={activate} disabled={busy} className="h-9 rounded-xl cursor-pointer" data-testid="button-confirm-activate-franchise">
                {busy ? "Activating…" : "Activate"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                className="h-9 rounded-xl cursor-pointer bg-card"
                data-testid="button-cancel-activate-franchise"
              >
                Cancel
              </Button>
            </span>
          </WarningPanel>
        ) : (
          <Button
            onClick={() => {
              setProblem(null);
              setConfirming(true);
            }}
            className="h-9 rounded-xl cursor-pointer"
            data-testid="button-activate-franchise"
          >
            Activate franchise
          </Button>
        )}
      </div>
    </Card>
  );
}

function doneMessage(done: FranchiseActivateResult): string {
  if (!done.changed) return "This franchise was already active. Nothing changed.";
  if (done.emailed === true) return "Activated. They have been emailed that they are live.";
  if (done.emailed === false) return `Activated. The email didn't go${done.emailReason ? ` (${done.emailReason})` : ""}, so let them know yourself.`;
  return "Activated. No email was sent.";
}
