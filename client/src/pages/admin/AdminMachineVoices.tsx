"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchVoices, setVoiceDefaults } from "@/lib/adminMachineApi";
import type { Voices } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, SuccessPanel } from "./AdminUi";
import { appStartNotice } from "./machines/mediaBits";
import { toPositionsInput, VoiceSlots, type VoiceFiles } from "./machines/VoiceSlots";
import {
  Cell,
  Col,
  DataTable,
  formatIstStamp,
  Head,
  MachineLabel,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";

export default function AdminMachineVoices() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <VoicesPage session={guard.session} />;
}

function VoicesPage({ session }: { session: AdminSession }) {
  const [data, setData] = useState<Voices | null>(null);
  const [files, setFiles] = useState<VoiceFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchVoices();
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setStale(false);
    setData(result.data);
    setFiles(result.data.defaults.positions);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data || !files) return;
    setNotice(null);
    setSaving(true);
    const result = await setVoiceDefaults(toPositionsInput(files), data.defaults.version);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setErrors({});
    setProblem(null);
    setData({ ...data, defaults: result.data.defaults });
    setFiles(result.data.defaults.positions);
    setNotice(appStartNotice(result.data.restartPending));
  }

  return (
    <MachinesShell session={session} section="voices">
      <MachinesHeader
        title="Voice prompts"
        subtitle="One audio file for each moment of a sale. MP3, AAC or WAV, up to 1 MB each."
      />

      <ProblemPanel problem={problem} testId="voices-error" />
      {stale && (
        <div className="mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="rounded-xl cursor-pointer" data-testid="button-reload-voices">
            Reload
          </Button>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="voices-notice">{notice}</SuccessPanel>
        </div>
      )}

      {(data || !problem) && (
        <div className="space-y-5">
          <Card
            title="Default prompts"
            note={
              data?.defaults.updatedAt
                ? `Every machine plays these unless it has its own. Last saved ${formatIstStamp(data.defaults.updatedAt)}${data.defaults.updatedBy ? ` by ${data.defaults.updatedBy}` : ""}.`
                : "Every machine plays these unless it has its own."
            }
            testId="card-voice-defaults"
          >
            {files ? (
              <>
                <VoiceSlots files={files} onChange={setFiles} errors={errors} onUploading={setUploading} />
                <div className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
                  <Button type="button" onClick={() => void save()} disabled={saving || uploading} className="rounded-xl cursor-pointer" data-testid="button-save-voices">
                    {saving ? "Saving…" : "Save default prompts"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
            )}
          </Card>

          <Card
            title="Machines with their own prompts"
            note="To give a machine its own prompts, open the machine and choose Voice prompts."
            testId="card-voice-overrides"
          >
            <div className="p-4 sm:p-5">
              <DataTable testId="voice-overrides-table">
                <Head>
                  <Col>Machine</Col>
                  <Col>Name</Col>
                  <Col>Own prompts</Col>
                  <Col>Operate</Col>
                </Head>
                <tbody className="divide-y divide-border/70">
                  {!data || data.overrides.length === 0 ? (
                    <NoData colSpan={4} loading={loading} />
                  ) : (
                    data.overrides.map((o) => (
                      <tr key={o.sn} data-testid={`override-${o.sn}`}>
                        <Cell>
                          <MachineLabel deviceExtNo={o.deviceExtNo} sn={o.sn} />
                        </Cell>
                        <Cell>{o.name}</Cell>
                        <Cell className="tabular-nums text-muted-foreground">
                          {o.positions.length === 1 ? "Position" : "Positions"} {o.positions.join(", ")}
                        </Cell>
                        <Cell>
                          <Link
                            href={`/machines/${encodeURIComponent(o.sn)}?tab=voices`}
                            className="text-xs font-semibold text-primary hover:underline"
                            data-testid={`edit-override-${o.sn}`}
                          >
                            Edit
                          </Link>
                        </Cell>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </div>
          </Card>
        </div>
      )}
    </MachinesShell>
  );
}
