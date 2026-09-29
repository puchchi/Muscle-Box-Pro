"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchMachineVoices, setMachineVoices } from "@/lib/adminMachineApi";
import type { MachineVoices } from "@shared/admin/machinesSchema";
import { Card, SuccessPanel } from "../AdminUi";
import { appStartNotice } from "./mediaBits";
import { toPositionsInput, VoiceSlots, type VoiceFiles } from "./VoiceSlots";
import { formatIstStamp, problemOf, ProblemPanel, type Problem } from "./MachinesUi";

export function MachineVoicesTab({ sn, onSaved }: { sn: string; onSaved: () => void }) {
  const [data, setData] = useState<MachineVoices | null>(null);
  const [files, setFiles] = useState<VoiceFiles | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchMachineVoices(sn);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setStale(false);
    setData(result.data);
    setFiles(result.data.override.positions);
  }, [sn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data || !files) return;
    setNotice(null);
    setSaving(true);
    const result = await setMachineVoices(sn, toPositionsInput(files), data.override.version);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setErrors({});
    setProblem(null);
    setData(result.data);
    setFiles(result.data.override.positions);
    setNotice(appStartNotice(result.data.restartPending ?? 0));
    onSaved();
  }

  const override = data?.override;

  return (
    <div className="space-y-4">
      <ProblemPanel problem={problem} testId="machine-voices-error" />
      {stale && (
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="rounded-xl cursor-pointer" data-testid="button-reload-machine-voices">
          Reload
        </Button>
      )}
      {notice && <SuccessPanel testId="machine-voices-notice">{notice}</SuccessPanel>}

      <Card
        title="Voice prompts on this machine"
        note={
          override?.updatedAt
            ? `A file here replaces the default for this machine only. Last saved ${formatIstStamp(override.updatedAt)}${override.updatedBy ? ` by ${override.updatedBy}` : ""}.`
            : "A file here replaces the default for this machine only."
        }
        testId="card-machine-voices"
      >
        {data && files ? (
          <>
            <VoiceSlots files={files} onChange={setFiles} inherited={data.defaults.positions} errors={errors} onUploading={setUploading} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
              <Link href="/machines/voices" className="text-xs font-semibold text-primary hover:underline">
                Edit the default prompts
              </Link>
              <Button type="button" onClick={() => void save()} disabled={saving || uploading} className="rounded-xl cursor-pointer" data-testid="button-save-machine-voices">
                {saving ? "Saving…" : "Save prompts"}
              </Button>
            </div>
          </>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">{problem ? "Nothing to show until the prompts load." : "Loading…"}</p>
        )}
      </Card>
    </div>
  );
}
