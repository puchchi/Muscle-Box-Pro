"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchAdminFranchiseView, IS_MOCK_ADMIN_FRANCHISE } from "@/lib/adminFranchiseApi";
import type { AdminFranchiseView } from "@shared/admin/franchises";
import type { FranchiseOnboardingStep } from "@shared/franchise/onboarding/types";
import { franchiseStepMeta } from "@shared/franchise/onboarding/steps";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, Empty, ErrorPanel, Field, Fields, Notice, Pill } from "./AdminUi";
import {
  FranchiseDecisionSection,
  FranchiseInstalmentsSection,
} from "./AdminFranchiseActions";
import { formatIstDateTime, formatPaiseAsInr, formatPaiseExact } from "./adminFormat";
import {
  FRANCHISE_DOC_TYPE_LABEL,
  FRANCHISE_STATUS_CLASS,
  FRANCHISE_STATUS_LABEL,
  LOGISTICS_LABEL,
  franchiseEntityLabel,
  franchiseStepLabel,
  franchiseTierLabel,
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
 * - **No term sheet and no e-sign record.** Both are `null` from the handler unconditionally,
 *   because nothing writes them yet. Typed as `null` rather than optional so that building them is
 *   a compile error here.
 * - **No editable terms.** `PATCH …/terms` exists for the gym and has no franchise equivalent, so
 *   the figures on this page are read-only even before signing.
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

      {IS_MOCK_ADMIN_FRANCHISE && (
        <Notice testId="franchise-mock">
          <strong className="font-semibold text-foreground">This is a fixture.</strong> The franchise
          routes are not deployed, so this record lives in memory and resets on reload. Approving or
          confirming here records nothing.
        </Notice>
      )}

      {/*
        At the top rather than only on its own card, because the two steps we owe are the two an
        admin opens this page to find, and both are a long scroll down.
      */}
      {owed && (
        <a
          href={`#${owed.section}`}
          className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
          data-testid="franchise-owed"
        >
          <span className="font-semibold">Waiting on us: {owed.what}.</span> {owed.detail}
        </a>
      )}

      <nav
        className="sticky top-[3.4rem] z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 px-1.5 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        aria-label="Sections of this franchise"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
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
        <div className="px-4 sm:px-5 pb-4 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Steps completed:{" "}
            {franchise.completedSteps.length > 0 ? franchise.completedSteps.join(", ") : "none"}. On
            step {franchise.currentStep}.
          </p>
          {/*
            The one thing about this figure that will otherwise be read as a bug: an approved
            franchise whose `completedSteps` omits 4.
          */}
          <p className="text-xs text-gray-400 leading-relaxed">
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

      <TermsCard franchise={franchise} />

      <Card
        id="kyc"
        title="Documents"
        note="Uploads only. There is no viewer here, and the reason is on purpose."
        testId="card-kyc"
      >
        {franchise.documents.length === 0 ? (
          <Empty testId="documents-none">Nothing uploaded yet. Step 3 is where these arrive.</Empty>
        ) : (
          /* Five columns, one of them a filename: the filename is the only shrinkable one, and
             without a floor it collapses to a character per line on a phone. */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm" data-testid="table-documents">
              <tbody className="divide-y divide-gray-100">
                {franchise.documents.map((document) => (
                  <tr key={document.docId}>
                    <td className="px-4 sm:px-5 py-2.5 font-semibold whitespace-nowrap">
                      {FRANCHISE_DOC_TYPE_LABEL[document.docType]}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground break-all">
                      {document.originalFilename}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatBytes(document.bytes)}
                    </td>
                    <td className="px-4 py-2.5">
                      {document.uploadState === "uploaded" ? (
                        <span className="text-muted-foreground">Uploaded</span>
                      ) : (
                        /* A row that exists with no file behind it: the upload was started and
                           abandoned, which looks identical to a missing document unless it is said. */
                        <span className="text-amber-700 font-semibold">Started, never arrived</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(document.uploadedAt ?? document.requestedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 sm:px-5 py-3.5 text-xs text-muted-foreground leading-relaxed border-t border-gray-100">
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
            <Field label="Warehouse" value={franchise.operations.warehouseAddress} />
            <Field
              label="Area"
              value={`${franchise.operations.warehouseAreaSqft.toLocaleString("en-IN")} sq ft`}
            />
            <Field
              label="Temperature control"
              value={franchise.operations.temperatureControl === "yes" ? "Yes" : "No"}
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
        note="Digio is the platform. Nothing writes either record yet."
      >
        <Empty testId="termsheet-none">
          No term sheet issued and no signature. The handler returns both as empty unconditionally
          because there is no writer for either, so this card will stay blank until step 7 is built.
        </Empty>
      </Card>

      <Card
        id="link"
        title="Onboarding link"
        testId="card-invite"
        note="Where they came in, and what we know about it."
      >
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
            No live link. Either none was issued or it was voided, and there is no way to recover the
            URL of one that was.
          </Empty>
        )}

        {franchise.firstOpen && (
          <div className="border-t border-gray-100">
            <p className="px-4 sm:px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              First opened
            </p>
            <Fields>
              {/* On this page because the weight of an e-signed term sheet rests on the franchisee
                  having walked the flow themselves, and this is the only record of that. */}
              <Field label="At" value={formatIstDateTime(franchise.firstOpen.at)} />
              <Field label="From" value={franchise.firstOpen.ip} mono />
              <Field label="Browser" value={franchise.firstOpen.userAgent} />
            </Fields>
          </div>
        )}
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

function TermsCard({ franchise }: { franchise: AdminFranchiseView }) {
  const { terms } = franchise;

  return (
    <Card
      id="terms"
      title="Terms"
      note="Read-only. There is no franchise equivalent of the gym's terms editor."
      testId="card-terms"
    >
      <Fields>
        <Field label="Tier" value={franchiseTierLabel(terms.tier)} />
        <Field label="Investment" value={formatPaiseAsInr(terms.investmentPaise)} />
        <Field label="Machines to start" value={String(terms.machineAllocation)} />
        <Field
          label="Capital recovery threshold"
          value={terms.capitalRecoveryPaise === null ? null : formatPaiseAsInr(terms.capitalRecoveryPaise)}
          hint={terms.capitalRecoveryPaise === null ? "Agreement-specific" : undefined}
        />
        <Field
          label="Protein share"
          value={`${terms.proteinSharePctDuringRecovery}% until recovery, then ${terms.proteinSharePctAfterRecovery}%`}
        />
        <Field
          label="Advertising split"
          value={`${terms.advertisingFranchiseeSharePct}% them, ${terms.advertisingMbpSharePct}% us`}
        />
        <Field label="Terms last written" value={formatIstDateTime(franchise.termsUpdatedAt)} />
        <Field label="By" value={franchise.termsUpdatedByEmail} />
      </Fields>

      {terms.paymentSchedule ? (
        <table className="w-full text-sm border-t border-gray-100" data-testid="table-schedule">
          <tbody className="divide-y divide-gray-100">
            {terms.paymentSchedule.map((instalment, index) => (
              <tr key={`${instalment.pct}-${index}`}>
                <td className="px-4 sm:px-5 py-2.5 whitespace-nowrap font-semibold tabular-nums">
                  {instalment.pct}%
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{instalment.trigger}</td>
                {/* Derived from the two figures beside it rather than stored, which is why the
                    schedule holds percentages: an edited investment cannot leave a stale amount. */}
                <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums whitespace-nowrap">
                  {formatPaiseExact(Math.round((terms.investmentPaise * instalment.pct) / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p
          className="border-t border-gray-100 px-4 sm:px-5 py-3.5 text-xs text-amber-800 leading-relaxed"
          data-testid="schedule-none"
        >
          No instalment schedule on this tier, so the term sheet has unresolved figures in it and
          cannot be issued until somebody agrees a schedule.
        </p>
      )}
    </Card>
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
): { section: string; what: string; detail: string } | null {
  if (franchise.status === "kyc_submitted" || franchise.status === "under_review") {
    return {
      section: "decision",
      what: "a decision on step 4",
      detail: "They have submitted everything they can and cannot go further until we answer.",
    };
  }
  if (franchise.status === "payment_claimed") {
    return {
      section: "instalments",
      what: "a bank check on step 8",
      detail: "They say the first instalment has been sent. Nobody has looked at a statement yet.",
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

function Timeline({ franchise }: { franchise: AdminFranchiseView }) {
  return (
    <ol className="px-4 sm:px-5 py-4 space-y-2" data-testid="franchise-timeline">
      {TIMELINE.map(({ key, label, step }) => {
        const at = franchise.timestamps[key];
        return (
          <li
            key={key}
            className="flex items-baseline gap-3 text-sm"
            data-testid={`timeline-${key}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${at ? "bg-green-500" : "bg-gray-300"}`}
              aria-hidden
            />
            <span className={at ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            {step && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                step {step}, {franchiseStepMeta(step).shortTitle.toLowerCase()}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              {formatIstDateTime(at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
