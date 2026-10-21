"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fetchMaterials, fetchModels } from "@/lib/adminMachineApi";
import { createItem, fetchItems, updateItem } from "@/lib/inventoryApi";
import { ITEM_KINDS, ITEM_UNITS, type InventoryItem } from "@shared/admin/inventorySchema";
import type { Material } from "@shared/admin/machinesSchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { SuccessPanel } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { FormRow, NativeSelect, TextInput } from "./machines/formBits";
import { Cell, Col, DataTable, Head, MachineDialog, MachinesHeader, NoData, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { INVENTORY_SUBTITLE, InventoryTabs, inventoryProblem } from "./machines/inventoryBits";
import {
  DEFAULT_UNIT,
  entryUnit,
  formatQty,
  formatUnitCost,
  itemValues,
  KIND_LABEL,
  UNIT_LABEL,
  validateItem,
  type ItemValues,
} from "./machines/inventoryRules";

export type ModelMaterial = Material & { modelName: string };

const UNTRACKED = new Set(["water", "ice"]);

export default function AdminInventoryItems() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Items session={guard.session} />;
}

async function fetchStockableMaterials(): Promise<ModelMaterial[]> {
  const models = await fetchModels();
  if (!models.ok) return [];
  const lists = await Promise.all(
    models.data.items.map(async (model) => {
      const result = await fetchMaterials(model.id);
      return result.ok ? result.data.items.map((m) => ({ ...m, modelName: model.name })) : [];
    }),
  );
  return lists.flat().filter((m) => m.enabled && !UNTRACKED.has(m.rawType));
}

function Items({ session }: { session: MachineViewer }) {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [materials, setMaterials] = useState<ModelMaterial[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ item: InventoryItem | null } | null>(null);
  const canEdit = session.can.has("inventory.edit");

  const load = useCallback(async () => {
    const result = await fetchItems();
    if (!result.ok) {
      setProblem(inventoryProblem(result));
      return;
    }
    setProblem(null);
    setItems(result.data.items);
  }, []);

  useEffect(() => {
    void load();
    void fetchStockableMaterials().then(setMaterials);
  }, [load]);

  const materialName = new Map(materials.map((m) => [m.materialId, `${m.name} (${m.modelName})`]));

  return (
    <MachinesShell session={session} section="inventory">
      <MachinesHeader
        title="Stock"
        subtitle={INVENTORY_SUBTITLE}
        action={
          canEdit && (
            <Button
              type="button"
              onClick={() => {
                setNotice(null);
                setEditing({ item: null });
              }}
              className="rounded-xl cursor-pointer"
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add item
            </Button>
          )
        }
      />
      <InventoryTabs current="items" />
      <ProblemPanel problem={problem} testId="items-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="items-notice">{notice}</SuccessPanel>
        </div>
      )}

      <DataTable testId="items-table">
        <Head>
          <Col>Item</Col>
          <Col>Pack</Col>
          <Col>Fills</Col>
          <Col align="right">Reorder at</Col>
          <Col align="right">Average cost</Col>
          <Col>Active</Col>
          {canEdit && <Col>Operate</Col>}
        </Head>
        <tbody className="divide-y divide-border/70">
          {!items || items.length === 0 ? (
            <NoData colSpan={canEdit ? 7 : 6} loading={!items && !problem} />
          ) : (
            items.map((item) => (
              <tr key={item.itemId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-item-${item.itemId}`}>
                <Cell>
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</span>
                </Cell>
                <Cell className="whitespace-nowrap text-muted-foreground">
                  {item.packLabel}
                  <span className="block text-xs">{formatQty(item.packSize, item.unit)}</span>
                </Cell>
                <Cell className="text-xs text-muted-foreground">
                  {item.materialIds.length === 0 ? (
                    <span className="text-amber-300">No canister yet</span>
                  ) : (
                    item.materialIds.map((id) => <span key={id} className="block">{materialName.get(id) ?? id}</span>)
                  )}
                </Cell>
                <Cell align="right" className="tabular-nums">{formatQty(item.reorderLevel, item.unit)}</Cell>
                <Cell align="right" className="whitespace-nowrap tabular-nums text-muted-foreground">{formatUnitCost(item.avgCostInr, item.unit)}</Cell>
                <Cell className={item.active ? "text-emerald-200" : "text-muted-foreground"}>{item.active ? "Yes" : "No"}</Cell>
                {canEdit && (
                  <Cell>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setEditing({ item });
                      }}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      data-testid={`edit-item-${item.itemId}`}
                    >
                      Edit
                    </button>
                  </Cell>
                )}
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        An item is what you buy. Link it to the machine materials it fills, so refills and drinks are costed from it.
      </p>

      {editing && (
        <ItemDialog
          key={editing.item?.itemId ?? "new"}
          item={editing.item}
          items={items ?? []}
          materials={materials}
          onClose={() => setEditing(null)}
          onSaved={async (name) => {
            setEditing(null);
            setNotice(`${name} saved.`);
            await load();
          }}
        />
      )}
    </MachinesShell>
  );
}

function ItemDialog({
  item,
  items,
  materials,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null;
  items: InventoryItem[];
  materials: ModelMaterial[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<ItemValues>(() => itemValues(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof ItemValues) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const takenBy = new Map(
    items.filter((i) => i.active && i.itemId !== item?.itemId).flatMap((i) => i.materialIds.map((id) => [id, i.name] as const)),
  );
  const fitting = materials.filter((m) => m.unit === values.unit);

  async function save() {
    const checked = validateItem(values);
    setErrors(checked.errors);
    if (!checked.input) return;
    setSaving(true);
    const result = item ? await updateItem(item.itemId, checked.input, item.version) : await createItem(checked.input);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(inventoryProblem(result));
      return;
    }
    onSaved(result.data.item.name);
  }

  const toggle = (materialId: string, on: boolean) =>
    setValues((v) => ({ ...v, materialIds: on ? [...v.materialIds, materialId] : v.materialIds.filter((id) => id !== materialId) }));

  return (
    <MachineDialog
      open
      onClose={onClose}
      title={item ? `Edit ${item.name}` : "Add item"}
      testId="item-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-item">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <ProblemPanel problem={problem} testId="item-error" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormRow label="Name" htmlFor="name" error={errors.name}>
            <TextInput id="name" value={values.name} onChange={set("name")} placeholder="Whey protein, chocolate" />
          </FormRow>
        </div>
        <FormRow label="Kind" htmlFor="kind" error={errors.kind}>
          <NativeSelect
            id="kind"
            value={values.kind}
            onChange={(kind) =>
              setValues((v) => ({ ...v, kind: kind as ItemValues["kind"], ...(item ? {} : { unit: DEFAULT_UNIT[kind as ItemValues["kind"]], materialIds: [] }) }))
            }
            options={ITEM_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />
        </FormRow>
        <FormRow label="Kept in" htmlFor="unit" error={errors.unit} hint={item ? "Can't change once stock moves." : undefined}>
          <NativeSelect
            id="unit"
            value={values.unit}
            onChange={(unit) => setValues((v) => ({ ...v, unit: unit as ItemValues["unit"], materialIds: [] }))}
            options={ITEM_UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
            disabled={item !== null}
          />
        </FormRow>
        <FormRow label="Pack" htmlFor="packLabel" error={errors.packLabel} hint="As the supplier sells it">
          <TextInput id="packLabel" value={values.packLabel} onChange={set("packLabel")} placeholder="1 kg bag" />
        </FormRow>
        <FormRow label={`Pack size (${entryUnit(values.unit)})`} htmlFor="packSize" error={errors.packSize}>
          <TextInput id="packSize" value={values.packSize} onChange={set("packSize")} inputMode="decimal" />
        </FormRow>
        <FormRow label={`Reorder at (${entryUnit(values.unit)})`} htmlFor="reorderLevel" error={errors.reorderLevel} hint="Across all warehouses">
          <TextInput id="reorderLevel" value={values.reorderLevel} onChange={set("reorderLevel")} inputMode="decimal" />
        </FormRow>
      </div>

      <fieldset data-testid="item-materials">
        <legend className="mb-1.5 text-sm font-semibold text-muted-foreground">Fills these machine materials</legend>
        {fitting.length === 0 ? (
          <p className="text-xs text-muted-foreground">No machine material is kept in {UNIT_LABEL[values.unit]}.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border px-3 py-2">
            {fitting.map((m) => {
              const other = takenBy.get(m.materialId);
              const checked = values.materialIds.includes(m.materialId);
              return (
                <li key={m.materialId}>
                  <label className={`flex items-center gap-2 py-1 text-sm ${other ? "text-muted-foreground" : "text-foreground cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={Boolean(other) && !checked}
                      onChange={(event) => toggle(m.materialId, event.target.checked)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      data-testid={`material-${m.materialId}`}
                    />
                    <span>
                      {m.name} <span className="text-xs text-muted-foreground">{m.modelName}, slot {m.position}</span>
                      {other && <span className="block text-xs">Filled by {other}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <label className="flex items-center gap-3 text-sm text-foreground">
        <Switch checked={values.active} onCheckedChange={(active) => setValues((v) => ({ ...v, active }))} data-testid="input-active" />
        <span>
          Active
          <span className="block text-xs text-muted-foreground">Off stops new receipts. Its history stays.</span>
        </span>
      </label>
    </MachineDialog>
  );
}
