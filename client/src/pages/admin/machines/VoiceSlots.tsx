"use client";

import { useState } from "react";
import { uploadMachineFile } from "@/lib/adminMachineApi";
import type { VoicePositionsInput } from "@shared/admin/machines";
import { VOICE_POSITIONS, type UploadedFile, type VoicePosition } from "@shared/admin/machinesSchema";
import { Pill } from "../AdminUi";
import { ACCEPT, FileButton, formatBytes, precheckMedia } from "./mediaBits";

export const VOICE_MOMENTS: Record<VoicePosition, { when: string; example: string }> = {
  "1": { when: "A customer touches an ad to close it", example: "Welcome, please select your drink" },
  "2": { when: "Making starts", example: "Your drink is being made, please wait" },
  "3": { when: "The drink is ready", example: "Your drink is ready, please enjoy" },
  "4": { when: "Making failed", example: "Sorry, making failed" },
  "5": { when: "A cup is left in the holder", example: "Please take your drink" },
};

export type VoiceFiles = Record<VoicePosition, UploadedFile | null>;

export const emptyVoiceFiles = (): VoiceFiles => ({ "1": null, "2": null, "3": null, "4": null, "5": null });

export const toPositionsInput = (files: VoiceFiles): VoicePositionsInput =>
  Object.fromEntries(VOICE_POSITIONS.map((p) => [p, files[p] ? { url: files[p]!.url } : null])) as VoicePositionsInput;

export function VoiceSlots({
  files,
  onChange,
  inherited,
  errors,
  onUploading,
}: {
  files: VoiceFiles;
  onChange: (files: VoiceFiles) => void;
  inherited?: VoiceFiles;
  errors: Record<string, string>;
  onUploading: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState<VoicePosition | null>(null);
  const [refusals, setRefusals] = useState<Partial<Record<VoicePosition, string>>>({});

  async function pick(p: VoicePosition, file: File) {
    const refusal = await precheckMedia("voice", file);
    setRefusals((r) => ({ ...r, [p]: refusal ?? undefined }));
    if (refusal) return;
    setUploading(p);
    onUploading(true);
    const result = await uploadMachineFile("voice", file);
    setUploading(null);
    onUploading(false);
    if (!result.ok) {
      const f = result.error.fieldErrors;
      setRefusals((r) => ({ ...r, [p]: f?.file ?? f?.size ?? f?.contentType ?? result.error.message }));
      return;
    }
    onChange({ ...files, [p]: result.data });
  }

  return (
    <ol className="divide-y divide-border/70" data-testid="voice-slots">
      {VOICE_POSITIONS.map((p) => {
        const own = files[p];
        const fallback = inherited?.[p] ?? null;
        const playing = own ?? fallback;
        const error = refusals[p] ?? errors[`positions.${p}`];
        return (
          <li key={p} className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-center" data-testid={`voice-${p}`}>
            <div className="flex gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold tabular-nums text-foreground">
                {p}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{VOICE_MOMENTS[p].when}</span>
                <span className="block text-xs text-muted-foreground">For example: “{VOICE_MOMENTS[p].example}”</span>
              </span>
            </div>

            <div className="min-w-0">
              {playing ? (
                <div className="space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="break-all font-medium text-foreground" data-testid={`voice-${p}-file`}>
                      {playing.fileName}
                    </span>
                    <span>{formatBytes(playing.size)}</span>
                    {inherited && (
                      <Pill className={own ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"} testId={`voice-${p}-source`}>
                        {own ? "This machine" : "Default"}
                      </Pill>
                    )}
                  </p>
                  <audio key={playing.url} src={playing.url} controls preload="none" className="h-9 w-full max-w-sm" aria-label={`Position ${p} prompt`} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid={`voice-${p}-empty`}>
                  {inherited ? "No prompt. The machine stays silent here." : "No prompt set."}
                </p>
              )}
              {error && (
                <p className="mt-1 text-xs text-rose-300" role="alert" data-testid={`voice-${p}-error`}>
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 md:justify-end">
              <FileButton
                accept={ACCEPT.voice}
                onFile={(file) => void pick(p, file)}
                disabled={uploading !== null}
                label={uploading === p ? "Uploading…" : own ? "Replace" : inherited ? "Use own file" : "Upload"}
                testId={`voice-${p}-upload`}
              />
              {own && (
                <button
                  type="button"
                  onClick={() => onChange({ ...files, [p]: null })}
                  className="rounded-lg px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 cursor-pointer"
                  data-testid={`voice-${p}-remove`}
                >
                  {inherited && fallback ? "Use default" : "Remove"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
