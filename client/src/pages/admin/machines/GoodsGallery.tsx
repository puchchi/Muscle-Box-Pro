"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Film, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contentTypeOf, uploadMachineFile } from "@/lib/adminMachineApi";
import type { GoodMedia } from "@shared/admin/machinesSchema";
import { Card } from "../AdminUi";
import { IconButton } from "./formBits";
import { ACCEPT, precheckMedia } from "./mediaBits";
import { GoodsPicture } from "./MachinesUi";

export const MAX_GALLERY = 7;
export const GALLERY_HELP =
  "Shown in turn on the machine's pay screen, after the main picture. Pictures stay 3.5 seconds; videos play without sound. Square PNG or JPG up to 2 MB, or MP4 up to 20 MB and 60 seconds. Up to 7.";
const TOO_MANY = "Up to 7 more pictures and videos.";
const THUMB_PX = 96;

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function GoodsGallery({
  items,
  onChange,
  onUploadingChange,
  error,
}: {
  items: GoodMedia[];
  onChange: (update: (items: GoodMedia[]) => GoodMedia[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ at: number; of: number } | null>(null);
  const [refusals, setRefusals] = useState<string[]>([]);

  async function pick(files: File[]) {
    if (files.length === 0) return;
    const room = Math.max(0, MAX_GALLERY - items.length);
    const refused: string[] = [];
    const ready: File[] = [];
    for (const file of files.slice(0, room)) {
      const refusal = await precheckMedia("goodsMedia", file);
      if (refusal) refused.push(`${file.name}: ${refusal}`);
      else ready.push(file);
    }
    if (files.length > room) refused.push(TOO_MANY);
    setRefusals(refused);
    if (ready.length === 0) return;

    onUploadingChange(true);
    for (const [i, file] of ready.entries()) {
      setProgress({ at: i + 1, of: ready.length });
      const result = await uploadMachineFile("goodsMedia", file);
      if (result.ok) {
        const video = contentTypeOf(file) === "video/mp4";
        onChange((list) => (list.some((m) => m.url === result.data.url) ? list : [...list, { url: result.data.url, video }]));
      } else {
        refused.push(`${file.name}: ${result.error.fieldErrors?.file ?? result.error.message}`);
        setRefusals([...refused]);
      }
    }
    setProgress(null);
    onUploadingChange(false);
  }

  const full = items.length >= MAX_GALLERY;

  return (
    <Card title="More pictures and videos" note={GALLERY_HELP} testId="card-good-gallery">
      <div className="space-y-3 p-4 sm:p-5">
        {items.length > 0 ? (
          <ol className="flex flex-wrap gap-3" aria-label="Pictures and videos in order" data-testid="gallery-list">
            {items.map((item, i) => (
              <li key={item.url} className="space-y-1" data-testid={`gallery-item-${i}`}>
                <Thumb item={item} position={i + 1} />
                <div className="flex justify-center">
                  <IconButton label="Move left" disabled={i === 0} onClick={() => onChange((list) => moveItem(list, i, i - 1))} testId={`gallery-${i}-left`}>
                    <ArrowLeft className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Move right"
                    disabled={i === items.length - 1}
                    onClick={() => onChange((list) => moveItem(list, i, i + 1))}
                    testId={`gallery-${i}-right`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Remove" onClick={() => onChange((list) => list.filter((m) => m.url !== item.url))} testId={`gallery-${i}-remove`}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="gallery-empty">
            None yet. The pay screen shows only the main picture.
          </p>
        )}

        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT.goodsMedia}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void pick(files);
          }}
          data-testid="input-gallery"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={progress !== null || full}
            onClick={() => input.current?.click()}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-gallery"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add pictures or videos
          </Button>
          {progress && (
            <span className="text-xs text-muted-foreground" role="status" data-testid="gallery-progress">
              Uploading {progress.at} of {progress.of}…
            </span>
          )}
          {full && !progress && <span className="text-xs text-muted-foreground">{items.length} of {MAX_GALLERY}. Remove one to add another.</span>}
        </div>

        {(refusals.length > 0 || error) && (
          <div className="space-y-0.5 text-xs text-rose-300" role="alert" data-testid="error-gallery">
            {error && <p>{error}</p>}
            {refusals.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Thumb({ item, position }: { item: GoodMedia; position: number }) {
  if (item.video) {
    return (
      <span
        role="img"
        aria-label={`Video ${position}`}
        className="flex items-center justify-center rounded-lg border border-border bg-black text-muted-foreground"
        style={{ width: THUMB_PX, height: THUMB_PX }}
        data-testid={`gallery-video-${position - 1}`}
      >
        <Film className="h-6 w-6" aria-hidden />
      </span>
    );
  }
  return <GoodsPicture url={item.url} alt={`Picture ${position}`} size={THUMB_PX} />;
}
