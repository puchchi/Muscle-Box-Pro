import type * as z from "zod";
import { apiBaseUrl, docsAdminRequest, type ApiMethod } from "./apiClient";
import type { MachineCall } from "./adminMachineApi";
import { parseWith } from "@shared/admin/machinesSchema";
import {
  adminDocDeletedSchema,
  adminDocSchema,
  adminDocUploadSchema,
  adminDocsSchema,
  type AdminDoc,
} from "@shared/admin/docsSchema";

export const docsAdminConfigured = () => apiBaseUrl("docsAdmin") !== null;

async function call<S extends z.ZodTypeAny>(schema: S, method: ApiMethod, path: string, body?: unknown): Promise<MachineCall<z.infer<S>>> {
  const result = await docsAdminRequest<unknown>(method, path, body);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseWith(schema, result.data);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "network", message: "The server answered in a shape this page does not understand. The details are below." },
      issues: parsed.issues,
    };
  }
  return { ok: true, data: parsed.data };
}

const seg = encodeURIComponent;

export const fetchDocuments = () => call(adminDocsSchema, "GET", "/admin/documents");

export const deleteDocument = (docId: string) => call(adminDocDeletedSchema, "DELETE", `/admin/documents/${seg(docId)}`);

export async function uploadDocument(file: File, title: string): Promise<MachineCall<AdminDoc>> {
  const started = await call(adminDocUploadSchema, "POST", "/admin/documents", { title: title.trim(), size: file.size });
  if (!started.ok) return started;

  let stored = false;
  try {
    const put = await fetch(started.data.url, { method: "PUT", headers: started.data.headers, body: file });
    stored = put.ok;
  } catch {
    stored = false;
  }
  if (!stored) {
    return { ok: false, error: { code: "network", message: "The file didn't reach storage. Try uploading it again." }, issues: [] };
  }
  return call(adminDocSchema, "POST", `/admin/documents/${seg(started.data.docId)}/complete`, {});
}

export function documentLink(doc: AdminDoc): string {
  if (doc.link) return doc.link;
  return `${apiBaseUrl("docsAdmin") ?? ""}/${doc.docId}`;
}
