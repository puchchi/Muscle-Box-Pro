"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fetchAllMachines } from "@/lib/adminMachineApi";
import { createWarehouse, fetchHomes, fetchWarehouses, setHomeWarehouse, updateWarehouse } from "@/lib/inventoryApi";
import type { Warehouse } from "@shared/admin/inventorySchema";
import type { MachineRow } from "@shared/admin/machinesSchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { SuccessPanel } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { FormRow, inputClass, TextInput } from "./machines/formBits";
import {
  Cell,
  Col,
  DataTable,
  Head,
  MachineDialog,
  MachineLabel,
  MachinesHeader,
  NoData,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";
import { INVENTORY_SUBTITLE, InventoryTabs, inventoryProblem } from "./machines/inventoryBits";

export default function AdminInventoryWarehouses() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Warehouses session={guard.session} />;
}

function Warehouses({ session }: { session: MachineViewer }) {
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [homes, setHomes] = useState<Map<string, string | null>>(new Map());
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ warehouse: Warehouse | null } | null>(null);
  const [savingSn, setSavingSn] = useState<string | null>(null);
  const canEdit = session.can.has("inventory.edit");

  const load = useCallback(async () => {
    const [list, homeList, fleet] = await Promise.all([fetchWarehouses(), fetchHomes(), fetchAllMachines()]);
    const failed = [list, homeList].find((r) => !r.ok);
    if (failed) {
      setProblem(inventoryProblem(failed));
      return;
    }
    setProblem(null);
    if (list.ok) setWarehouses(list.data.items);
    if (homeList.ok) setHomes(new Map(homeList.data.items.map((h) => [h.sn, h.warehouseId])));
    if (fleet.ok) setMachines(fleet.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeHome(sn: string, warehouseId: string) {
    setSavingSn(sn);
    setNotice(null);
    const result = await setHomeWarehouse(sn, warehouseId);
    setSavingSn(null);
    if (!result.ok) {
      setProblem(inventoryProblem(result));
      return;
    }
    setProblem(null);
    setHomes((all) => new Map(all).set(sn, warehouseId));
  }

  const active = (warehouses ?? []).filter((w) => w.active);
  const homeless = machines.filter((m) => !homes.get(m.sn)).length;

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
                setEditing({ warehouse: null });
              }}
              className="rounded-xl cursor-pointer"
              data-testid="button-add-warehouse"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add warehouse
            </Button>
          )
        }
      />
      <InventoryTabs current="warehouses" />
      <ProblemPanel problem={problem} testId="warehouses-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="warehouses-notice">{notice}</SuccessPanel>
        </div>
      )}

      <DataTable testId="warehouses-table">
        <Head>
          <Col>Warehouse</Col>
          <Col align="right">Machines it stocks</Col>
          <Col>Active</Col>
          {canEdit && <Col>Operate</Col>}
        </Head>
        <tbody className="divide-y divide-border/70">
          {!warehouses || warehouses.length === 0 ? (
            <NoData colSpan={canEdit ? 4 : 3} loading={!warehouses && !problem} />
          ) : (
            warehouses.map((w) => (
              <tr key={w.warehouseId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-warehouse-${w.warehouseId}`}>
                <Cell>
                  <span className="font-semibold">{w.name}</span>
                  {w.address && <span className="block text-xs text-muted-foreground">{w.address}</span>}
                </Cell>
                <Cell align="right" className="tabular-nums">{w.machines}</Cell>
                <Cell className={w.active ? "text-emerald-200" : "text-muted-foreground"}>{w.active ? "Yes" : "No"}</Cell>
                {canEdit && (
                  <Cell>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setEditing({ warehouse: w });
                      }}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      data-testid={`edit-warehouse-${w.warehouseId}`}
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

      <section className="mt-8" data-testid="machine-homes">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Where each machine is refilled from</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          A refill on the machine or in the console takes that stock out of this warehouse.
          {homeless > 0 && (
            <span className="text-amber-300" data-testid="homeless-count">
              {" "}
              {homeless} machine{homeless === 1 ? " has" : "s have"} no home yet, so {homeless === 1 ? "its" : "their"} refills aren&apos;t taken
              from any stock.
            </span>
          )}
        </p>
        <DataTable testId="homes-table">
          <Head>
            <Col>Machine</Col>
            <Col>Name</Col>
            <Col>Home warehouse</Col>
          </Head>
          <tbody className="divide-y divide-border/70">
            {machines.length === 0 ? (
              <NoData colSpan={3} loading={!warehouses && !problem} />
            ) : (
              machines.map((m) => {
                const home = homes.get(m.sn) ?? "";
                return (
                  <tr key={m.sn} data-testid={`row-home-${m.sn}`}>
                    <Cell>
                      <MachineLabel deviceExtNo={m.deviceExtNo ?? ""} sn={m.sn} />
                    </Cell>
                    <Cell>{m.name || "—"}</Cell>
                    <Cell>
                      <select
                        value={home}
                        onChange={(event) => void changeHome(m.sn, event.target.value)}
                        disabled={!canEdit || savingSn === m.sn || active.length === 0}
                        aria-label={`Home warehouse for ${m.deviceExtNo || m.sn}`}
                        className={`${inputClass} h-9 w-48 border px-2 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${home ? "" : "text-amber-300"}`}
                        data-testid={`home-${m.sn}`}
                      >
                        {!home && <option value="">No home yet</option>}
                        {active.map((w) => (
                          <option key={w.warehouseId} value={w.warehouseId}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </Cell>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </section>

      {editing && (
        <WarehouseDialog
          key={editing.warehouse?.warehouseId ?? "new"}
          warehouse={editing.warehouse}
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

function WarehouseDialog({ warehouse, onClose, onSaved }: { warehouse: Warehouse | null; onClose: () => void; onSaved: (name: string) => void }) {
  const [name, setName] = useState(warehouse?.name ?? "");
  const [address, setAddress] = useState(warehouse?.address ?? "");
  const [active, setActive] = useState(warehouse?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setErrors({ name: "2 to 60 characters." });
      return;
    }
    setErrors({});
    setSaving(true);
    const input = { name: trimmed, address: address.trim(), active };
    const result = warehouse ? await updateWarehouse(warehouse.warehouseId, input, warehouse.version) : await createWarehouse(input);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(inventoryProblem(result));
      return;
    }
    onSaved(result.data.warehouse.name);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      title={warehouse ? `Edit ${warehouse.name}` : "Add warehouse"}
      testId="warehouse-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-warehouse">
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <ProblemPanel problem={problem} testId="warehouse-error" />
      <FormRow label="Name" htmlFor="name" error={errors.name}>
        <TextInput id="name" value={name} onChange={setName} placeholder="Pune central" />
      </FormRow>
      <FormRow label="Address" htmlFor="address" error={errors.address}>
        <TextInput id="address" value={address} onChange={setAddress} />
      </FormRow>
      <label className="flex items-center gap-3 text-sm text-foreground">
        <Switch checked={active} onCheckedChange={setActive} data-testid="input-active" />
        <span>
          Active
          <span className="block text-xs text-muted-foreground">A warehouse with stock in it can&apos;t be turned off.</span>
        </span>
      </label>
    </MachineDialog>
  );
}
