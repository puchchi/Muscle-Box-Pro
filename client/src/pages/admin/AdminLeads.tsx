"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchLeads } from "@/lib/adminLeadsApi";
import type { Lead, LeadKind, LeadPage } from "@shared/admin/leads";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { ErrorPanel, Notice } from "./AdminUi";
import { formatIstDateTime } from "./adminFormat";

/**
 * The Enquiries tab — demo requests, campaign enquiries and investor enquiries, read-only.
 *
 * These three tables are the last thing in the product still living in Supabase, which is frozen: no
 * migration will run against it and nothing new will be added. So this panel is a window onto rows that
 * only get written by the public forms, and there is deliberately nothing here that writes.
 *
 * ## It fetches when you open it, and only for the tab you open
 *
 * Nothing is requested on `/admin`. Each kind is fetched the first time its tab is selected and then
 * kept in `pages`, so switching back and forth costs nothing and a stale view is refreshed by pressing
 * Refresh rather than by a timer. Three tabs opened once is three requests for a session, which is the
 * whole cost of this screen.
 *
 * ## One table for three shapes
 *
 * The three Supabase tables have different columns, flattened server-side into one row where a column a
 * table does not have is `null`. Rendering that as five columns with blanks in them, rather than three
 * per-kind layouts, is a deliberate trade: an investor enquiry has no phone number, and a blank cell
 * under a heading is easier to read correctly than a table that changes shape under you.
 */

const KIND_LABEL: Record<LeadKind, string> = {
  demo: "Demo requests",
  campaign: "Campaign enquiries",
  investor: "Investor enquiries",
};

/** What the second line of the Details cell means for each kind, since the column is shared. */
const KIND_NOTE: Record<LeadKind, string> = {
  demo: "Gym name and location, as typed into the demo form.",
  campaign: "Brand name. This form asks for nothing else, so the other columns are blank by design.",
  investor: "Firm and investor type. This form asks for no phone number.",
};

const KINDS: LeadKind[] = ["demo", "campaign", "investor"];

type Problem = { message: string; issues: string[] };

export default function AdminLeads() {
  const guard = useAdminGuard();
  const [kind, setKind] = useState<LeadKind>("demo");
  /**
   * One entry per kind that has been opened. Not a single `page`, because switching tabs would then
   * throw away a list that has already been paid for and fetch it again on the way back.
   */
  const [pages, setPages] = useState<Partial<Record<LeadKind, LeadPage>>>({});
  const [loading, setLoading] = useState<LeadKind | null>(null);
  const [problems, setProblems] = useState<Partial<Record<LeadKind, Problem>>>({});
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async (which: LeadKind) => {
    setLoading(which);
    const result = await fetchLeads(which);
    if (!result.ok) {
      setProblems((prev) => ({ ...prev, [which]: { message: result.error.message, issues: result.issues } }));
    } else {
      setProblems((prev) => ({ ...prev, [which]: undefined }));
      setPages((prev) => ({ ...prev, [which]: result.data }));
    }
    setLoading((current) => (current === which ? null : current));
  }, []);

  useEffect(() => {
    if (guard.state !== "ready") return;
    // Already held, so selecting the tab again is free. This is the whole of the lazy-loading rule:
    // a request happens on first sight of a kind and on an explicit Refresh, never on a re-render.
    if (pages[kind] !== undefined || problems[kind] !== undefined) return;
    void load(kind);
  }, [guard.state, kind, pages, problems, load]);

  if (guard.state !== "ready") return <AdminChecking />;

  const page = pages[kind];
  const problem = problems[kind];
  const isLoading = loading === kind;
  const needle = filter.trim().toLowerCase();
  const rows = page?.leads ?? [];
  const visible = needle === "" ? rows : rows.filter((lead) => matches(lead, needle));

  function toggleMessage(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AdminShell session={guard.session}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-leads-heading"
          >
            Enquiries
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="admin-leads-count">
            {isLoading
              ? "Loading…"
              : page === undefined
                ? "Nothing loaded yet."
                : countLine(page, visible.length, needle !== "")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load(kind)}
          disabled={isLoading}
          className="rounded-xl cursor-pointer"
          data-testid="button-refresh-leads"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Which enquiries to show">
        {/*
          `page.kinds` when a page has been loaded, so the tabs come from the server's own whitelist
          rather than from a copy of it. Before the first response there is nothing to draw them from,
          which is why the local constant exists at all.
        */}
        {(page?.kinds ?? KINDS).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              kind === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300 hover:text-foreground"
            }`}
            data-testid={`tab-leads-${value}`}
          >
            {KIND_LABEL[value]}
            {pages[value] !== undefined && (
              <span className={`tabular-nums ${kind === value ? "opacity-80" : "text-gray-400"}`}>
                {pages[value]?.leads.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {problem && (
        <div className="mb-5">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-leads-error"
            issuesTestId="admin-leads-issues"
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden
            />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by name, email or place"
              aria-label="Filter loaded enquiries"
              className="bg-white border-gray-200 h-10 rounded-xl pl-9"
              data-testid="input-filter-leads"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Filters the {rows.length} loaded {rows.length === 1 ? "enquiry" : "enquiries"} only. There
            is no search on the API.
          </p>
        </div>
      )}

      {!isLoading && page !== undefined && rows.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-leads-empty">
          Nothing here yet. {KIND_LABEL[kind]} arrive from the public forms on the website.
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          {/*
            `min-w-` with the scroller above it, rather than letting five columns share whatever width
            there is. On a phone the shared width collapses the Message column to one word per line and
            a single enquiry becomes a screen and a half; a sideways scroll is the lesser evil.
          */}
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Who</Th>
                <Th>Contact</Th>
                <Th>Details</Th>
                <Th>Message</Th>
                <Th align="right">Received</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((lead) => {
                const message = lead.message?.trim() ?? "";
                const open = expanded.has(lead.id);
                return (
                  <tr key={lead.id} className="align-top" data-testid={`row-lead-${lead.id}`}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-foreground">{lead.name || "Not given"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {/*
                        A `mailto:` rather than plain text, because answering an enquiry is the only
                        thing anybody does with this screen. The inbox tab replies to mail that came
                        *to* us; these rows are people who used a form and never sent one.
                      */}
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-foreground hover:underline break-all"
                        data-testid={`lead-email-${lead.id}`}
                      >
                        {lead.email}
                      </a>
                      {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {lead.organisation && <p className="text-foreground">{lead.organisation}</p>}
                      {lead.location && (
                        <p className="text-xs text-muted-foreground">{lead.location}</p>
                      )}
                      {lead.investorType && (
                        <p className="text-xs text-muted-foreground">{lead.investorType}</p>
                      )}
                      {!lead.organisation && !lead.location && !lead.investorType && (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[38ch]">
                      {message === "" ? (
                        <span className="text-gray-400">—</span>
                      ) : message.length <= 160 ? (
                        <p className="whitespace-pre-wrap break-words text-muted-foreground">
                          {message}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleMessage(lead.id)}
                          aria-expanded={open}
                          className="text-left cursor-pointer"
                          data-testid={`lead-message-${lead.id}`}
                        >
                          {/*
                            Two whole class lists rather than one with a conditional suffix. `block` and
                            `line-clamp-3` both set `display`, and `block` was winning, so the collapsed
                            state rendered the entire message and "Show more" did nothing.
                          */}
                          <span
                            className={
                              open
                                ? "block whitespace-pre-wrap break-words text-muted-foreground"
                                : "line-clamp-3 break-words text-muted-foreground"
                            }
                          >
                            {message}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {open ? "Show less" : "Show more"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {needle !== "" && visible.length === 0 && rows.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-leads-no-match">
          Nothing in the {rows.length} loaded {rows.length === 1 ? "enquiry" : "enquiries"} matches
          “{filter.trim()}”.
        </p>
      )}

      {page !== undefined && (
        <div className="mt-5">
          <Notice testId="admin-leads-note">{KIND_NOTE[kind]}</Notice>
        </div>
      )}
    </AdminShell>
  );
}

function matches(lead: Lead, needle: string): boolean {
  return [lead.name, lead.email, lead.phone, lead.organisation, lead.location, lead.investorType].some(
    (value) => (value ?? "").toLowerCase().includes(needle),
  );
}

/**
 * "12 of 40 in the table" and its variants.
 *
 * `total` is rows in the Supabase table, not rows on screen, and it is the only number here that could
 * mislead: a page cut short by the server's limit with no note would read as the whole table. When the
 * count is missing entirely the line says how many are loaded and claims nothing else.
 */
function countLine(page: LeadPage, shown: number, narrowed: boolean): string {
  const loaded = page.leads.length;
  const noun = loaded === 1 ? "enquiry" : "enquiries";
  if (narrowed) return `${shown} of ${loaded} loaded ${noun}.`;
  if (page.total === null) return `${loaded} loaded, newest first.`;
  if (page.total > loaded) return `${loaded} of ${page.total} loaded, newest first.`;
  return `${loaded} ${noun}, newest first.`;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
