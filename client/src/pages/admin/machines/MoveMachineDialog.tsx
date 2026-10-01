"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchActiveFranchises,
  fetchFranchiseNetwork,
  fetchGymsWithoutMachine,
  moveMachine,
  type FranchiseTarget,
  type GymTarget,
} from "@/lib/adminOwnershipApi";
import type { MachineMove, OwnerMove, OwnerView } from "@shared/admin/ownership";
import { WarningPanel } from "./WarningPanel";
import { FormRow, NativeSelect, TextInput } from "./formBits";
import { MachineDialog, ProblemPanel, type Problem } from "./MachinesUi";
import { allocationNote, checkPlacement, franchiseChangeNote, ownerLine, ownershipProblem, type PlacementDraft } from "./ownerRules";

type Destination = "stock" | "franchise" | "gym";

const DESTINATIONS: { value: Destination; label: string; hint: string }[] = [
  { value: "gym", label: "A gym", hint: "Place it at a gym that has no machine." },
  { value: "franchise", label: "A franchise", hint: "The franchise holds it until it is placed at one of its gyms." },
  { value: "stock", label: "MBP stock", hint: "Back with MBP, not held by any gym or franchise." },
];

export function MoveMachineDialog({
  open,
  sn,
  owner,
  defaultModel,
  onClose,
  onMoved,
  onStale,
}: {
  open: boolean;
  sn: string;
  owner: OwnerView;
  defaultModel: string;
  onClose: () => void;
  onMoved: (result: MachineMove) => void;
  onStale: () => void;
}) {
  const [destination, setDestination] = useState<Destination>("gym");
  const [franchises, setFranchises] = useState<FranchiseTarget[] | null>(null);
  const [gyms, setGyms] = useState<GymTarget[] | null>(null);
  const [franchiseId, setFranchiseId] = useState("");
  const [draft, setDraft] = useState<PlacementDraft>(emptyDraft(defaultModel));
  const [allocation, setAllocation] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(owner.ownerState === "placed" ? "stock" : "gym");
    setFranchiseId("");
    setDraft(emptyDraft(defaultModel));
    setErrors({});
    setProblem(null);
    setStale(false);
    setAllocation(null);
    fetchActiveFranchises().then((result) => {
      if (result.ok) setFranchises(result.data);
      else setProblem({ message: result.error.message, issues: result.issues });
    });
    fetchGymsWithoutMachine().then((result) => {
      if (result.ok) setGyms(result.data);
      else setProblem({ message: result.error.message, issues: result.issues });
    });
  }, [open, owner.ownerState, defaultModel]);

  const gym = gyms?.find((g) => g.gymId === draft.gymId) ?? null;
  const receivingFranchise = destination === "franchise" ? franchiseId : destination === "gym" ? (gym?.franchiseId ?? "") : "";
  const alreadyHeld = receivingFranchise !== "" && receivingFranchise === owner.franchiseId;

  useEffect(() => {
    setAllocation(null);
    if (!receivingFranchise || alreadyHeld) return;
    let current = true;
    fetchFranchiseNetwork(receivingFranchise).then((result) => {
      if (current && result.ok) setAllocation(allocationNote(result.data, 1));
    });
    return () => {
      current = false;
    };
  }, [receivingFranchise, alreadyHeld]);

  const unchanged =
    (destination === "stock" && owner.ownerState === "stock") ||
    (destination === "franchise" && owner.ownerState === "franchise_unplaced" && franchiseId === owner.franchiseId);
  const franchiseNote = destination === "gym" && gym ? franchiseChangeNote(owner, gym) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    let move: OwnerMove;
    if (destination === "stock") move = { to: "stock", expectedVersion: owner.version };
    else if (destination === "franchise") {
      if (!franchiseId) {
        setErrors({ franchiseId: "Choose a franchise." });
        return;
      }
      move = { to: "franchise", franchiseId, expectedVersion: owner.version };
    } else {
      const checked = checkPlacement(draft);
      if (!checked.placement) {
        setErrors(checked.errors);
        return;
      }
      move = { to: "gym", ...checked.placement, expectedVersion: owner.version };
    }
    setErrors({});
    setSaving(true);
    const result = await moveMachine(sn, move);
    setSaving(false);
    if (!result.ok) {
      const found = ownershipProblem(result.error, "sn");
      setErrors(found.fieldErrors);
      setProblem({ message: found.message, issues: result.issues });
      setStale(found.kind === "stale");
      return;
    }
    onMoved(result.data);
  }

  const set = (patch: Partial<PlacementDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title="Move machine"
      description={`Now: ${ownerLine(owner)}. Past orders keep the owner they were made under.`}
      wide={destination === "gym"}
      testId="dialog-move-machine"
    >
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="move-machine-form">
        <ProblemPanel problem={problem} testId="move-machine-error" />
        {stale && (
          <Button type="button" variant="outline" onClick={onStale} className="rounded-xl cursor-pointer" data-testid="button-move-reload">
            Reload
          </Button>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-semibold text-muted-foreground">Move to</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {DESTINATIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                  destination === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                }`}
              >
                <input
                  type="radio"
                  name="move-destination"
                  value={option.value}
                  checked={destination === option.value}
                  onChange={() => {
                    setDestination(option.value);
                    setErrors({});
                  }}
                  className="mt-0.5 h-4 w-4 accent-primary"
                  data-testid={`move-to-${option.value}`}
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {destination === "franchise" && (
          <FormRow label="Franchise" htmlFor="move-franchise" error={errors.franchiseId} hint="Only active franchises can hold machines.">
            <NativeSelect
              id="move-franchise"
              value={franchiseId}
              onChange={setFranchiseId}
              disabled={!franchises}
              options={[
                { value: "", label: franchises ? (franchises.length ? "Choose a franchise" : "No active franchises") : "Loading…" },
                ...(franchises ?? []).map((f) => ({ value: f.franchiseId, label: f.name })),
              ]}
            />
          </FormRow>
        )}

        {destination === "gym" && (
          <>
            <FormRow label="Gym" htmlFor="move-gym" error={errors.gymId} hint="Gyms with no machine. Offboarded gyms aren't listed.">
              <NativeSelect
                id="move-gym"
                value={draft.gymId}
                onChange={(gymId) => set({ gymId })}
                disabled={!gyms}
                options={[
                  { value: "", label: gyms ? (gyms.length ? "Choose a gym" : "Every gym has a machine") : "Loading…" },
                  ...(gyms ?? []).map((g) => ({ value: g.gymId, label: g.franchiseName ? `${g.name} (${g.franchiseName})` : g.name })),
                ]}
              />
            </FormRow>
            {franchiseNote && <WarningPanel testId="move-franchise-note">{franchiseNote}</WarningPanel>}
            <p className="text-xs text-muted-foreground">These go on the gym's machine record and its agreement schedule.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label="Model" htmlFor="move-model" error={errors.model}>
                <TextInput id="move-model" value={draft.model} onChange={(model) => set({ model })} maxLength={120} />
              </FormRow>
              <FormRow label="Serial number" htmlFor="move-serial" error={errors.serialNumber} hint="Optional.">
                <TextInput id="move-serial" value={draft.serialNumber} onChange={(serialNumber) => set({ serialNumber })} mono maxLength={120} />
              </FormRow>
              <FormRow label="Value (₹)" htmlFor="move-value" error={errors.valueInr} hint="Whole rupees.">
                <TextInput id="move-value" value={draft.valueInr} onChange={(valueInr) => set({ valueInr })} inputMode="numeric" />
              </FormRow>
              <FormRow label="Installation date" htmlFor="move-installed" error={errors.installationDate} hint="Optional. A future date books the installation.">
                <TextInput id="move-installed" type="date" value={draft.installationDate} onChange={(installationDate) => set({ installationDate })} />
              </FormRow>
            </div>
            <FormRow label="Accessories" htmlFor="move-accessories" error={errors.accessories} hint="Optional.">
              <TextInput
                id="move-accessories"
                value={draft.accessories}
                onChange={(accessories) => set({ accessories })}
                placeholder="Cup dispenser, water filter, base cabinet"
                maxLength={2000}
              />
            </FormRow>
          </>
        )}

        {destination === "stock" && owner.ownerState === "placed" && (
          <WarningPanel testId="move-stock-note">
            {owner.gymName ?? "The gym"} will have no machine until another one is placed there.
          </WarningPanel>
        )}
        {allocation && <WarningPanel testId="move-allocation-note">{allocation}</WarningPanel>}
        {unchanged && <p className="text-xs text-muted-foreground" data-testid="move-unchanged">The machine is already there.</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || unchanged} className="rounded-xl cursor-pointer" data-testid="button-move-machine">
            {saving ? "Moving…" : "Move machine"}
          </Button>
        </div>
      </form>
    </MachineDialog>
  );
}

function emptyDraft(model: string): PlacementDraft {
  return { gymId: "", model, serialNumber: "", valueInr: "", accessories: "", installationDate: "" };
}
