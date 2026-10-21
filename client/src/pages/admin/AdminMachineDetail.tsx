"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchMachine, fetchModels } from "@/lib/adminMachineApi";
import type { Machine, MachineModel } from "@shared/admin/machinesSchema";
import type { MachineViewer, Permission } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { Pill } from "./AdminUi";
import { MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { MachineSettingsTab } from "./machines/MachineSettingsTab";
import { MachinePinTab } from "./machines/MachinePinTab";
import { MachineGoodsTab } from "./machines/MachineGoodsTab";
import { MachineStockTab } from "./machines/MachineStockTab";
import { MachineVoicesTab } from "./machines/MachineVoicesTab";
import { MachineOwnerTab } from "./machines/MachineOwnerTab";
import { MachineRemoteTab } from "./machines/MachineRemoteTab";
import { machineIotConfigured } from "@/lib/machineIotApi";

const REMOTE_PERMISSIONS: Permission[] = [
  "remote.mqtt.edit",
  "remote.clean.edit",
  "remote.door.edit",
  "remote.lock.edit",
  "remote.unlock.edit",
  "remote.water.edit",
  "remote.uploadLog.edit",
  "remote.reload.edit",
  "remote.restart.edit",
  "remote.live.view",
];

const TABS = [
  { id: "settings", label: "Settings", needs: ["settings.facts.view"] },
  { id: "owner", label: "Owner", needs: ["owner.view"] },
  { id: "goods", label: "Goods", needs: ["machineGoods.view"] },
  { id: "stock", label: "Stock", needs: ["stock.view"] },
  { id: "voices", label: "Voice prompts", needs: ["machineVoices.view"] },
  { id: "pin", label: "PINs", needs: ["pins.operator.view", "pins.factory.view"] },
  { id: "remote", label: "Remote control", needs: REMOTE_PERMISSIONS },
] as const satisfies ReadonlyArray<{ id: string; label: string; needs: ReadonlyArray<Permission> }>;

type TabId = (typeof TABS)[number]["id"];

export const visibleTabs = (viewer: MachineViewer) =>
  TABS.filter(
    (t) => (t.id !== "remote" || machineIotConfigured()) && t.needs.some((p: Permission) => viewer.can.has(p)),
  );

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function tabOf(raw: string | null, tabs: ReadonlyArray<{ id: TabId }>): TabId {
  return tabs.some((t) => t.id === raw) ? (raw as TabId) : (tabs[0]?.id ?? "settings");
}

export default function AdminMachineDetail({ sn }: { sn: string }) {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <MachineDetail session={guard.session} sn={sn} />;
}

function MachineDetail({ session, sn }: { session: MachineViewer; sn: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const can = (p: Permission) => session.can.has(p);
  const tabs = visibleTabs(session);
  const tab = tabOf(search?.get("tab") ?? null, tabs);
  const showLogs = can("logs.equipment.view") || can("logs.operations.view");
  const showFiles = can("files.logs.view") || can("files.backups.view");
  const [machine, setMachine] = useState<Machine | null>(null);
  const [models, setModels] = useState<MachineModel[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);

  const reload = useCallback(async () => {
    const result = await fetchMachine(sn);
    if (!result.ok) {
      setProblem(problemOf(result));
      return null;
    }
    setProblem(null);
    setMachine(result.data.machine);
    return result.data.machine;
  }, [sn]);

  useEffect(() => {
    void reload();
    fetchModels().then((result) => {
      if (result.ok) setModels(result.data.items);
    });
  }, [reload]);

  const keepMqtt = useCallback((saved: Machine) => setMachine((was) => ({ ...saved, mqtt: saved.mqtt ?? was?.mqtt ?? null })), []);

  const online = machine?.lastSeenAt ? Date.now() - new Date(machine.lastSeenAt).getTime() < ONLINE_WINDOW_MS : false;

  return (
    <MachinesShell session={session} section="machines">
      <MachinesHeader
        title={machine ? `${machine.deviceExtNo || machine.sn} · ${machine.name}` : "Machine"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines" className="text-primary hover:underline">
              Machines
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-xs">{sn}</span>
            {machine && (
              <>
                <Pill
                  className={online ? "bg-emerald-400/15 text-emerald-200" : "bg-secondary text-muted-foreground"}
                  testId="machine-network"
                >
                  {online ? "Online" : "Offline"}
                </Pill>
                {machine.enabled === false && (
                  <Pill className="bg-rose-400/15 text-rose-200" testId="machine-disabled">
                    Disabled
                  </Pill>
                )}
                {machine.mqtt?.state === "not_issued_to_this_tablet" && (
                  <Pill className="bg-rose-400/15 text-rose-200" testId="machine-mqtt-warning">
                    MQTT: unknown certificate
                  </Pill>
                )}
                {machine.restartPending && (
                  <Pill className="bg-amber-400/15 text-amber-200" testId="machine-restart">
                    Restart pending
                  </Pill>
                )}
              </>
            )}
          </span>
        }
        action={
          (showLogs || showFiles) && (
            <span className="flex gap-4">
              {showLogs && (
                <Link
                  href={`/machines/logs?sn=${encodeURIComponent(sn)}`}
                  className="text-sm font-semibold text-primary hover:underline"
                  data-testid="link-machine-logs"
                >
                  Logs
                </Link>
              )}
              {showFiles && (
                <Link
                  href={`/machines/${encodeURIComponent(sn)}/files`}
                  className="text-sm font-semibold text-primary hover:underline"
                  data-testid="link-machine-files"
                >
                  Files
                </Link>
              )}
            </span>
          )
        }
      />

      <ProblemPanel problem={problem} testId="machine-error" />

      {machine && (
        <>
          <div className="mb-5 flex flex-wrap gap-1" role="tablist" aria-label="Machine">
            {tabs.map((entry) => {
              const active = entry.id === tab;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => router.replace(`${pathname}?tab=${entry.id}`)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                  data-testid={`tab-${entry.id}`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>

          {tab === "settings" && <MachineSettingsTab machine={machine} models={models} onReload={reload} onSaved={keepMqtt} />}
          {tab === "owner" && <MachineOwnerTab machine={machine} onChanged={() => void reload()} />}
          {tab === "goods" && <MachineGoodsTab sn={machine.sn} />}
          {tab === "stock" && <MachineStockTab sn={machine.sn} />}
          {tab === "voices" && <MachineVoicesTab sn={machine.sn} onSaved={() => void reload()} />}
          {tab === "pin" && <MachinePinTab machine={machine} onChanged={() => void reload()} />}
          {tab === "remote" && <MachineRemoteTab machine={machine} onReload={reload} />}
        </>
      )}
    </MachinesShell>
  );
}
