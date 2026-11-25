"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FileText, Film } from "lucide-react";
import { docUrl, STATIC_DOCS, type StaticDoc } from "@shared/admin/staticDocs";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Cell, Col, DataTable, Head } from "./machines/MachinesUi";

const formatSize = (bytes: number): string => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function AdminDocuments() {
  const guard = useAdminGuard();
  const [copied, setCopied] = useState<string | null>(null);
  if (guard.state !== "ready") return <AdminChecking />;

  const copy = async (doc: StaticDoc) => {
    await navigator.clipboard.writeText(docUrl(doc));
    setCopied(doc.file);
    setTimeout(() => setCopied((current) => (current === doc.file ? null : current)), 2000);
  };

  return (
    <AdminShell session={guard.session}>
      <h1 className="mb-1 text-2xl font-display font-black tracking-tight text-foreground" data-testid="documents-heading">
        Documents
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">PDFs and demo videos for the website. Anyone with an item's link can open it, and only this page lists the links.</p>
      <DataTable testId="documents-table">
        <Head>
          <Col>Title</Col>
          <Col>Link</Col>
          <Col align="right">Size</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {STATIC_DOCS.map((doc) => (
            <tr key={doc.file} data-testid={`row-document-${doc.file}`}>
              <Cell className="min-w-[10rem] font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  {doc.kind === "video" ? <Film className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                  {doc.title}
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{doc.kind === "video" ? "Video" : "PDF"}</span>
                </span>
              </Cell>
              <Cell className="max-w-[22rem]">
                <span className="block truncate font-mono text-xs text-muted-foreground" data-testid={`link-text-${doc.file}`}>
                  {docUrl(doc)}
                </span>
                <span className="mt-1 flex gap-3 text-xs">
                  <button type="button" onClick={() => void copy(doc)} className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline" data-testid={`copy-${doc.file}`}>
                    {copied === doc.file ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                    {copied === doc.file ? "Copied" : "Copy link"}
                  </button>
                  <a href={docUrl(doc)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" data-testid={`open-${doc.file}`}>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open
                  </a>
                </span>
              </Cell>
              <Cell align="right" className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {formatSize(doc.sizeBytes)}
              </Cell>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}
