"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  fetchActiveFranchises,
  fetchFranchiseNetwork,
  OFFBOARDED_LIFECYCLES,
  setGymFranchise,
  type FranchiseTarget,
} from "@/lib/adminOwnershipApi";
import type { AdminGymView } from "@shared/admin/gyms";
import type { GymFranchise } from "@shared/admin/ownership";
import { Card, SuccessPanel } from "./AdminUi";
import { FormRow, NativeSelect } from "./machines/formBits";
import { MachineDialog, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { FranchiseLink } from "./machines/ownerBits";
import { allocationNote, ownershipProblem } from "./machines/ownerRules";
import { WarningPanel } from "./machines/WarningPanel";

export function GymFranchiseCard({ gym, onChanged }: { gym: AdminGymView; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const offboarded = gym.offboarding ? OFFBOARDED_LIFECYCLES.has(gym.offboarding.state) : false;
  const machinePath = gym.liveDeviceNo ? `/machines/${encodeURIComponent(gym.liveDeviceNo)}` : null;

  function saved(result: GymFranchise) {
    setOpen(false);
    if (!result.changed) setDone("Nothing changed.");
    else if (result.franchiseId) setDone(`Saved. The gym is now in ${result.franchiseName ?? result.franchiseId}.`);
    else setDone("Saved. The gym is now MBP-direct.");
    onChanged();
  }

  return (
    <Card
      id="franchise"
      title="Franchise and machine"
      note="Orders are credited to the gym and franchise that held the machine when the order was made."
      testId="card-gym-franchise"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
          disabled={offboarded}
          title={offboarded ? "An offboarded gym can't join a franchise." : undefined}
          className="h-8 rounded-xl cursor-pointer"
          data-testid="button-open-gym-franchise"
        >
          Change franchise
        </Button>
      }
    >
      {done && (
        <div className="px-4 pt-3 sm:px-5">
          <SuccessPanel testId="gym-franchise-saved">{done}</SuccessPanel>
        </div>
      )}
      <dl className="divide-y divide-border/60 py-1">
        <Row label="Franchise" testId="gym-franchise">
          {gym.franchiseId ? (
            <FranchiseLink franchiseId={gym.franchiseId} name={gym.franchiseName} className="text-foreground" />
          ) : (
            <span className="text-muted-foreground">None. The gym is MBP-direct.</span>
          )}
        </Row>
        <Row label="Machine" testId="gym-live-machine">
          {machinePath ? (
            <Link href={`${machinePath}?tab=owner`} className="font-mono text-xs text-foreground hover:text-primary hover:underline">
              {gym.liveDeviceNo}
            </Link>
          ) : (
            <span className="text-muted-foreground">None placed. Place one from a machine&apos;s Owner tab.</span>
          )}
        </Row>
        <Row label="Sales">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href={`/machines/orders?gymId=${encodeURIComponent(gym.gymId)}`} className="text-primary hover:underline" data-testid="gym-orders-link">
              Orders
            </Link>
            <Link
              href={`/machines/statistics?gymId=${encodeURIComponent(gym.gymId)}`}
              className="text-primary hover:underline"
              data-testid="gym-stats-link"
            >
              Statistics
            </Link>
          </span>
        </Row>
      </dl>
      <GymFranchiseDialog
        open={open}
        gym={gym}
        onClose={() => setOpen(false)}
        onSaved={saved}
        onStale={() => {
          setOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

const NONE = "__none__";

function GymFranchiseDialog({
  open,
  gym,
  onClose,
  onSaved,
  onStale,
}: {
  open: boolean;
  gym: AdminGymView;
  onClose: () => void;
  onSaved: (result: GymFranchise) => void;
  onStale: () => void;
}) {
  const [franchises, setFranchises] = useState<FranchiseTarget[] | null>(null);
  const [choice, setChoice] = useState("");
  const [allocation, setAllocation] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoice("");
    setProblem(null);
    setStale(false);
    fetchActiveFranchises().then((result) => {
      if (result.ok) setFranchises(result.data);
      else setProblem({ message: result.error.message, issues: result.issues });
    });
  }, [open]);

  const target = choice === NONE ? null : choice;
  const unchanged = choice === "" || target === gym.franchiseId;
  const targetName = franchises?.find((f) => f.franchiseId === target)?.name ?? target;

  useEffect(() => {
    setAllocation(null);
    if (!target || unchanged || !gym.liveDeviceNo) return;
    let current = true;
    fetchFranchiseNetwork(target).then((result) => {
      if (current && result.ok) setAllocation(allocationNote(result.data, 1));
    });
    return () => {
      current = false;
    };
  }, [target, unchanged, gym.liveDeviceNo]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (unchanged) return;
    setSaving(true);
    const result = await setGymFranchise(gym.gymId, target, gym.ownershipVersion);
    setSaving(false);
    if (!result.ok) {
      const found = ownershipProblem(result.error, "deviceNo");
      setProblem({ message: found.message, issues: result.issues });
      setStale(found.kind === "stale");
      return;
    }
    onSaved(result.data);
  }

  const options = [
    { value: "", label: franchises ? "Choose" : "Loading…" },
    { value: NONE, label: "None. Make the gym MBP-direct." },
    ...(franchises ?? []).map((f) => ({ value: f.franchiseId, label: f.name })),
  ];

  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title="Change franchise"
      description={`Now: ${gym.franchiseId ? (gym.franchiseName ?? gym.franchiseId) : "MBP-direct"}. Past orders keep the franchise they were made under.`}
      testId="dialog-gym-franchise"
    >
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="gym-franchise-form">
        <ProblemPanel problem={problem} testId="gym-franchise-error" />
        {stale && (
          <Button type="button" variant="outline" onClick={onStale} className="rounded-xl cursor-pointer" data-testid="button-gym-franchise-reload">
            Reload
          </Button>
        )}
        <FormRow label="Franchise" htmlFor="gym-franchise-select" hint="Only active franchises are listed.">
          <NativeSelect id="gym-franchise-select" value={choice} onChange={setChoice} disabled={!franchises} options={options} />
        </FormRow>
        {!unchanged && gym.liveDeviceNo && (
          <WarningPanel testId="gym-franchise-machine-note">
            {target
              ? `The machine at this gym, ${gym.liveDeviceNo}, moves to ${targetName} with it.`
              : `The machine at this gym, ${gym.liveDeviceNo}, becomes MBP-direct. It stays at the gym.`}
          </WarningPanel>
        )}
        {allocation && <WarningPanel testId="gym-franchise-allocation-note">{allocation}</WarningPanel>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || unchanged} className="rounded-xl cursor-pointer" data-testid="button-save-gym-franchise">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </MachineDialog>
  );
}

function Row({ label, testId, children }: { label: string; testId?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-baseline gap-x-4 px-4 py-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:px-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}
