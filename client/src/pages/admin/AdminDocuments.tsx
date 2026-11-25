"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, FileText, Film, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDocument, documentLink, docsAdminConfigured, fetchDocuments, uploadDocument } from "@/lib/adminDocsApi";
import { DOC_TYPES, validateDocUpload, type AdminDoc } from "@shared/admin/docsSchema";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, Notice, SuccessPanel } from "./AdminUi";
import { Cell, Col, ConfirmDialog, DataTable, Head, NoData, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";
import { formatIstDateTime } from "./adminFormat";

const formatSize = (bytes: number): string => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function AdminDocuments() {
  const guard = useAdminGuard();
  if (guard.state !== "ready") return <AdminChecking />;
  return (
    <AdminShell session={guard.session}>
      <h1 className="mb-1 text-2xl font-display font-black tracking-tight text-foreground" data-testid="documents-heading">
        Documents
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">PDFs and demo videos for the website. Anyone with an item's link can open it, and only this page lists the links.</p>
      {docsAdminConfigured() ? (
        <Documents />
      ) : (
        <Notice testId="documents-not-configured">The documents API isn't set up for this build. Set NEXT_PUBLIC_MBP_DOCS_API_URL to its address.</Notice>
      )}
    </AdminShell>
  );
}

function Documents() {
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ file?: string; title?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<AdminDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await fetchDocuments();
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setDocs(result.data.documents);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validateDocUpload(file, title);
    setFieldErrors(problems);
    if (problems.file || problems.title || !file) return;
    setUploading(true);
    setNotice(null);
    const result = await uploadDocument(file, title);
    setUploading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      setFieldErrors({ ...(result.error.fieldErrors?.title ? { title: result.error.fieldErrors.title } : {}), ...(result.error.fieldErrors?.size ? { file: result.error.fieldErrors.size } : {}) });
      return;
    }
    setProblem(null);
    setNotice(`Added "${result.data.title}".`);
    setTitle("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    await load();
  };

  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await deleteDocument(removing.docId);
    setDeleting(false);
    if (!result.ok && result.error.code !== "not_found") {
      setProblem(problemOf(result));
      setRemoving(null);
      return;
    }
    setProblem(null);
    setNotice(`Deleted "${removing.title}". Its link no longer works.`);
    setRemoving(null);
    await load();
  };

  const copy = async (doc: AdminDoc) => {
    await navigator.clipboard.writeText(documentLink(doc));
    setCopied(doc.docId);
    setTimeout(() => setCopied((current) => (current === doc.docId ? null : current)), 2000);
  };

  return (
    <>
      <ProblemPanel problem={problem} testId="documents-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="documents-notice">{notice}</SuccessPanel>
        </div>
      )}

      <div className="mb-6">
        <Card title="Add a PDF or video" note="PDF up to 25 MB, MP4 video up to 100 MB." testId="card-upload">
          <form onSubmit={submit} className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start sm:px-5" noValidate>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Title</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                className="h-9 rounded-lg border-border bg-card text-sm"
                aria-invalid={fieldErrors.title ? true : undefined}
                data-testid="documents-title"
              />
              {fieldErrors.title && (
                <span className="mt-1 block text-xs text-rose-300" data-testid="documents-title-error">
                  {fieldErrors.title}
                </span>
              )}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">File</span>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf,video/mp4,.mp4"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-foreground"
                data-testid="documents-file"
              />
              {fieldErrors.file && (
                <span className="mt-1 block text-xs text-rose-300" data-testid="documents-file-error">
                  {fieldErrors.file}
                </span>
              )}
            </label>
            <Button type="submit" disabled={uploading} className="rounded-xl cursor-pointer bg-primary-fill text-primary-foreground font-bold sm:mt-6" data-testid="documents-upload">
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </Card>
      </div>

      <DataTable testId="documents-table">
        <Head>
          <Col>Title</Col>
          <Col>Link</Col>
          <Col className="hidden sm:table-cell">Added</Col>
          <Col align="right">Size</Col>
          <Col align="right">
            <span className="sr-only">Actions</span>
          </Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {docs.length === 0 ? (
            <NoData colSpan={5} loading={loading} />
          ) : (
            docs.map((doc) => (
              <tr key={doc.docId} data-testid={`row-document-${doc.docId}`}>
                <Cell className="min-w-[10rem] font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    {doc.contentType === "video/mp4" ? <Film className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                    {doc.title}
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" data-testid={`type-${doc.docId}`}>
                      {DOC_TYPES[doc.contentType].label}
                    </span>
                  </span>
                </Cell>
                <Cell className="max-w-[22rem]">
                  <span className="block truncate font-mono text-xs text-muted-foreground" data-testid={`link-text-${doc.docId}`}>
                    {documentLink(doc)}
                  </span>
                  <span className="mt-1 flex gap-3 text-xs">
                    <button type="button" onClick={() => void copy(doc)} className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline" data-testid={`copy-${doc.docId}`}>
                      {copied === doc.docId ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                      {copied === doc.docId ? "Copied" : "Copy link"}
                    </button>
                    <a href={documentLink(doc)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" data-testid={`open-${doc.docId}`}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Open
                    </a>
                  </span>
                </Cell>
                <Cell className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:table-cell">{formatIstDateTime(doc.createdAt)}</Cell>
                <Cell align="right" className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {formatSize(doc.size)}
                </Cell>
                <Cell align="right">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRemoving(doc)} className="rounded-lg cursor-pointer" aria-label={`Delete ${doc.title}`} data-testid={`delete-${doc.docId}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this document?"
        message={removing ? `"${removing.title}" will be removed and its link will stop working straight away. Anyone who has the link will get an error.` : ""}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setRemoving(null)}
        testId="documents-delete-dialog"
      />
    </>
  );
}
