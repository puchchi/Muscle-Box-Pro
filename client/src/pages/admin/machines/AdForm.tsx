"use client";

import { useEffect, useState } from "react";
import { Film, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contentTypeOf, uploadMachineFile, type MachineCall } from "@/lib/adminMachineApi";
import type { Ad, UploadedFile } from "@shared/admin/machinesSchema";
import { FormRow, TextInput, inputClass } from "./formBits";
import { ACCEPT, FileButton, formatBytes, precheckMedia } from "./mediaBits";
import { AD_DESCRIPTION_MAX, validateAdFields } from "./adRules";
import { problemOf, ProblemPanel, type Problem } from "./MachinesUi";

type Media = { url: string; video: boolean };

export function AdPreview({ media, width = 72 }: { media: Media | null; width?: number }) {
  const box = { width, height: Math.round((width * 16) / 9) };
  if (!media) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground/60"
        style={box}
        aria-label="No file"
      >
        <ImageOff className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (media.video) {
    return width < 120 ? (
      <span
        className="inline-flex items-center justify-center rounded-lg border border-border bg-black text-muted-foreground"
        style={box}
        aria-label="Video"
      >
        <Film className="h-5 w-5" aria-hidden />
      </span>
    ) : (
      <video src={media.url} style={box} className="rounded-lg border border-border bg-black object-cover" controls muted playsInline preload="metadata" />
    );
  }
  return <img src={media.url} alt="Ad preview" style={box} className="rounded-lg border border-border bg-black object-cover" />;
}

export const mediaOfAd = (ad: Pick<Ad, "type" | "file">): Media => ({ url: ad.file.url, video: ad.type === "video" });

export function AdForm({
  ad,
  submitLabel,
  onSubmit,
  onSaved,
  onCancel,
  onReload,
}: {
  ad: Ad | null;
  submitLabel: string;
  onSubmit: (input: NonNullable<ReturnType<typeof validateAdFields>["input"]>) => Promise<MachineCall<{ ad: Ad; restartPending?: number }>>;
  onSaved: (ad: Ad, restartPending: number) => void;
  onCancel?: () => void;
  onReload?: () => void;
}) {
  const [values, setValues] = useState({ name: ad?.name ?? "", description: ad?.description ?? "" });
  const [file, setFile] = useState<UploadedFile | null>(ad?.file ?? null);
  const [preview, setPreview] = useState<Media | null>(ad ? mediaOfAd(ad) : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function pick(picked: File) {
    const refusal = await precheckMedia("ad", picked);
    if (refusal) {
      setErrors((e) => ({ ...e, file: refusal }));
      return;
    }
    setErrors(({ file: _file, ...rest }) => rest);
    setPreview({ url: URL.createObjectURL(picked), video: contentTypeOf(picked) === "video/mp4" });
    setUploading(true);
    const result = await uploadMachineFile("ad", picked);
    setUploading(false);
    if (!result.ok) {
      setPreview(file ? { url: file.url, video: file.path.endsWith(".mp4") } : null);
      setErrors((e) => ({ ...e, file: result.error.fieldErrors?.file ?? result.error.fieldErrors?.size ?? result.error.fieldErrors?.contentType ?? result.error.message }));
      return;
    }
    setFile(result.data);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const checked = validateAdFields(values, file?.url ?? null);
    setErrors(checked.errors);
    if (!checked.input) return;
    setSaving(true);
    const result = await onSubmit(checked.input);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setProblem(null);
    setStale(false);
    onSaved(result.data.ad, result.data.restartPending ?? 0);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid="ad-form">
      <ProblemPanel problem={problem} testId="ad-form-error" />
      {stale && onReload && (
        <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-xl cursor-pointer" data-testid="button-reload-ad">
          Reload
        </Button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 flex-col items-start gap-2">
          <AdPreview key={preview?.url ?? "none"} media={preview} width={144} />
          <FileButton
            accept={ACCEPT.ad}
            onFile={(picked) => void pick(picked)}
            disabled={uploading}
            label={uploading ? "Uploading…" : file ? "Replace file" : "Upload file"}
            testId="button-ad-file"
          />
          {file && (
            <p className="max-w-[9rem] break-all text-xs text-muted-foreground" data-testid="ad-file-name">
              {file.fileName} · {formatBytes(file.size)}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <FormRow label="Name" htmlFor="ad-name" error={errors.name}>
            <TextInput id="ad-name" value={values.name} onChange={(name) => setValues((v) => ({ ...v, name }))} placeholder="Monsoon whey offer" />
          </FormRow>
          <FormRow label="Description" htmlFor="ad-description" error={errors.description} hint="Optional. Only shown here.">
            <textarea
              id="ad-description"
              value={values.description}
              onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))}
              maxLength={AD_DESCRIPTION_MAX}
              rows={3}
              className={`${inputClass} h-auto w-full border px-3 py-2 text-sm`}
              data-testid="input-ad-description"
            />
          </FormRow>
          <div>
            <p className="text-xs text-muted-foreground">
              A picture (JPG or PNG, 1080×1920 px upright, up to 5 MB) shows for 10 seconds. A video (MP4 H.264, up to 100 MB)
              plays to the end.
            </p>
            {errors.file && (
              <p className="mt-1 text-xs text-rose-300" role="alert" data-testid="error-ad-file">
                {errors.file}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || uploading} className="rounded-xl cursor-pointer" data-testid="button-save-ad">
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
