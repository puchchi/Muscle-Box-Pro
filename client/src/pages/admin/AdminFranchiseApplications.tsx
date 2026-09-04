"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  franchiseTriageFormSchema,
  toFranchiseTriageBody,
  type FranchiseApplicationRow,
  type FranchiseTriageForm,
  type FranchiseTriageStatus,
} from "@shared/admin/franchiseApplications";
import { fetchFranchiseApplications, triageFranchiseApplication } from "@/lib/adminFranchiseApi";
import { Chip, ErrorPanel, Notice, Pill, StatCard, SuccessPanel } from "./AdminUi";
import { AreaField } from "./adminFields";
import { formatIstDateTime, formatPaiseAsInr } from "./adminFormat";
import { inviteHrefForApplication } from "./franchiseInviteLink";

/**
 * The enquiry backlog — everything that came in through `/franchise`, and what we decided about it.
 *
 * A view inside the Franchises tab rather than a page of its own, because an enquiry and a franchise
 * are two states of one pipeline: this list is where an invite comes *from*, and the row that
 * converts is the row that stops being here.
 *
 * ## The status filter is a round trip
 *
 * Everywhere else in this panel a chip narrows rows already fetched. Here it does not. The enquiry
 * table is keyed by the applicant's email, so the list route reads a bounded slab and joins the
 * triage rows in memory; asking the server for `status=new` therefore returns *more* new enquiries
 * than filtering a mixed page would. That is also why there are no counts on the status chips — the
 * only number available for the ones you have not selected is zero.
 *
 * ## Nothing here writes to the applicant
 *
 * Both decisions are notes to ourselves. `PATCH /admin/franchise-applications/{id}` sends no email
 * and serves nothing to the applicant, so rejecting an enquiry does not tell anybody they were
 * rejected. Declining in writing would be a different route with copy somebody has read, and the
 * screen says so rather than leaving an admin to assume either way.
 *
 * ## Converting is deliberately not an autofill of the legal entity name
 *
 * The invite link carries the email, the phone, the tier and the application id. It does not carry a
 * legal entity name, because the only candidate is a free-text company field and that name is what
 * the term sheet identifies its counterparty by. `AdminFranchiseActions` makes the same call about a
 * granted territory: a field that arrives holding what somebody asked for is a value nobody chose the
 * moment they click past it. The applicant's own answers are shown on the invite form instead.
 */

const STATUS_LABEL: Record<FranchiseTriageStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  rejected: "Rejected",
  converted: "Converted",
};

const STATUS_CLASS: Record<FranchiseTriageStatus, string> = {
  new: "bg-amber-50 text-amber-800",
  reviewed: "bg-blue-50 text-blue-700",
  rejected: "bg-gray-100 text-gray-600",
  converted: "bg-green-50 text-green-700",
};

const STATUS_NOTE: Record<FranchiseTriageStatus, string> = {
  new: "Nobody has looked at this yet.",
  reviewed: "Read and kept. Convert it when the territory is worth taking.",
  rejected: "Kept on file. The applicant was not told.",
  converted: "A franchise exists for this. Nothing further can be recorded here.",
};

/** How many rows to ask for. The route clamps at 200 and defaults to 50. */
const PAGE_LIMIT = 100;

export default function AdminFranchiseApplications({
  onLoaded,
}: {
  /** The row count, so the tab's chip can show it. */
  onLoaded?: (count: number) => void;
}) {
  const [status, setStatus] = useState<FranchiseTriageStatus | "all">("all");
  const [page, setPage] = useState<{
    statuses: FranchiseTriageStatus[];
    applications: FranchiseApplicationRow[];
    scanned: number;
    capped: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(
    async (which: FranchiseTriageStatus | "all") => {
      const result = await fetchFranchiseApplications({
        limit: PAGE_LIMIT,
        ...(which === "all" ? {} : { status: which }),
      });
      if (!result.ok) {
        setProblem({ message: result.error.message, issues: result.issues });
        return;
      }
      setProblem(null);
      setPage(result.data);
      // The tab's chip counts enquiries, not the current filter, so a filtered read leaves it alone
      // rather than reporting "Enquiries 1" while three more are a chip away.
      if (which === "all") onLoaded?.(result.data.applications.length);
    },
    [onLoaded],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    load(status).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, status]);

  function switchTo(next: FranchiseTriageStatus | "all") {
    if (next === status) return;
    setExpanded(null);
    setSaved(null);
    setStatus(next);
  }

  const rows = page?.applications ?? [];
  const untouched = rows.filter((row) => row.status === "new").length;

  return (
    <div data-testid="franchise-applications">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Chip
          label="Every enquiry"
          selected={status === "all"}
          onClick={() => switchTo("all")}
          testId="app-status-all"
        />
        {(page?.statuses ?? []).map((option) => (
          <Chip
            key={option}
            label={STATUS_LABEL[option]}
            selected={status === option}
            onClick={() => switchTo(option)}
            testId={`app-status-${option}`}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => void load(status)}
          disabled={isLoading}
          className="ml-auto h-9 rounded-xl cursor-pointer"
          data-testid="button-refresh-applications"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {problem && (
        <div className="mb-4">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="applications-error"
            issuesTestId="applications-issues"
          />
        </div>
      )}

      {saved && (
        <div className="mb-4">
          <SuccessPanel testId="applications-saved">{saved}</SuccessPanel>
        </div>
      )}

      {page && page.capped && (
        <div className="mb-4">
          <Notice testId="applications-capped">
            This list has outgrown the slab the route reads, so the oldest enquiries are no longer in
            it. {page.scanned} rows were scanned. Filter by status to see more of one kind, and treat
            the totals here as a floor rather than a count.
          </Notice>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="New"
            value={String(untouched)}
            hint="Nobody has looked at these."
            tone={untouched > 0 ? "warn" : "plain"}
            testId="stat-applications-new"
          />
          <StatCard
            label="Loaded"
            value={String(rows.length)}
            hint={status === "all" ? "Every status, newest first." : STATUS_LABEL[status] + " only."}
            testId="stat-applications-loaded"
          />
          <StatCard
            label="Converted"
            value={String(rows.filter((row) => row.status === "converted").length)}
            hint="A franchise exists for these."
            testId="stat-applications-converted"
          />
        </div>
      )}

      <div className="mb-4">
        <Notice testId="applications-privacy-note">
          Reviewing and rejecting are notes to ourselves. Neither sends an email and neither is served
          to the applicant, so a rejected enquiry has not been declined in writing.
        </Notice>
      </div>

      {isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="applications-loading">
          Loading enquiries…
        </p>
      )}

      {!isLoading && rows.length === 0 && !problem && (
        <p className="text-sm text-muted-foreground" data-testid="applications-empty">
          {status === "all"
            ? "No franchise enquiries yet. They arrive from the form on /franchise."
            : `No enquiries are ${STATUS_LABEL[status].toLowerCase()}.`}
        </p>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="w-10" />
                <th
                  scope="col"
                  className="px-3 sm:px-4 py-2.5 text-left font-semibold text-muted-foreground"
                >
                  Applicant
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-4 py-2.5 text-left font-semibold text-muted-foreground"
                >
                  Wants
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-4 py-2.5 text-left font-semibold text-muted-foreground"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="hidden lg:table-cell px-4 py-2.5 text-right font-semibold text-muted-foreground"
                >
                  Received
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-4 py-2.5 text-right font-semibold text-muted-foreground"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <ApplicationRows
                  key={row.applicationId}
                  row={row}
                  isOpen={expanded === row.applicationId}
                  onToggle={() =>
                    setExpanded((prev) => (prev === row.applicationId ? null : row.applicationId))
                  }
                  onTriaged={(message) => {
                    setSaved(message);
                    setExpanded(null);
                    void load(status);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ApplicationRows({
  row,
  isOpen,
  onToggle,
  onTriaged,
}: {
  row: FranchiseApplicationRow;
  isOpen: boolean;
  onToggle: () => void;
  onTriaged: (message: string) => void;
}) {
  const terminal = row.status === "converted";

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors"
        data-testid={`row-application-${row.applicationId}`}
      >
        <td className="pl-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`toggle-application-${row.applicationId}`}
          >
            <span className="sr-only">
              {isOpen ? "Hide" : "Show"} what {row.name} wrote
            </span>
            {isOpen ? (
              <ChevronDown className="w-4 h-4" aria-hidden />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden />
            )}
          </button>
        </td>
        <td className="px-3 sm:px-4 py-2.5 sm:min-w-[11rem]">
          <p className="font-semibold text-foreground">{row.name}</p>
          {/* An address with no break opportunity would widen the column past a phone screen, and
              there is no room there to lose. Above sm it stays whole. */}
          <p className="text-xs text-muted-foreground break-all sm:break-normal">{row.email}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.reference}</p>
          {/* Four columns do not fit a phone. Status rides under the name there, and keeps the
              testid off so the one on the Status column stays the only match. */}
          <div className="sm:hidden mt-1.5">
            <Pill className={STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</Pill>
          </div>
        </td>
        <td className="hidden sm:table-cell px-4 py-2.5 sm:min-w-[10rem]">
          <p className="text-foreground">{row.targetMarket}</p>
          <p className="text-xs text-muted-foreground">{wants(row)}</p>
        </td>
        <td className="hidden sm:table-cell px-4 py-2.5">
          <Pill className={STATUS_CLASS[row.status]} testId={`app-status-${row.applicationId}`}>
            {STATUS_LABEL[row.status]}
          </Pill>
          {/* An email has no break opportunity, so on a phone this line alone would set the column
              wide enough to push the table into a sideways scroll. It is in the panel instead. */}
          {row.triage && (
            <p className="hidden sm:block mt-1 text-xs text-muted-foreground">
              {row.triage.decidedByEmail}, {formatIstDateTime(row.triage.decidedAt)}
            </p>
          )}
        </td>
        <td className="hidden lg:table-cell px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
          {formatIstDateTime(row.createdAt)}
        </td>
        <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
          {terminal && row.triage?.franchiseId ? (
            <Link
              href={`/admin/franchises/${row.triage.franchiseId}`}
              className="text-sm font-semibold text-primary-ink hover:underline"
              data-testid={`link-converted-${row.applicationId}`}
            >
              Its franchise
            </Link>
          ) : (
            !terminal && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl cursor-pointer font-semibold"
              >
                <Link
                  href={inviteHrefForApplication(row)}
                  data-testid={`link-convert-${row.applicationId}`}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />
                  Invite
                </Link>
              </Button>
            )
          )}
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-4 sm:px-5 py-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="sm:hidden">
                  <Detail label="Wants" value={`${row.targetMarket}\n${wants(row)}`} />
                </div>
                <Detail label="Mobile" value={row.mobile} />
                <Detail label="Company" value={row.company?.trim() || "Not given"} />
                <Detail
                  label="Background, as written"
                  value={row.background?.trim() || "Nothing written"}
                />
                <Detail label="Application id" value={row.applicationId} mono />
                {row.triage && (
                  <div className="sm:hidden">
                    <Detail
                      label="Decided by"
                      value={`${row.triage.decidedByEmail}\n${formatIstDateTime(row.triage.decidedAt)}`}
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-3">{STATUS_NOTE[row.status]}</p>
                {/* Only where there is no form. Below one, the same words are already in the textarea,
                    and printing them twice reads as two separate decisions. */}
                {terminal && row.triage && row.triage.note.trim() !== "" && (
                  <blockquote
                    className="mb-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-700 leading-relaxed"
                    data-testid={`triage-note-${row.applicationId}`}
                  >
                    {row.triage.note}
                  </blockquote>
                )}
                {terminal ? (
                  <p className="text-sm text-muted-foreground" data-testid={`triage-closed-${row.applicationId}`}>
                    A franchise was created from this enquiry, so its status cannot change. The
                    franchise record is where everything after this lives.
                  </p>
                ) : (
                  <TriageForm row={row} onTriaged={onTriaged} />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function wants(row: FranchiseApplicationRow): string {
  return `${row.tierName ?? row.tier} · ${formatPaiseAsInr(row.investmentPaise)} · ${row.initialMachines} machines`;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={`text-sm text-foreground leading-relaxed whitespace-pre-line ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function TriageForm({
  row,
  onTriaged,
}: {
  row: FranchiseApplicationRow;
  onTriaged: (message: string) => void;
}) {
  const form = useForm<FranchiseTriageForm>({
    resolver: zodResolver(franchiseTriageFormSchema),
    // The stored note is the starting point, so recording a second decision does not silently
    // discard the first one's reasoning.
    defaultValues: { status: "reviewed", note: row.triage?.note ?? "" },
    mode: "onBlur",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const status = form.watch("status");

  async function onSubmit(values: FranchiseTriageForm) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const result = await triageFranchiseApplication(
        row.applicationId,
        toFranchiseTriageBody(values),
      );
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            form.setError(field as keyof FranchiseTriageForm, { message });
          }
        }
        setServerError(result.error.message);
        return;
      }
      onTriaged(
        `${row.reference} marked ${STATUS_LABEL[values.status].toLowerCase()}. Nothing was sent to ${row.name}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {serverError && (
          <ErrorPanel message={serverError} testId={`triage-error-${row.applicationId}`} />
        )}

        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground mb-2">
            Record a decision
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["reviewed", "rejected"] as const).map((option) => (
              <label
                key={option}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 min-h-11 cursor-pointer transition-colors ${
                  status === option
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  value={option}
                  checked={status === option}
                  onChange={() => form.setValue("status", option, { shouldValidate: true })}
                  className="w-4 h-4 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`triage-${option}-${row.applicationId}`}
                />
                <span className="text-sm font-semibold">{STATUS_LABEL[option]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <AreaField
          control={form.control}
          name="note"
          label="Note"
          rows={3}
          placeholder={
            status === "rejected"
              ? "Why this is not one we want. The next person reads this if they enquire again."
              : "What you concluded. Optional."
          }
          description={`${
            status === "rejected"
              ? "Required, and internal. The applicant is not told."
              : "Optional, and internal. The applicant is not told."
          }${row.triage ? " This starts from the last note, and replaces it." : ""}`}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 px-5 rounded-xl font-semibold text-sm cursor-pointer"
          data-testid={`button-triage-${row.applicationId}`}
        >
          {isSubmitting ? "Saving…" : `Mark ${STATUS_LABEL[status].toLowerCase()}`}
        </Button>
      </form>
    </Form>
  );
}
