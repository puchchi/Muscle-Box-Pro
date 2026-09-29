"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { MachineCreateInput, MachineEditInput } from "@shared/admin/machines";
import type { Machine, MachineModel } from "@shared/admin/machinesSchema";
import type { MachineCall } from "@/lib/adminMachineApi";
import { FormRow, NativeSelect, parseNumber, TextInput } from "./formBits";
import { ProblemPanel, type Problem } from "./MachinesUi";

type Values = {
  sn: string;
  modelId: string;
  deviceExtNo: string;
  name: string;
  servicePhone: string;
  address: string;
  latitude: string;
  longitude: string;
  hotMax: string;
  hotMin: string;
  coldMax: string;
  coldMin: string;
  enabled: boolean;
};

function valuesOf(machine: Machine | null, models: MachineModel[]): Values {
  if (!machine) {
    return {
      sn: "",
      modelId: models[0]?.id ?? "",
      deviceExtNo: "",
      name: "",
      servicePhone: "",
      address: "",
      latitude: "",
      longitude: "",
      hotMax: "85",
      hotMin: "80",
      coldMax: "8",
      coldMin: "5",
      enabled: true,
    };
  }
  return {
    sn: machine.sn,
    modelId: machine.modelId,
    deviceExtNo: machine.deviceExtNo,
    name: machine.name,
    servicePhone: machine.servicePhone,
    address: machine.address,
    latitude: machine.latitude === null ? "" : String(machine.latitude),
    longitude: machine.longitude === null ? "" : String(machine.longitude),
    hotMax: String(machine.hotMax),
    hotMin: String(machine.hotMin),
    coldMax: String(machine.coldMax),
    coldMin: String(machine.coldMin),
    enabled: machine.enabled,
  };
}

export function validateMachine(
  v: Values,
  adding: boolean,
): { errors: Record<string, string>; input: MachineCreateInput | null } {
  const errors: Record<string, string> = {};
  const sn = v.sn.trim();
  if (adding) {
    if (!sn) errors.sn = "Required.";
    else if (sn.length > 64 || !/^[A-Za-z0-9_-]{4,}$/.test(sn)) errors.sn = "The SN shown on the machine's operator home.";
    if (!v.modelId) errors.modelId = "Required.";
  }
  const deviceExtNo = v.deviceExtNo.trim();
  if (!deviceExtNo) errors.deviceExtNo = "Required.";
  else if (deviceExtNo.length > 16) errors.deviceExtNo = "Up to 16 characters.";
  else if (!/^[A-Za-z0-9-]+$/.test(deviceExtNo)) errors.deviceExtNo = "Letters, digits and - only.";
  const name = v.name.trim();
  if (!name) errors.name = "Required.";
  else if (name.length > 40) errors.name = "Up to 40 characters.";
  const servicePhone = v.servicePhone.trim();
  if (servicePhone.length > 20) errors.servicePhone = "Up to 20 characters.";
  else if (servicePhone && !/^[0-9+ ]+$/.test(servicePhone)) errors.servicePhone = "Digits, + and spaces only.";
  const address = v.address.trim();
  if (address.length > 200) errors.address = "Up to 200 characters.";

  const latitude = parseNumber(v.latitude);
  const longitude = parseNumber(v.longitude);
  if (latitude !== null && (Number.isNaN(latitude) || latitude < -90 || latitude > 90)) errors.latitude = "Must be -90 to 90.";
  if (longitude !== null && (Number.isNaN(longitude) || longitude < -180 || longitude > 180)) {
    errors.longitude = "Must be -180 to 180.";
  }
  if ((latitude === null) !== (longitude === null)) {
    errors[latitude === null ? "latitude" : "longitude"] = "Give both or neither.";
  }

  const temp = (key: "hotMax" | "hotMin" | "coldMax" | "coldMin", min: number, max: number) => {
    const n = parseNumber(v[key]);
    if (n === null) errors[key] = "Required.";
    else if (Number.isNaN(n) || n < min || n > max) errors[key] = `Must be ${min} to ${max}.`;
    return n ?? 0;
  };
  const hotMax = temp("hotMax", 40, 98);
  const hotMin = temp("hotMin", 40, 98);
  const coldMax = temp("coldMax", 1, 25);
  const coldMin = temp("coldMin", 1, 25);
  if (!errors.hotMin && !errors.hotMax && hotMin >= hotMax) errors.hotMin = "Must be below the maximum.";
  if (!errors.coldMin && !errors.coldMax && coldMin >= coldMax) errors.coldMin = "Must be below the maximum.";

  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: {
      sn,
      modelId: v.modelId,
      deviceExtNo,
      name,
      servicePhone,
      address,
      latitude,
      longitude,
      hotMax,
      hotMin,
      coldMax,
      coldMin,
      enabled: v.enabled,
    },
  };
}

export function MachineForm({
  machine,
  models,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  machine: Machine | null;
  models: MachineModel[];
  onSubmit: (input: MachineCreateInput | MachineEditInput) => Promise<MachineCall<unknown>>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const adding = machine === null;
  const [values, setValues] = useState<Values>(() => valuesOf(machine, models));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const checked = validateMachine(values, adding);
    setErrors(checked.errors);
    if (!checked.input) return;
    setSaving(true);
    const { sn: _sn, modelId: _modelId, ...edit } = checked.input;
    const result = await onSubmit(adding ? checked.input : edit);
    setSaving(false);
    if (result.ok) {
      setProblem(null);
      return;
    }
    setErrors(result.error.fieldErrors ?? {});
    setProblem({ message: result.error.message, issues: result.issues });
  }

  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }));
  if (machine && !models.some((m) => m.id === machine.modelId)) {
    modelOptions.push({ value: machine.modelId, label: machine.modelName });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate data-testid="machine-form">
      <ProblemPanel problem={problem} testId="machine-form-error" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow
          label="Machine ID (SN)"
          htmlFor="sn"
          error={errors.sn}
          hint={adding ? "Exactly as shown on the machine's operator home. It can't be changed later." : undefined}
        >
          <TextInput id="sn" value={values.sn} onChange={set("sn")} disabled={!adding} mono />
        </FormRow>
        <FormRow
          label="Model"
          htmlFor="modelId"
          error={errors.modelId}
          hint={adding ? "Drives the board protocol. It can't be changed later." : undefined}
        >
          <NativeSelect
            id="modelId"
            value={values.modelId}
            onChange={set("modelId")}
            options={modelOptions}
            disabled={!adding}
          />
        </FormRow>
        <FormRow label="Machine Number" htmlFor="deviceExtNo" error={errors.deviceExtNo} hint="For example E01904.">
          <TextInput id="deviceExtNo" value={values.deviceExtNo} onChange={set("deviceExtNo")} />
        </FormRow>
        <FormRow label="Name" htmlFor="name" error={errors.name}>
          <TextInput id="name" value={values.name} onChange={set("name")} />
        </FormRow>
        <FormRow label="Service phone" htmlFor="servicePhone" error={errors.servicePhone} hint="Shown in the machine's header.">
          <TextInput id="servicePhone" value={values.servicePhone} onChange={set("servicePhone")} inputMode="numeric" />
        </FormRow>
        <FormRow label="Address" htmlFor="address" error={errors.address}>
          <TextInput id="address" value={values.address} onChange={set("address")} />
        </FormRow>
        <FormRow label="Latitude" htmlFor="latitude" error={errors.latitude}>
          <TextInput id="latitude" value={values.latitude} onChange={set("latitude")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Longitude" htmlFor="longitude" error={errors.longitude}>
          <TextInput id="longitude" value={values.longitude} onChange={set("longitude")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Hot water max (°C)" htmlFor="hotMax" error={errors.hotMax}>
          <TextInput id="hotMax" value={values.hotMax} onChange={set("hotMax")} inputMode="numeric" />
        </FormRow>
        <FormRow label="Hot water min (°C)" htmlFor="hotMin" error={errors.hotMin}>
          <TextInput id="hotMin" value={values.hotMin} onChange={set("hotMin")} inputMode="numeric" />
        </FormRow>
        <FormRow label="Cold water max (°C)" htmlFor="coldMax" error={errors.coldMax}>
          <TextInput id="coldMax" value={values.coldMax} onChange={set("coldMax")} inputMode="numeric" />
        </FormRow>
        <FormRow label="Cold water min (°C)" htmlFor="coldMin" error={errors.coldMin}>
          <TextInput id="coldMin" value={values.coldMin} onChange={set("coldMin")} inputMode="numeric" />
        </FormRow>
      </div>

      <label className="flex items-center gap-3 text-sm text-foreground">
        <Switch
          checked={values.enabled}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, enabled: checked }))}
          data-testid="input-enabled"
        />
        <span>
          Enabled
          <span className="block text-xs text-muted-foreground">A disabled machine is refused service.</span>
        </span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-machine">
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
