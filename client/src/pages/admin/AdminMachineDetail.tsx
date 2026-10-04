"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchMachine, fetchModels } from "@/lib/adminMachineApi";
import type { Machine, MachineModel } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
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

const TABS = [
  { id: "settings", label: "Settings" },
  { id: "owner", label: "Owner" },
  { id: "goods", label: "Goods" },
  { id: "stock", label: "Stock" },
  { id: "voices", label: "Voice prompts" },
  { id: "pin", label: "PINs" },
  { id: "remote", label: "Remote control" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const VISIBLE_TABS = TABS.filter((t) => t.id !== "remote" || machineIotConfigured());

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function tabOf(raw: string | null): TabId {
  return VISIBLE_TABS.some((t) => t.id === raw) ? (raw as TabId) : "settings";
}

export default function AdminMachineDetail({ sn }: { sn: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <MachineDetail session={guard.session} sn={sn} />;
}

function MachineDetail({ session, sn }: { session: AdminSession; sn: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const tab = tabOf(search?.get("tab") ?? null);
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
                {!machine.enabled && (
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
          <span className="flex gap-4">
            <Link
              href={`/machines/logs?sn=${encodeURIComponent(sn)}`}
              className="text-sm font-semibold text-primary hover:underline"
              data-testid="link-machine-logs"
            >
              Logs
            </Link>
            <Link
              href={`/machines/${encodeURIComponent(sn)}/files`}
              className="text-sm font-semibold text-primary hover:underline"
              data-testid="link-machine-files"
            >
              Files
            </Link>
          </span>
        }
      />

      <ProblemPanel problem={problem} testId="machine-error" />

      {machine && (
        <>
          <div className="mb-5 flex flex-wrap gap-1" role="tablist" aria-label="Machine">
            {VISIBLE_TABS.map((entry) => {
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
