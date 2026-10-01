"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFranchiseNetwork } from "@/lib/adminOwnershipApi";
import type { FranchiseNetwork } from "@shared/admin/ownership";
import type { OffboardingState } from "@shared/admin/gyms";
import type { OnboardingStatus } from "@shared/onboarding/types";
import { Card, Empty, ErrorPanel, Pill } from "./AdminUi";
import { formatIstStamp } from "./machines/MachinesUi";
import { GymLink } from "./machines/ownerBits";
import { WarningPanel } from "./machines/WarningPanel";
import { OFFBOARDING_STATE_LABEL, STATUS_CLASS, STATUS_LABEL } from "./adminFormat";

export function FranchiseNetworkCard({ franchiseId }: { franchiseId: string }) {
  const [network, setNetwork] = useState<FranchiseNetwork | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchFranchiseNetwork(franchiseId).then((result) => {
      if (!current) return;
      if (result.ok) setNetwork(result.data);
      else setProblem(result.error.message);
    });
    return () => {
      current = false;
    };
  }, [franchiseId]);

  const query = `franchiseId=${encodeURIComponent(franchiseId)}`;

  return (
    <Card
      id="network"
      title="Gyms and machines"
      note={network ? countNote(network) : undefined}
      testId="card-franchise-network"
      action={
        <span className="flex gap-3 text-sm">
          <Link href={`/machines/orders?${query}`} className="text-primary hover:underline" data-testid="franchise-orders-link">
            Orders
          </Link>
          <Link href={`/machines/statistics?${query}`} className="text-primary hover:underline" data-testid="franchise-stats-link">
            Statistics
          </Link>
        </span>
      }
    >
      {problem && (
        <div className="px-4 py-3 sm:px-5">
          <ErrorPanel message={problem} testId="franchise-network-error" />
        </div>
      )}
      {network?.overAllocated && (
        <div className="px-4 pt-3 sm:px-5">
          <WarningPanel testId="franchise-over-allocated">
            This franchise holds {network.machineCount} machines. Its agreement allows {network.machineAllocation}.
          </WarningPanel>
        </div>
      )}
      {!network ? (
        !problem && <Empty testId="franchise-network-loading">Loading…</Empty>
      ) : network.gyms.length === 0 && network.unplacedMachines.length === 0 ? (
        <Empty testId="franchise-network-empty">No gyms or machines yet. Link a gym from its page, or move a machine here from its Owner tab.</Empty>
      ) : (
        <>
          {network.gyms.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-franchise-gyms">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-semibold sm:px-5">Gym</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">Machine</th>
                    <th className="hidden px-4 py-2 font-semibold sm:table-cell sm:px-5">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {network.gyms.map((gym) => (
                    <tr key={gym.gymId} data-testid={`network-gym-${gym.gymId}`}>
                      <td className="px-4 py-2.5 sm:px-5">
                        <GymLink gymId={gym.gymId} name={gym.gymName} className="font-medium text-foreground" />
                      </td>
                      <td className="px-4 py-2.5">
                        <GymStatus status={gym.status} lifecycle={gym.lifecycle} />
                      </td>
                      <td className="px-4 py-2.5">
                        {gym.machine ? <MachineLink sn={gym.machine.sn} /> : <span className="text-muted-foreground">None</span>}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground sm:table-cell sm:px-5">
                        {gym.machine ? formatIstStamp(gym.machine.since) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {network.unplacedMachines.length > 0 && (
            <div className="border-t border-border/70" data-testid="franchise-unplaced">
              <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">Not placed at a gym</p>
              <p className="px-4 pb-2 text-xs text-muted-foreground sm:px-5">Open a machine to place it at one of this franchise&apos;s gyms.</p>
              <ul className="divide-y divide-border/70">
                {network.unplacedMachines.map((machine) => (
                  <li key={machine.sn} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm sm:px-5">
                    <MachineLink sn={machine.sn} />
                    <span className="text-xs text-muted-foreground">Since {formatIstStamp(machine.since)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function countNote(network: FranchiseNetwork): string {
  const gyms = `${network.gyms.length} gym${network.gyms.length === 1 ? "" : "s"}`;
  const machines = `${network.machineCount} machine${network.machineCount === 1 ? "" : "s"}`;
  return network.machineAllocation === null ? `${gyms}, ${machines}.` : `${gyms}, ${machines} of ${network.machineAllocation} allowed.`;
}

function MachineLink({ sn }: { sn: string }) {
  return (
    <Link href={`/machines/${encodeURIComponent(sn)}?tab=owner`} className="font-mono text-xs text-foreground hover:text-primary hover:underline">
      {sn}
    </Link>
  );
}

function GymStatus({ status, lifecycle }: { status: string; lifecycle: string | null }) {
  if (lifecycle && lifecycle in OFFBOARDING_STATE_LABEL) {
    return <Pill className="bg-rose-400/15 text-rose-200">{OFFBOARDING_STATE_LABEL[lifecycle as OffboardingState]}</Pill>;
  }
  if (status in STATUS_LABEL) {
    return <Pill className={STATUS_CLASS[status as OnboardingStatus]}>{STATUS_LABEL[status as OnboardingStatus]}</Pill>;
  }
  return <span className="text-muted-foreground">{status}</span>;
}
