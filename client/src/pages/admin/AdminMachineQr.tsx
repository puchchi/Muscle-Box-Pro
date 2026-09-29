"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchQrSettings, setQrSettings, uploadMachineFile } from "@/lib/adminMachineApi";
import type { QrInput } from "@shared/admin/machines";
import type { QrSettings, UploadedFile } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, SuccessPanel } from "./AdminUi";
import { FormRow, TextInput } from "./machines/formBits";
import { ACCEPT, appStartNotice, FileButton, formatBytes, precheckMedia } from "./machines/mediaBits";
import { formatIstStamp, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";

export const TIP_MAX = 80;

export const REDEEM_PAIR_WARNING = "Set both the redeem QR and its tip, or the machine hides step 1 of Get Drinks.";

type Values = Pick<QrSettings, "logo" | "memberQr" | "memberTip" | "exchangeQr" | "exchangeTip">;

const ref = (file: UploadedFile | null) => (file ? { url: file.url } : null);

export function validateQr(v: Values): { errors: Record<string, string>; input: QrInput | null; warning: string | null } {
  const errors: Record<string, string> = {};
  const memberTip = v.memberTip.trim();
  const exchangeTip = v.exchangeTip.trim();
  if (memberTip.length > TIP_MAX) errors.memberTip = `Up to ${TIP_MAX} characters.`;
  if (exchangeTip.length > TIP_MAX) errors.exchangeTip = `Up to ${TIP_MAX} characters.`;
  const warning = Boolean(v.exchangeQr) !== Boolean(exchangeTip) ? REDEEM_PAIR_WARNING : null;
  if (Object.keys(errors).length > 0) return { errors, input: null, warning };
  return {
    errors,
    warning,
    input: { logo: ref(v.logo), memberQr: ref(v.memberQr), memberTip, exchangeQr: ref(v.exchangeQr), exchangeTip },
  };
}

export default function AdminMachineQr() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <QrPage session={guard.session} />;
}

function QrPage({ session }: { session: AdminSession }) {
  const [settings, setSettings] = useState<QrSettings | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchQrSettings();
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setStale(false);
    setSettings(result.data.settings);
    setValues(result.data.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof Values>(key: K) => (value: Values[K]) => setValues((v) => (v ? { ...v, [key]: value } : v));
  const busy = (delta: number) => setUploading((n) => n + delta);

  async function save() {
    if (!settings || !values) return;
    setNotice(null);
    const checked = validateQr(values);
    setErrors(checked.errors);
    if (!checked.input) return;
    setSaving(true);
    const result = await setQrSettings(checked.input, settings.version);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setProblem(null);
    setSettings(result.data.settings);
    setValues(result.data.settings);
    setNotice(appStartNotice(result.data.restartPending ?? 0));
  }

  const warning = values ? validateQr(values).warning : null;

  return (
    <MachinesShell session={session} section="qr">
      <MachinesHeader
        title="QR and logo"
        subtitle={
          settings?.updatedAt
            ? `One set for every machine. Last saved ${formatIstStamp(settings.updatedAt)}${settings.updatedBy ? ` by ${settings.updatedBy}` : ""}.`
            : "One set for every machine."
        }
      />

      <ProblemPanel problem={problem} testId="qr-error" />
      {stale && (
        <div className="mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="rounded-xl cursor-pointer" data-testid="button-reload-qr">
            Reload
          </Button>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="qr-notice">{notice}</SuccessPanel>
        </div>
      )}

      {values && (
        <div className="space-y-5">
          <Card title="Header logo" note="PNG with a clear background, 195 px high and up to 600 px wide. It sits on the left of the menu header." testId="card-logo">
            <div className="p-4 sm:p-5">
              <PictureSlot
                kind="logo"
                file={values.logo}
                onChange={set("logo")}
                onBusy={busy}
                error={errors.logo}
                emptyText="No logo. The header shows none."
                frame="h-[98px] w-full max-w-[300px]"
                testId="logo"
              />
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Join Members" note="Shown in the Join Members dialog. A square PNG, at least 200×200 px." testId="card-member">
              <div className="space-y-4 p-4 sm:p-5">
                <PictureSlot
                  kind="qr"
                  file={values.memberQr}
                  onChange={set("memberQr")}
                  onBusy={busy}
                  error={errors.memberQr}
                  emptyText="No QR. The machine shows its SN as a QR instead."
                  frame="h-40 w-40"
                  testId="member-qr"
                />
                <TipField id="memberTip" label="Tip under the QR" value={values.memberTip} onChange={set("memberTip")} error={errors.memberTip} />
              </div>
            </Card>

            <Card title="Get Drinks (redeem)" note="Step 1 of the Get Drinks screen. A square PNG, at least 200×200 px." testId="card-exchange">
              <div className="space-y-4 p-4 sm:p-5">
                <PictureSlot
                  kind="qr"
                  file={values.exchangeQr}
                  onChange={set("exchangeQr")}
                  onBusy={busy}
                  error={errors.exchangeQr}
                  emptyText="No QR. The machine hides step 1."
                  frame="h-40 w-40"
                  testId="exchange-qr"
                />
                <TipField id="exchangeTip" label="Tip beside the QR" value={values.exchangeTip} onChange={set("exchangeTip")} error={errors.exchangeTip} />
                {warning && (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="status" data-testid="redeem-warning">
                    {warning}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => void save()} disabled={saving || uploading > 0} className="rounded-xl cursor-pointer" data-testid="button-save-qr">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </MachinesShell>
  );
}

function TipField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <FormRow label={label} htmlFor={id} error={error} hint={`${value.trim().length} of ${TIP_MAX} characters.`}>
      <TextInput id={id} value={value} onChange={onChange} />
    </FormRow>
  );
}

function PictureSlot({
  kind,
  file,
  onChange,
  onBusy,
  error,
  emptyText,
  frame,
  testId,
}: {
  kind: "logo" | "qr";
  file: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onBusy: (delta: number) => void;
  error?: string;
  emptyText: string;
  frame: string;
  testId: string;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(picked: File) {
    const found = await precheckMedia(kind, picked);
    setRefusal(found);
    if (found) return;
    setUploading(true);
    onBusy(1);
    const result = await uploadMachineFile(kind, picked);
    setUploading(false);
    onBusy(-1);
    if (!result.ok) {
      const f = result.error.fieldErrors;
      setRefusal(f?.file ?? f?.size ?? f?.contentType ?? result.error.message);
      return;
    }
    onChange(result.data);
  }

  const shown = refusal ?? error;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-testid={testId}>
      <div
        className={`${frame} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(hsl(var(--secondary))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]`}
      >
        {file ? (
          <img src={file.url} alt="" className="max-h-full max-w-full object-contain" data-testid={`${testId}-picture`} />
        ) : (
          <ImageOff className="h-5 w-5 text-muted-foreground/60" aria-hidden />
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <p className="break-all text-xs text-muted-foreground">
          {file ? (
            <>
              <span className="font-medium text-foreground">{file.fileName}</span>
              {file.width && file.height ? ` · ${file.width}×${file.height} px` : ""} · {formatBytes(file.size)}
            </>
          ) : (
            emptyText
          )}
        </p>
        <div className="flex gap-2">
          <FileButton
            accept={ACCEPT[kind]}
            onFile={(picked) => void pick(picked)}
            disabled={uploading}
            label={uploading ? "Uploading…" : file ? "Replace" : "Upload"}
            testId={`${testId}-upload`}
          />
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 cursor-pointer"
              data-testid={`${testId}-remove`}
            >
              Remove
            </button>
          )}
        </div>
        {shown && (
          <p className="text-xs text-rose-300" role="alert" data-testid={`${testId}-error`}>
            {shown}
          </p>
        )}
      </div>
    </div>
  );
}
