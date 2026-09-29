"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createMaterial, fetchMaterials, fetchModels, updateMaterial } from "@/lib/adminMachineApi";
import type { MaterialInput } from "@shared/admin/machines";
import type { MachineModel, Material } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { SuccessPanel } from "./AdminUi";
import { FormRow, NativeSelect, parseNumber, TextInput } from "./machines/formBits";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  Head,
  MachineDialog,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  REFRESH_NOTE,
  SelectFilter,
  type Problem,
} from "./machines/MachinesUi";

export const RAW_TYPES = ["water", "cup", "powder", "sugar", "ice"] as const;
const UNITS = ["g", "ml", "pcs"] as const;
export const POSITION_WARNING = "The machine will dispense this material from the new slot.";

type Values = {
  name: string;
  position: string;
  rawType: string;
  unit: string;
  capacity: string;
  warnCapacity: string;
  expendRate: string;
  enabled: boolean;
};

export function validateMaterial(v: Values): { errors: Record<string, string>; input: MaterialInput | null } {
  const errors: Record<string, string> = {};
  const name = v.name.trim();
  if (!name) errors.name = "Required.";
  else if (name.length > 40) errors.name = "Up to 40 characters.";
  const position = v.position.trim();
  if (!/^[1-9]\d?$/.test(position)) errors.position = "A slot number such as 1.";
  if (!(UNITS as readonly string[]).includes(v.unit)) errors.unit = "Must be g, ml or pcs.";
  if (!(RAW_TYPES as readonly string[]).includes(v.rawType)) errors.rawType = "Must be water, cup, powder, sugar or ice.";
  const capacity = parseNumber(v.capacity);
  if (capacity === null || Number.isNaN(capacity) || capacity < 0.01 || capacity > 100000) errors.capacity = "Above 0, up to 100000.";
  const warnCapacity = parseNumber(v.warnCapacity);
  if (warnCapacity === null || Number.isNaN(warnCapacity) || warnCapacity < 0 || warnCapacity > 100000) {
    errors.warnCapacity = "0 or more.";
  } else if (!errors.capacity && capacity !== null && warnCapacity >= capacity) {
    errors.warnCapacity = "Must be below Capacity.";
  }
  const expendRate = parseNumber(v.expendRate);
  if (expendRate === null || Number.isNaN(expendRate) || expendRate < 0.01 || expendRate > 10000) {
    errors.expendRate = "Above 0, up to 10000.";
  }
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: {
      name,
      position,
      unit: v.unit,
      capacity: capacity!,
      warnCapacity: warnCapacity!,
      expendRate: expendRate!,
      enabled: v.enabled,
    },
  };
}

export default function AdminMachineMaterials() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Materials session={guard.session} />;
}

type Editing = { material: Material | null } | null;

function Materials({ session }: { session: AdminSession }) {
  const [models, setModels] = useState<MachineModel[]>([]);
  const [modelId, setModelId] = useState("");
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => {
    fetchModels().then((result) => {
      if (!result.ok) {
        setProblem(problemOf(result));
        setLoading(false);
        return;
      }
      setModels(result.data.items);
      setModelId((id) => id || result.data.items[0]?.id || "");
      if (result.data.items.length === 0) setLoading(false);
    });
  }, []);

  const load = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    const result = await fetchMaterials(modelId);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setRows(result.data.items);
  }, [modelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const model = models.find((m) => m.id === modelId);

  return (
    <MachinesShell session={session} section="materials">
      <MachinesHeader
        title="Materials"
        subtitle="The canisters of each model. Recipes and stock slots are made from these."
        action={
          <Button
            type="button"
            onClick={() => {
              setNotice(null);
              setEditing({ material: null });
            }}
            disabled={!modelId}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-material"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add material
          </Button>
        }
      />

      <ProblemPanel problem={problem} testId="materials-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="materials-notice">{notice}</SuccessPanel>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SelectFilter
          label="Model"
          value={modelId}
          onChange={setModelId}
          options={models.map((m) => ({ value: m.id, label: m.name }))}
          testId="filter-model"
        />
        {model && (
          <p className="pb-2 text-xs text-muted-foreground">
            Protocol {model.protocol || "—"}. Hardware {model.versions || "—"}.
          </p>
        )}
      </div>

      <DataTable testId="materials-table">
        <Head>
          <Col>Position</Col>
          <Col>Name</Col>
          <Col>Type</Col>
          <Col>Unit</Col>
          <Col align="right">Capacity</Col>
          <Col align="right">Warning</Col>
          <Col align="right">Consume rate</Col>
          <Col>Enabled</Col>
          <Col>Updated</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={10} loading={loading} />
          ) : (
            rows.map((m) => (
              <tr key={m.materialId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-material-${m.materialId}`}>
                <Cell className="tabular-nums">{m.position}</Cell>
                <Cell className="font-semibold">{m.name}</Cell>
                <Cell className="text-muted-foreground">{m.rawType}</Cell>
                <Cell className="text-muted-foreground">{m.unit}</Cell>
                <Cell align="right" className="tabular-nums">{m.capacity}</Cell>
                <Cell align="right" className="tabular-nums">{m.warnCapacity}</Cell>
                <Cell align="right" className="tabular-nums">{m.expendRate}</Cell>
                <Cell>
                  <span className={m.enabled ? "text-emerald-200" : "text-muted-foreground"} data-testid={`enabled-${m.materialId}`}>
                    {m.enabled ? "Yes" : "No"}
                  </span>
                </Cell>
                <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatIstStamp(m.updatedAt)}
                  {m.updatedBy && <span className="block">{m.updatedBy}</span>}
                </Cell>
                <Cell>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setEditing({ material: m });
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    data-testid={`edit-material-${m.materialId}`}
                  >
                    Edit
                  </button>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        Position is the physical canister slot and decides which motor runs. Adding a material makes an empty stock slot on
        every machine of the model.
      </p>

      {editing && modelId && (
        <MaterialDialog
          key={editing.material?.materialId ?? "new"}
          modelId={modelId}
          material={editing.material}
          onClose={() => setEditing(null)}
          onSaved={async (name, machines) => {
            setEditing(null);
            setNotice(`${name} saved. ${machines} machine${machines === 1 ? "" : "s"} updated. ${REFRESH_NOTE}`);
            await load();
          }}
        />
      )}
    </MachinesShell>
  );
}

function MaterialDialog({
  modelId,
  material,
  onClose,
  onSaved,
}: {
  modelId: string;
  material: Material | null;
  onClose: () => void;
  onSaved: (name: string, machinesUpdated: number) => void;
}) {
  const [values, setValues] = useState<Values>(() => ({
    name: material?.name ?? "",
    position: material?.position ?? "",
    rawType: material?.rawType ?? "powder",
    unit: material?.unit ?? "g",
    capacity: material ? String(material.capacity) : "",
    warnCapacity: material ? String(material.warnCapacity) : "",
    expendRate: material ? String(material.expendRate) : "",
    enabled: material?.enabled ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [confirmMove, setConfirmMove] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Values) => (value: string) => {
    setConfirmMove(false);
    setValues((v) => ({ ...v, [key]: value }));
  };

  async function save() {
    const checked = validateMaterial(values);
    setErrors(checked.errors);
    if (!checked.input) return;
    if (material && checked.input.position !== material.position && !confirmMove) {
      setConfirmMove(true);
      return;
    }
    setSaving(true);
    const result = material
      ? await updateMaterial(modelId, material.materialId, checked.input, material.version)
      : await createMaterial(modelId, { ...checked.input, rawType: values.rawType });
    setSaving(false);
    if (!result.ok) {
      setConfirmMove(false);
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      return;
    }
    onSaved(result.data.material.name, result.data.machinesUpdated);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      title={material ? `Edit ${material.name}` : "Add material"}
      testId="material-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-material">
            {saving ? "Saving…" : confirmMove ? "Move and save" : "Save"}
          </Button>
        </>
      }
    >
      <ProblemPanel problem={problem} testId="material-error" />
      {confirmMove && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="alert" data-testid="position-warning">
          Slot {material?.position} to slot {values.position.trim()}. {POSITION_WARNING}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Name" htmlFor="name" error={errors.name}>
          <TextInput id="name" value={values.name} onChange={set("name")} placeholder="Whey chocolate" />
        </FormRow>
        <FormRow label="Position" htmlFor="position" error={errors.position} hint="The canister slot, such as 1.">
          <TextInput id="position" value={values.position} onChange={set("position")} inputMode="numeric" />
        </FormRow>
        <FormRow label="Type" htmlFor="rawType" error={errors.rawType} hint={material ? "Set when added." : "Can't be changed later."}>
          <NativeSelect
            id="rawType"
            value={values.rawType}
            onChange={set("rawType")}
            options={RAW_TYPES.map((t) => ({ value: t, label: t }))}
            disabled={material !== null}
          />
        </FormRow>
        <FormRow label="Unit" htmlFor="unit" error={errors.unit}>
          <NativeSelect id="unit" value={values.unit} onChange={set("unit")} options={UNITS.map((u) => ({ value: u, label: u }))} />
        </FormRow>
        <FormRow label="Capacity" htmlFor="capacity" error={errors.capacity} hint="A full canister.">
          <TextInput id="capacity" value={values.capacity} onChange={set("capacity")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Warning" htmlFor="warnCapacity" error={errors.warnCapacity} hint="Below this, stock shows Lack.">
          <TextInput id="warnCapacity" value={values.warnCapacity} onChange={set("warnCapacity")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Consume rate" htmlFor="expendRate" error={errors.expendRate} hint="Per second. For reference.">
          <TextInput id="expendRate" value={values.expendRate} onChange={set("expendRate")} inputMode="decimal" />
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
          <span className="block text-xs text-muted-foreground">Off hides it on machines. Refused while a recipe uses it.</span>
        </span>
      </label>
    </MachineDialog>
  );
}
