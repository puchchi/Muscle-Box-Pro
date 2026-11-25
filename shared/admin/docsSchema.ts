import * as z from "zod";

const MB = 1024 * 1024;

export const DOC_TYPES = {
  "application/pdf": { label: "PDF", maxBytes: 25 * MB },
  "video/mp4": { label: "Video", maxBytes: 100 * MB },
} as const;

export type AdminDocType = keyof typeof DOC_TYPES;

export const MAX_DOC_TITLE_LENGTH = 120;

export const adminDocSchema = z.object({
  docId: z.string().min(1),
  title: z.string(),
  contentType: z.enum(["application/pdf", "video/mp4"]).catch("application/pdf"),
  size: z.number().int().nonnegative(),
  createdAt: z.string(),
  createdBy: z.string(),
  link: z.string().nullable(),
});

export const adminDocsSchema = z.object({ documents: z.array(adminDocSchema) });

export const adminDocUploadSchema = z.object({
  docId: z.string().min(1),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()),
  expiresInSeconds: z.number(),
});

export const adminDocDeletedSchema = z.object({ docId: z.string().min(1), deleted: z.literal(true) });

export type AdminDoc = z.infer<typeof adminDocSchema>;

export function docTypeOf(file: Pick<File, "name" | "type">): AdminDocType | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (file.type === "video/mp4" || name.endsWith(".mp4")) return "video/mp4";
  return null;
}

export function validateDocUpload(file: File | null, title: string): { file?: string; title?: string } {
  const problems: { file?: string; title?: string } = {};
  const trimmed = title.trim();
  if (!trimmed) problems.title = "Give the document a title.";
  else if (trimmed.length > MAX_DOC_TITLE_LENGTH) problems.title = `Up to ${MAX_DOC_TITLE_LENGTH} characters.`;

  if (!file) {
    problems.file = "Choose a PDF or an MP4 video.";
    return problems;
  }
  const type = docTypeOf(file);
  if (!type) problems.file = "Only PDF or MP4 files.";
  else if (file.size === 0) problems.file = "This file is empty.";
  else if (file.size > DOC_TYPES[type].maxBytes) problems.file = `${DOC_TYPES[type].label}s can be up to ${DOC_TYPES[type].maxBytes / MB} MB.`;
  return problems;
}
