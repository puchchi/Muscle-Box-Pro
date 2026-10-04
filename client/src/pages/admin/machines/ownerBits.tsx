"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOwnerChoices, type OwnerChoices } from "@/lib/adminOwnershipApi";
import type { OwnerState } from "@shared/admin/ownership";
import { Pill } from "../AdminUi";
import { SelectFilter } from "./MachinesUi";
import { OWNER_STATE_LABEL } from "./ownerRules";

const OWNER_STATE_TONE: Record<OwnerState, string> = {
  stock: "bg-secondary text-muted-foreground",
  franchise_unplaced: "bg-amber-400/15 text-amber-200",
  placed: "bg-emerald-400/15 text-emerald-200",
};

export function OwnerPill({ state, testId }: { state: OwnerState; testId?: string }) {
  return (
    <Pill className={OWNER_STATE_TONE[state]} testId={testId}>
      {OWNER_STATE_LABEL[state]}
    </Pill>
  );
}

type OwnerNames = { gymId: string | null; gymName: string | null; franchiseId: string | null; franchiseName: string | null };

export function OwnerCellText({ owner, empty = "MBP stock" }: { owner: OwnerNames | null; empty?: string }) {
  if (!owner || (!owner.gymId && !owner.franchiseId)) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <span className="block min-w-0">
      {owner.gymId ? (
        <GymLink gymId={owner.gymId} name={owner.gymName} className="font-medium text-foreground" />
      ) : (
        <span className="text-muted-foreground">Not placed</span>
      )}
      {owner.franchiseId && (
        <span className="block text-xs text-muted-foreground">
          <FranchiseLink franchiseId={owner.franchiseId} name={owner.franchiseName} />
        </span>
      )}
    </span>
  );
}

export function GymLink({ gymId, name, className = "" }: { gymId: string; name: string | null; className?: string }) {
  return (
    <Link href={`/admin/gyms/${encodeURIComponent(gymId)}`} className={`hover:text-primary hover:underline ${className}`}>
      {name ?? <span className="font-mono text-xs">{gymId}</span>}
    </Link>
  );
}

export function FranchiseLink({ franchiseId, name, className = "" }: { franchiseId: string; name: string | null; className?: string }) {
  return (
    <Link href={`/admin/franchises/${encodeURIComponent(franchiseId)}`} className={`hover:text-primary hover:underline ${className}`}>
      {name ?? <span className="font-mono text-xs">{franchiseId}</span>}
    </Link>
  );
}

export function useOwnerChoices(): OwnerChoices | null {
  const [choices, setChoices] = useState<OwnerChoices | null>(null);
  useEffect(() => {
    let current = true;
    fetchOwnerChoices().then((result) => {
      if (current) setChoices(result.ok ? result.data : { franchises: [], gyms: [] });
    });
    return () => {
      current = false;
    };
  }, []);
  return choices;
}

export function OwnerSelectFilters({
  choices,
  franchiseId,
  gymId,
  onFranchise,
  onGym,
}: {
  choices: OwnerChoices | null;
  franchiseId: string;
  gymId: string;
  onFranchise: (franchiseId: string) => void;
  onGym: (gymId: string) => void;
}) {
  const all = choices ? "All" : "Loading…";
  const withMissing = (options: { value: string; label: string }[], value: string) =>
    value && !options.some((o) => o.value === value) ? [...options, { value, label: value }] : options;
  return (
    <>
      <SelectFilter
        label="Franchise"
        value={franchiseId}
        onChange={onFranchise}
        options={[{ value: "", label: all }, ...withMissing((choices?.franchises ?? []).map((f) => ({ value: f.franchiseId, label: f.name })), franchiseId)]}
        testId="filter-franchise"
      />
      <SelectFilter
        label="Gym"
        value={gymId}
        onChange={onGym}
        options={[{ value: "", label: all }, ...withMissing((choices?.gyms ?? []).map((g) => ({ value: g.gymId, label: g.name })), gymId)]}
        testId="filter-gym"
      />
    </>
  );
}
