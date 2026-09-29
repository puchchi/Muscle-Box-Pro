"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateMachine } from "@/lib/adminMachineApi";
import type { MachineEditInput } from "@shared/admin/machines";
import type { Machine, MachineModel } from "@shared/admin/machinesSchema";
import { Card, Field, Fields, SuccessPanel } from "../AdminUi";
import { MachineForm } from "./MachineForm";
import { formatIstStamp, REFRESH_NOTE } from "./MachinesUi";

export function MachineSettingsTab({
  machine,
  models,
  onReload,
  onSaved,
}: {
  machine: Machine;
  models: MachineModel[];
  onReload: () => Promise<Machine | null>;
  onSaved: (machine: Machine) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(false);

  async function reload() {
    const fresh = await onReload();
    if (!fresh) return;
    setStale(false);
    setSaved(false);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-5">
      <Card title="Settings" testId="card-machine-settings">
        <div className="space-y-4 p-4 sm:p-5">
          {saved && <SuccessPanel testId="machine-saved">Saved. {REFRESH_NOTE}</SuccessPanel>}
          {stale && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reload}
              className="rounded-xl cursor-pointer"
              data-testid="button-reload-machine"
            >
              Reload
            </Button>
          )}
          <MachineForm
            key={formKey}
            machine={machine}
            models={models}
            submitLabel="Save"
            onSubmit={async (input) => {
              setSaved(false);
              const result = await updateMachine(machine.sn, input as MachineEditInput, machine.version);
              if (result.ok) {
                onSaved(result.data.machine);
                setSaved(true);
                setStale(false);
              } else {
                setStale(result.error.code === "stale_write");
              }
              return result;
            }}
          />
        </div>
      </Card>

      <Card title="Machine facts" testId="card-machine-facts">
        <Fields>
          <Field label="Model" value={machine.modelName} />
          <Field label="Protocol" value={machine.protocol} />
          <Field label="Hardware version" value={machine.hardwareVersion} />
          <Field label="First seen" value={formatIstStamp(machine.firstSeenAt)} />
          <Field label="Last seen" value={formatIstStamp(machine.lastSeenAt)} testId="fact-last-seen" />
          <Field label="Last app start" value={formatIstStamp(machine.lastBootAt)} />
          <Field label="Added" value={`${formatIstStamp(machine.createdAt)}${machine.createdBy ? ` by ${machine.createdBy}` : ""}`} />
          <Field label="Last edited" value={`${formatIstStamp(machine.updatedAt)}${machine.updatedBy ? ` by ${machine.updatedBy}` : ""}`} />
        </Fields>
      </Card>
    </div>
  );
}
