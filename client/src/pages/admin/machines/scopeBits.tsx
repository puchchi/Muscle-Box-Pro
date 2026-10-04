"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { MachineRow } from "@shared/admin/machinesSchema";
import { inputClass } from "./formBits";
import { END_QUICK_MONTHS, quickEnd } from "./quickEnd";

export function FieldError({ error, testId }: { error?: string; testId: string }) {
  if (!error) return null;
  return (
    <p className="text-xs text-rose-300" role="alert" data-testid={testId}>
      {error}
    </p>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  error,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  testId: string;
}) {
  return (
    <label className="min-w-0 space-y-1.5">
      <span className="block text-sm font-semibold text-muted-foreground">{label}</span>
      <Input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} data-testid={testId} />
      <FieldError error={error} testId={`error-${testId}`} />
    </label>
  );
}

export function EndField({
  label = "End",
  start,
  value,
  onChange,
  error,
  testId,
}: {
  label?: string;
  start: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  testId: string;
}) {
  const from = start ? "after the start" : "from now";
  return (
    <div className="min-w-0 space-y-2">
      <TimeField label={label} value={value} onChange={onChange} error={error} testId={testId} />
      <div className="flex flex-wrap gap-1" role="group" aria-label={`Quick ${label.toLowerCase()}`}>
        {END_QUICK_MONTHS.map(({ months, short, label: length }) => (
          <button
            key={months}
            type="button"
            onClick={() => onChange(quickEnd(start, months, Date.now()))}
            className="min-h-8 rounded-full border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label={`End ${length} ${from}`}
            title={`End ${length} ${from}`}
            data-testid={`${testId}-plus-${months}`}
          >
            +{short}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MachinePicker({
  machines,
  chosen,
  onChange,
  testId,
}: {
  machines: MachineRow[];
  chosen: string[];
  onChange: (sns: string[]) => void;
  testId: string;
}) {
  const [query, setQuery] = useState("");
  const picked = useMemo(() => new Set(chosen), [chosen]);
  const q = query.trim().toLowerCase();
  const shown = machines.filter(
    (m) => !q || m.sn.toLowerCase().includes(q) || m.deviceExtNo.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
  );
  const toggle = (sn: string) => onChange(picked.has(sn) ? chosen.filter((s) => s !== sn) : [...chosen, sn]);

  return (
    <div className="rounded-xl border border-border bg-card" data-testid={testId}>
      <div className="border-b border-border p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find by number, name or SN"
          aria-label="Find a machine"
          className="h-9 rounded-lg border-border bg-secondary/50 text-sm"
        />
      </div>
      <ul className="max-h-48 overflow-y-auto p-1">
        {shown.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No machine matches.</li>}
        {shown.map((m) => (
          <li key={m.sn}>
            <label className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary/50 cursor-pointer">
              <input type="checkbox" checked={picked.has(m.sn)} onChange={() => toggle(m.sn)} className="h-4 w-4 accent-primary" />
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{m.deviceExtNo || m.sn}</span>
                <span className="text-muted-foreground"> · {m.name}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">{m.sn}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MachineScopeField({
  name,
  allMachines,
  sns,
  machines,
  onChange,
  error,
  testId,
}: {
  name: string;
  allMachines: boolean;
  sns: string[];
  machines: MachineRow[];
  onChange: (scope: { allMachines: boolean; sns: string[] }) => void;
  error?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="text-sm font-semibold text-muted-foreground">Machines</p>
      <div className="flex flex-wrap gap-4 text-sm text-foreground">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={allMachines}
            onChange={() => onChange({ allMachines: true, sns })}
            className="h-4 w-4 accent-primary"
            data-testid={`${testId}-all`}
          />
          All machines
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={!allMachines}
            onChange={() => onChange({ allMachines: false, sns })}
            className="h-4 w-4 accent-primary"
            data-testid={`${testId}-chosen`}
          />
          Chosen machines{sns.length > 0 ? ` (${sns.length})` : ""}
        </label>
      </div>
      {!allMachines && <MachinePicker machines={machines} chosen={sns} onChange={(next) => onChange({ allMachines: false, sns: next })} testId={`${testId}-picker`} />}
      <FieldError error={error} testId={`error-${testId}`} />
    </div>
  );
}

export function GoodsPicker({
  goods,
  chosen,
  onChange,
  testId,
}: {
  goods: ReadonlyArray<{ goodsId: string; no: string; name: string }>;
  chosen: string[];
  onChange: (goodsIds: string[]) => void;
  testId: string;
}) {
  const [query, setQuery] = useState("");
  const picked = useMemo(() => new Set(chosen), [chosen]);
  const q = query.trim().toLowerCase();
  const shown = goods.filter((g) => !q || g.name.toLowerCase().includes(q) || g.no.toLowerCase().includes(q));
  const toggle = (id: string) => onChange(picked.has(id) ? chosen.filter((g) => g !== id) : [...chosen, id]);

  return (
    <div className="rounded-xl border border-border bg-card" data-testid={testId}>
      <div className="border-b border-border p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find by name or number"
          aria-label="Find a good"
          className="h-9 rounded-lg border-border bg-secondary/50 text-sm"
        />
      </div>
      <ul className="grid max-h-60 overflow-y-auto p-1 sm:grid-cols-2">
        {shown.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No good matches.</li>}
        {shown.map((g) => (
          <li key={g.goodsId}>
            <label className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary/50 cursor-pointer">
              <input
                type="checkbox"
                checked={picked.has(g.goodsId)}
                onChange={() => toggle(g.goodsId)}
                className="h-4 w-4 accent-primary"
                data-testid={`${testId}-${g.goodsId}`}
              />
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{g.name}</span>
                {g.no && <span className="block font-mono text-[11px] text-muted-foreground">{g.no}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
