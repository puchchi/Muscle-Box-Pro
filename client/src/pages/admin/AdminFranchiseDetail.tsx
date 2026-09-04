"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchAdminFranchiseView } from "@/lib/adminFranchiseApi";
import type { AdminFranchiseTermSheet, AdminFranchiseView } from "@shared/admin/franchises";
import type { FranchiseOnboardingStep } from "@shared/franchise/onboarding/types";
import { franchiseStepMeta } from "@shared/franchise/onboarding/steps";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, Empty, ErrorPanel, Field, Fields, Pill, Subhead } from "./AdminUi";
import {
  FranchiseDecisionSection,
  FranchiseInstalmentsSection,
} from "./AdminFranchiseActions";
import { AdminFranchiseTermsEditor } from "./AdminFranchiseTermsEditor";
import { FranchiseInviteActions } from "./AdminFranchiseInviteActions";
import { formatCalendarDate, formatIstDateTime } from "./adminFormat";
import {
  FRANCHISE_DOC_TYPE_LABEL,
  FRANCHISE_STATUS_CLASS,
  FRANCHISE_STATUS_LABEL,
  LOGISTICS_LABEL,
  TEMPERATURE_LABEL,
  franchiseEntityLabel,
  franchiseStepLabel,
} from "./adminFranchiseFormat";

/**
 * One franchise, completely — `AdminGymDetail.tsx`'s brief for a nine-step flow with two of the
 * steps on our side of the table.
 *
 * That difference is the whole shape of this page. A gym gets stuck for reasons that are all its
 * own; a franchise gets stuck at step 4 or step 8 because **we** have not done something, so the
 * banner at the top names the one thing owed and links to the card that does it. Everything else is
 * read-only, and everything read-only shows its gaps rather than hiding them.
 *
 * ## What is deliberately absent
 *
 * - **No document downloads.** `AdminFranchiseDocument` has no `s3Key` and that is not an omission
 *   (§9): these are identity documents, so reading one needs a short-lived presigned GET behind an
 *   admin session, and that route is not built. The card says so instead of rendering a dead link.
 * - **No e-sign record.** `esign` is `null` from the handler unconditionally, because nothing writes
 *   the row yet. Typed as `null` rather than optional so that building it is a compile error here,
 *   which is how the term sheet card came to exist.
 * - **No term sheet text.** The card carries the hash and the dates, not the document. It is
 *   rendered from live state on the franchisee's side, so the only faithful way to read what they
 *   are reading is their own step 7.
 */

export default function AdminFranchiseDetail({ franchiseId }: { franchiseId: string }) {
  const guard = useAdminGuard();
  const [franchise, setFranchise] = useState<AdminFranchiseView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);

  const load = useCallback(async () => {
    const result = await fetchAdminFranchiseView(franchiseId);
    if (result.ok) {
      setFranchise(result.data);
      setProblem(null);
    } else {
      setProblem({ message: result.error.message, issues: result.issues });
    }
  }, [franchiseId]);

  useEffect(() => {
    if (guard.state !== "ready") return;
    let cancelled = false;
    load().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, load]);

  if (guard.state !== "ready") return <AdminChecking />;

  return (
    <AdminShell session={guard.session}>
      <Link
        href="/admin/franchises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
        data-testid="link-back-to-franchises"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        All franchises
      </Link>

      {isLoading && (
        <p className="text-sm text-muted-foreground" data-testid="franchise-loading">
          Loading…
        </p>
      )}

      {problem && (
        <ErrorPanel
          message={problem.message}
          issues={problem.issues}
          testId="franchise-error"
          issuesTestId="franchise-issues"
        />
      )}

      {franchise && <FranchiseView franchise={franchise} onChanged={load} />}
    </AdminShell>
  );
}

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: "progress", label: "Progress" },
  { id: "decision", label: "Decision" },
  { id: "instalments", label: "Instalments" },
  { id: "details", label: "Details" },
  { id: "terms", label: "Terms" },
  { id: "kyc", label: "Documents" },
  { id: "operations", label: "Operations" },
  { id: "termsheet", label: "Term sheet" },
  { id: "link", label: "Link" },
];

function FranchiseView({
  franchise,
  onChanged,
}: {
  franchise: AdminFranchiseView;
  onChanged: () => void;
}) {
  const owed = whatWeOwe(franchise);
  const owedDays = daysSince(owed?.since ?? null);
  const quietDays = daysSince(franchise.updatedAt);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight"
            data-testid="franchise-heading"
          >
            {franchise.details.tradeName || franchise.details.legalEntityName || franchise.slug}
          </h1>
          <Pill className={FRANCHISE_STATUS_CLASS[franchise.status]} testId="franchise-status">
            {FRANCHISE_STATUS_LABEL[franchise.status]}
          </Pill>
        </div>
        <p className="text-sm text-muted-foreground">
          {franchiseStepLabel(franchise.status)}
          {" · "}
          <span className="font-mono text-xs" data-testid="franchise-id">
            {franchise.franchiseId}
          </span>
        </p>
      </div>

      {/*
        At the top rather than only on its own card, because the two steps we owe are the two an
        admin opens this page to find, and both are a long scroll down.
      */}
      {owed && (
        <a
          href={`#${owed.section}`}
          className="block rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 hover:bg-amber-400/20 transition-colors cursor-pointer"
          data-testid="franchise-owed"
        >
          {/* How long, not just what. Two of these is a queue; the one that is eleven days old is
              the one to open first, and nothing else on the page dates the silence. */}
          <span className="font-semibold">
            Waiting on us{owedDays !== null && owedDays > 0 ? ` for ${plural(owedDays)}` : ""}:{" "}
            {owed.what}.
          </span>{" "}
          {owed.detail}
        </a>
      )}

      {/*
        Sticky from `md` up and no lower, because the offset has to clear the shell's header and that
        header is not one height: its nav wraps below 768px, so it stands 157px tall on a phone and
        57px here. Pinned at 57px on a phone this bar was painted under the header and could not be
        clicked, which is worse than scrolling away with the page.
      */}
      <nav
        className="z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 px-1.5 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:sticky md:top-[57px]"
        aria-label="Sections of this franchise"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            data-testid={`jump-${section.id}`}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <Card
        id="progress"
        title="Progress"
        note="Every stage, including the ones that have not happened. The gap is the diagnosis."
        testId="card-progress"
      >
        <Timeline franchise={franchise} />
        <div className="px-4 sm:px-5 pb-4 space-y-1.5 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Steps completed:{" "}
            {franchise.completedSteps.length > 0 ? franchise.completedSteps.join(", ") : "none"}. On
            step {franchise.currentStep}. Last activity {formatIstDateTime(franchise.updatedAt)}
            {quietDays === null ? "" : quietDays === 0 ? ", today" : `, ${plural(quietDays)} ago`}.
          </p>
          {/*
            The one thing about this figure that will otherwise be read as a bug: an approved
            franchise whose `completedSteps` omits 4.
          */}
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            These are the stored steps. The franchisee's own screen adds 4 and 8 from our approval
            and payment records, so their count can legitimately be ahead of this one.
          </p>
        </div>
      </Card>

      <FranchiseDecisionSection franchise={franchise} onSaved={onChanged} />

      <FranchiseInstalmentsSection franchise={franchise} onSaved={onChanged} />

      <Card
        id="details"
        title="Details"
        testId="card-details"
        note={
          franchise.details.legalEntityName === ""
            ? "Nothing here yet. The invite carries a trade name and an email, and everything else arrives at step 1."
            : undefined
        }
      >
        <Fields>
          <Field label="Legal entity" value={franchise.details.legalEntityName} />
          <Field label="Entity type" value={franchiseEntityLabel(franchise.details.entityType)} />
          <Field label="Trade name" value={franchise.details.tradeName} />
          <Field label="PAN" value={franchise.details.pan} mono />
          <Field label="GSTIN" value={franchise.details.gstin} mono />
          <Field label="CIN" value={franchise.details.cin} mono />
          <Field label="LLPIN" value={franchise.details.llpin} mono />
          <Field label="Registered address" value={franchise.details.registeredAddress} />
          <Field label="Signatory" value={franchise.details.signatoryName} />
          <Field label="Designation" value={franchise.details.signatoryDesignation} />
          <Field label="Signatory PAN" value={franchise.details.signatoryPan} mono />
          {/* Four digits is all we hold. There is no full number here to leak. */}
          <Field
            label="Signatory Aadhaar"
            value={
              franchise.details.signatoryAadhaarLast4
                ? `xxxx xxxx ${franchise.details.signatoryAadhaarLast4}`
                : ""
            }
            mono
          />
          <Field label="Notices email" value={franchise.details.noticesEmail} />
          <Field label="Notices phone" value={franchise.details.noticesPhone} />
        </Fields>
      </Card>

      <AdminFranchiseTermsEditor franchise={franchise} onSaved={onChanged} />

      <Card
        id="kyc"
        title="Documents"
        note="Uploads only. There is no viewer here, and the note at the foot says why."
        testId="card-kyc"
      >
        {franchise.documents.length === 0 ? (
          <Empty testId="documents-none">Nothing uploaded yet. Step 3 is where these arrive.</Empty>
        ) : (
          /* Five columns, one of them a filename: the filename is the only shrinkable one, and
             without a floor it collapses to a character per line, both on a phone and beside the
             `w-full` date column that packs the other four to the left. */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm" data-testid="table-documents">
              <tbody className="divide-y divide-border/70">
                {franchise.documents.map((document) => (
                  <tr key={document.docId}>
                    <td
                      className={`px-4 sm:px-5 py-2.5 whitespace-nowrap ${
                        document.removedAt ? "text-muted-foreground" : "font-semibold"
                      }`}
                    >
                      {FRANCHISE_DOC_TYPE_LABEL[document.docType]}
                    </td>
                    <td className="min-w-[16rem] px-4 py-2.5 text-muted-foreground break-all">
                      {document.originalFilename}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatBytes(document.bytes)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {document.removedAt ? (
                        /* Withdrawal is orthogonal to `uploadState` rather than a third value of it,
                           so both facts are shown. The franchisee's own view drops these rows, which
                           makes this the only place a replaced document is visible at all. */
                        <span className="text-muted-foreground">
                          Withdrawn
                          <span className="block text-xs">
                            {document.uploadState === "uploaded"
                              ? "after uploading"
                              : "before the file arrived"}
                          </span>
                        </span>
                      ) : document.uploadState === "uploaded" ? (
                        <span className="text-muted-foreground">Uploaded</span>
                      ) : (
                        /* A row that exists with no file behind it: the upload was started and
                           abandoned, which looks identical to a missing document unless it is said. */
                        <span className="text-amber-300 font-semibold">Started, never arrived</span>
                      )}
                    </td>
                    {/* The last column takes the slack, so the five pack left rather than spreading a
                        500px gap between each pair of them. */}
                    <td className="w-full px-4 sm:px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(document.uploadedAt ?? document.requestedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 sm:px-5 py-3.5 text-xs text-muted-foreground leading-relaxed border-t border-border/70">
          These are identity documents, so nothing on this page links to the files themselves.
          Reading one needs a short-lived presigned link behind an admin session, and that route is
          not built yet.
        </p>
      </Card>

      <Card
        id="operations"
        title="Operations readiness"
        note="Step 6. What they have to store and move the stock."
        testId="card-operations"
      >
        {franchise.operations ? (
          <Fields>
            <Field
              label="Warehouse"
              value={
                franchise.operations.warehouseNotIdentified
                  ? "Not identified yet"
                  : franchise.operations.warehouseAddress
              }
            />
            <Field
              label="Area"
              value={
                franchise.operations.warehouseAreaSqft === null
                  ? null
                  : `${franchise.operations.warehouseAreaSqft.toLocaleString("en-IN")} sq ft`
              }
            />
            <Field
              label="Temperature control"
              value={TEMPERATURE_LABEL[franchise.operations.temperatureControl]}
            />
            <Field label="Operations contact" value={franchise.operations.operationsContactName} />
            <Field label="Contact phone" value={franchise.operations.operationsContactPhone} />
            <Field
              label="Logistics"
              value={LOGISTICS_LABEL[franchise.operations.logisticsArrangement]}
            />
            <Field label="Deployment plan" value={franchise.operations.deploymentPlan} />
            <Field label="Submitted" value={formatIstDateTime(franchise.operations.submittedAt)} />
          </Fields>
        ) : (
          <Empty testId="operations-none">
            Not submitted. Step 6 opens once they have acknowledged the terms.
          </Empty>
        )}
      </Card>

      <Card
        id="termsheet"
        title="Term sheet and signature"
        testId="card-termsheet"
        note="The document they are reading at step 7, and its hash."
      >
        {franchise.termSheet ? (
          <Fields>
            <Field label="Version" value={franchise.termSheet.version} />
            <Field
              label="Issued"
              value={formatIstDateTime(franchise.termSheet.issuedAt)}
              hint={issuanceHint(franchise.termSheet)}
            />
            <Field
              label="First opened"
              value={formatIstDateTime(franchise.timestamps.termsheetViewedAt)}
            />
            <Field
              label="Effective"
              value={formatCalendarDate(franchise.termSheet.effectiveDate)}
            />
            <Field label="Valid until" value={formatCalendarDate(franchise.termSheet.validUntil)} />
            {/* The hash is what a signature is over, so it is the one field here worth copying out
                of the page verbatim. `length` beside it is what makes a truncated render visible. */}
            <Field label="Content hash" value={franchise.termSheet.contentHash} mono />
            <Field
              label="Length"
              value={`${franchise.termSheet.length.toLocaleString("en-IN")} characters`}
            />
            <Field
              label="PDF hash"
              value={franchise.termSheet.pdfHash}
              hint={
                franchise.termSheet.pdfHash
                  ? undefined
                  : "This term sheet was pinned before PDFs were rendered"
              }
              mono
            />
          </Fields>
        ) : (
          <Empty testId="termsheet-none">
            No term sheet issued. One is pinned the first time they open step 7, which needs the
            approval on the decision card above.
          </Empty>
        )}
        <p className="px-4 sm:px-5 py-3.5 text-xs text-muted-foreground leading-relaxed border-t border-border/70">
          No signature record. Leegality is the platform and nothing writes an e-sign row yet, so this
          stays empty even for a franchise the ladder has already moved past signing.
        </p>
      </Card>

      <Card
        id="link"
        title="Onboarding link"
        testId="card-invite"
        note="Where they came in, and what we know about it."
      >
        {/* The empty state below is deliberately not the gym card's, which offers "issued or voided"
            as the two cases. Neither is the common one here: only the approval at step 4 writes the
            pointer this card reads, so a franchise invited from this panel has a working link and an
            empty card, and "First opened" can appear directly underneath. */}
        {franchise.invite ? (
          <Fields>
            <Field label="Token" value={franchise.invite.tokenId} mono />
            <Field label="Type" value={franchise.invite.typ} />
            <Field label="Invited by" value={franchise.invite.invitedByName} />
            <Field label="Issued by" value={franchise.invite.issuedByEmail} />
            <Field label="Created" value={formatIstDateTime(franchise.invite.createdAt)} />
            <Field
              label="Expires"
              value={formatIstDateTime(franchise.invite.expiresAt)}
              hint={expiryHint(franchise.invite.expiresAt)}
            />
            {/* The link itself is not here and cannot be: only `sha256(handle)` is stored, so a
                working URL exists exactly once, in the response that minted it. */}
            {franchise.invite.revokedAt && (
              <Field label="Revoked" value={formatIstDateTime(franchise.invite.revokedAt)} />
            )}
            {franchise.invite.revokedReason && (
              <Field label="Reason" value={franchise.invite.revokedReason} />
            )}
            {franchise.invite.supersededByTokenId && (
              <Field label="Superseded by" value={franchise.invite.supersededByTokenId} mono />
            )}
          </Fields>
        ) : (
          <Empty testId="invite-none">
            No link on record, which is not the same as no link. A franchise created before we began
            storing the link's fingerprint has a working one we cannot address, so nothing can revoke
            it and no URL can be recovered. Sending a new link is the way to supersede it.
          </Empty>
        )}

        {franchise.firstOpen && (
          <>
            <Subhead>First opened</Subhead>
            <Fields>
              {/* On this page because the weight of an e-signed term sheet rests on the franchisee
                  having walked the flow themselves, and this is the only record of that. */}
              <Field label="At" value={formatIstDateTime(franchise.firstOpen.at)} />
              <Field label="From" value={franchise.firstOpen.ip} mono />
              <Field label="Browser" value={franchise.firstOpen.userAgent} />
            </Fields>
          </>
        )}

        <FranchiseInviteActions franchise={franchise} onChanged={onChanged} />
      </Card>

      {franchise.sourceApplicationId && (
        <Card title="Converted from an application" testId="card-source">
          <Fields>
            <Field label="Application" value={franchise.sourceApplicationId} mono />
          </Fields>
        </Card>
      )}

      {franchise.unmodelledRows.length > 0 && (
        <Card
          title="Rows this page has no model for"
          note="Shown rather than dropped, so an unrecognised row does not send anyone to the database console."
          testId="card-unmodelled"
        >
          <ul className="px-4 sm:px-5 py-4 space-y-1" data-testid="unmodelled-rows">
            {franchise.unmodelledRows.map((sk) => (
              <li key={sk} className="font-mono text-xs text-muted-foreground break-all">
                {sk}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/**
 * The one thing owed, or nothing.
 *
 * Three statuses and no more: `kyc_submitted` and `under_review` are a decision, `payment_claimed`
 * is a bank statement to check. A franchise that has been quiet for eleven days at
 * `territory_submitted` is *also* stuck, and it is deliberately not here — chasing that is a phone
 * call, not a task on this page, and a banner for it would train people to scroll past this one.
 */
function whatWeOwe(
  franchise: AdminFranchiseView,
): { section: string; what: string; detail: string; since: string | null } | null {
  if (franchise.status === "kyc_submitted" || franchise.status === "under_review") {
    return {
      section: "decision",
      what: "a decision on step 4",
      detail: "They have submitted everything they can and cannot go further until we answer.",
      since: franchise.timestamps.kycSubmittedAt,
    };
  }
  if (franchise.status === "payment_claimed") {
    return {
      section: "instalments",
      what: "a bank check on step 8",
      detail: "They say the first instalment has been sent. Nobody has looked at a statement yet.",
      since: franchise.timestamps.paymentClaimedAt,
    };
  }
  return null;
}

/**
 * The ladder in order, with the gaps left visible.
 *
 * The field names are the stored ones rather than the wizard contract's, which is why `decidedAt`
 * appears once and covers a hold as well as a decline, and why `reviewStartedAt` is on the list even
 * though nothing writes it. A row that is always blank is itself the finding.
 */
const TIMELINE: Array<{
  key: keyof AdminFranchiseView["timestamps"];
  label: string;
  step?: FranchiseOnboardingStep;
}> = [
  { key: "invitedAt", label: "Invited" },
  { key: "firstOpenedAt", label: "Opened the link" },
  { key: "detailsSubmittedAt", label: "Submitted details", step: 1 },
  { key: "territorySubmittedAt", label: "Proposed a territory", step: 2 },
  { key: "kycSubmittedAt", label: "Submitted KYC", step: 3 },
  { key: "reviewStartedAt", label: "Review started" },
  { key: "decidedAt", label: "Decided", step: 4 },
  { key: "approvedAt", label: "Approved" },
  { key: "franchiseAckAt", label: "Acknowledged the terms", step: 5 },
  { key: "operationsSubmittedAt", label: "Submitted operations", step: 6 },
  { key: "termsheetViewedAt", label: "Viewed the term sheet" },
  { key: "esignRequestedAt", label: "Sent for signature" },
  { key: "signedAt", label: "Signed", step: 7 },
  { key: "paymentClaimedAt", label: "Claimed the instalment" },
  { key: "paymentVerifiedAt", label: "Instalment confirmed", step: 8 },
  { key: "accountCreatedAt", label: "Created a portal account" },
  { key: "activatedAt", label: "Activated", step: 9 },
];

/**
 * The date first and the event after it, both packed to the left.
 *
 * The dates were a column flushed against the right edge, which put them 1,400px from the stage they
 * belonged to. Leading with the date also makes the axis this list is actually read along the scannable
 * one: the question is "where did it stop", and that is answered by the point the dates run out.
 */
function Timeline({ franchise }: { franchise: AdminFranchiseView }) {
  return (
    <ol className="px-4 sm:px-5 py-3" data-testid="franchise-timeline">
      {TIMELINE.map(({ key, label, step }, index) => {
        const at = franchise.timestamps[key];
        return (
          <li
            key={key}
            className="relative flex flex-wrap items-baseline gap-x-3 pb-1.5 pl-5"
            data-testid={`timeline-${key}`}
          >
            {index < TIMELINE.length - 1 && (
              <span className="absolute left-[3px] top-2 bottom-0 w-px bg-secondary" aria-hidden />
            )}
            <span
              className={`absolute left-0 top-[0.3rem] h-[7px] w-[7px] rounded-full ${
                at ? "bg-emerald-400" : "ring-1 ring-muted-foreground/40"
              }`}
              aria-hidden
            />
            <span className="w-[7.5rem] shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatIstDateTime(at)}
            </span>
            {/* `flex-1` below `sm` so a long stage wraps inside its own box. Left to itself, flex
                wrapping drops the whole label onto the next line, where it sits under the dot with no
                date beside it and reads as a stage of its own. */}
            <span
              className={`min-w-0 flex-1 sm:flex-none text-sm ${
                at ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {step && (
              <span className="w-full sm:w-auto text-xs text-muted-foreground/70 whitespace-nowrap">
                step {step}, {franchiseStepMeta(step).shortTitle.toLowerCase()}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Whole days between then and now, or null when there is no date to measure. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((Date.now() - at) / 86_400_000));
}

function plural(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Said only when there has been more than one issuance.
 *
 * A re-pin happens when the figures change while the franchise is still unsigned, so this is the answer to
 * "why does their hash not match the one in my email" and there is nothing else on the page that hints at it.
 */
function issuanceHint(termSheet: AdminFranchiseTermSheet): string | undefined {
  if (termSheet.issuedCount < 2) return undefined;
  return `Re-issued after the terms changed. ${termSheet.issuedCount} in total, this is number ${termSheet.seq}.`;
}

/** Said in words beside the date, because "expired" is the answer to why a link stopped working. */
function expiryHint(expiresAt: string | null): string | undefined {
  if (!expiresAt) return undefined;
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return undefined;
  const days = Math.round((at - Date.now()) / 86_400_000);
  if (days < 0) return "Expired. A new link has to be issued.";
  return days === 0 ? "Expires today" : `${days} ${days === 1 ? "day" : "days"} left`;
}
