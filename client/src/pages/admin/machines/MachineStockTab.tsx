"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchRestockHistory, fetchStock, restock } from "@/lib/adminMachineApi";
import type { RestockLine } from "@shared/admin/machines";
import type { RestockEvent, StockSlot } from "@shared/admin/machinesSchema";
import { SuccessPanel } from "../AdminUi";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  Head,
  LoadMore,
  MachineDialog,
  NoData,
  problemOf,
  ProblemPanel,
  REFRESH_NOTE,
  type Problem,
} from "./MachinesUi";

const FILLS = [1, 0.75, 0.5, 0.25] as const;

export function newLevel(slot: StockSlot, add: number): number {
  return Math.min(slot.capacity, Math.max(0, slot.residueQty + add));
}

export function fillAdd(slot: StockSlot, share: number): number {
  return Math.max(0, Math.round(slot.capacity * share - slot.residueQty));
}

export function restockLines(slots: StockSlot[], adds: Record<string, string>): { lines: RestockLine[]; errors: Record<string, string> } {
  const lines: RestockLine[] = [];
  const errors: Record<string, string> = {};
  for (const slot of slots) {
    const text = (adds[slot.slotId] ?? "").trim();
    if (text === "") continue;
    const add = Number(text);
    if (!Number.isInteger(add) || Math.abs(add) > 1_000_000) {
      errors[slot.slotId] = "A whole number.";
      continue;
    }
    if (add !== 0) lines.push({ slotId: slot.slotId, add, seenResidueQty: slot.residueQty });
  }
  return { lines, errors };
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function MachineStockTab({ sn }: { sn: string }) {
  const [slots, setSlots] = useState<StockSlot[]>([]);
  const [adds, setAdds] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchStock(sn);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return false;
    }
    setSlots(result.data.items);
    return true;
  }, [sn]);

  useEffect(() => {
    void load();
  }, [load]);

  function fill(share: number) {
    setErrors({});
    setAdds(Object.fromEntries(slots.map((slot) => [slot.slotId, String(fillAdd(slot, share))])));
  }

  async function submit() {
    setNotice(null);
    const checked = restockLines(slots, adds);
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length > 0) return;
    if (checked.lines.length === 0) {
      setProblem({ message: "Enter an amount to add on at least one row.", issues: [] });
      return;
    }
    setSaving(true);
    const result = await restock(sn, checked.lines);
    setSaving(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      if (result.error.code === "stale_stock") await load();
      return;
    }
    setProblem(null);
    setSlots(result.data.items);
    setAdds({});
    setNotice(`Stock updated on ${result.data.changes.length} slot${result.data.changes.length === 1 ? "" : "s"}. ${REFRESH_NOTE}`);
  }

  return (
    <div>
      <ProblemPanel problem={problem} testId="stock-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="stock-saved">{notice}</SuccessPanel>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILLS.map((share) => (
          <Button
            key={share}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fill(share)}
            disabled={slots.length === 0}
            className="rounded-lg cursor-pointer"
            data-testid={`button-fill-${share * 100}`}
          >
            {share === 1 ? "Fill 100%" : `${share * 100}%`}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setAdds({});
            setErrors({});
          }}
          className="rounded-lg cursor-pointer"
          data-testid="button-clear"
        >
          Clear
        </Button>
        <button
          type="button"
          onClick={() => setHistory(true)}
          className="ml-auto text-sm font-semibold text-primary hover:underline cursor-pointer"
          data-testid="link-restock-history"
        >
          History
        </button>
      </div>

      <DataTable testId="stock-table">
        <Head>
          <Col className="hidden sm:table-cell">Position</Col>
          <Col>Material</Col>
          <Col align="right">Capacity</Col>
          <Col align="right" className="hidden sm:table-cell">Warning</Col>
          <Col>Current</Col>
          <Col>Add</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {slots.length === 0 ? (
            <NoData colSpan={6} loading={loading} />
          ) : (
            slots.map((slot) => {
              const text = adds[slot.slotId] ?? "";
              const add = Number(text);
              const preview = text.trim() !== "" && Number.isFinite(add) && add !== 0 ? newLevel(slot, add) : null;
              const share = slot.capacity > 0 ? Math.min(100, (slot.residueQty / slot.capacity) * 100) : 0;
              return (
                <tr key={slot.slotId} data-testid={`row-slot-${slot.slotId}`}>
                  <Cell className="hidden tabular-nums sm:table-cell">{slot.position}</Cell>
                  <Cell className="font-semibold">{slot.name}</Cell>
                  <Cell align="right" className="tabular-nums whitespace-nowrap">
                    {trim(slot.capacity)} {slot.unit}
                  </Cell>
                  <Cell align="right" className="hidden tabular-nums sm:table-cell">{trim(slot.warnCapacity)}</Cell>
                  <Cell className="min-w-[6rem] sm:min-w-[10rem]">
                    <span
                      className={`block tabular-nums font-semibold ${slot.low ? "text-rose-300" : "text-foreground"}`}
                      data-testid={`current-${slot.slotId}`}
                    >
                      {trim(slot.residueQty)}
                    </span>
                    <span className="mt-1 block h-1.5 w-full rounded-full bg-secondary" aria-hidden>
                      <span
                        className={`block h-full rounded-full ${slot.low ? "bg-rose-400" : "bg-emerald-400"}`}
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </Cell>
                  <Cell>
                    <Input
                      value={text}
                      onChange={(event) => setAdds((a) => ({ ...a, [slot.slotId]: event.target.value }))}
                      inputMode="numeric"
                      aria-label={`Add to ${slot.name}`}
                      aria-invalid={Boolean(errors[slot.slotId])}
                      className="h-8 w-24 rounded-lg bg-secondary/50 border-border text-sm tabular-nums"
                      data-testid={`add-${slot.slotId}`}
                    />
                    {errors[slot.slotId] ? (
                      <span className="mt-0.5 block text-[11px] text-rose-300">{errors[slot.slotId]}</span>
                    ) : (
                      preview !== null && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground" data-testid={`new-level-${slot.slotId}`}>
                          New level: {trim(preview)}
                        </span>
                      )
                    )}
                  </Cell>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>
      <p className="mt-2 text-xs text-muted-foreground">
        A negative amount corrects a level down. Capacity and Warning are set per model in Materials.
      </p>

      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={submit} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-submit-stock">
          {saving ? "Submitting…" : "Submit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAdds({});
            setErrors({});
            setProblem(null);
          }}
          className="rounded-xl cursor-pointer"
          data-testid="button-cancel-stock"
        >
          Cancel
        </Button>
      </div>

      <RestockHistory open={history} sn={sn} onClose={() => setHistory(false)} />
    </div>
  );
}

function RestockHistory({ open, sn, onClose }: { open: boolean; sn: string; onClose: () => void }) {
  const [events, setEvents] = useState<RestockEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const page = useCallback(
    async (from: string | null) => {
      setLoading(true);
      const result = await fetchRestockHistory(sn, from);
      setLoading(false);
      if (!result.ok) {
        setProblem(problemOf(result));
        return;
      }
      setProblem(null);
      setEvents((e) => (from ? [...e, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
    },
    [sn],
  );

  useEffect(() => {
    if (open) void page(null);
  }, [open, page]);

  return (
    <MachineDialog open={open} onClose={onClose} wide title="Restock history" description="Newest first." testId="restock-history">
      <ProblemPanel problem={problem} testId="restock-history-error" />
      <DataTable testId="restock-history-table">
        <Head>
          <Col>Time</Col>
          <Col>By</Col>
          <Col>Changes</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {events.length === 0 ? (
            <NoData colSpan={3} loading={loading} />
          ) : (
            events.map((event, i) => (
              <tr key={`${event.at}-${i}`}>
                <Cell className="whitespace-nowrap text-xs tabular-nums">{formatIstStamp(event.at)}</Cell>
                <Cell className={event.byMachine ? "text-muted-foreground" : ""}>{event.by}</Cell>
                <Cell>
                  <ul className="space-y-0.5 text-xs">
                    {event.changes.map((change) => (
                      <li key={change.slotId}>
                        <span className="font-semibold">{change.name}</span>{" "}
                        <span className="tabular-nums text-muted-foreground">
                          {trim(change.before)} → {trim(change.after)} ({change.add >= 0 ? "+" : ""}
                          {trim(change.add)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      {cursor && <LoadMore onClick={() => page(cursor)} loading={loading} />}
    </MachineDialog>
  );
}
