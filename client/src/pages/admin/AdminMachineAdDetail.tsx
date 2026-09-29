"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAd, fetchAllMachines, setAdSchedules, updateAd } from "@/lib/adminMachineApi";
import type { Ad, MachineRow } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Pill, SuccessPanel } from "./AdminUi";
import { AdForm } from "./machines/AdForm";
import { inputClass } from "./machines/formBits";
import { appStartNotice } from "./machines/mediaBits";
import { FieldError, MachinePicker, TimeField } from "./machines/scopeBits";
import {
  blankRow,
  MAX_SCHEDULE_ROWS,
  rowsOf,
  scheduleState,
  validateSchedules,
  type ScheduleRow,
  type ScheduleState,
} from "./machines/adRules";
import { formatIstStamp, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachineAdDetail({ adId }: { adId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <AdDetail session={guard.session} adId={adId} />;
}

function AdDetail({ session, adId }: { session: AdminSession; adId: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);

  const load = useCallback(async () => {
    const result = await fetchAd(adId);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setAd(result.data.ad);
    setLoadCount((n) => n + 1);
  }, [adId]);

  useEffect(() => {
    void load();
    fetchAllMachines().then((result) => {
      if (result.ok) setMachines(result.data);
      else setProblem(problemOf(result));
    });
  }, [load]);

  useEffect(() => {
    if (loadCount === 1 && window.location.hash === "#where-shown") {
      document.getElementById("where-shown")?.scrollIntoView({ block: "start" });
    }
  }, [loadCount]);

  return (
    <MachinesShell session={session} section="ads">
      <MachinesHeader
        title={ad ? ad.name : "Ad"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/ads" className="text-primary hover:underline">
              Ads
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-xs">{adId}</span>
            {ad && (
              <span className="text-xs">
                Last edited {formatIstStamp(ad.updatedAt)}
                {ad.updatedBy ? ` by ${ad.updatedBy}` : ""}.
              </span>
            )}
          </span>
        }
      />

      <ProblemPanel problem={problem} testId="ad-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="ad-notice">{notice}</SuccessPanel>
        </div>
      )}

      {ad && (
        <div className="space-y-5">
          <Card title="Ad" testId="card-ad">
            <div className="p-4 sm:p-5">
              <AdForm
                key={`form-${loadCount}`}
                ad={ad}
                submitLabel="Save"
                onSubmit={(input) => updateAd(ad.adId, input, ad.version)}
                onReload={() => void load()}
                onSaved={(saved, restartPending) => {
                  setAd(saved);
                  setNotice(saved.schedules.length > 0 ? appStartNotice(restartPending) : "Saved.");
                }}
              />
            </div>
          </Card>

          <ScheduleCard
            key={`schedules-${loadCount}`}
            ad={ad}
            machines={machines}
            onReload={() => void load()}
            onSaved={(saved, restartPending) => {
              setAd(saved);
              setNotice(appStartNotice(restartPending));
            }}
          />
        </div>
      )}
    </MachinesShell>
  );
}

const STATE_LABEL: Record<ScheduleState, { text: string; className: string }> = {
  live: { text: "Showing now", className: "bg-emerald-400/15 text-emerald-200" },
  upcoming: { text: "Upcoming", className: "bg-sky-400/15 text-sky-200" },
  ended: { text: "Ended", className: "bg-secondary text-muted-foreground" },
};

const asIst = (value: string) => (value ? `${value}:00+05:30` : null);

function ScheduleCard({
  ad,
  machines,
  onSaved,
  onReload,
}: {
  ad: Ad;
  machines: MachineRow[];
  onSaved: (ad: Ad, restartPending: number) => void;
  onReload: () => void;
}) {
  const [rows, setRows] = useState<ScheduleRow[]>(() => rowsOf(ad.schedules));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = Date.now();

  const update = (key: string, patch: Partial<ScheduleRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function save() {
    const checked = validateSchedules(rows);
    setErrors(checked.errors);
    if (!checked.input) {
      setProblem({ message: "Some rows need fixing.", issues: [] });
      return;
    }
    setSaving(true);
    const result = await setAdSchedules(ad.adId, checked.input, ad.version);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setProblem(null);
    setStale(false);
    setRows(rowsOf(result.data.ad.schedules));
    onSaved(result.data.ad, result.data.restartPending ?? 0);
  }

  const nextSort = rows.reduce((max, r) => Math.max(max, Number(r.sort) || 0), 0) + (rows.length ? 1 : 0);

  return (
    <Card
      id="where-shown"
      title="Where shown"
      note="Each row says which machines play this ad, and when. A machine can be in one row per ad. Times are India time."
      testId="card-where-shown"
    >
      <div className="space-y-4 p-4 sm:p-5">
        <ProblemPanel problem={problem} testId="schedules-error" />
        {stale && (
          <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-xl cursor-pointer" data-testid="button-reload-schedules">
            Reload
          </Button>
        )}
        {errors.schedules && (
          <p className="text-xs text-rose-300" role="alert">
            {errors.schedules}
          </p>
        )}

        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground" data-testid="no-schedules">
            Not shown on any machine yet. Add a row to choose machines and a time window.
          </p>
        )}

        {rows.map((row, i) => {
          const at = `schedules.${i}`;
          const state = row.start && row.end && row.start < row.end ? scheduleState({ startAt: asIst(row.start), endAt: asIst(row.end) }, now) : null;
          return (
            <fieldset key={row.key} className="rounded-xl border border-border bg-secondary/20 p-4" data-testid={`schedule-row-${i}`}>
              <legend className="sr-only">Row {i + 1}</legend>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  Row {i + 1}
                  {state && <Pill className={STATE_LABEL[state].className}>{STATE_LABEL[state].text}</Pill>}
                </span>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 cursor-pointer"
                  data-testid={`remove-row-${i}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Machines</p>
                  <div className="flex flex-wrap gap-4 text-sm text-foreground">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`machines-${row.key}`}
                        checked={row.allMachines}
                        onChange={() => update(row.key, { allMachines: true })}
                        className="h-4 w-4 accent-primary"
                        data-testid={`all-machines-${i}`}
                      />
                      All machines
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`machines-${row.key}`}
                        checked={!row.allMachines}
                        onChange={() => update(row.key, { allMachines: false })}
                        className="h-4 w-4 accent-primary"
                        data-testid={`chosen-machines-${i}`}
                      />
                      Chosen machines{row.sns.length > 0 ? ` (${row.sns.length})` : ""}
                    </label>
                  </div>
                  {!row.allMachines && (
                    <MachinePicker machines={machines} chosen={row.sns} onChange={(sns) => update(row.key, { sns })} testId={`picker-${i}`} />
                  )}
                  <FieldError error={errors[`${at}.sns`]} testId={`error-${at}.sns`} />
                </div>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem] lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
                  <TimeField label="Start" value={row.start} onChange={(start) => update(row.key, { start })} error={errors[`${at}.start`]} testId={`start-${i}`} />
                  <TimeField label="End" value={row.end} onChange={(end) => update(row.key, { end })} error={errors[`${at}.end`]} testId={`end-${i}`} />
                  <label className="space-y-1.5">
                    <span className="block text-sm font-semibold text-muted-foreground">Order</span>
                    <Input
                      value={row.sort}
                      onChange={(event) => update(row.key, { sort: event.target.value })}
                      inputMode="numeric"
                      className={inputClass}
                      data-testid={`sort-${i}`}
                    />
                    <FieldError error={errors[`${at}.sort`]} testId={`error-${at}.sort`} />
                  </label>
                </div>
              </div>
            </fieldset>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((rs) => [...rs, blankRow(nextSort)])}
            disabled={rows.length >= MAX_SCHEDULE_ROWS}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-row"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add row
          </Button>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">Lower order plays first.</p>
            <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-schedules">
              {saving ? "Saving…" : "Save where shown"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
