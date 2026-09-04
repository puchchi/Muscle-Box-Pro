"use client";

import { useRef, useState } from "react";
import { AlertCircle, Check, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  MAX_DOCUMENT_BYTES,
} from "@shared/franchise/onboarding/schema";
import {
  missingRequiredDocuments,
  requiredDocumentTypes,
} from "@shared/franchise/onboarding/status";
import type { EntityType } from "@shared/onboarding/types";
import type {
  FranchiseDocumentType,
  UploadedDocument,
} from "@shared/franchise/onboarding/types";
import { Section, SubmitBar } from "../formKit";
import { BODY_TEXT, HINT_TEXT } from "../shell";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 3 — KYC and documents.
 *
 * Not a form: a list of things we need, each either missing or held. What it is careful about
 * is the small set of ways an upload screen wastes somebody's afternoon.
 *
 * *The type and size are checked here as well as on the server.* A 20 MB scan rejected after a
 * 20 MB upload on a hotel connection is the failure this avoids. The server checks regardless,
 * because a client-side check is a courtesy rather than a boundary.
 *
 * *One file per type, and replacing is the same control as uploading.* The record keeps one
 * document per type, so a second upload supersedes the first rather than adding to it, and a
 * screen offering both "Upload another" and "Replace" would be lying about one of them.
 *
 * *Nothing is downloadable.* `UploadedDocument` carries no URL, deliberately: this handle
 * travels in a URL, and one that authorises reading someone's identity documents has a blast
 * radius the same handle authorising a nine-step form does not. So a held document shows its
 * name, its size and a tick.
 *
 * The list comes from `requiredDocumentTypes`, which is what the server checks too, so this cannot
 * ask for a document the submit does not want or miss one it does. A proprietorship or an
 * unregistered applicant is asked for three rather than four, because there is no incorporation
 * certificate to produce.
 * Everything shown is required: there is no optional row, and so no row a franchisee has to decide
 * about.
 */

type DocumentSpec = {
  docType: FranchiseDocumentType;
  label: string;
  description: string;
};

/** Only reached for the three entity types `requiredDocumentTypes` asks entity proof of. */
function entityProofLabel(entityType: EntityType): string {
  if (entityType === "llp") return "LLP agreement";
  if (entityType === "partnership") return "Partnership deed";
  return "Certificate of incorporation";
}

function specsFor(entityType: EntityType): DocumentSpec[] {
  const all: Record<FranchiseDocumentType, DocumentSpec> = {
    pan_card: {
      docType: "pan_card",
      label: "PAN card",
      description: "The entity's PAN card, matching the number you gave in your details.",
    },
    entity_proof: {
      docType: "entity_proof",
      label: entityProofLabel(entityType),
      description: "Whatever registered your entity.",
    },
    address_proof: {
      docType: "address_proof",
      label: "Address proof",
      description: "A utility bill, a bank statement or a lease showing the registered address.",
    },
    signatory_id: {
      docType: "signatory_id",
      label: "Signatory's photo ID",
      description: "Aadhaar, passport or driving licence for the person signing.",
    },
    payment_proof: {
      docType: "payment_proof",
      label: "Transfer proof",
      description: "Belongs to the first instalment.",
    },
  };

  return requiredDocumentTypes(entityType).map((docType) => all[docType]);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StepDocuments({
  state,
  readOnly,
  frozenReason,
  isSubmitting,
  fieldErrors,
  actions,
}: FranchiseStepViewProps) {
  const specs = specsFor(state.details.entityType);
  const missing = missingRequiredDocuments(state.details.entityType, state.documents);
  const requiredCount = requiredDocumentTypes(state.details.entityType).length;

  return (
    <div className="space-y-6">
      <Section title="What we need">
        <p className={HINT_TEXT}>
          PDF, JPEG or PNG, up to {formatBytes(MAX_DOCUMENT_BYTES)} each. Once you submit, replacing
          one means asking us.
        </p>

        <ul role="list" className="space-y-3">
          {specs.map((spec) => (
            <li key={spec.docType}>
              <DocumentRow
                spec={spec}
                held={state.documents.find((doc) => doc.docType === spec.docType) ?? null}
                readOnly={readOnly}
                error={fieldErrors?.[spec.docType] ?? null}
                onUpload={(file) =>
                  actions.uploadDocument({
                    docType: spec.docType,
                    fileName: file.name,
                    file,
                  })
                }
                onRemove={(docId) => actions.removeDocument(docId)}
              />
            </li>
          ))}
        </ul>
      </Section>

      {frozenReason ? (
        <div
          className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 flex items-start gap-2.5"
          data-testid="documents-frozen"
        >
          <Check className="w-4 h-4 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className={BODY_TEXT}>{frozenReason}</p>
        </div>
      ) : (
        !readOnly && (
          // Not a `<form>`: there is nothing to validate client-side beyond "are they all
          // here", and the server checks that against the same function this screen counts
          // with. The button is disabled rather than hidden while something is missing,
          // because a missing button is not a reason.
          <SubmitBar
            nextHint={
              missing.length > 0
                ? `${missing.length} of ${requiredCount} still to come.`
                : "We confirm the territory in a few working days."
            }
            isSubmitting={isSubmitting}
            disabled={missing.length > 0}
            label="Submit for review"
            busyLabel="Submitting..."
            onClick={() => void actions.submitKyc()}
          />
        )
      )}
    </div>
  );
}

/**
 * One row: what we want, whether we have it, and the one control that changes that.
 *
 * The local checks match the schema's own bounds rather than being looser or stricter — a
 * client that refuses what the server accepts is worse than no check at all, because there is
 * no way for the franchisee to get past it.
 */
function DocumentRow({
  spec,
  held,
  readOnly,
  error,
  onUpload,
  onRemove,
}: {
  spec: DocumentSpec;
  held: UploadedDocument | null;
  readOnly: boolean;
  error: string | null;
  onUpload(file: File): Promise<boolean>;
  onRemove(docId: string): Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared immediately, so picking the same file twice after a failure still fires a change.
    event.target.value = "";
    if (!file) return;

    setLocalError(null);
    if (!ALLOWED_DOCUMENT_CONTENT_TYPES.includes(file.type)) {
      setLocalError("That file type isn't accepted. Send a PDF, a JPEG or a PNG.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setLocalError(
        `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_DOCUMENT_BYTES)}, so a photo may need resizing.`,
      );
      return;
    }

    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  }

  const message = localError ?? error;

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        message ? "border-red-300 bg-red-50" : held ? "border-primary/20 bg-primary/5" : "border-gray-200 bg-gray-50"
      }`}
      data-testid={`document-${spec.docType}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          {held ? (
            <Check className="w-4 h-4 text-primary-ink" aria-hidden="true" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{spec.label}</p>
          {held ? (
            <p className={`${HINT_TEXT} mt-0.5 truncate`}>
              {held.fileName} · {formatBytes(held.sizeBytes)}
            </p>
          ) : (
            <p className={`${HINT_TEXT} mt-0.5`}>
              {spec.description}
            </p>
          )}
          {message && (
            <p className="text-xs text-red-700 font-medium mt-1.5 flex items-start gap-1.5" role="alert">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
              {message}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-shrink-0 w-full justify-end sm:w-auto">
            {/* The input is hidden and driven by the button, because a bare file input cannot
                be styled to 44px reliably across browsers. `aria-label` on it rather than a
                visible label: the row's own heading is what names it, and `id`-based labelling
                would need an id this component has no reason to invent. */}
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept={ALLOWED_DOCUMENT_CONTENT_TYPES.join(",")}
              aria-label={held ? `Replace ${spec.label}` : `Upload ${spec.label}`}
              onChange={(event) => void onPick(event)}
              data-testid={`input-file-${spec.docType}`}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-lg text-xs font-semibold cursor-pointer"
              data-testid={`button-upload-${spec.docType}`}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span className="ml-1.5">{held ? "Replace" : "Upload"}</span>
            </Button>
            {held && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void onRemove(held.docId)}
                className="min-h-11 w-11 rounded-lg text-muted-foreground hover:text-red-700 cursor-pointer"
                data-testid={`button-remove-${spec.docType}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Remove {spec.label}</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
