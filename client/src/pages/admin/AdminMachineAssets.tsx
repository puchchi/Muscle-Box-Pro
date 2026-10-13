"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAsset, fetchAssets, fetchWarehouses, updateAsset } from "@/lib/inventoryApi";
import { ASSET_STATUSES, type Asset, type AssetStatus, type Warehouse } from "@shared/admin/inventorySchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { StatCard, SuccessPanel } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { FormRow, NativeSelect, TextInput } from "./machines/formBits";
import { Cell, Col, DataTable, formatRupees, Head, MachineDialog, MachinesHeader, NoData, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { inventoryProblem } from "./machines/inventoryBits";
import { ASSET_STATUS_LABEL, validateAsset, type AssetValues } from "./machines/inventoryRules";
import { istToday } from "./machines/statsRules";

export default function AdminMachineAssets() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Assets session={guard.session} />;
}

export const investedInr = (a: Pick<Asset, "costInr" | "landedCostInr">) => a.costInr + a.landedCostInr;

export function whereIs(asset: Asset, warehouseName: (id: string) => string): string {
  if (asset.status === "in_warehouse" && asset.warehouseId) return warehouseName(asset.warehouseId);
  if (asset.status === "deployed" && asset.placement) {
    return [asset.placement.gymName, asset.placement.franchiseName].filter(Boolean).join(", ") || ASSET_STATUS_LABEL.deployed;
  }
  return ASSET_STATUS_LABEL[asset.status];
}

function Assets({ session }: { session: MachineViewer }) {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ asset: Asset | null } | null>(null);
  const canEdit = session.can.has("assets.edit");

  const load = useCallback(async () => {
    const [list, places] = await Promise.all([fetchAssets(), fetchWarehouses()]);
    if (!list.ok) {
      setProblem(inventoryProblem(list));
      return;
    }
    setProblem(null);
    setAssets(list.data.items);
    if (places.ok) setWarehouses(places.data.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const owned = (assets ?? []).filter((a) => a.status !== "retired");
  const count = (status: AssetStatus) => owned.filter((a) => a.status === status).length;
  const nameOf = new Map(warehouses.map((w) => [w.warehouseId, w.name]));
  const warehouseName = (id: string) => nameOf.get(id) ?? id;

  return (
    <MachinesShell session={session} section="assets">
      <MachinesHeader
        title="Machine assets"
        subtitle="Every machine we have bought: what it cost and where it is. This is capital, not the cost of a drink."
        action={
          canEdit && (
            <Button
              type="button"
              onClick={() => {
                setNotice(null);
                setEditing({ asset: null });
              }}
              className="rounded-xl cursor-pointer"
              data-testid="button-add-asset"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add machine
            </Button>
          )
        }
      />
      <ProblemPanel problem={problem} testId="assets-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="assets-notice">{notice}</SuccessPanel>
        </div>
      )}

      {assets && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Machines owned" value={String(owned.length)} hint="Not counting retired" testId="stat-owned" />
          <StatCard
            label="Invested"
            value={formatRupees(owned.reduce((sum, a) => sum + investedInr(a), 0))}
            hint="Price and landing costs, before GST"
            testId="stat-invested"
          />
          <StatCard label="At gyms" value={String(count("deployed"))} hint="Earning" tone="good" testId="stat-deployed" />
          <StatCard
            label="Not earning"
            value={String(owned.length - count("deployed"))}
            hint="In a warehouse, on the way or being repaired"
            tone={owned.length - count("deployed") > 0 ? "warn" : "plain"}
            testId="stat-idle"
          />
        </div>
      )}

      <DataTable testId="assets-table">
        <Head>
          <Col>Serial</Col>
          <Col>Model</Col>
          <Col>Machine</Col>
          <Col>Where</Col>
          <Col>Bought</Col>
          <Col align="right">Invested</Col>
          {canEdit && <Col>Operate</Col>}
        </Head>
        <tbody className="divide-y divide-border/70">
          {!assets || assets.length === 0 ? (
            <NoData colSpan={canEdit ? 7 : 6} loading={!assets && !problem} />
          ) : (
            assets.map((a) => (
              <tr key={a.assetId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-asset-${a.assetId}`}>
                <Cell className="font-mono text-xs">{a.serialNo}</Cell>
                <Cell>{a.model}</Cell>
                <Cell>
                  {a.sn ? (
                    <>
                      <span className="font-semibold">{a.placement?.machineName || "—"}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{a.sn}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not enrolled</span>
                  )}
                </Cell>
                <Cell className={a.status === "deployed" ? "" : a.status === "retired" ? "text-muted-foreground" : "text-amber-300"}>
                  {whereIs(a, warehouseName)}
                </Cell>
                <Cell className="whitespace-nowrap tabular-nums text-muted-foreground">{a.purchasedOn ?? "—"}</Cell>
                <Cell align="right" className="tabular-nums">{formatRupees(investedInr(a))}</Cell>
                {canEdit && (
                  <Cell>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setEditing({ asset: a });
                      }}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      data-testid={`edit-asset-${a.assetId}`}
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
        Once a machine is enrolled and placed, its gym and franchise come from the machine&apos;s owner, set on the machine&apos;s Owner tab.
      </p>

      {editing && (
        <AssetDialog
          key={editing.asset?.assetId ?? "new"}
          asset={editing.asset}
          warehouses={warehouses}
          onClose={() => setEditing(null)}
          onSaved={async (serial) => {
            setEditing(null);
            setNotice(`Machine ${serial} saved.`);
            await load();
          }}
        />
      )}
    </MachinesShell>
  );
}

const valuesOf = (asset: Asset | null, warehouses: Warehouse[]): AssetValues => ({
  serialNo: asset?.serialNo ?? "",
  sn: asset?.sn ?? "",
  model: asset?.model ?? "GS805",
  supplier: asset?.supplier ?? "",
  invoiceNo: asset?.invoiceNo ?? "",
  purchasedOn: asset?.purchasedOn ?? "",
  cost: asset ? String(asset.costInr) : "",
  gst: asset ? String(asset.gstInr) : "",
  landed: asset ? String(asset.landedCostInr) : "",
  status: asset?.status ?? "in_warehouse",
  warehouseId: asset?.warehouseId ?? warehouses.find((w) => w.active)?.warehouseId ?? "",
  note: asset?.note ?? "",
});

function AssetDialog({
  asset,
  warehouses,
  onClose,
  onSaved,
}: {
  asset: Asset | null;
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: (serial: string) => void;
}) {
  const [values, setValues] = useState<AssetValues>(() => valuesOf(asset, warehouses));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof AssetValues) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    const checked = validateAsset(values, istToday(Date.now()));
    setErrors(checked.errors);
    if (!checked.input) return;
    setSaving(true);
    const result = asset ? await updateAsset(asset.assetId, checked.input, asset.version) : await createAsset(checked.input);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(inventoryProblem(result));
      return;
    }
    onSaved(result.data.asset.serialNo);
  }

  return (
    <MachineDialog
      open
      wide
      onClose={onClose}
      title={asset ? `Edit ${asset.serialNo}` : "Add machine"}
      testId="asset-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-asset">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <ProblemPanel problem={problem} testId="asset-error" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Serial number" htmlFor="serialNo" error={errors.serialNo} hint="From the plate on the machine">
          <TextInput id="serialNo" value={values.serialNo} onChange={set("serialNo")} mono />
        </FormRow>
        <FormRow label="Model" htmlFor="model" error={errors.model}>
          <TextInput id="model" value={values.model} onChange={set("model")} />
        </FormRow>
        <FormRow label="Supplier" htmlFor="supplier" error={errors.supplier}>
          <TextInput id="supplier" value={values.supplier} onChange={set("supplier")} />
        </FormRow>
        <FormRow label="Invoice number" htmlFor="invoiceNo" error={errors.invoiceNo}>
          <TextInput id="invoiceNo" value={values.invoiceNo} onChange={set("invoiceNo")} />
        </FormRow>
        <FormRow label="Bought on" htmlFor="purchasedOn" error={errors.purchasedOn}>
          <TextInput id="purchasedOn" type="date" value={values.purchasedOn} onChange={set("purchasedOn")} />
        </FormRow>
        <FormRow label="Price" htmlFor="cost" error={errors.cost} hint="₹, before GST">
          <TextInput id="cost" value={values.cost} onChange={set("cost")} inputMode="decimal" />
        </FormRow>
        <FormRow label="GST paid" htmlFor="gst" error={errors.gst} hint="₹">
          <TextInput id="gst" value={values.gst} onChange={set("gst")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Landing costs" htmlFor="landed" error={errors.landed} hint="₹ for freight, duty and installation">
          <TextInput id="landed" value={values.landed} onChange={set("landed")} inputMode="decimal" />
        </FormRow>
        <FormRow label="Where it is" htmlFor="status" error={errors.status}>
          <NativeSelect
            id="status"
            value={values.status}
            onChange={(status) => setValues((v) => ({ ...v, status: status as AssetStatus }))}
            options={ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABEL[s] }))}
          />
        </FormRow>
        {values.status === "in_warehouse" ? (
          <FormRow label="Warehouse" htmlFor="warehouseId" error={errors.warehouseId}>
            <NativeSelect
              id="warehouseId"
              value={values.warehouseId}
              onChange={set("warehouseId")}
              options={[{ value: "", label: "Choose a warehouse" }, ...warehouses.filter((w) => w.active).map((w) => ({ value: w.warehouseId, label: w.name }))]}
            />
          </FormRow>
        ) : (
          <FormRow label="Machine SN" htmlFor="sn" error={errors.sn} hint="Once it is enrolled in the console">
            <TextInput id="sn" value={values.sn} onChange={set("sn")} mono />
          </FormRow>
        )}
        <div className="sm:col-span-2">
          <FormRow label="Note" htmlFor="note" error={errors.note}>
            <TextInput id="note" value={values.note} onChange={set("note")} />
          </FormRow>
        </div>
      </div>
    </MachineDialog>
  );
}
