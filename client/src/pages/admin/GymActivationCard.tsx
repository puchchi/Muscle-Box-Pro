"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { activateGym, type GymActivateResult } from "@/lib/adminApi";
import type { AdminGymView } from "@shared/admin/gyms";
import { Card, ErrorPanel, Field, Fields, SuccessPanel } from "./AdminUi";
import { WarningPanel } from "./machines/WarningPanel";
import { formatIstDateTime } from "./adminFormat";
import { activationChecks, MAX_WAIVER_REASON, plainActivationMessage, planActivation } from "./activationRules";

export function GymActivationCard({ gym, onChanged }: { gym: AdminGymView; onChanged: () => void }) {
  const [waiverReason, setWaiverReason] = useState("");
  const [notifyGym, setNotifyGym] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<GymActivateResult | null>(null);

  const checks = activationChecks(gym);
  const plan = planActivation(gym, waiverReason, notifyGym);
  const needsWaiver = gym.depositStatus !== "paid";

  async function activate() {
    if (!plan.ready) return;
    setBusy(true);
    setProblem(null);
    const result = await activateGym(gym.gymId, plan.body);
    setBusy(false);
    if (!result.ok) {
      setProblem(plainActivationMessage(result.error.message));
      setConfirming(false);
      return;
    }
    setDone(result.data);
    setConfirming(false);
    onChanged();
  }

  if (gym.activatedAt) {
    return (
      <Card id="activation" title="Activation" testId="card-activation">
        {done && (
          <div className="px-4 pt-3 sm:px-5">
            <SuccessPanel testId="activation-done">{doneMessage(done)}</SuccessPanel>
          </div>
        )}
        <Fields>
          <Field label="Activated" value={formatIstDateTime(gym.activatedAt)} />
          <Field label="By" value={gym.activatedByEmail} />
        </Fields>
      </Card>
    );
  }

  return (
    <Card id="activation" title="Activation" note="Activating makes the gym live. It can't be undone." testId="card-activation">
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {problem && <ErrorPanel message={problem} testId="activation-error" />}

        <ul className="space-y-2.5" data-testid="activation-checks">
          {checks.map((check) => (
            <li key={check.key} className="flex items-start gap-2.5 text-sm" data-testid={`activation-check-${check.key}`} data-ok={check.ok}>
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" aria-hidden />
              )}
              <span>
                <span className="font-medium text-foreground">{check.label}</span>
                <span className="block text-xs text-muted-foreground">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        {needsWaiver && (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Why the deposit is being waived</span>
            <Textarea
              value={waiverReason}
              onChange={(event) => setWaiverReason(event.target.value)}
              maxLength={MAX_WAIVER_REASON}
              rows={2}
              placeholder="For example: agreed with the owner to collect it from the first payout."
              className="mt-1 rounded-xl bg-card border-border"
              data-testid="input-waiver-reason"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Saved on the gym with your name, so anyone can see later why it was skipped.</span>
          </label>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyGym}
            onChange={(event) => setNotifyGym(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
            data-testid="checkbox-notify-gym"
          />
          <span className="text-sm text-foreground">
            Email {gym.details.noticesEmail || "the gym"} that they are live
            <span className="block text-xs text-muted-foreground">Untick if the gym already knows, for example when fixing a record.</span>
          </span>
        </label>

        {!plan.ready && (
          <p className="text-xs text-amber-200" data-testid="activation-blocked">
            {plan.message}
          </p>
        )}

        {confirming ? (
          <WarningPanel testId="confirm-activate">
            <span className="block font-semibold">Activate {gym.details.tradeName || "this gym"}?</span>
            <span className="block">
              The gym goes live and its agreement term starts.{" "}
              {needsWaiver ? "The deposit is recorded as waived. " : ""}This can&apos;t be undone.
            </span>
            <span className="mt-3 flex gap-2.5">
              <Button onClick={activate} disabled={busy} className="h-9 rounded-xl cursor-pointer" data-testid="button-confirm-activate">
                {busy ? "Activating…" : "Activate"}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)} className="h-9 rounded-xl cursor-pointer bg-card" data-testid="button-cancel-activate">
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
            disabled={!plan.ready}
            className="h-9 rounded-xl cursor-pointer"
            data-testid="button-activate-gym"
          >
            Activate gym
          </Button>
        )}
      </div>
    </Card>
  );
}

function doneMessage(done: GymActivateResult): string {
  if (!done.changed) return "This gym was already active. Nothing changed.";
  if (done.emailed === true) return "Activated. The gym has been emailed that they are live.";
  if (done.emailed === false) return `Activated. The email didn't go${done.emailReason ? ` (${done.emailReason})` : ""}, so let the gym know yourself.`;
  return "Activated. No email was sent.";
}
