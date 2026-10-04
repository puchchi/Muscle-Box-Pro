"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contentTypeOf } from "@/lib/adminMachineApi";
import type { UploadKind } from "@shared/admin/machines";

export const APP_START_NOTE = "The machine picks this up the next time its app starts.";

export function appStartNotice(restartPending: number, lead = "Saved."): string {
  if (restartPending === 0) return `${lead} No machine needs a restart for this.`;
  const machines = restartPending === 1 ? "1 machine now shows" : `${restartPending} machines now show`;
  return `${lead} ${APP_START_NOTE} ${machines} Restart pending.`;
}

const MB = 1024 * 1024;

type Size = { width: number; height: number };

type MediaRule = {
  maxBytes: Record<string, number>;
  typeHint: string;
  notPicture: string;
  picture?: (width: number, height: number) => string | null;
  maxSeconds?: number;
};

type MediaKind = Exclude<UploadKind, "goods">;

const MEDIA_RULES: Record<MediaKind, MediaRule> = {
  goodsMedia: {
    maxBytes: { "image/png": 2 * MB, "image/jpeg": 2 * MB, "video/mp4": 20 * MB },
    typeHint: "PNG, JPG or MP4 only.",
    notPicture: "This isn't a PNG or JPG picture.",
    picture: (w, h) =>
      w !== h
        ? `The picture must be square. This one is ${w}×${h} px.`
        : w < 420
          ? `The picture must be at least 420×420 px. This one is ${w}×${h} px.`
          : null,
    maxSeconds: 60,
  },
  ad: {
    maxBytes: { "image/png": 5 * MB, "image/jpeg": 5 * MB, "video/mp4": 100 * MB },
    typeHint: "JPG, PNG or MP4 only.",
    notPicture: "This isn't a PNG or JPG picture.",
    picture: (w, h) => (w === 1080 && h === 1920 ? null : `Ad pictures must be 1080×1920 px, upright. This one is ${w}×${h} px.`),
  },
  voice: {
    maxBytes: { "audio/mpeg": MB, "audio/aac": MB, "audio/wav": MB, "audio/x-wav": MB, "audio/wave": MB },
    typeHint: "MP3, AAC or WAV only.",
    notPicture: "",
  },
  logo: {
    maxBytes: { "image/png": MB },
    typeHint: "PNG only.",
    notPicture: "This isn't a PNG picture.",
    picture: (w, h) =>
      h === 195 && w <= 600 ? null : `The logo must be 195 px high and up to 600 px wide. This one is ${w}×${h} px.`,
  },
  qr: {
    maxBytes: { "image/png": MB },
    typeHint: "PNG only.",
    notPicture: "This isn't a PNG picture.",
    picture: (w, h) =>
      w !== h
        ? `The QR picture must be square. This one is ${w}×${h} px.`
        : w < 200
          ? `The QR picture must be at least 200×200 px. This one is ${w}×${h} px.`
          : null,
  },
};

export const ACCEPT: Record<MediaKind, string> = {
  goodsMedia: "image/png,image/jpeg,video/mp4",
  ad: "image/png,image/jpeg,video/mp4",
  voice: "audio/mpeg,audio/aac,audio/wav,.mp3,.aac,.wav",
  logo: "image/png",
  qr: "image/png",
};

export const isPictureType = (type: string) => type === "image/png" || type === "image/jpeg";

export function checkMedia(
  kind: MediaKind,
  file: { name: string; type: string; size: number },
  size: Size | null,
  seconds: number | null = null,
): string | null {
  const rule = MEDIA_RULES[kind];
  const type = contentTypeOf(file);
  const max = rule.maxBytes[type];
  if (max === undefined) return rule.typeHint;
  if (file.size > max) return `Up to ${max / MB} MB.`;
  if (type === "video/mp4" && rule.maxSeconds && seconds !== null && seconds > rule.maxSeconds) {
    return `Videos can be up to ${rule.maxSeconds} seconds.`;
  }
  if (!isPictureType(type) || !rule.picture) return null;
  if (!size) return rule.notPicture;
  return rule.picture(size.width, size.height);
}

export function readPictureSize(url: string): Promise<Size | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function readVideoSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => resolve(null);
    video.src = url;
  });
}

export async function precheckMedia(kind: MediaKind, file: File): Promise<string | null> {
  const type = contentTypeOf(file);
  const early = checkMedia(kind, file, null);
  const timed = type === "video/mp4" && MEDIA_RULES[kind].maxSeconds !== undefined;
  if (!isPictureType(type) && (!timed || early)) return early;
  const local = URL.createObjectURL(file);
  try {
    if (timed) return checkMedia(kind, file, null, await readVideoSeconds(local));
    return checkMedia(kind, file, await readPictureSize(local));
  } finally {
    URL.revokeObjectURL(local);
  }
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export function FileButton({
  accept,
  onFile,
  disabled,
  label,
  testId,
}: {
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  label: string;
  testId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
        data-testid={`${testId}-input`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="rounded-xl cursor-pointer"
        data-testid={testId}
      >
        <Upload className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    </>
  );
}
