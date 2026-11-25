import * as z from "zod";

export const MAX_DOC_BYTES = 25 * 1024 * 1024;
export const MAX_DOC_TITLE_LENGTH = 120;

export const adminDocSchema = z.object({
  docId: z.string().min(1),
  title: z.string(),
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

export function validateDocUpload(file: File | null, title: string): { file?: string; title?: string } {
  const problems: { file?: string; title?: string } = {};
  const trimmed = title.trim();
  if (!trimmed) problems.title = "Give the document a title.";
  else if (trimmed.length > MAX_DOC_TITLE_LENGTH) problems.title = `Up to ${MAX_DOC_TITLE_LENGTH} characters.`;
  if (!file) problems.file = "Choose a PDF.";
  else if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) problems.file = "Only PDF files.";
  else if (file.size === 0) problems.file = "This file is empty.";
  else if (file.size > MAX_DOC_BYTES) problems.file = `Up to ${MAX_DOC_BYTES / (1024 * 1024)} MB.`;
  return problems;
}
